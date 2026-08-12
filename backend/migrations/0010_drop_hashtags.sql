-- Pulse: hashtags are gone. #hashtag auto-parsing out of post content
-- (0005_pulse_posts.sql) has been replaced entirely by the `tags`
-- column added in 0009_post_tags.sql — personalized tags picked in the
-- compose box's "Add tags" control are now the only tagging mechanism,
-- for both the corner badge and the channel/trending sidebars.
--
-- Run once against your Neon database after 0009_post_tags.sql:
--   psql "$DATABASE_URL" -f migrations/0010_drop_hashtags.sql

DROP INDEX IF EXISTS idx_posts_hashtags;

ALTER TABLE posts DROP COLUMN IF EXISTS hashtags;

-- tags now drives the channel filter (?tag=) and the channel/trending
-- aggregation queries that idx_posts_hashtags used to serve, so it
-- needs the same GIN index.
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
