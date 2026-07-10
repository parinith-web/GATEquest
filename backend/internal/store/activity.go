package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// RecordAttempt logs one submission of a question by a user. Called from
// the question detail page every time the user hits "Submit answer" —
// retries are logged as separate rows (append-only), which is what lets
// the activity heatmap show a day as active even if every attempt that
// day was eventually wrong.
func (s *Store) RecordAttempt(ctx context.Context, userID uuid.UUID, questionID int, isCorrect bool) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO attempts (user_id, question_id, is_correct, attempted_at)
		 VALUES ($1, $2, $3, now())`,
		userID, questionID, isCorrect,
	)
	return err
}

// DayCount is one cell of the activity heatmap: how many attempts (of
// any correctness) a user made on a given calendar date.
type DayCount struct {
	Date  time.Time
	Count int
}

// GetActivityHeatmap returns one DayCount per day in [from, to] inclusive
// (both dates truncated to UTC midnight), in ascending date order, with
// zero-filled gaps for days with no activity — so the caller can lay it
// straight into a fixed-size grid without doing its own date math.
func (s *Store) GetActivityHeatmap(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]DayCount, error) {
	from = from.Truncate(24 * time.Hour)
	to = to.Truncate(24 * time.Hour)

	rows, err := s.db.Query(ctx,
		`SELECT date_trunc('day', attempted_at) AS day, COUNT(*)
		 FROM attempts
		 WHERE user_id = $1 AND attempted_at >= $2 AND attempted_at < $3
		 GROUP BY day`,
		userID, from, to.AddDate(0, 0, 1),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var day time.Time
		var n int
		if err := rows.Scan(&day, &n); err != nil {
			return nil, err
		}
		counts[day.Format("2006-01-02")] = n
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var out []DayCount
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		out = append(out, DayCount{Date: d, Count: counts[d.Format("2006-01-02")]})
	}
	return out, nil
}

// HistoryItem is one solved-question entry for the profile page's recent
// activity feed — the most recent attempt per question, joined with
// enough question detail to render a feed row without a second fetch.
type HistoryItem struct {
	QuestionID   int
	Subject      string
	Topic        string
	QuestionText string
	IsCorrect    bool
	AttemptedAt  time.Time
}

// GetRecentHistory returns a user's attempts from the last `since`
// duration, most recent first, deduplicated to one row per question (the
// latest attempt on it). Used for the profile page's "solved in the past
// week" feed.
func (s *Store) GetRecentHistory(ctx context.Context, userID uuid.UUID, since time.Duration) ([]HistoryItem, error) {
	cutoff := time.Now().Add(-since)

	rows, err := s.db.Query(ctx,
		`SELECT DISTINCT ON (a.question_id)
		        a.question_id, q.subject, q.topic, q.question_text, a.is_correct, a.attempted_at
		 FROM attempts a
		 JOIN questions q ON q.id = a.question_id
		 WHERE a.user_id = $1 AND a.attempted_at >= $2
		 ORDER BY a.question_id, a.attempted_at DESC`,
		userID, cutoff,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []HistoryItem
	for rows.Next() {
		var h HistoryItem
		if err := rows.Scan(&h.QuestionID, &h.Subject, &h.Topic, &h.QuestionText, &h.IsCorrect, &h.AttemptedAt); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// DISTINCT ON gives us one row per question but ordered by
	// question_id, not recency — re-sort by attempted_at desc so the feed
	// reads newest-first.
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j].AttemptedAt.After(out[j-1].AttemptedAt); j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	return out, nil
}
