// Quest HTTP handlers: create/list quests, join, blind submit, live
// leaderboard, post-close results, and rating history. Thin over
// internal/quest.Service — this file's job is request parsing, auth
// context, and DTO shaping; the actual blind-grading/ranking/rating
// rules live in Service so they're enforced the same way regardless of
// caller.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/quest"
	"gatequest-auth/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// --- DTOs ------------------------------------------------------------

// questSummaryDTO is one row of a quest list — enough to render a card
// (title, when, status) without loading its 25 questions.
type questSummaryDTO struct {
	ID              string `json:"id"`
	Branch          string `json:"branch"`
	WeekNumber      int    `json:"weekNumber"`
	Title           string `json:"title"`
	StartsAt        string `json:"startsAt"` // RFC3339
	DurationSeconds int    `json:"durationSeconds"`
	Status          string `json:"status"`
}

func toQuestSummaryDTO(q *store.Quest) questSummaryDTO {
	return questSummaryDTO{
		ID:              q.ID.String(),
		Branch:          q.Branch,
		WeekNumber:      q.WeekNumber,
		Title:           q.Title,
		StartsAt:        q.StartsAt.Format(time.RFC3339),
		DurationSeconds: q.DurationSeconds,
		Status:          q.Status,
	}
}

// questSafeQuestionDTO is a quest question with every answer-bearing
// field stripped — the same "don't leak the answer" shape as
// questionListItem in questions.go, but also dropping theory_text since
// that can itself give the answer away for some questions.
type questSafeQuestionDTO struct {
	ID           int      `json:"id"`
	OrderIndex   int      `json:"orderIndex"`
	Subject      string   `json:"subject"`
	Topic        string   `json:"topic"`
	Type         string   `json:"type"`
	QuestionText string   `json:"questionText"`
	OptionA      *string  `json:"optionA"`
	OptionB      *string  `json:"optionB"`
	OptionC      *string  `json:"optionC"`
	OptionD      *string  `json:"optionD"`
	Difficulty   *string  `json:"difficulty"`
	Marks        *float64 `json:"marks"`
}

// questDetailDTO is a single quest plus its (answer-stripped) questions
// and the requesting user's own state relative to it.
type questDetailDTO struct {
	questSummaryDTO
	Questions     []questSafeQuestionDTO `json:"questions"`
	IsParticipant bool                   `json:"isParticipant"`
	UserRating    int                    `json:"userRating"`
}

type leaderboardEntryDTO struct {
	Rank   int    `json:"rank"`
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Score  int64  `json:"score,omitempty"` // only present for the live (Redis) leaderboard
}

type resultEntryDTO struct {
	Rank             int    `json:"rank"`
	UserID           string `json:"userId"`
	Name             string `json:"name"`
	SolvedCount      int    `json:"solvedCount"`
	TimeTakenSeconds int    `json:"timeTakenSeconds"`
	RatingBefore     int    `json:"ratingBefore"`
	RatingAfter      int    `json:"ratingAfter"`
}

type historyEntryDTO struct {
	Quest  questSummaryDTO `json:"quest"`
	Result resultEntryDTO  `json:"result"`
}

// nameFor picks the best available display name for a user, falling
// back through name -> email -> a truncated ID so a leaderboard row
// never renders blank if a user has neither set.
func nameFor(u *store.User) string {
	if u == nil {
		return "unknown"
	}
	if u.Name != "" {
		return u.Name
	}
	if u.Email != "" {
		return u.Email
	}
	return u.ID.String()[:8]
}

// --- Handlers ----------------------------------------------------------

// POST /api/quests  (admin only)
type createQuestRequest struct {
	Branch          string `json:"branch"`
	Title           string `json:"title"`
	WeekNumber      int    `json:"weekNumber"`
	StartsAt        string `json:"startsAt"` // RFC3339
	DurationSeconds int    `json:"durationSeconds"`
	QuestionIDs     []int  `json:"questionIds"`
}

