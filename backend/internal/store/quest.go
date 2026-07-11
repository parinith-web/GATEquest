// Quest contest lifecycle: pure Postgres reads/writes only. Nothing in
// this file talks to Redis — that combination (grading, live
// leaderboard updates, close/rating orchestration) lives one layer up
// in internal/quest, which composes *Store with *quest.Redis. Keeping
// this file Redis-free means the contest data model can be tested and
// reasoned about without a live Redis connection.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// QuestsPerContest is the fixed question count a quest is created with —
// "admin uploads 25 Qs Sat night" is a product decision, not just a
// default, so CreateQuest enforces it rather than silently accepting
// any length.
const QuestsPerContest = 25

// Quest statuses. A quest moves scheduled -> live -> closed, always in
// that order, driven by internal/quest.Scheduler comparing StartsAt /
// DurationSeconds against wall-clock time (see that package for the
// "automatic, server times it and closes itself" transition logic).
const (
	QuestStatusScheduled = "scheduled"
	QuestStatusLive      = "live"
	QuestStatusClosed    = "closed"
)

// DefaultRating is the starting rating for a branch a user has never
// competed in before — matches the DEFAULT on user_ratings.rating.
const DefaultRating = 1200

// Quest is one weekly branch-scoped contest.
type Quest struct {
	ID              uuid.UUID
	Branch          string
	WeekNumber      int
	Title           string
	StartsAt        time.Time
	DurationSeconds int
	Status          string
	CreatedBy       uuid.UUID
	CreatedAt       time.Time
	ClosedAt        *time.Time
}

// EndsAt is StartsAt + DurationSeconds — when a live quest should close.
func (q *Quest) EndsAt() time.Time {
	return q.StartsAt.Add(time.Duration(q.DurationSeconds) * time.Second)
}

// QuestResult is one settled row of quest_results: a single user's
// final standing (and rating change) in a closed quest.
type QuestResult struct {
	QuestID          uuid.UUID
	UserID           uuid.UUID
	SolvedCount      int
	TimeTakenSeconds int
	Rank             int
	RatingBefore     int
	RatingAfter      int
}

// QuestHistoryEntry is one row of a user's rating history — a settled
// quest plus how they did in it. Used by the "user rating history"
// endpoint (Category 4).
type QuestHistoryEntry struct {
	Quest  Quest
	Result QuestResult
}

var questColumns = `id, branch, week_number, title, starts_at, duration_seconds, status, created_by, created_at, closed_at`

func scanQuest(row interface{ Scan(dest ...any) error }) (*Quest, error) {
	var q Quest
	if err := row.Scan(
		&q.ID, &q.Branch, &q.WeekNumber, &q.Title, &q.StartsAt, &q.DurationSeconds,
		&q.Status, &q.CreatedBy, &q.CreatedAt, &q.ClosedAt,
	); err != nil {
		return nil, err
	}
	return &q, nil
}

// --- Quest creation & lookup --------------------------------------------

