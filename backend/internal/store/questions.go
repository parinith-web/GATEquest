package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// Question mirrors one row of the `questions` table. Pointer fields are
// nullable in the DB (e.g. a "mcq" row has no correct_answer, a "nat"
// row has no options).
type Question struct {
	ID              int
	QuestionNumber  *int
	Subject         string
	Topic           string
	Type            string // "mcq", "msq", or "nat"
	QuestionText    string
	OptionA         *string
	OptionB         *string
	OptionC         *string
	OptionD         *string
	CorrectOption   *string
	CorrectAnswer   *string
	AnswerTolerance *string
	Difficulty      *string
	ExamYear        *int
	Marks           *float64
	Tags            *string
	TheoryTitle     *string
	TheoryText      *string
	NeedsReview     bool
	ReviewReason    *string
}

// TopicCount is one entry in the topic list for a subject, with how many
// questions exist under it — enough for the sidebar filter UI.
type TopicCount struct {
	Topic string
	Count int
}

var questionColumns = `
	id, question_number, subject, topic, type, question_text,
	option_a, option_b, option_c, option_d,
	correct_option, correct_answer, answer_tolerance,
	difficulty, exam_year, marks, tags,
	theory_title, theory_text, needs_review, review_reason
`

func scanQuestion(row interface {
	Scan(dest ...any) error
}) (*Question, error) {
	var q Question
	if err := row.Scan(
		&q.ID, &q.QuestionNumber, &q.Subject, &q.Topic, &q.Type, &q.QuestionText,
		&q.OptionA, &q.OptionB, &q.OptionC, &q.OptionD,
		&q.CorrectOption, &q.CorrectAnswer, &q.AnswerTolerance,
		&q.Difficulty, &q.ExamYear, &q.Marks, &q.Tags,
		&q.TheoryTitle, &q.TheoryText, &q.NeedsReview, &q.ReviewReason,
	); err != nil {
		return nil, err
	}
	return &q, nil
}

// ListSubjects returns every distinct subject that has at least one
// question, e.g. ["Computer Science", "Data Science and Artificial
// Intelligence", "General Aptitude"].
func (s *Store) ListSubjects(ctx context.Context) ([]string, error) {
	rows, err := s.db.Query(ctx, `SELECT DISTINCT subject FROM questions ORDER BY subject`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subjects []string
	for rows.Next() {
		var subj string
		if err := rows.Scan(&subj); err != nil {
			return nil, err
		}
		subjects = append(subjects, subj)
	}
	return subjects, rows.Err()
}

// ListTopics returns every topic within a subject along with how many
// questions it has, ordered by topic name — this is what feeds the
// "Topics" sidebar filter (e.g. Operating System, Databases, ...).
func (s *Store) ListTopics(ctx context.Context, subject string) ([]TopicCount, error) {
	rows, err := s.db.Query(ctx,
		`SELECT topic, COUNT(*) FROM questions WHERE subject = $1 GROUP BY topic ORDER BY topic`,
		subject,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var topics []TopicCount
	for rows.Next() {
		var tc TopicCount
		if err := rows.Scan(&tc.Topic, &tc.Count); err != nil {
			return nil, err
		}
		topics = append(topics, tc)
	}
	return topics, rows.Err()
}

// QuestionFilter narrows ListQuestions. Zero-value fields ("") are
// treated as "don't filter on this".
type QuestionFilter struct {
	Subject    string
	Topic      string
	Type       string // "mcq" | "msq" | "nat"
	Difficulty string
	Limit      int // 0 defaults to 20
	Offset     int
}

// ListQuestions returns questions matching the filter, newest-inserted
// first is not meaningful here so we order by id for stable pagination.
func (s *Store) ListQuestions(ctx context.Context, f QuestionFilter) ([]*Question, error) {
	limit := f.Limit
	if limit <= 0 {
		limit = 20
	}

	query := `SELECT ` + questionColumns + ` FROM questions WHERE 1=1`
	var args []any
	arg := func(v any) string {
		args = append(args, v)
		return "$" + itoa(len(args))
	}

	if f.Subject != "" {
		query += ` AND subject = ` + arg(f.Subject)
	}
	if f.Topic != "" {
		query += ` AND topic = ` + arg(f.Topic)
	}
	if f.Type != "" {
		query += ` AND type = ` + arg(f.Type)
	}
	if f.Difficulty != "" {
		query += ` AND difficulty = ` + arg(f.Difficulty)
	}
	query += ` ORDER BY id LIMIT ` + arg(limit) + ` OFFSET ` + arg(f.Offset)

	rows, err := s.db.Query(ctx, query, args...)
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

// GetQuestion fetches a single question by id (used by the question
// detail page).
func (s *Store) GetQuestion(ctx context.Context, id int) (*Question, error) {
	row := s.db.QueryRow(ctx, `SELECT `+questionColumns+` FROM questions WHERE id = $1`, id)
	q, err := scanQuestion(row)
	if err != nil {
		if isNoRows(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return q, nil
}

func isNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

// itoa avoids importing strconv just for this file's small int-to-string
// needs in query building.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