func (h *Handlers) CreateQuest(w http.ResponseWriter, r *http.Request) {
	admin := auth.UserFromContext(r.Context())
	if admin == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body createQuestRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	startsAt, err := time.Parse(time.RFC3339, body.StartsAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "startsAt must be an RFC3339 timestamp")
		return
	}
	durationSeconds := body.DurationSeconds
	if durationSeconds <= 0 {
		durationSeconds = 3600 // matches the schema default: a standard 1hr quest
	}

	q, err := h.Quest.CreateQuest(r.Context(), admin, body.Branch, body.Title, body.WeekNumber, startsAt, durationSeconds, body.QuestionIDs)
	if err != nil {
		if err == store.ErrInvalidQuestionCount {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create quest")
		return
	}
	writeJSON(w, http.StatusCreated, toQuestSummaryDTO(q))
}

// GET /api/quests?branch=Computer+Science
// Defaults to the requesting user's own branch if none is given, since
// that's what "my quests" means for a participant; an admin can still
// pass a different branch explicitly to check on another one.
func (h *Handlers) ListQuests(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	branch := r.URL.Query().Get("branch")
	if branch == "" {
		branch = user.Branch
	}
	if branch == "" {
		writeJSON(w, http.StatusOK, []questSummaryDTO{})
		return
	}

	quests, err := h.Store.ListQuests(r.Context(), branch)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load quests")
		return
	}
	out := make([]questSummaryDTO, 0, len(quests))
	for _, q := range quests {
		out = append(out, toQuestSummaryDTO(q))
	}
	writeJSON(w, http.StatusOK, out)
}

// loadQuestParam resolves the {id} URL param into a *store.Quest, or
// writes an appropriate error response and returns ok=false.
func (h *Handlers) loadQuestParam(w http.ResponseWriter, r *http.Request) (*store.Quest, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid quest id")
		return nil, false
	}
	q, err := h.Store.GetQuest(r.Context(), id)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "quest not found")
			return nil, false
		}
		writeError(w, http.StatusInternalServerError, "failed to load quest")
		return nil, false
	}
	return q, true
}

// GET /api/quests/{id}
func (h *Handlers) GetQuest(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	q, ok := h.loadQuestParam(w, r)
	if !ok {
		return
	}

	questions, err := h.Store.ListQuestQuestions(r.Context(), q.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load quest questions")
		return
	}
	questionsOut := make([]questSafeQuestionDTO, 0, len(questions))
	for i, ques := range questions {
		questionsOut = append(questionsOut, questSafeQuestionDTO{
			ID: ques.ID, OrderIndex: i,
			Subject: ques.Subject, Topic: ques.Topic, Type: ques.Type,
			QuestionText: ques.QuestionText,
			OptionA:      ques.OptionA, OptionB: ques.OptionB, OptionC: ques.OptionC, OptionD: ques.OptionD,
			Difficulty: ques.Difficulty, Marks: ques.Marks,
		})
	}

	isParticipant, err := h.Store.IsParticipant(r.Context(), q.ID, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load participation status")
		return
	}
	rating, err := h.Store.GetUserRating(r.Context(), user.ID, q.Branch)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load rating")
		return
	}

	writeJSON(w, http.StatusOK, questDetailDTO{
		questSummaryDTO: toQuestSummaryDTO(q),
		Questions:       questionsOut,
		IsParticipant:   isParticipant,
		UserRating:      rating,
	})
}

