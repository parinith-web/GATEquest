package store

import (
	"context"

	"github.com/google/uuid"
)

// normalizeDifficulty buckets a raw (possibly nil/unrecognized) question
// difficulty into one of the three tiers the profile page's solved
// counter shows. Mirrors xpForDifficulty's fallback in activity.go:
// anything missing or unrecognized counts as Medium rather than being
// dropped, so the Easy+Medium+Hard totals always add up to the full
// question bank size.
func normalizeDifficulty(difficulty string) string {
	switch difficulty {
	case "Easy":
		return "Easy"
	case "Hard":
		return "Hard"
	default:
		return "Medium"
	}
}

// DifficultyCount is solved-vs-total for one difficulty tier.
type DifficultyCount struct {
	Solved int
	Total  int
}

// SolveProgress is everything the profile page's LeetCode-style solved
// counter needs: how many distinct questions the user has solved
// correctly (at least once, ever — not just recently) versus how many
// exist, broken down by difficulty, plus how many questions are
// "in progress" (attempted at least once, never yet solved).
type SolveProgress struct {
	Easy       DifficultyCount
	Medium     DifficultyCount
	Hard       DifficultyCount
	Attempting int
}

func (p SolveProgress) TotalSolved() int {
	return p.Easy.Solved + p.Medium.Solved + p.Hard.Solved
}

func (p SolveProgress) TotalQuestions() int {
	return p.Easy.Total + p.Medium.Total + p.Hard.Total
}

// GetSolveProgress computes SolveProgress for one user, optionally
// scoped to a single subject (pass "" to total across every subject,
// same convention as GetXP).
func (s *Store) GetSolveProgress(ctx context.Context, userID uuid.UUID, subject string) (SolveProgress, error) {
	var progress SolveProgress
	totals := map[string]int{}
	solved := map[string]int{}

	// Total questions in the bank per difficulty tier.
	totalRows, err := s.db.Query(ctx,
		`SELECT difficulty, COUNT(*)
		 FROM questions
		 WHERE ($1 = '' OR subject = $1)
		 GROUP BY difficulty`,
		subject,
	)
	if err != nil {
		return progress, err
	}
	for totalRows.Next() {
		var difficulty *string
		var n int
		if err := totalRows.Scan(&difficulty, &n); err != nil {
			totalRows.Close()
			return progress, err
		}
		d := ""
		if difficulty != nil {
			d = *difficulty
		}
		totals[normalizeDifficulty(d)] += n
	}
	if err := totalRows.Err(); err != nil {
		totalRows.Close()
		return progress, err
	}
	totalRows.Close()

	// Distinct questions this user has solved correctly at least once,
	// per difficulty tier. DISTINCT so retries (or an initial wrong
	// attempt followed by a correct one) don't double-count a question.
	solvedRows, err := s.db.Query(ctx,
		`SELECT q.difficulty, COUNT(DISTINCT a.question_id)
		 FROM attempts a
		 JOIN questions q ON q.id = a.question_id
		 WHERE a.user_id = $1 AND a.is_correct = true
		   AND ($2 = '' OR q.subject = $2)
		 GROUP BY q.difficulty`,
		userID, subject,
	)
	if err != nil {
		return progress, err
	}
	for solvedRows.Next() {
		var difficulty *string
		var n int
		if err := solvedRows.Scan(&difficulty, &n); err != nil {
			solvedRows.Close()
			return progress, err
		}
		d := ""
		if difficulty != nil {
			d = *difficulty
		}
		solved[normalizeDifficulty(d)] += n
	}
	if err := solvedRows.Err(); err != nil {
		solvedRows.Close()
		return progress, err
	}
	solvedRows.Close()

	progress.Easy = DifficultyCount{Solved: solved["Easy"], Total: totals["Easy"]}
	progress.Medium = DifficultyCount{Solved: solved["Medium"], Total: totals["Medium"]}
	progress.Hard = DifficultyCount{Solved: solved["Hard"], Total: totals["Hard"]}

	// "Attempting": questions the user has tried at least once but never
	// answered correctly — attempted minus solved, at the question level.
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT a.question_id)
		 FROM attempts a
		 JOIN questions q ON q.id = a.question_id
		 WHERE a.user_id = $1
		   AND ($2 = '' OR q.subject = $2)
		   AND a.question_id NOT IN (
		     SELECT a2.question_id FROM attempts a2
		     WHERE a2.user_id = $1 AND a2.is_correct = true
		   )`,
		userID, subject,
	).Scan(&progress.Attempting); err != nil {
		return progress, err
	}

	return progress, nil
}
