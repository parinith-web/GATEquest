-- Weekly branch-scoped quest contests, plus the account fields they need.
-- Run once against your Neon database:
--   psql "$DATABASE_URL" -f migrations/0004_quests.sql

-- Every account needs a branch to scope "compete with your branch mates"
-- leaderboards server-side (previously this only lived in localStorage).
-- is_admin gates who is allowed to create/close quests.
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- One row per weekly contest. duration_seconds is stored explicitly
-- rather than always assumed to be 3600 so a one-off longer/shorter
-- contest doesn't require a schema change.
CREATE TABLE IF NOT EXISTS quests (
    id               UUID PRIMARY KEY,
    branch           TEXT NOT NULL,
    week_number      INT NOT NULL,
    title            TEXT NOT NULL DEFAULT '',
    starts_at        TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 3600,
    status           TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | closed
    created_by       UUID NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quests_branch_starts ON quests(branch, starts_at);

-- The 25 questions chosen for a given quest, in display order. Reuses
-- the existing question bank rather than duplicating question content.
CREATE TABLE IF NOT EXISTS quest_questions (
    quest_id    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    question_id INT  NOT NULL REFERENCES questions(id),
    order_index INT NOT NULL,
    PRIMARY KEY (quest_id, question_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_questions_order ON quest_questions(quest_id, order_index);

-- A user joining a live contest. Row is created the moment they open
-- the quest for the first time, which is also what timestamps "elapsed
-- since contest start" is measured against for that user if you ever
-- want a personal start clock instead of the global quest starts_at.
CREATE TABLE IF NOT EXISTS quest_participants (
    quest_id  UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (quest_id, user_id)
);

-- Durable, blind-graded submission log. correct is filled in at grading
-- time but is NEVER read back to the user before the quest closes — see
-- internal/quest for the enforcement of that. One row per (quest, user,
-- question): a user may only submit once per question, ever, per the
-- product requirement that they can't retry after seeing... nothing,
-- since they see nothing. That's still enforced here as a hard
-- constraint, not just client-side.
CREATE TABLE IF NOT EXISTS quest_submissions (
    quest_id                    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id                 INT  NOT NULL REFERENCES questions(id),
    answer                      TEXT NOT NULL,
    correct                     BOOLEAN NOT NULL,
    elapsed_seconds             INT NOT NULL, -- seconds since quest start when submitted
    submitted_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (quest_id, user_id, question_id)
);

-- Final settled results, written once at contest close from the Redis
-- snapshot. This (not Redis) is what results pages / rating math read
-- from afterwards.
CREATE TABLE IF NOT EXISTS quest_results (
    quest_id           UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    solved_count       INT NOT NULL,
    time_taken_seconds INT NOT NULL, -- sum of elapsed_seconds over first-correct submissions
    rank               INT NOT NULL, -- 1-indexed, shared on ties (Codeforces-style)
    rating_before      INT NOT NULL,
    rating_after       INT NOT NULL,
    PRIMARY KEY (quest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_results_quest_rank ON quest_results(quest_id, rank);

-- Current rating per user per branch (a user's rating is meaningful
-- only relative to the branch they're competing in).
CREATE TABLE IF NOT EXISTS user_ratings (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch     TEXT NOT NULL,
    rating     INT NOT NULL DEFAULT 1200,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, branch)
);
