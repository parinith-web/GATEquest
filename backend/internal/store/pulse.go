// Pulse: the CS community feed. This file is the data layer for posts
// only (session 2 of the rebuild) — comments, likes/dislikes, and
// bookmarks are separate tables/files added once those endpoints land.
package store

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Post is one Pulse post ("tweet") with enough author info denormalized
// in that the frontend never needs a second round trip to render a
// feed card.
type Post struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	AuthorName   string
	AuthorAvatar string
	Content      string
	MediaURL     *string
	MediaType    *string
	Hashtags     []string
	LikeCount    int
	DislikeCount int
	CommentCount int
	ShareCount   int
	CreatedAt    time.Time
}

// hashtagPattern matches a '#' followed by letters/digits/underscore/
// hyphen, e.g. "#OS", "#data_structures", "#GATE-2026". Matches how
// channel labels already look in the pre-existing mock UI
// ("#algorithms", "#digital-logic").
var hashtagPattern = regexp.MustCompile(`#([A-Za-z0-9_-]+)`)

// ExtractHashtags pulls every #hashtag out of post text, lower-cased and
// de-duplicated (case-insensitively) while preserving first-seen order.
// Lower-casing is deliberate: it's what lets "#OS" and "#os" in
// different posts count toward the same channel.
func ExtractHashtags(content string) []string {
	matches := hashtagPattern.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return []string{}
	}
	seen := make(map[string]bool, len(matches))
	out := make([]string, 0, len(matches))
	for _, m := range matches {
		tag := strings.ToLower(m[1])
		if seen[tag] {
			continue
		}
		seen[tag] = true
		out = append(out, tag)
	}
	return out
}

// PostFilter scopes/sorts a Pulse feed query.
type PostFilter struct {
	// Hashtag, if non-empty, restricts the feed to posts containing
	// this tag (lower-cased before matching). Corresponds to clicking
	// a channel in the left sidebar.
	Hashtag string

	// Sort is "hot" (default), "new", or "top".
	Sort string

	Limit  int
	Offset int
}

const (
	defaultPostLimit = 20
	maxPostLimit     = 50
)

// postSelectColumns is shared between ListPosts and GetPost so the two
// stay in sync (same columns, same join, same scan order).
const postSelectColumns = `
	p.id, p.user_id, u.name, u.avatar_url, p.content, p.media_url,
	p.media_type, p.hashtags, p.like_count, p.dislike_count,
	p.comment_count, p.share_count, p.created_at`

func scanPost(row interface{ Scan(dest ...any) error }) (*Post, error) {
	var p Post
	if err := row.Scan(
		&p.ID, &p.UserID, &p.AuthorName, &p.AuthorAvatar, &p.Content,
		&p.MediaURL, &p.MediaType, &p.Hashtags, &p.LikeCount,
		&p.DislikeCount, &p.CommentCount, &p.ShareCount, &p.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &p, nil
}

// CreatePost inserts a new post, parsing #hashtags out of content
// server-side (never trust a client-supplied hashtags list — it'd let
// someone tag a post into a channel its text never mentions).
func (s *Store) CreatePost(ctx context.Context, userID uuid.UUID, content string, mediaURL, mediaType *string) (*Post, error) {
	id := uuid.New()
	hashtags := ExtractHashtags(content)

	_, err := s.db.Exec(ctx,
		`INSERT INTO posts (id, user_id, content, media_url, media_type, hashtags, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, now())`,
		id, userID, content, mediaURL, mediaType, hashtags,
	)
	if err != nil {
		return nil, err
	}
	return s.GetPost(ctx, id)
}

// ListPosts returns a page of posts matching filter, most-relevant
// first per filter.Sort:
//   - "new": plain reverse-chronological.
//   - "top": highest (likes - dislikes) first, ties broken by recency.
//   - "hot" (default): (likes - dislikes) decayed by post age, so a
//     post that's been sitting for days doesn't outrank something fresh
//     with similar net votes. Same shape as Reddit/HN "hot" ranking.
func (s *Store) ListPosts(ctx context.Context, filter PostFilter) ([]Post, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = defaultPostLimit
	}
	if limit > maxPostLimit {
		limit = maxPostLimit
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	orderBy := `
		((p.like_count - p.dislike_count + 1) /
		 POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2, 1.5)) DESC,
		p.created_at DESC`
	switch filter.Sort {
	case "new":
		orderBy = "p.created_at DESC"
	case "top":
		orderBy = "(p.like_count - p.dislike_count) DESC, p.created_at DESC"
	}

	hashtag := strings.ToLower(strings.TrimPrefix(filter.Hashtag, "#"))

	query := `
		SELECT ` + postSelectColumns + `
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE ($1 = '' OR $1 = ANY(p.hashtags))
		ORDER BY ` + orderBy + `
		LIMIT $2 OFFSET $3`

	rows, err := s.db.Query(ctx, query, hashtag, limit, offset)
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

// GetPost fetches a single post by ID.
func (s *Store) GetPost(ctx context.Context, id uuid.UUID) (*Post, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+postSelectColumns+`
		 FROM posts p JOIN users u ON u.id = p.user_id
		 WHERE p.id = $1`,
		id,
	)
	p, err := scanPost(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

// DeletePost removes a post, but only if userID is its author — callers
// pass the authenticated user's ID, never a trusted "yes it's theirs"
// flag from the client.
func (s *Store) DeletePost(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := s.db.Exec(ctx,
		`DELETE FROM posts WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ChannelCount is one hashtag and how many posts carry it — powers both
// the "CHANNELS" sidebar list and the trending-topics view.
type ChannelCount struct {
	Hashtag string
	Count   int
}

// ListChannels returns the most-used hashtags across all of Pulse,
// highest count first. This replaces the hardcoded `channels` array
// that used to live in the frontend.
func (s *Store) ListChannels(ctx context.Context, limit int) ([]ChannelCount, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := s.db.Query(ctx,
		`SELECT tag, COUNT(*) AS n
		 FROM posts, unnest(hashtags) AS tag
		 GROUP BY tag
		 ORDER BY n DESC, tag ASC
		 LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ChannelCount
	for rows.Next() {
		var c ChannelCount
		if err := rows.Scan(&c.Hashtag, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ListTrendingHashtags is like ListChannels but scoped to posts created
// within `since` of now, so a tag that was huge last month but is dead
// today doesn't dominate "trending" forever.
func (s *Store) ListTrendingHashtags(ctx context.Context, since time.Duration, limit int) ([]ChannelCount, error) {
	if limit <= 0 {
		limit = 10
	}
	cutoff := time.Now().Add(-since)
	rows, err := s.db.Query(ctx,
		`SELECT tag, COUNT(*) AS n
		 FROM posts, unnest(hashtags) AS tag
		 WHERE created_at >= $1
		 GROUP BY tag
		 ORDER BY n DESC, tag ASC
		 LIMIT $2`,
		cutoff, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ChannelCount
	for rows.Next() {
		var c ChannelCount
		if err := rows.Scan(&c.Hashtag, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// CountPosts returns the total number of Pulse posts, matching filter's
// Hashtag scope (Sort/Limit/Offset are ignored). Used for the "Total
// Nodes: N" counter and for pagination ("has more" checks).
func (s *Store) CountPosts(ctx context.Context, hashtag string) (int, error) {
	hashtag = strings.ToLower(strings.TrimPrefix(hashtag, "#"))
	var n int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM posts WHERE ($1 = '' OR $1 = ANY(hashtags))`,
		hashtag,
	).Scan(&n)
	return n, err
}
