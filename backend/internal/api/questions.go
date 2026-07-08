// Package api holds HTTP handlers for the question bank — subjects,
// topics, and the questions themselves — as distinct from internal/auth
// which handles login. Kept separate so this can grow (bookmarks,
// attempts/scoring, discussion) without main.go turning into a junk
// drawer.
package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"gatequest-auth/internal/store"

	"github.com/go-chi/chi/v5"
)

type Handlers struct {
	Store *store.Store
}

func New(st *store.Store) *Handlers {
	return &Handlers{Store: st}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// GET /api/subjects
func (h *Handlers) Subjects(w http.ResponseWriter, r *http.Request) {
	subjects, err := h.Store.ListSubjects(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load subjects")
		return
	}
	writeJSON(w, http.StatusOK, subjects)
}

// GET /api/topics?subject=Computer+Science
func (h *Handlers) Topics(w http.ResponseWriter, r *http.Request) {
	subject := r.URL.Query().Get("subject")
	if subject == "" {
		writeError(w, http.StatusBadRequest, "subject query param is required")
		return
	}
	topics, err := h.Store.ListTopics(r.Context(), subject)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load topics")
		return
	}
	writeJSON(w, http.StatusOK, topics)
}

// questionListItem is the shape returned for list views. It deliberately
// omits correct_option/correct_answer/theory_text so browsing a topic's
// question list doesn't leak answers before the user attempts it — the
// full Question (with answers) is only served from GetQuestion below,
// for the single-question practice page after the user has already
// selected/submitted an answer client-side, or is ready to check it.
type questionListItem struct {
	ID           int      `json:"id"`
	Subject      string   `json:"subject"`
	Topic        string   `json:"topic"`
	Type         string   `json:"type"`
	QuestionText string   `json:"questionText"`
	Difficulty   *string  `json:"difficulty"`
	ExamYear     *int     `json:"examYear"`
	Marks        *float64 `json:"marks"`
}

// GET /api/questions?subject=...&topic=...&type=mcq&difficulty=Easy&limit=20&offset=0
func (h *Handlers) ListQuestions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	filter := store.QuestionFilter{
		Subject:    q.Get("subject"),
		Topic:      q.Get("topic"),
		Type:       q.Get("type"),
		Difficulty: q.Get("difficulty"),
		Limit:      limit,
		Offset:     offset,
	}

	questions, err := h.Store.ListQuestions(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load questions")
		return
	}

	out := make([]questionListItem, 0, len(questions))
	for _, ques := range questions {
		out = append(out, questionListItem{
			ID:           ques.ID,
			Subject:      ques.Subject,
			Topic:        ques.Topic,
			Type:         ques.Type,
			QuestionText: ques.QuestionText,
			Difficulty:   ques.Difficulty,
			ExamYear:     ques.ExamYear,
			Marks:        ques.Marks,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// GET /api/questions/{id}
// Returns the full question, including options, correct answer, and
// theory snippet — everything the Question detail page needs.
func (h *Handlers) GetQuestion(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question id")
		return
	}

	question, err := h.Store.GetQuestion(r.Context(), id)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "question not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load question")
		return
	}
	writeJSON(w, http.StatusOK, question)
}
