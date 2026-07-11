-- Adds a unique, user-chosen username, set during onboarding (after
-- branch selection) and shown on the profile page. Nullable at the
-- column level (stored as '' until set, same convention as `branch`)
-- so existing accounts created before this migration aren't broken —
-- the app enforces "must be non-empty" and gates onboarding client-
-- and server-side instead.
--
-- Run once against your Neon database:
--   psql "$DATABASE_URL" -f migrations/0007_username.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';

-- Case-insensitive uniqueness: "Alice" and "alice" are the same handle.
-- Partial index (WHERE username <> '') so the many rows still sitting
-- at the default '' don't collide with each other under the unique
-- constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
    ON users (lower(username))
    WHERE username <> '';
