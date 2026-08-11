package auth

import (
	"context"
	"log"
	"time"

	"gatequest-auth/internal/store"
)

// cleanupInterval controls how often expired sessions and abandoned
// WebAuthn ceremonies get purged. Nothing user-facing depends on this
// running promptly — an expired session is already rejected by
// GetSession, and an expired ceremony by TakeCeremony, the moment either
// is looked up (both check their own expires_at on every read) — so this
// ticker is pure storage hygiene, not correctness, same as
// debrief.Cleaner. 15 minutes is frequent enough that rows don't pile up
// for long, and infrequent enough not to matter at all on load.
const cleanupInterval = 15 * time.Minute

// Cleaner periodically purges expired sessions (backend/internal/store's
// `sessions` table) and lapsed WebAuthn ceremonies (`webauthn_ceremonies`).
// Deliberately its own small ticker rather than folded into debrief.Cleaner
// or quest.Scheduler: this only ever touches auth's own tables, so a bug
// or a slow query here can't stall theirs, and vice versa. See plan.md
// Phase 5 — sessions have a 30-day TTL and ceremonies a 5-minute one, and
// with neither ever getting deleted just for expiring, both tables only
// ever grow, which eventually slows down the lookups every authenticated
// request depends on (GetSession runs on every RequireAuth check).
type Cleaner struct {
	store *store.Store
}

// NewCleaner constructs a Cleaner. Doesn't start anything on its own —
// call Start from main.go, same as debrief.NewCleaner(...).Start.
func NewCleaner(st *store.Store) *Cleaner {
	return &Cleaner{store: st}
}

// Start runs the cleanup loop until ctx is canceled. Intended to be
// launched with `go cleaner.Start(ctx)` once, alongside the quest
// scheduler and debrief cleaner, from main.go.
func (c *Cleaner) Start(ctx context.Context) {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	log.Printf("auth cleanup: started, polling every %s", cleanupInterval)
	for {
		select {
		case <-ctx.Done():
			log.Print("auth cleanup: stopped")
			return
		case <-ticker.C:
			c.tick(ctx)
		}
	}
}

// tick runs one purge pass over both tables. Logged at "found nothing"
// verbosity too (0 deleted) so a silent Postgres connection issue shows
// up as "cleanup ran but the count looks wrong over time" rather than no
// log line at all ever appearing — errors from one table are logged and
// swallowed rather than aborting the other, since a missed pass on either
// just means its expired rows wait for the next tick.
func (c *Cleaner) tick(ctx context.Context) {
	now := time.Now()

	if n, err := c.store.DeleteExpiredSessions(ctx, now); err != nil {
		log.Printf("auth cleanup: purge expired sessions: %v", err)
	} else if n > 0 {
		log.Printf("auth cleanup: purged %d expired session(s)", n)
	}

	if n, err := c.store.DeleteExpiredCeremonies(ctx, now); err != nil {
		log.Printf("auth cleanup: purge expired webauthn ceremonies: %v", err)
	} else if n > 0 {
		log.Printf("auth cleanup: purged %d expired webauthn ceremonie(s)", n)
	}
}
