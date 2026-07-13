-- Pulse Debrief: the temporary, branch-scoped chat room that opens once
-- a weekly quest contest closes. Deliberately reuses `quests` as the
-- room identity instead of introducing a separate "rooms" table:
--
--   - quests.branch already scopes CSE/ECE/ME/etc separately, so a
--     debrief room is automatically unique per branch per week with no
--     extra column here.
--   - quests.closed_at (set atomically by quest.Scheduler.Close, see
--     internal/store/quest.go) is the anchor for the room's open
--     window: [closed_at, closed_at + 12h). Service-layer code is what
--     enforces that window on read/write — this table just stores the
--     messages themselves.
--   - Because a room is only ever resolved server-side from the
--     caller's own branch (never accepted as a client-supplied
--     quest_id), a user has no way to address, or even discover the
--     existence of, another branch's room.
--
-- Run once against your Neon database after the earlier migrations:
--   psql "$DATABASE_URL" -f migrations/0008_pulse_debrief.sql

CREATE TABLE IF NOT EXISTS debrief_messages (
    id         UUID PRIMARY KEY,
    quest_id   UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Plain text only — this room intentionally has no media/attachment
    -- support (matches the mock frontend's composer). Capped to match
    -- the client-side maxLength on the message box.
    content    TEXT NOT NULL CHECK (char_length(content) <= 300),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary read pattern: "give me everything in room X newer than
-- message Y" (both the initial load and every subsequent poll/catch-up
-- after an SSE reconnect). DESC isn't needed since callers page forward
-- from a cursor, not backward from "now".
CREATE INDEX IF NOT EXISTS idx_debrief_messages_quest_created
    ON debrief_messages(quest_id, created_at);

-- Batched cleanup (Session 6) deletes across every quest whose window
-- has lapsed in a single statement — this index is what keeps that
-- DELETE ... WHERE quest_id = ANY($1) AND created_at < ... cheap even
-- with ~30 branches' worth of rooms expiring in the same run.
CREATE INDEX IF NOT EXISTS idx_debrief_messages_created_at
    ON debrief_messages(created_at);