// POST /api/quests/{id}/join
func (h *Handlers) JoinQuest(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	q, ok := h.loadQuestParam(w, r)
	if !ok {
		return
	}

	if err := h.Quest.Join(r.Context(), q, user); err != nil {
		writeQuestServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/quests/{id}/submit
type submitRequest struct {
	QuestionID int    `json:"questionId"`
	Answer     string `json:"answer"`
}

// Submit is deliberately blind: the response never says whether the
// answer was correct, only whether it was accepted. See
// internal/quest.Service.Submit's doc comment for why.
func (h *Handlers) Submit(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	q, ok := h.loadQuestParam(w, r)
	if !ok {
		return
	}

	var body submitRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.Quest.Submit(r.Context(), q, user, body.QuestionID, body.Answer); err != nil {
		writeQuestServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"accepted": true})
}

// GET /api/quests/{id}/leaderboard
// While the quest is live, reads the fast live-ranking straight from
// Redis (score only, no solved/time breakdown — that stays hidden until
// close same as everything else). Once closed, Redis's per-quest keys
// may have expired (see redisCleanupTTLSeconds in the quest package), so
// this instead serves the same settled standings /results does, just in
// the leaderboard's leaner shape — a client can hit this single endpoint
// throughout a quest's whole lifecycle without branching on status.
func (h *Handlers) Leaderboard(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	q, ok := h.loadQuestParam(w, r)
	if !ok {
		return
	}

	const limit = 100

	if q.Status == store.QuestStatusClosed {
		results, err := h.Store.GetQuestResults(r.Context(), q.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load results")
			return
		}
		ids := make([]uuid.UUID, 0, len(results))
		for _, res := range results {
			ids = append(ids, res.UserID)
		}
		users, err := h.Store.GetUsersByIDs(r.Context(), ids)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load user info")
			return
		}
		out := make([]leaderboardEntryDTO, 0, len(results))
		for _, res := range results {
			out = append(out, leaderboardEntryDTO{Rank: res.Rank, UserID: res.UserID.String(), Name: nameFor(users[res.UserID])})
		}
		writeJSON(w, http.StatusOK, out)
		return
	}

	entries, err := h.Quest.Redis.Leaderboard(r.Context(), q.ID, q.Branch, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load leaderboard")
		return
	}
	ids := make([]uuid.UUID, 0, len(entries))
	for _, e := range entries {
		ids = append(ids, e.UserID)
	}
	users, err := h.Store.GetUsersByIDs(r.Context(), ids)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load user info")
		return
	}
	out := make([]leaderboardEntryDTO, 0, len(entries))
	for _, e := range entries {
		out = append(out, leaderboardEntryDTO{Rank: e.Rank, UserID: e.UserID.String(), Name: nameFor(users[e.UserID]), Score: e.Score})
	}
	writeJSON(w, http.StatusOK, out)
}

// GET /api/quests/{id}/results
// Only meaningful once a quest has closed — this is the full
// solved/time/rating breakdown that stays hidden while it's live.
func (h *Handlers) QuestResults(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	q, ok := h.loadQuestParam(w, r)
	if !ok {
		return
	}
	if q.Status != store.QuestStatusClosed {
		writeError(w, http.StatusConflict, "quest has not closed yet")
		return
	}

	results, err := h.Store.GetQuestResults(r.Context(), q.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load results")
		return
	}
	ids := make([]uuid.UUID, 0, len(results))
	for _, res := range results {
		ids = append(ids, res.UserID)
	}
	users, err := h.Store.GetUsersByIDs(r.Context(), ids)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load user info")
		return
	}

	out := make([]resultEntryDTO, 0, len(results))
	for _, res := range results {
		out = append(out, resultEntryDTO{
			Rank: res.Rank, UserID: res.UserID.String(), Name: nameFor(users[res.UserID]),
			SolvedCount: res.SolvedCount, TimeTakenSeconds: res.TimeTakenSeconds,
			RatingBefore: res.RatingBefore, RatingAfter: res.RatingAfter,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// GET /api/quests/rating-history
// The logged-in user's own settled quest history, most recent first —
// what a profile-style "rating over time" view reads from.
func (h *Handlers) RatingHistory(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	entries, err := h.Store.GetUserQuestHistory(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load rating history")
		return
	}
	out := make([]historyEntryDTO, 0, len(entries))
	for _, e := range entries {
		out = append(out, historyEntryDTO{
			Quest: toQuestSummaryDTO(&e.Quest),
			Result: resultEntryDTO{
				Rank: e.Result.Rank, UserID: user.ID.String(), Name: nameFor(user),
				SolvedCount: e.Result.SolvedCount, TimeTakenSeconds: e.Result.TimeTakenSeconds,
				RatingBefore: e.Result.RatingBefore, RatingAfter: e.Result.RatingAfter,
			},
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// writeQuestServiceError maps the sentinel errors internal/quest.Service
// returns to the right HTTP status, so every handler that calls into it
// (Join, Submit) handles them the same way instead of each reimplementing
// this switch.
func writeQuestServiceError(w http.ResponseWriter, err error) {
	switch err {
	case quest.ErrWrongBranch:
		writeError(w, http.StatusForbidden, err.Error())
	case quest.ErrQuestNotOpen:
		writeError(w, http.StatusConflict, err.Error())
	case quest.ErrNotParticipant:
		writeError(w, http.StatusConflict, err.Error())
	case quest.ErrQuestionNotInQuest:
		writeError(w, http.StatusBadRequest, err.Error())
	case quest.ErrAlreadySubmitted:
		writeError(w, http.StatusConflict, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "failed to process request")
	}
}
