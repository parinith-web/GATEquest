// Pulse Debrief: the store layer for the temporary, branch-scoped chat
// room that opens once a weekly quest contest closes (see
// migrations/0008_pulse_debrief.sql for the schema and the reasoning
// behind reusing `quests` as the room identity instead of a separate
// "rooms" table).
//
// Nothing in this file enforces the 12h window or branch isolation on
// its own — GetActiveQuestForBranch is the one place that time math
// happens, and it's deliberately the *only* way a room is resolved here.
// There is no "get quest by arbitrary ID" helper in this file; the
// service layer (Session 3) must always go through GetActiveQuestForBranch
// with the caller's own branch, never a client-supplied quest_id.
package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DebriefWindow is how long a debrief room stays open after its quest
// closes — matches the product spec (contest ends, room is open for the
// following 12 hours).
const DebriefWindow = 12 * time.Hour

// DebriefMessage is one chat message in a branch's debrief room, with
// enough author info denormalized in that the frontend never needs a
// second round trip to render a message bubble (same reasoning as
// Post/postSelectColumns in pulse.go).
type DebriefMessage struct {
	ID           uuid.UUID
	QuestID      uuid.UUID
	UserID       uuid.UUID
	AuthorName   string
	AuthorAvatar string
	Content      string
	CreatedAt    time.Time
}

const debriefMessageColumns = `
	dm.id, dm.quest_id, dm.user_id, u.name, u.avatar_url, dm.content, dm.created_at`

func scanDebriefMessage(row interface{ Scan(dest ...any) error }) (*DebriefMessage, error) {
	var m DebriefMessage
	if err := row.Scan(
		&m.ID, &m.QuestID, &m.UserID, &m.AuthorName, &m.AuthorAvatar, &m.Content, &m.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &m, nil
}

// GetActiveQuestForBranch returns the quest whose debrief room is
// currently open for branch, i.e. a closed quest with
// now in [closed_at, closed_at + DebriefWindow). Returns ErrNotFound if
// no such quest exists (room not open yet, already expired, or the
// branch simply has no closed quest) — the service layer turns that
// into a 404, never a leak of "here's the most recent closed quest
// anyway".
//
// A branch can only ever have zero or one quest in this state at a time
// (weekly cadence, 12h window << the week between contests), but the
// query doesn't assume that — it takes the most recently closed one
// that still qualifies, just in case.
func (s *Store) GetActiveQuestForBranch(ctx context.Context, branch string, now time.Time) (*Quest, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+questColumns+`
		 FROM quests
		 WHERE branch = $1
		   AND status = $2
		   AND closed_at IS NOT NULL
		   AND $3 >= closed_at
		   AND $3 < closed_at + ($4 * interval '1 second')
		 ORDER BY closed_at DESC
		 LIMIT 1`,
		// DebriefWindow is passed as a plain number of seconds (not the
		// Go time.Duration value itself) and turned into an interval in
		// SQL — pgx has no built-in time.Duration -> interval mapping,
		// same reasoning as duration_seconds in quest.go's scheduler
		// queries.
		branch, QuestStatusClosed, now, DebriefWindow.Seconds(),
	)
	q, err := scanQuest(row)
	if err != nil {
		if isNoRows(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return q, nil
}

// InsertDebriefMessage writes a new chat message and returns it with
// author info attached, ready to hand straight to the broadcaster
// (Session 5) and the HTTP response (Session 4) without a second query
// on the caller's part.
//
// Deliberately takes no "is the room still open" flag — that check
// belongs to the service layer, which should call
// GetActiveQuestForBranch immediately before this to confirm the window
// (and branch match) rather than trusting a quest_id it resolved a
// while ago.
func (s *Store) InsertDebriefMessage(ctx context.Context, questID, userID uuid.UUID, content string) (*DebriefMessage, error) {
	id := uuid.New()
	createdAt := time.Now()

	_, err := s.db.Exec(ctx,
		`INSERT INTO debrief_messages (id, quest_id, user_id, content, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		id, questID, userID, content, createdAt,
	)
	if err != nil {
		return nil, err
	}
	return s.GetDebriefMessage(ctx, id)
}

// GetDebriefMessage fetches a single message by ID, author info joined
// in. Used right after InsertDebriefMessage so the insert path and the
// list path (below) always build a DebriefMessage the same way.
func (s *Store) GetDebriefMessage(ctx context.Context, id uuid.UUID) (*DebriefMessage, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+debriefMessageColumns+`
		 FROM debrief_messages dm
		 JOIN users u ON u.id = dm.user_id
		 WHERE dm.id = $1`,
		id,
	)
	m, err := scanDebriefMessage(row)
	if err != nil {
		if isNoRows(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return m, nil
}

// ListDebriefMessagesSince returns every message in questID's room
// created strictly after `since`, oldest first — the shape both the
// initial page load (since = the room's opens_at, or any zero-value
// time) and every SSE reconnect catch-up (since = last message the
// client already has) need.
func (s *Store) ListDebriefMessagesSince(ctx context.Context, questID uuid.UUID, since time.Time) ([]*DebriefMessage, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+debriefMessageColumns+`
		 FROM debrief_messages dm
		 JOIN users u ON u.id = dm.user_id
		 WHERE dm.quest_id = $1 AND dm.created_at > $2
		 ORDER BY dm.created_at ASC`,
		questID, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*DebriefMessage
	for rows.Next() {
		m, err := scanDebriefMessage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// DeleteExpiredDebriefMessages purges messages belonging to any quest
// whose debrief window has fully lapsed (closed_at + DebriefWindow <=
// now). Written as a single statement driven by a subquery on `quests`
// rather than "list expired quest IDs, then loop a DELETE per ID" —
// with up to ~30 branches' rooms expiring in the same 7:30am run (see
// migration comment / plan discussion), one round trip matters more
// than it would for a single room.
//
// Returns the number of messages deleted, mainly for logging/metrics
// from the cleanup job (Session 6) — callers aren't expected to branch
// on it.
func (s *Store) DeleteExpiredDebriefMessages(ctx context.Context, now time.Time) (int64, error) {
	tag, err := s.db.Exec(ctx,
		`DELETE FROM debrief_messages
		 WHERE quest_id IN (
		     SELECT id FROM quests
		     WHERE status = $1
		       AND closed_at IS NOT NULL
		       AND closed_at + ($2 * interval '1 second') <= $3
		 )`,
		QuestStatusClosed, DebriefWindow.Seconds(), now,
	)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
