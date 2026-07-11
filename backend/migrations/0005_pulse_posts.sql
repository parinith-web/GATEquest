-- Pulse: the CS community feed. Session 2 of the Pulse rebuild — data
-- model + core posting API only. Comments/likes/dislikes/bookmarks get
-- their own tables in a later migration (session 4); the counter
-- columns below are added now so sorting (hot/top) and the UI's counts
-- work from day one without a schema change later, they just sit at 0
-- until those tables exist and start updating them.
--
-- Run once against your Neon database after the earlier migrations:
--   psql "$DATABASE_URL" -f migrations/0005_pulse_posts.sql

CREATE TABLE IF NOT EXISTS posts (
    id             UUID PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- The tweet/post text itself. #hashtags inside it are parsed out at
    -- write time (see internal/store/pulse.go ExtractHashtags) into the
    -- hashtags column below, so channel/trending queries never have to
    -- regex-scan post bodies at read time.
    content        TEXT NOT NULL,

    -- A single attached image or video, if any. One attachment per post
    -- for now — enough for the "share resources/images/videos" use
    -- case without needing a separate media table yet.
    media_url      TEXT,
    media_type     TEXT CHECK (media_type IN ('image', 'video')),

    -- Lower-cased, de-duplicated hashtags parsed from content, e.g.
    -- {"os","scheduling"} for a post containing "#OS #Scheduling #os".
    -- Drives the channel list and trending topics.
    hashtags       TEXT[] NOT NULL DEFAULT '{}',

    -- Denormalized counters, updated transactionally by the
    -- like/dislike/comment endpoints once those land. Kept on the post
    -- row (rather than always COUNT()'d from child tables) so feed
    -- sorting by hot/top stays a single indexed query.
    like_count     INT NOT NULL DEFAULT 0,
    dislike_count  INT NOT NULL DEFAULT 0,
    comment_count  INT NOT NULL DEFAULT 0,
    share_count    INT NOT NULL DEFAULT 0,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NEW sort: newest first.
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Channel filter (?hashtag=os) and channel/trending aggregation both
-- filter/unnest this column — GIN makes both cheap.
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);

-- "delete own post" / a future "my posts" view.
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id, created_at DESC);
