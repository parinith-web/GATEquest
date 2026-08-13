-- Pulse: multiple attachments per post. Previously a post could carry
-- at most one image/video (media_url + media_type, see
-- 0005_pulse_posts.sql). This replaces that pair with a single `media`
-- JSONB array column, e.g.
--   [{"url": "https://...", "type": "image"}, {"url": "https://...", "type": "video"}]
-- so the compose box can attach several files to one post, same as
-- every other feed of this shape.
--
-- Run once against your Neon database after 0010_drop_hashtags.sql:
--   psql "$DATABASE_URL" -f migrations/0011_pulse_multi_media.sql

ALTER TABLE posts ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: fold any existing single attachment into the new array
-- shape so old posts keep their media after the columns below go away.
UPDATE posts
SET media = jsonb_build_array(jsonb_build_object('url', media_url, 'type', media_type))
WHERE media_url IS NOT NULL AND media = '[]'::jsonb;

ALTER TABLE posts DROP COLUMN IF EXISTS media_url;
ALTER TABLE posts DROP COLUMN IF EXISTS media_type;
