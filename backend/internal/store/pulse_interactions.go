// Pulse: session 4 of the rebuild — likes/dislikes, comments, and
// bookmarks on top of posts (pulse.go / migration 0005). Each of the
// three features gets its own table (migration 0006); this file keeps
// posts.like_count / dislike_count / comment_count in sync with those
// tables transactionally, so a feed listing never has to re-aggregate
// vote/comment rows just to render counts.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ErrInvalidVoteValue is returned by VotePost when value isn't one of
// 1 (like), -1 (dislike), or 0 (clear an existing vote).
var ErrInvalidVoteValue = errors.New("invalid vote value")

// --- Votes -------------------------------------------------------------

// VotePost sets the caller's reaction to a post: value is 1 to like,
// -1 to dislike, or 0 to clear whatever reaction they had. A user can
// only ever have one active reaction per post (liking after disliking
// replaces the dislike rather than stacking), and posts.like_count /
// dislike_count are adjusted in the same transaction so they never
// drift from the post_votes rows that back them.
//
// Returns the post's fresh like/dislike counts and the caller's
// resulting vote value (0 if cleared).
func (s *Store) VotePost(ctx context.Context, postID, userID uuid.UUID, value int) (likeCount, dislikeCount, resultValue int, err error) {
	if value != 1 && value != -1 && value != 0 {
		return 0, 0, 0, ErrInvalidVoteValue
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, 0, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed

	var existing int
	var hasExisting bool
	row := tx.QueryRow(ctx,
		`SELECT value FROM post_votes WHERE post_id = $1 AND user_id = $2 FOR UPDATE`,
		postID, userID)
	switch err := row.Scan(&existing); {
	case err == nil:
		hasExisting = true
	case errors.Is(err, pgx.ErrNoRows):
		hasExisting = false
	default:
		return 0, 0, 0, err
	}

	likeDelta, dislikeDelta := 0, 0

	switch {
	case value == 0:
		if hasExisting {
			if _, err := tx.Exec(ctx,
				`DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2`,
				postID, userID); err != nil {
				return 0, 0, 0, err
			}
			if existing == 1 {
				likeDelta = -1
			} else {
				dislikeDelta = -1
			}
		}
	case !hasExisting:
		if _, err := tx.Exec(ctx,
			`INSERT INTO post_votes (post_id, user_id, value, created_at) VALUES ($1, $2, $3, now())`,
			postID, userID, value); err != nil {
			return 0, 0, 0, err
		}
		if value == 1 {
			likeDelta = 1
		} else {
			dislikeDelta = 1
		}
	case existing != value:
		if _, err := tx.Exec(ctx,
			`UPDATE post_votes SET value = $3, created_at = now() WHERE post_id = $1 AND user_id = $2`,
			postID, userID, value); err != nil {
			return 0, 0, 0, err
		}
		if value == 1 {
			likeDelta, dislikeDelta = 1, -1
		} else {
			likeDelta, dislikeDelta = -1, 1
		}
	default:
		// existing == value: already reacted this way, nothing to change.
	}

	row = tx.QueryRow(ctx,
		`UPDATE posts
		 SET like_count = like_count + $2, dislike_count = dislike_count + $3
		 WHERE id = $1
		 RETURNING like_count, dislike_count`,
		postID, likeDelta, dislikeDelta,
	)
	if err := row.Scan(&likeCount, &dislikeCount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, 0, 0, ErrNotFound
		}
		return 0, 0, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, 0, err
	}
	return likeCount, dislikeCount, value, nil
}

// GetUserVotes batch-loads the caller's vote value (1 or -1) for each
// of postIDs, keyed by post ID. Posts the user hasn't voted on are
// simply absent from the map. Used to hydrate a feed page with
// "userVote" per card in one query instead of one-per-post.
func (s *Store) GetUserVotes(ctx context.Context, userID uuid.UUID, postIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	out := make(map[uuid.UUID]int, len(postIDs))
	if len(postIDs) == 0 || userID == uuid.Nil {
		return out, nil
	}
	rows, err := s.db.Query(ctx,
		`SELECT post_id, value FROM post_votes WHERE user_id = $1 AND post_id = ANY($2)`,
		userID, postIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var postID uuid.UUID
		var value int
		if err := rows.Scan(&postID, &value); err != nil {
			return nil, err
		}
		out[postID] = value
	}
	return out, rows.Err()
}

// --- Comments ------------------------------------------------------------

// Comment is one reply on a Pulse post, with author info denormalized
// the same way Post is.
type Comment struct {
	ID           uuid.UUID
	PostID       uuid.UUID
	UserID       uuid.UUID
	AuthorName   string
	AuthorAvatar string
	Content      string
	CreatedAt    time.Time
}

