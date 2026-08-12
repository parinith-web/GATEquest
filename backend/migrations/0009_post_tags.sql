-- Pulse: user-chosen post tags, separate from the #hashtags parsed out
-- of post content (see 0005_pulse_posts.sql / store.ExtractHashtags).
--
-- Previously the compose box's "Experience/Doubt/Resource/Advice"
-- chips worked by literally prepending "#Experience " etc. to the post
-- text, which meant the tag showed up as visible text in the tweet.
-- This column lets the author attach freeform tags to a post without
-- them ever being part of `content` — they're rendered the same way
-- (top-right badges) but stored and validated separately.
--
-- Run once against your Neon database after the earlier migrations:
--   psql "$DATABASE_URL" -f migrations/0009_post_tags.sql

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Not indexed here — at this point tags were still just a display-only
-- label alongside the #hashtags parsed from content. Once hashtags
-- were removed entirely (see 0010_drop_hashtags.sql), tags became the
-- only thing the feed filters/channels query by and picked up the same
-- GIN index hashtags used to have.
