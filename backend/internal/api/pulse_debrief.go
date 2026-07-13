// Pulse Debrief (session 4b): the room-metadata and message handlers
// for the temporary, branch-scoped chat room that opens once a weekly
// quest closes. Same request/response shape as pulse_interactions.go —
// no long-lived connections here. The one handler with real
// concurrency/lifecycle subtlety, the SSE stream itself, is session 4c
// (internal/api/pulse_debrief_stream.go).
//
// Every handler below resolves "the room" via h.Debrief.GetRoom(ctx,
// user) — i.e. from the caller's own branch, server-side — and never
// from a client-supplied quest_id. There is no route that takes a room
// ID as a URL param; "/active" always means "whatever's open for me".
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/debrief"
	"gatequest-auth/internal/store"

	"github.com/google/uuid"
)

// debriefMessageDTO mirrors frontend/client/lib/pulse-chat.ts's
// DebriefMessage shape (author/authorAvatar/content/createdAt) so
// swapping the mock store for real fetches in session 7 is a
// find-and-replace, not a reshape.
type debriefMessageDTO struct {
	ID           string `json:"id"`
	Author       string `json:"author"`
	AuthorAvatar string `json:"authorAvatar"`
	Content      string `json:"content"`
	CreatedAt    string `json:"createdAt"`
	IsOwner      bool   `json:"isOwner"`
}

func toDebriefMessageDTO(m *store.DebriefMessage, viewerID uuid.UUID) debriefMessageDTO {
	return debriefMessageDTO{
		ID:           m.ID.String(),
		Author:       m.AuthorName,
		AuthorAvatar: m.AuthorAvatar,
		Content:      m.Content,
		CreatedAt:    m.CreatedAt.Format(time.RFC3339),
		IsOwner:      viewerID == m.UserID,
	}
}

// debriefRoomDTO is the response for GET /active — just enough for the
// frontend to know whether to render the room and what to show as its
// countdown.
type debriefRoomDTO struct {
	QuestID  string `json:"questId"`
	Branch   string `json:"branch"`
	OpensAt  string `json:"opensAt"`
	ClosesAt string `json:"closesAt"`
}

// writeDebriefError maps debrief.Service errors to HTTP status codes.
// Centralized here since all three handlers below hit the same error
// set from GetRoom/PostMessage.
func writeDebriefError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, debrief.ErrRoomNotOpen):
		writeError(w, http.StatusNotFound, "no debrief room is currently open for your branch")
	case errors.Is(err, debrief.ErrMessageEmpty):
		writeError(w, http.StatusBadRequest, "message cannot be empty")
	case errors.Is(err, debrief.ErrMessageTooLong):
		writeError(w, http.StatusBadRequest, "message is too long")
	case errors.Is(err, debrief.ErrRateLimited):
		writeError(w, http.StatusTooManyRequests, "you're sending messages too fast")
	default:
		writeError(w, http.StatusInternalServerError, "debrief room is temporarily unavailable")
	}
}

// GET /api/pulse/debrief/active
// Resolves the caller's own branch's debrief room, if one's currently
// open. 404 (via ErrRoomNotOpen) covers "not open yet", "already
// closed", and "no branch set" alike — see debrief.ErrRoomNotOpen's
// doc comment for why those are deliberately indistinguishable to the
// client.
func (h *Handlers) GetActiveDebriefRoom(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	quest, err := h.Debrief.GetRoom(r.Context(), user)
	if err != nil {
		writeDebriefError(w, err)
		return
	}

	opensAt, closesAt := debrief.RoomWindow(quest)
	writeJSON(w, http.StatusOK, debriefRoomDTO{
		QuestID:  quest.ID.String(),
		Branch:   quest.Branch,
		OpensAt:  opensAt.Format(time.RFC3339),
		ClosesAt: closesAt.Format(time.RFC3339),
	})
}

// GET /api/pulse/debrief/active/messages?since=<RFC3339>
// The initial catch-up load for a freshly opened room panel, and the
// fallback path if the SSE stream (session 4c) ever fails to connect.
// `since` is optional — omit it (or pass a bad value) to get the
// room's full history, which is fine here since a room's total
// lifetime is bounded to 12h of low-throughput chat, not an
// unbounded feed.
func (h *Handlers) ListDebriefMessages(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var since time.Time
	if raw := r.URL.Query().Get("since"); raw != "" {
		if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
			since = parsed
		}
		// A bad `since` value silently falls back to the zero time
		// (full history) rather than 400ing — this is a convenience
		// query param for pagination, not a validated API contract, and
		// EventSource/fetch retries shouldn't break over a malformed
		// timestamp.
	}

	msgs, err := h.Debrief.ListMessages(r.Context(), user, since)
	if err != nil {
		writeDebriefError(w, err)
		return
	}

	out := make([]debriefMessageDTO, 0, len(msgs))
	for _, m := range msgs {
		out = append(out, toDebriefMessageDTO(m, user.ID))
	}
	writeJSON(w, http.StatusOK, map[string]any{"messages": out})
}

type postDebriefMessageRequest struct {
	Content string `json:"content"`
}

// POST /api/pulse/debrief/active/messages
// Validates + writes the message (Service.PostMessage handles the
// window check, branch resolution, length cap, and rate limit), then
// fans it out to any open SSE connections for the room via the hub —
// session 4c's stream handlers are just Hub.Subscribe on the other end
// of this same Broadcast call.
func (h *Handlers) PostDebriefMessage(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body postDebriefMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	msg, err := h.Debrief.PostMessage(r.Context(), user, body.Content)
	if err != nil {
		writeDebriefError(w, err)
		return
	}

	// Broadcast is nil-safe to skip if the hub hasn't been wired in yet
	// (e.g. running this handler in isolation before session 4c/4d wire
	// main.go) — the message is already durably stored either way, so
	// a missing hub only costs live delivery, never correctness.
	if h.Hub != nil {
		h.Hub.Broadcast(msg)
	}

	writeJSON(w, http.StatusCreated, toDebriefMessageDTO(msg, user.ID))
}