// CreateQuest inserts a new quest plus its fixed set of QuestsPerContest
// questions (in the given order) in a single transaction — either the
// whole contest is created with all its questions, or nothing is. The
// quest starts out "scheduled"; internal/quest.Scheduler flips it to
// "live" once StartsAt arrives.
func (s *Store) CreateQuest(ctx context.Context, branch, title string, weekNumber int, startsAt time.Time, durationSeconds int, createdBy uuid.UUID, questionIDs []int) (*Quest, error) {
	if len(questionIDs) != QuestsPerContest {
		return nil, ErrInvalidQuestionCount
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) // no-op once committed

	q := &Quest{
		ID:              uuid.New(),
		Branch:          branch,
		WeekNumber:      weekNumber,
		Title:           title,
		StartsAt:        startsAt,
		DurationSeconds: durationSeconds,
		Status:          QuestStatusScheduled,
		CreatedBy:       createdBy,
		CreatedAt:       time.Now(),
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO quests (id, branch, week_number, title, starts_at, duration_seconds, status, created_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		q.ID, q.Branch, q.WeekNumber, q.Title, q.StartsAt, q.DurationSeconds, q.Status, q.CreatedBy, q.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	for i, questionID := range questionIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO quest_questions (quest_id, question_id, order_index) VALUES ($1, $2, $3)`,
			q.ID, questionID, i,
		); err != nil {
			// Most likely cause: a duplicate question ID in the input, or a
			// question ID that doesn't exist — surfaced as-is (wrapped by
			// the caller) rather than papered over, since a partially-built
			// quest is worse than a rejected create.
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return q, nil
}

func (s *Store) GetQuest(ctx context.Context, id uuid.UUID) (*Quest, error) {
	row := s.db.QueryRow(ctx, `SELECT `+questColumns+` FROM quests WHERE id = $1`, id)
	q, err := scanQuest(row)
	if err != nil {
		if isNoRows(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return q, nil
}

// ListQuests returns every quest for a branch, most recent first — the
// quest list page's data source.
func (s *Store) ListQuests(ctx context.Context, branch string) ([]*Quest, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+questColumns+` FROM quests WHERE branch = $1 ORDER BY starts_at DESC`, branch)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Quest
	for rows.Next() {
		q, err := scanQuest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// ListScheduledQuestsPastStart returns "scheduled" quests whose
// starts_at has arrived — candidates for the scheduler to flip to
// "live".
func (s *Store) ListScheduledQuestsPastStart(ctx context.Context, now time.Time) ([]*Quest, error) {
	return s.listQuestsByStatusBefore(ctx, QuestStatusScheduled, `starts_at <= $2`, now)
}

// ListLiveQuestsPastEnd returns "live" quests whose starts_at +
// duration_seconds has passed — candidates for the scheduler to close.
func (s *Store) ListLiveQuestsPastEnd(ctx context.Context, now time.Time) ([]*Quest, error) {
	return s.listQuestsByStatusBefore(ctx, QuestStatusLive, `starts_at + (duration_seconds * interval '1 second') <= $2`, now)
}

func (s *Store) listQuestsByStatusBefore(ctx context.Context, status, cond string, now time.Time) ([]*Quest, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+questColumns+` FROM quests WHERE status = $1 AND `+cond, status, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Quest
	for rows.Next() {
		q, err := scanQuest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// MarkQuestLive transitions a quest from scheduled to live. Scoped to
// status = 'scheduled' in the WHERE clause so a concurrent double-run of
// the scheduler can't double-transition it; RowsAffected == 0 just means
// someone else already did it (not an error).
func (s *Store) MarkQuestLive(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`UPDATE quests SET status = $1 WHERE id = $2 AND status = $3`,
		QuestStatusLive, id, QuestStatusScheduled)
	return err
}

// MarkQuestClosed transitions a quest from live to closed and stamps
// closed_at. Same concurrency-safety reasoning as MarkQuestLive.
func (s *Store) MarkQuestClosed(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`UPDATE quests SET status = $1, closed_at = $2 WHERE id = $3 AND status = $4`,
		QuestStatusClosed, time.Now(), id, QuestStatusLive)
	return err
}

// --- Quest questions -----------------------------------------------------

// ListQuestQuestions returns the QuestsPerContest questions belonging to
// a quest, in display order. Reuses the question bank's own row shape
// (scanQuestion/questionColumns from questions.go) since quest questions
// are just a curated, ordered subset of the existing bank — including
// their correct-answer fields, which callers MUST NOT forward to a
// participant before the quest closes (see internal/quest.Service.Submit
// for the one place grading is allowed to look at them).
func (s *Store) ListQuestQuestions(ctx context.Context, questID uuid.UUID) ([]*Question, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+questionColumns+`
		 FROM quest_questions qq JOIN questions ON questions.id = qq.question_id
		 WHERE qq.quest_id = $1
		 ORDER BY qq.order_index`,
		questID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Question
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// QuestHasQuestion reports whether questionID is one of questID's
// QuestsPerContest questions — checked before grading a submission so a
// participant can't submit an answer for a question outside the quest.
func (s *Store) QuestHasQuestion(ctx context.Context, questID uuid.UUID, questionID int) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM quest_questions WHERE quest_id = $1 AND question_id = $2)`,
		questID, questionID,
	).Scan(&exists)
	return exists, err
}

// --- Participants ----------------------------------------------------------

// JoinQuest records userID as a participant of questID. Idempotent — a
// user re-opening a quest they already joined is a no-op, not an error.
func (s *Store) JoinQuest(ctx context.Context, questID, userID uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO quest_participants (quest_id, user_id) VALUES ($1, $2)
		 ON CONFLICT (quest_id, user_id) DO NOTHING`,
		questID, userID,
	)
	return err
}

func (s *Store) IsParticipant(ctx context.Context, questID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM quest_participants WHERE quest_id = $1 AND user_id = $2)`,
		questID, userID,
	).Scan(&exists)
	return exists, err
}

