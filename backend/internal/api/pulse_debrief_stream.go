// Pulse Debrief (session 4c): the SSE stream handler.
//
// Everything else in this package (pulse_debrief.go, session 4b) is
// ordinary request/response — this file is the one handler with real
// concurrency/lifecycle subtlety: a goroutine per connection, a
// heartbeat so idle proxies don't kill it, and several distinct exit
// paths (client disconnect, room window lapsing, write failure) that
// all have to clean up the same way.
package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/debrief"
)

// heartbeatInterval is how often we write an SSE comment line to a
// connection with nothing new to say. Keeps idle connections alive
// through proxies/load balancers that kill a socket after ~60s of
// silence (Heroku, many nginx configs, etc.) without that silence ever
// looking like "message data" to the client's EventSource.
const heartbeatInterval = 20 * time.Second

// writeSSEEvent writes one message as an SSE "data:" event and flushes
// immediately. SSE frames are newline-delimited, so a payload
// containing a literal newline would silently truncate the event; msg
// is always a single-line JSON encoding of a DebriefMessage, so that
// can't happen here, but the assumption is worth naming.
func writeSSEEvent(w http.ResponseWriter, flusher http.Flusher, data []byte) error {
	if _, err := fmt.Fprintf(w, "data: %s\n\n", data); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

// writeSSEHeartbeat writes a comment line — per the SSE spec, a line
// starting with ':' is ignored by EventSource but still counts as
// traffic, which is all a heartbeat needs to do.
func writeSSEHeartbeat(w http.ResponseWriter, flusher http.Flusher) error {
	if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

// GET /api/pulse/debrief/active/stream
//
// Resolves the caller's own room exactly like GetActiveDebriefRoom,
// subscribes it to the hub, and then pushes every new message as an
// SSE `data:` event until one of: the client disconnects, the room's
// 12h window lapses, or a write to the connection fails (client gone
// but we haven't noticed via ctx yet — same effect, so treated the
// same way).
//
// Deliberately does NOT send the room's message history on connect —
// that's what GET .../active/messages?since= is for (session 4b), and
// is what the frontend is expected to call once up front before
// opening this stream, same division of labor as any other
// catch-up-then-subscribe SSE setup. Keeping history out of this
// handler means it only ever has one job: live delivery.
func (h *Handlers) StreamDebriefMessages(w http.ResponseWriter, r *http.Request) {
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

	flusher, ok := w.(http.Flusher)
	if !ok {
		// Should be unreachable on net/http's normal server, but a
		// clean 500 beats a panic if this handler is ever wrapped by
		// something that doesn't implement Flusher.
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	// hub is guaranteed non-nil here: GetRoom above already succeeded,
	// meaning session 4d has wired a real debrief.Service — and it's
	// the same wiring step that supplies the Hub. If this handler is
	// ever exercised before that wiring exists, this nil check turns
	// a missing Hub into a clean error instead of a nil-pointer panic.
	if h.Hub == nil {
		writeError(w, http.StatusInternalServerError, "debrief stream is temporarily unavailable")
		return
	}

	_, closesAt := debrief.RoomWindow(quest)
	untilClose := time.Until(closesAt)
	if untilClose <= 0 {
		// Room's window lapsed between GetRoom's check and here —
		// vanishingly rare (a race on the window boundary itself),
		// but report it the same way any other "room not open" case
		// is reported rather than opening a stream that would close
		// itself instantly.
		writeDebriefError(w, debrief.ErrRoomNotOpen)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// Needed behind nginx-style reverse proxies, which otherwise buffer
	// the response and defeat the entire point of a streaming
	// connection — harmless if there's no such proxy in front of this.
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	ch, unsubscribe := h.Hub.Subscribe(quest.ID)
	defer unsubscribe()

	heartbeat := time.NewTicker(heartbeatInterval)
	defer heartbeat.Stop()

	// closeTimer fires once this room's own 12h window lapses, so a
	// tab left open overnight doesn't hold its connection (and
	// goroutine) into the next week's room. time.NewTimer instead of
	// context.WithTimeout since we still want r.Context() itself free
	// to report client-disconnect independently.
	closeTimer := time.NewTimer(untilClose)
	defer closeTimer.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			// Client disconnected (tab closed, navigated away,
			// EventSource torn down). Nothing further to do — the
			// deferred unsubscribe() above handles hub cleanup.
			return

		case <-closeTimer.C:
			// Room's window lapsed while this connection was open.
			// Send one last comment so the client's network tab shows
			// a clean close rather than an apparent timeout, then
			// return so the deferred cleanup runs.
			_, _ = fmt.Fprint(w, ": room closed\n\n")
			flusher.Flush()
			return

		case <-heartbeat.C:
			if err := writeSSEHeartbeat(w, flusher); err != nil {
				return
			}

		case msg, open := <-ch:
			if !open {
				// Hub closed our channel out from under us — not a
				// normal path (unsubscribe is what closes it, and
				// we're the only ones holding this reference), but
				// treat it the same as a client hangup rather than
				// looping on a closed channel.
				return
			}
			data, err := json.Marshal(toDebriefMessageDTO(msg, user.ID))
			if err != nil {
				// Genuinely shouldn't happen (DTO is all plain
				// strings/bools) — skip this one message rather than
				// tearing down an otherwise-healthy connection over
				// an encoding bug.
				continue
			}
			if err := writeSSEEvent(w, flusher, data); err != nil {
				return
			}
		}
	}
}
