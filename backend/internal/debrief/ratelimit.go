package debrief

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// rateLimiter is a minimal per-user cooldown: Allow reports true at
// most once per `cooldown` for a given user ID. In-memory and
// per-process, same tradeoff as the SSE broadcaster (Session 5) — fine
// for a single backend instance, and if this ever runs behind a load
// balancer with multiple instances it'd need to move to Redis alongside
// that broadcaster, not before.
//
// The map is never explicitly pruned. At this app's scale (bounded by
// logged-in user count, not message volume) that's a few hundred bytes
// per active chatter for the lifetime of the process — not worth adding
// a cleanup goroutine for.
type rateLimiter struct {
	mu       sync.Mutex
	cooldown time.Duration
	last     map[uuid.UUID]time.Time
}

func newRateLimiter(cooldown time.Duration) *rateLimiter {
	return &rateLimiter{
		cooldown: cooldown,
		last:     make(map[uuid.UUID]time.Time),
	}
}

// Allow reports whether userID may act now, and if so, records this
// moment as their most recent action.
func (rl *rateLimiter) Allow(userID uuid.UUID) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	if last, ok := rl.last[userID]; ok && now.Sub(last) < rl.cooldown {
		return false
	}
	rl.last[userID] = now
	return true
}