// ListParticipantIDs returns every user who joined a quest — the input
// list for both Close() (who to settle) and the live leaderboard (whose
// Redis keys to expire afterwards).
func (s *Store) ListParticipantIDs(ctx context.Context, questID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := s.db.Query(ctx,
		`SELECT user_id FROM quest_participants WHERE quest_id = $1`, questID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// --- Submissions -------------------------------------------------------

// RecordSubmission durably logs a graded submission. It is the single
// source of truth for "did this user answer this question, and was it
// right" — correct is stored but must never be read back to the
// submitting user before the quest closes (enforced by callers in
// internal/quest, not here). Returns inserted = false (no error) if the
// user already had a submission for this question, since a question may
// only be answered once — the caller uses that to reject a resubmission
// attempt without a racy read-then-write.
func (s *Store) RecordSubmission(ctx context.Context, questID, userID uuid.UUID, questionID int, answer string, correct bool, elapsedSeconds int) (inserted bool, err error) {
	tag, err := s.db.Exec(ctx,
		`INSERT INTO quest_submissions (quest_id, user_id, question_id, answer, correct, elapsed_seconds)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (quest_id, user_id, question_id) DO NOTHING`,
		questID, userID, questionID, answer, correct, elapsedSeconds,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// --- Results & ratings ---------------------------------------------------

// WriteQuestResults replaces (deletes then bulk-inserts) every
// quest_results row for a quest inside one transaction. Delete-then-
// insert rather than upsert-per-row because Close() computes the full
// standings snapshot in memory and should overwrite any previous
// (partial/failed) settle attempt wholesale rather than merge with it.
func (s *Store) WriteQuestResults(ctx context.Context, questID uuid.UUID, results []QuestResult) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM quest_results WHERE quest_id = $1`, questID); err != nil {
		return err
	}
	for _, r := range results {
		if _, err := tx.Exec(ctx,
			`INSERT INTO quest_results (quest_id, user_id, solved_count, time_taken_seconds, rank, rating_before, rating_after)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			questID, r.UserID, r.SolvedCount, r.TimeTakenSeconds, r.Rank, r.RatingBefore, r.RatingAfter,
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// UpdateQuestResultRating sets the settled rating_after for one user's
// result row — called by the rating batch job once it's computed the
// pairwise-Elo outcome, separately from WriteQuestResults because rating
// math needs the full standings to already be written (and readable)
// first.
func (s *Store) UpdateQuestResultRating(ctx context.Context, questID, userID uuid.UUID, ratingAfter int) error {
	_, err := s.db.Exec(ctx,
		`UPDATE quest_results SET rating_after = $1 WHERE quest_id = $2 AND user_id = $3`,
		ratingAfter, questID, userID)
	return err
}

// GetQuestResults returns the settled standings for a closed quest,
// best rank first — the results page's data source.
func (s *Store) GetQuestResults(ctx context.Context, questID uuid.UUID) ([]*QuestResult, error) {
	rows, err := s.db.Query(ctx,
		`SELECT quest_id, user_id, solved_count, time_taken_seconds, rank, rating_before, rating_after
		 FROM quest_results WHERE quest_id = $1 ORDER BY rank`,
		questID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*QuestResult
	for rows.Next() {
		var r QuestResult
		if err := rows.Scan(&r.QuestID, &r.UserID, &r.SolvedCount, &r.TimeTakenSeconds, &r.Rank, &r.RatingBefore, &r.RatingAfter); err != nil {
			return nil, err
		}
		out = append(out, &r)
	}
	return out, rows.Err()
}

// GetUserRating returns a user's current rating for a branch, or
// DefaultRating if they've never had one written (i.e. never finished a
// quest in that branch yet) — never an error for "no rows", since an
// unrated user is the normal starting state, not a failure.
func (s *Store) GetUserRating(ctx context.Context, userID uuid.UUID, branch string) (int, error) {
	var rating int
	err := s.db.QueryRow(ctx,
		`SELECT rating FROM user_ratings WHERE user_id = $1 AND branch = $2`, userID, branch,
	).Scan(&rating)
	if err != nil {
		if isNoRows(err) {
			return DefaultRating, nil
		}
		return 0, err
	}
	return rating, nil
}

// UpsertUserRating sets a user's current rating for a branch, creating
// the row on their first settled quest in that branch.
func (s *Store) UpsertUserRating(ctx context.Context, userID uuid.UUID, branch string, rating int) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO user_ratings (user_id, branch, rating, updated_at) VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, branch) DO UPDATE SET rating = $3, updated_at = $4`,
		userID, branch, rating, time.Now(),
	)
	return err
}

// questHistoryColumns qualifies quests' columns with the "qu" alias used
// in GetUserQuestHistory's join, plus the quest_results columns tacked
// on — written out explicitly (rather than derived from questColumns by
// string surgery) so the two stay easy to read side by side.
const questHistoryColumns = `qu.id, qu.branch, qu.week_number, qu.title, qu.starts_at, qu.duration_seconds,
	qu.status, qu.created_by, qu.created_at, qu.closed_at,
	qr.solved_count, qr.time_taken_seconds, qr.rank, qr.rating_before, qr.rating_after`

// GetUserQuestHistory returns every closed quest a user has a result in,
// most recent first — the "user rating history" view.
func (s *Store) GetUserQuestHistory(ctx context.Context, userID uuid.UUID) ([]*QuestHistoryEntry, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+questHistoryColumns+`
		 FROM quest_results qr
		 JOIN quests qu ON qu.id = qr.quest_id
		 WHERE qr.user_id = $1
		 ORDER BY qu.starts_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*QuestHistoryEntry
	for rows.Next() {
		var e QuestHistoryEntry
		if err := rows.Scan(
			&e.Quest.ID, &e.Quest.Branch, &e.Quest.WeekNumber, &e.Quest.Title, &e.Quest.StartsAt, &e.Quest.DurationSeconds,
			&e.Quest.Status, &e.Quest.CreatedBy, &e.Quest.CreatedAt, &e.Quest.ClosedAt,
			&e.Result.SolvedCount, &e.Result.TimeTakenSeconds, &e.Result.Rank, &e.Result.RatingBefore, &e.Result.RatingAfter,
		); err != nil {
			return nil, err
		}
		e.Result.QuestID = e.Quest.ID
		e.Result.UserID = userID
		out = append(out, &e)
	}
	return out, rows.Err()
}

// --- Errors --------------------------------------------------------------

// ErrInvalidQuestionCount is returned by CreateQuest when the caller
// didn't supply exactly QuestsPerContest question IDs.
var ErrInvalidQuestionCount = errors.New("a quest must have exactly 25 questions")