// CreateComment adds a comment under a post and bumps its
// comment_count, in one transaction so the two never disagree.
func (s *Store) CreateComment(ctx context.Context, postID, userID uuid.UUID, content string) (*Comment, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	id := uuid.New()
	createdAt := time.Now()
	tag, err := tx.Exec(ctx,
		`INSERT INTO post_comments (id, post_id, user_id, content, created_at)
		 SELECT $1, $2, $3, $4, $5 WHERE EXISTS (SELECT 1 FROM posts WHERE id = $2)`,
		id, postID, userID, content, createdAt,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound // post doesn't exist
	}

	if _, err := tx.Exec(ctx,
		`UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`, postID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetComment(ctx, id)
}

const commentSelectColumns = `
	c.id, c.post_id, c.user_id, u.name, u.avatar_url, c.content, c.created_at`

func scanComment(row interface{ Scan(dest ...any) error }) (*Comment, error) {
	var c Comment
	if err := row.Scan(
		&c.ID, &c.PostID, &c.UserID, &c.AuthorName, &c.AuthorAvatar,
		&c.Content, &c.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &c, nil
}

// GetComment fetches a single comment by ID.
func (s *Store) GetComment(ctx context.Context, id uuid.UUID) (*Comment, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+commentSelectColumns+`
		 FROM post_comments c JOIN users u ON u.id = c.user_id
		 WHERE c.id = $1`,
		id,
	)
	c, err := scanComment(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

const (
	defaultCommentLimit = 50
	maxCommentLimit     = 100
)

// ListComments returns a page of comments for a post, oldest first
// (the natural reading order for a reply thread).
func (s *Store) ListComments(ctx context.Context, postID uuid.UUID, limit, offset int) ([]Comment, error) {
	if limit <= 0 {
		limit = defaultCommentLimit
	}
	if limit > maxCommentLimit {
		limit = maxCommentLimit
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := s.db.Query(ctx,
		`SELECT `+commentSelectColumns+`
		 FROM post_comments c JOIN users u ON u.id = c.user_id
		 WHERE c.post_id = $1
		 ORDER BY c.created_at ASC
		 LIMIT $2 OFFSET $3`,
		postID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Comment
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// CountComments returns the total number of comments on a post — used
// for comment-thread pagination.
func (s *Store) CountComments(ctx context.Context, postID uuid.UUID) (int, error) {
	var n int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM post_comments WHERE post_id = $1`, postID).Scan(&n)
	return n, err
}

// DeleteComment removes a comment (owner-only) and decrements its
// post's comment_count in the same transaction.
func (s *Store) DeleteComment(ctx context.Context, id, userID uuid.UUID) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var postID uuid.UUID
	row := tx.QueryRow(ctx,
		`DELETE FROM post_comments WHERE id = $1 AND user_id = $2 RETURNING post_id`,
		id, userID)
	if err := row.Scan(&postID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1`,
		postID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// --- Bookmarks -----------------------------------------------------------

// BookmarkPost saves a post to the caller's bookmarks. Idempotent —
// bookmarking an already-bookmarked post is a no-op, not an error.
func (s *Store) BookmarkPost(ctx context.Context, postID, userID uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO post_bookmarks (post_id, user_id, created_at) VALUES ($1, $2, now())
		 ON CONFLICT (post_id, user_id) DO NOTHING`,
		postID, userID)
	return err
}

// UnbookmarkPost removes a post from the caller's bookmarks. Also
// idempotent — unbookmarking something that isn't saved is a no-op.
func (s *Store) UnbookmarkPost(ctx context.Context, postID, userID uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`DELETE FROM post_bookmarks WHERE post_id = $1 AND user_id = $2`, postID, userID)
	return err
}

// GetUserBookmarks batch-loads which of postIDs the caller has
// bookmarked, keyed by post ID (present + true if bookmarked, absent
// otherwise). Mirrors GetUserVotes's shape for feed hydration.
func (s *Store) GetUserBookmarks(ctx context.Context, userID uuid.UUID, postIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	out := make(map[uuid.UUID]bool, len(postIDs))
	if len(postIDs) == 0 || userID == uuid.Nil {
		return out, nil
	}
	rows, err := s.db.Query(ctx,
		`SELECT post_id FROM post_bookmarks WHERE user_id = $1 AND post_id = ANY($2)`,
		userID, postIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var postID uuid.UUID
		if err := rows.Scan(&postID); err != nil {
			return nil, err
		}
		out[postID] = true
	}
	return out, rows.Err()
}

// ListBookmarkedPosts returns the caller's saved posts, most-recently
// bookmarked first (not most-recently posted — a bookmark you made
// today of an old post should still show up at the top).
func (s *Store) ListBookmarkedPosts(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Post, error) {
	if limit <= 0 {
		limit = defaultPostLimit
	}
	if limit > maxPostLimit {
		limit = maxPostLimit
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := s.db.Query(ctx,
		`SELECT `+postSelectColumns+`
		 FROM post_bookmarks b
		 JOIN posts p ON p.id = b.post_id
		 JOIN users u ON u.id = p.user_id
		 WHERE b.user_id = $1
		 ORDER BY b.created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Post
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

// CountBookmarkedPosts returns how many posts the caller has bookmarked
// — used for the bookmarks view's pagination.
func (s *Store) CountBookmarkedPosts(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM post_bookmarks WHERE user_id = $1`, userID).Scan(&n)
	return n, err
}

// --- Share -----------------------------------------------------------

// IncrementShareCount bumps a post's share counter by one. Fired when
// a user copies a post's link — there's no dedup by design (matches
// how the pre-backend mock UI let share count go up on every click);
// it's a lightweight "this got shared" signal, not an audit log.
func (s *Store) IncrementShareCount(ctx context.Context, postID uuid.UUID) (int, error) {
	var shareCount int
	row := s.db.QueryRow(ctx,
		`UPDATE posts SET share_count = share_count + 1 WHERE id = $1 RETURNING share_count`,
		postID)
	if err := row.Scan(&shareCount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}
	return shareCount, nil
}
