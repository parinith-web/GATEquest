-- Questions bank for GATEquest (GATE CS + Data Science & AI + General Aptitude).
-- Run this once against your Neon database after 0001_init.sql:
--   psql "$DATABASE_URL" -f migrations/0002_questions.sql

CREATE TABLE IF NOT EXISTS questions (
    id               SERIAL PRIMARY KEY,

    -- Original row number from the source CSV, kept for traceability
    -- back to the spreadsheet (not unique across subjects on its own).
    question_number  INT,

    -- e.g. "Computer Science", "Data Science and Artificial Intelligence",
    -- "General Aptitude". This is the top-level branch filter.
    subject          TEXT NOT NULL,

    -- e.g. "Operating System", "Databases", "Machine Learning".
    -- This is the topic filter within a subject.
    topic            TEXT NOT NULL,

    -- "mcq" (single correct option), "msq" (multiple correct options),
    -- or "nat" (numerical answer type, no options).
    type             TEXT NOT NULL CHECK (type IN ('mcq', 'msq', 'nat')),

    question_text    TEXT NOT NULL,
    option_a         TEXT,
    option_b         TEXT,
    option_c         TEXT,
    option_d         TEXT,

    -- For mcq: single letter "A"-"D". For msq: comma-separated letters,
    -- e.g. "A,C". NULL for nat.
    correct_option   TEXT,

    -- For nat: the numeric answer as text (so "3.14" or "-2" round-trip
    -- exactly). NULL for mcq/msq.
    correct_answer   TEXT,

    -- For nat: allowed +/- tolerance when grading, e.g. "0.05". NULL if
    -- an exact match is required.
    answer_tolerance TEXT,

    difficulty       TEXT,
    exam_year        INT,
    marks            NUMERIC,

    -- Free-form tags from the source sheet, e.g. "PYQ;GATE 2023".
    -- Stored as-is; split on ';' in application code if you need a list.
    tags             TEXT,

    theory_title     TEXT,
    theory_text      TEXT,

    needs_review     BOOLEAN NOT NULL DEFAULT false,
    review_reason    TEXT,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The frontend's main access pattern is "give me topic X within subject Y",
-- so that pair is the primary index.
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON questions(subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
