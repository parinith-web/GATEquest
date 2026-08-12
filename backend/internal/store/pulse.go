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
	// Tags are freeform labels the author picked in the "Add tags"
	// control at compose time. They're the only tagging mechanism Pulse
	// has — there used to also be #hashtags auto-parsed out of post
	// text, but that's been removed in favor of this single, explicit,
	// author-controlled list. Tags never appear as text inside the
	// post itself; they render as the badge in the top-right corner of
	// the card and drive the channel/trending sidebars.
	Tags         []string
	LikeCount    int
	DislikeCount int
	CommentCount int
	ShareCount   int
	CreatedAt    time.Time
}

// maxTagsPerPost / maxTagLength bound the "Add tags" control — enough
// room for a handful of personalized tags without turning the corner
// badge row into its own scrollable feed.
const (
	maxTagsPerPost = 6
	maxTagLength   = 24
)

// tagPattern restricts a tag to letters/digits/underscore/hyphen, e.g.
// "os", "data_structures", "gate-2026" — the compose UI doesn't ask the
// user to type a leading '#', SanitizeTags strips one off if they did
// anyway.
var tagPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

// SanitizeTags trims, strips any leading '#' the client sent anyway,
// validates characters/length, lower-cases, and de-duplicates a
// client-supplied tags list. Never trust it verbatim — this is the one
// place a post's tags get written, so every path (create, and any
// future edit endpoint) should route through here.
func SanitizeTags(raw []string) []string {
	seen := make(map[string]bool, len(raw))
	out := make([]string, 0, len(raw))
	for _, t := range raw {
		t = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(t), "#"))
		if t == "" || len(t) > maxTagLength || !tagPattern.MatchString(t) {
			continue
		}
		lower := strings.ToLower(t)
		if seen[lower] {
			continue
		}
		seen[lower] = true
		out = append(out, lower)
		if len(out) >= maxTagsPerPost {
			break
		}
	}
	return out
}

// PostFilter scopes/sorts a Pulse feed query.
type PostFilter struct {
	// Tag, if non-empty, restricts the feed to posts carrying this tag
	// (lower-cased before matching). Corresponds to clicking a channel
	// in the left sidebar.
	Tag string

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
	p.media_type, p.tags, p.like_count, p.dislike_count,
	p.comment_count, p.share_count, p.created_at`

func scanPost(row interface{ Scan(dest ...any) error }) (*Post, error) {
	var p Post
	if err := row.Scan(
		&p.ID, &p.UserID, &p.AuthorName, &p.AuthorAvatar, &p.Content,
		&p.MediaURL, &p.MediaType, &p.Tags, &p.LikeCount,
		&p.DislikeCount, &p.CommentCount, &p.ShareCount, &p.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &p, nil
}

// CreatePost inserts a new post. tags is the already-sanitized
// (SanitizeTags) list of personalized tags the author picked in the
// compose box's "Add tags" control — content is stored as-is, with no
// server-side parsing of it for tags.
func (s *Store) CreatePost(ctx context.Context, userID uuid.UUID, content string, mediaURL, mediaType *string, tags []string) (*Post, error) {
	id := uuid.New()
	if tags == nil {
		tags = []string{}
	}

	_, err := s.db.Exec(ctx,
		`INSERT INTO posts (id, user_id, content, media_url, media_type, tags, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, now())`,
		id, userID, content, mediaURL, mediaType, tags,
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

	tag := strings.ToLower(strings.TrimPrefix(filter.Tag, "#"))

	query := `
		SELECT ` + postSelectColumns + `
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE ($1 = '' OR $1 = ANY(p.tags))
		ORDER BY ` + orderBy + `
		LIMIT $2 OFFSET $3`

	rows, err := s.db.Query(ctx, query, tag, limit, offset)
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

// ChannelCount is one tag and how many posts carry it — powers both the
// "CHANNELS" sidebar list and the trending-topics view.
type ChannelCount struct {
	Tag   string
	Count int
}

// ListChannels returns the most-used tags across all of Pulse, highest
// count first. This replaces the hardcoded `channels` array that used
// to live in the frontend.
func (s *Store) ListChannels(ctx context.Context, limit int) ([]ChannelCount, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := s.db.Query(ctx,
		`SELECT tag, COUNT(*) AS n
		 FROM posts, unnest(tags) AS tag
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
		if err := rows.Scan(&c.Tag, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ListTrendingTags is like ListChannels but scoped to posts created
// within `since` of now, so a tag that was huge last month but is dead
// today doesn't dominate "trending" forever.
func (s *Store) ListTrendingTags(ctx context.Context, since time.Duration, limit int) ([]ChannelCount, error) {
	if limit <= 0 {
		limit = 10
	}
	cutoff := time.Now().Add(-since)
	rows, err := s.db.Query(ctx,
		`SELECT tag, COUNT(*) AS n
		 FROM posts, unnest(tags) AS tag
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
		if err := rows.Scan(&c.Tag, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// CountPosts returns the total number of Pulse posts, matching filter's
// Tag scope (Sort/Limit/Offset are ignored). Used for the "Total Nodes:
// N" counter and for pagination ("has more" checks).
func (s *Store) CountPosts(ctx context.Context, tag string) (int, error) {
	tag = strings.ToLower(strings.TrimPrefix(tag, "#"))
	var n int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM posts WHERE ($1 = '' OR $1 = ANY(tags))`,
		tag,
	).Scan(&n)
	return n, err
}
