package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"gatequest-auth/internal/auth"

	"github.com/go-chi/chi/v5"
)

// heatmapWeeks controls how far back the activity map goes. 53 weeks
// gives a little over a full year, matching the "NODE_UPTIME: 365 DAYS"
// label already on the profile page and lining up 7 rows x N columns
// (calendar weeks, Sunday-start) the way the frontend grid expects.
const heatmapWeeks = 53

// historyWindow is how far back the "recent activity" feed looks — the
// profile page shows questions solved in the past week.
const historyWindow = 7 * 24 * time.Hour

type attemptRequest struct {
	IsCorrect bool `json:"isCorrect"`
}

// POST /api/questions/{id}/attempt
// Records that the logged-in user submitted an answer to this question.
// The frontend already grades mcq/msq/nat answers client-side (it has
// the correct answer in hand once a question is fetched), so this just
// takes the verdict rather than re-grading — this endpoint is for
// activity tracking, not scoring authority.
func (h *Handlers) RecordAttempt(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question id")
		return
	}

	var body attemptRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.Store.RecordAttempt(r.Context(), user.ID, id, body.IsCorrect); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record attempt")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type heatmapDay struct {
	Date  string `json:"date"` // YYYY-MM-DD
	Count int    `json:"count"`
}

type historyItemDTO struct {
	QuestionID   int    `json:"questionId"`
	Subject      string `json:"subject"`
	Topic        string `json:"topic"`
	QuestionText string `json:"questionText"`
	IsCorrect    bool   `json:"isCorrect"`
	AttemptedAt  string `json:"attemptedAt"` // RFC3339
}

// GET /api/profile/activity
// Returns everything the profile page's Activity Map + history feed
// need in one call: a zero-filled daily heatmap for the last ~year, and
// the last 7 days of solved questions (one entry per question, most
// recent attempt).
func (h *Handlers) GetActivity(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	to := time.Now().UTC()
	// Align the grid to full Sunday-Saturday calendar weeks so each
	// column in the frontend's grid is a real week, not an arbitrary
	// 7-day slice.
	endOfWeek := to.AddDate(0, 0, 6-int(to.Weekday()))
	from := endOfWeek.AddDate(0, 0, -(heatmapWeeks*7 - 1))

	days, err := h.Store.GetActivityHeatmap(r.Context(), user.ID, from, endOfWeek)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load activity")
		return
	}

	heatmap := make([]heatmapDay, 0, len(days))
	total := 0
	for _, d := range days {
		heatmap = append(heatmap, heatmapDay{Date: d.Date.Format("2006-01-02"), Count: d.Count})
		total += d.Count
	}

	history, err := h.Store.GetRecentHistory(r.Context(), user.ID, historyWindow)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load history")
		return
	}
	historyOut := make([]historyItemDTO, 0, len(history))
	for _, item := range history {
		historyOut = append(historyOut, historyItemDTO{
			QuestionID:   item.QuestionID,
			Subject:      item.Subject,
			Topic:        item.Topic,
			QuestionText: item.QuestionText,
			IsCorrect:    item.IsCorrect,
			AttemptedAt:  item.AttemptedAt.Format(time.RFC3339),
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"heatmap":            heatmap,
		"totalContributions": total,
		"history":            historyOut,
	})
}
