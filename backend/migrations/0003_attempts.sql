-- Attempt tracking for GATEquest — powers the profile page's activity
-- heatmap and the "solved in the last 7 days" history feed.
-- Run this once against your Neon database after 0001_init.sql and
-- 0002_questions.sql:
--   psql "$DATABASE_URL" -f migrations/0003_attempts.sql

CREATE TABLE IF NOT EXISTS attempts (
    id           SERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id  INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

    -- Whether this particular submission was graded correct. A user can
    -- attempt the same question more than once (retries), so this is an
    -- append-only log rather than one-row-per-question.
    is_correct   BOOLEAN NOT NULL,

    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The profile page's main access patterns: "give me this user's attempts
-- in a date range" (heatmap + history) and "has this user already solved
-- question X" (future: dedupe / streak logic).
CREATE INDEX IF NOT EXISTS idx_attempts_user_time ON attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_user_question ON attempts(user_id, question_id);
