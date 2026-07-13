package debrief

import (
	"context"
	"log"
	"time"

	"gatequest-auth/internal/store"
)

// cleanupInterval controls how often expired debrief rooms get purged.
// Unlike quest.Scheduler's 15s poll, nothing user-facing depends on this
// running promptly — a room already stops being readable/writable the
// moment its window lapses (Service.GetRoom re-checks that live off
// closed_at on every call), so this ticker is pure storage hygiene, not
// correctness. 15 minutes is frequent enough that rows don't pile up for
// long, and infrequent enough not to matter at all on load.
const cleanupInterval = 15 * time.Minute

// Cleaner periodically purges debrief messages whose room's 12h window
// has fully lapsed. Deliberately its own small ticker rather than a
// case bolted onto quest.Scheduler's tick: this only ever touches
// debrief_messages, quest.Scheduler only ever touches quests, and
// keeping them as two independent loops in main.go means a bug or a
// slow query in one can't stall the other.
type Cleaner struct {
	store *store.Store
}

// NewCleaner constructs a Cleaner. Doesn't start anything on its own —
// call Start from main.go, same as quest.NewScheduler(...).Start.
func NewCleaner(st *store.Store) *Cleaner {
	return &Cleaner{store: st}
}

// Start runs the cleanup loop until ctx is canceled. Intended to be
// launched with `go cleaner.Start(ctx)` once, alongside the quest
// scheduler, from main.go.
func (c *Cleaner) Start(ctx context.Context) {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	log.Printf("debrief cleanup: started, polling every %s", cleanupInterval)
	for {
		select {
		case <-ctx.Done():
			log.Print("debrief cleanup: stopped")
			return
		case <-ticker.C:
			c.tick(ctx)
		}
	}
}

// tick runs one purge pass. Logged at "found nothing" verbosity too
// (0 deleted) so a silent Postgres connection issue shows up as
// "cleanup ran but the count looks wrong over time" rather than no log
// line at all ever appearing — errors are logged and swallowed, same
// as quest.Scheduler's tick, since a missed pass just means expired
// rows wait for the next one.
func (c *Cleaner) tick(ctx context.Context) {
	deleted, err := c.store.DeleteExpiredDebriefMessages(ctx, time.Now())
	if err != nil {
		log.Printf("debrief cleanup: purge expired messages: %v", err)
		return
	}
	if deleted > 0 {
		log.Printf("debrief cleanup: purged %d expired message(s)", deleted)
	}
}
