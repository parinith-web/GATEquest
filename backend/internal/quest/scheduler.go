package quest

import (
	"context"
	"log"
	"time"
)

// pollInterval controls how promptly a quest opens/closes after its
// scheduled time. 15s means a contest closes at most 15s after its true
// 1hr mark — tight enough that "1 hour" is meaningful, loose enough not
// to hammer Postgres/Redis with polling.
const pollInterval = 15 * time.Second

// Scheduler is the automatic contest clock: "server times it and closes
// itself" (as opposed to an admin manually hitting a close endpoint).
// It polls for quests whose starts_at has arrived (scheduled -> live)
// and quests whose starts_at+duration has passed (live -> closed, which
// also triggers settlement + rating).
type Scheduler struct {
	svc *Service
}

func NewScheduler(svc *Service) *Scheduler {
	return &Scheduler{svc: svc}
}

// Start runs the scheduler loop until ctx is canceled. Intended to be
// launched with `go scheduler.Start(ctx)` once, from main.go, alongside
// the rest of server startup (Category 4 wiring — this file only
// defines the loop, it doesn't start itself).
func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	log.Printf("quest scheduler: started, polling every %s", pollInterval)
	for {
		select {
		case <-ctx.Done():
			log.Print("quest scheduler: stopped")
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

func (s *Scheduler) tick(ctx context.Context) {
	now := time.Now()

	toOpen, err := s.svc.Store.ListScheduledQuestsPastStart(ctx, now)
	if err != nil {
		log.Printf("quest scheduler: list quests to open: %v", err)
	}
	for _, q := range toOpen {
		if err := s.svc.Store.MarkQuestLive(ctx, q.ID); err != nil {
			log.Printf("quest scheduler: open quest %s: %v", q.ID, err)
			continue
		}
		log.Printf("quest scheduler: quest %s (%s) is now live", q.ID, q.Title)
	}

	toClose, err := s.svc.Store.ListLiveQuestsPastEnd(ctx, now)
	if err != nil {
		log.Printf("quest scheduler: list quests to close: %v", err)
	}
	for _, q := range toClose {
		if err := s.svc.Close(ctx, q.ID); err != nil {
			log.Printf("quest scheduler: close quest %s: %v", q.ID, err)
			continue
		}
		log.Printf("quest scheduler: quest %s (%s) closed and settled", q.ID, q.Title)
	}
}
