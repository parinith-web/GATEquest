-- Pulse: session 4 of the rebuild — interactions on top of posts
-- (migration 0005). Adds the three tables the like/dislike, comment,
-- and bookmark endpoints need. The denormalized like_count/dislike_
-- count/comment_count/share_count columns on posts (already present
-- since 0005) are kept in sync transactionally by the store layer
-- (internal/store/pulse_interactions.go) rather than by triggers, so
-- the counter-update logic stays visible in Go instead of split across
-- SQL and application code.
--
-- Run once against your Neon database after 0005:
--   psql "$DATABASE_URL" -f migrations/0006_pulse_interactions.sql

-- One row per (post, user): a user can like OR dislike a post, never
-- both at once — value is +1 (like) or -1 (dislike). Switching from
-- like to dislike updates this row in place rather than deleting +
-- re-inserting, so there's never a moment with two rows for the same
-- (post, user).
CREATE TABLE IF NOT EXISTS post_votes (
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value      SMALLINT NOT NULL CHECK (value IN (1, -1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- Lets "has this user voted on any of these posts" (feed hydration) be
-- one indexed lookup instead of N.
CREATE INDEX IF NOT EXISTS idx_post_votes_user ON post_votes(user_id);

-- Flat (non-threaded) comments — matches the "view + add comments"
-- scope for this session. Threading/replies-to-replies can be added
-- later with a nullable parent_comment_id column without touching
-- existing rows.
CREATE TABLE IF NOT EXISTS post_comments (
    id         UUID PRIMARY KEY,
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Oldest-first comment thread per post is the common read path.
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at ASC);

-- One row per (post, user): saved posts, shown on a "my bookmarks" view.
CREATE TABLE IF NOT EXISTS post_bookmarks (
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- "My bookmarks, newest-saved first" is the only read pattern.
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON post_bookmarks(user_id, created_at DESC);
