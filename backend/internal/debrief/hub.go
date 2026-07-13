package debrief

import (
	"sync"

	"github.com/google/uuid"

	"gatequest-auth/internal/store"
)

// subscriberBuffer is how many un-flushed messages a single SSE
// connection can fall behind by before Broadcast gives up on it. A
// debrief room is low-throughput (people typing, not a firehose), so
// this only ever matters if a client's stream goroutine is genuinely
// stuck — in which case dropping it is the right call rather than
// letting one slow reader block delivery to everyone else in the room.
const subscriberBuffer = 16

// Hub is the in-process fan-out point between PostMessage (Session 4b)
// and every open SSE connection for a room (Session 4c). One process,
// one Hub, one map entry per quest_id currently being watched — see the
// package-level plan notes on why that's fine at this app's scale, and
// what "swap for Redis pub/sub" would look like if it ever stops being
// fine (multiple backend instances behind a load balancer).
//
// Safe for concurrent use. Deliberately dumb: it doesn't know about
// rooms opening/closing, the 12h window, or branch scoping — it only
// knows "questID -> set of channels currently listening", and trusts
// the HTTP layer to only ever Subscribe/Broadcast using a questID that
// debrief.Service has already verified is the caller's own open room.
type Hub struct {
	mu   sync.Mutex
	subs map[uuid.UUID]map[chan *store.DebriefMessage]struct{}
}

func NewHub() *Hub {
	return &Hub{
		subs: make(map[uuid.UUID]map[chan *store.DebriefMessage]struct{}),
	}
}

// Subscribe registers a new listener for questID and returns the
// channel to read from plus an unsubscribe func the caller MUST run
// (typically via defer) once the connection ends — usually when the SSE
// handler's request context is done. Forgetting to call it leaks the
// channel and the map entry for as long as the process runs.
func (h *Hub) Subscribe(questID uuid.UUID) (ch chan *store.DebriefMessage, unsubscribe func()) {
	ch = make(chan *store.DebriefMessage, subscriberBuffer)

	h.mu.Lock()
	if h.subs[questID] == nil {
		h.subs[questID] = make(map[chan *store.DebriefMessage]struct{})
	}
	h.subs[questID][ch] = struct{}{}
	h.mu.Unlock()

	unsubscribe = func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if set, ok := h.subs[questID]; ok {
			delete(set, ch)
			if len(set) == 0 {
				delete(h.subs, questID)
			}
		}
		close(ch)
	}
	return ch, unsubscribe
}

// Broadcast fans msg out to every subscriber currently watching
// msg.QuestID. Non-blocking per subscriber: a channel that's full (i.e.
// a stream goroutine that's fallen behind) is skipped rather than
// stalling the POST request that's delivering the message to everyone
// else. Called right after Service.PostMessage's DB write succeeds, so
// a dropped broadcast only ever costs that one slow client a live
// update — the message itself is already durably stored, and their next
// GET .../messages?since= (or stream reconnect) will still pick it up.
func (h *Hub) Broadcast(msg *store.DebriefMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for ch := range h.subs[msg.QuestID] {
		select {
		case ch <- msg:
		default:
			// Slow subscriber — drop this message for them rather than
			// block every other listener in the room.
		}
	}
}

// SubscriberCount reports how many open connections are currently
// watching questID's room. Not used by the hot path — handy for
// logging/metrics and for tests.
func (h *Hub) SubscriberCount(questID uuid.UUID) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs[questID])
}
