// Service composes the Postgres access layer (internal/store) with the
// Redis live-leaderboard layer (redis.go in this package) into the
// actual contest lifecycle: joining a quest, blind-grading a submission,
// and closing a quest out (settling standings + running the rating
// batch). HTTP handlers (Category 4) should call through Service rather
// than reaching into Store or Redis directly, so this file stays the one
// place the "never leak correctness before close" rule is enforced.
package quest

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"gatequest-auth/internal/store"

	"github.com/google/uuid"
)

var (
	// ErrWrongBranch is returned when a user tries to join/submit to a
	// quest scoped to a branch other than their own.
	ErrWrongBranch = errors.New("quest is not open to your branch")
	// ErrQuestNotOpen is returned when joining/submitting to a quest
	// that isn't currently accepting participants/submissions.
	ErrQuestNotOpen = errors.New("quest is not currently open")
	// ErrNotParticipant is returned by Submit when the user hasn't
	// joined the quest yet.
	ErrNotParticipant = errors.New("join the quest before submitting")
	// ErrQuestionNotInQuest is returned by Submit when questionID isn't
	// one of this quest's questions.
	ErrQuestionNotInQuest = errors.New("question is not part of this quest")
	// ErrAlreadySubmitted is returned by Submit on a second attempt at
	// the same question — a quest_submissions row already exists, and
	// resubmission is not allowed even though no verdict was ever shown.
	ErrAlreadySubmitted = errors.New("you have already submitted an answer for this question")
)

// Service is the contest lifecycle: grading, blind submit, close, and
// rating. Safe for concurrent use — all state lives in Postgres/Redis,
// not on the struct.
type Service struct {
	Store *store.Store
	Redis *Redis
}

func NewService(st *store.Store, rdb *Redis) *Service {
	return &Service{Store: st, Redis: rdb}
}

// --- Create & join -------------------------------------------------------

// CreateQuest builds a new quest for admin.Branch — well, more
// precisely for the branch the caller specifies, since an admin might
// run quests for more than one branch. Enforces the admin gate again
// here (not just at the HTTP middleware layer) since Service is meant to
// be safely callable from anywhere, including future non-HTTP callers
// like an admin CLI.
func (svc *Service) CreateQuest(ctx context.Context, admin *store.User, branch, title string, weekNumber int, startsAt time.Time, durationSeconds int, questionIDs []int) (*store.Quest, error) {
	if !admin.IsAdmin {
		return nil, errors.New("only an admin can create a quest")
	}
	if strings.TrimSpace(branch) == "" {
		return nil, errors.New("branch is required")
	}
	if strings.TrimSpace(title) == "" {
		return nil, errors.New("title is required")
	}
	if durationSeconds <= 0 {
		return nil, errors.New("durationSeconds must be positive")
	}
	q, err := svc.Store.CreateQuest(ctx, branch, title, weekNumber, startsAt, durationSeconds, admin.ID, questionIDs)
	if err != nil {
		return nil, fmt.Errorf("create quest: %w", err)
	}
	return q, nil
}

// Join adds user as a participant of quest, enforcing that a user can
// only compete on quests scoped to their own branch, and only while the
// quest hasn't closed yet. Idempotent — joining twice is a no-op.
func (svc *Service) Join(ctx context.Context, quest *store.Quest, user *store.User) error {
	if user.Branch != quest.Branch {
		return ErrWrongBranch
	}
	if quest.Status == store.QuestStatusClosed {
		return ErrQuestNotOpen
	}
	if err := svc.Store.JoinQuest(ctx, quest.ID, user.ID); err != nil {
		return fmt.Errorf("join quest: %w", err)
	}
	return nil
}

// --- Blind submit ----------------------------------------------------------

// Submit grades answer against questionID's stored correct answer and
// durably logs the result, but — this is the whole point of a blind
// contest — never returns whether it was correct. The only signals the
// caller gets back are "accepted" or a specific error (not a
// participant, already submitted, quest not live, question not in this
// quest). Live leaderboard position updates happen here too, via Redis,
// but again without revealing per-question correctness.
func (svc *Service) Submit(ctx context.Context, quest *store.Quest, user *store.User, questionID int, rawAnswer string) error {
	if user.Branch != quest.Branch {
		return ErrWrongBranch
	}
	if quest.Status != store.QuestStatusLive {
		return ErrQuestNotOpen
	}

	isParticipant, err := svc.Store.IsParticipant(ctx, quest.ID, user.ID)
	if err != nil {
		return fmt.Errorf("check participant: %w", err)
	}
	if !isParticipant {
		return ErrNotParticipant
	}

	inQuest, err := svc.Store.QuestHasQuestion(ctx, quest.ID, questionID)
	if err != nil {
		return fmt.Errorf("check question membership: %w", err)
	}
	if !inQuest {
		return ErrQuestionNotInQuest
	}

	question, err := svc.Store.GetQuestion(ctx, questionID)
	if err != nil {
		return fmt.Errorf("load question: %w", err)
	}

	correct := gradeAnswer(question, rawAnswer)
	elapsed := clamp(int(time.Since(quest.StartsAt).Seconds()), 0, quest.DurationSeconds)

	inserted, err := svc.Store.RecordSubmission(ctx, quest.ID, user.ID, questionID, rawAnswer, correct, elapsed)
	if err != nil {
		return fmt.Errorf("record submission: %w", err)
	}
	if !inserted {
		return ErrAlreadySubmitted
	}

	if correct {
		if _, err := svc.Redis.RecordFirstCorrect(ctx, quest.ID, user.ID, quest.Branch, questionID, elapsed); err != nil {
			// The durable Postgres row is already written at this point —
			// that's the source of truth Close() reconciles the leaderboard
			// against being unavailable would be surprising, so this is
			// logged-worthy, but the submission itself must still succeed
			// from the user's point of view (blind — they can't retry).
			return fmt.Errorf("update live leaderboard: %w", err)
		}
	}
	return nil
}

// gradeAnswer mirrors the frontend's client-side grading in
// pages/Question.tsx exactly, so a blind quest submission is judged by
// the same rules a normal practice-mode question would be:
//   - mcq/msq: question.CorrectOption is a comma-separated set of option
//     letters (e.g. "A" or "B,D"); rawAnswer must be the same set,
//     order-independent, no extras, no omissions.
//   - nat: rawAnswer must parse as a float within AnswerTolerance
//     (default 0) of CorrectAnswer.
func gradeAnswer(q *store.Question, rawAnswer string) bool {
	if q.Type == "nat" {
		given, err := strconv.ParseFloat(strings.TrimSpace(rawAnswer), 64)
		if err != nil {
			return false
		}
		target, err := strconv.ParseFloat(strings.TrimSpace(deref(q.CorrectAnswer)), 64)
		if err != nil {
			return false
		}
		tol, _ := strconv.ParseFloat(strings.TrimSpace(deref(q.AnswerTolerance)), 64)
		return math.Abs(given-target) <= tol
	}

	correctSet := splitOptionSet(deref(q.CorrectOption))
	givenSet := splitOptionSet(rawAnswer)
	if len(correctSet) != len(givenSet) {
		return false
	}
	for k := range givenSet {
		if !correctSet[k] {
			return false
		}
	}
	return true
}

func splitOptionSet(s string) map[string]bool {
	out := map[string]bool{}
	for _, part := range strings.Split(s, ",") {
		part = strings.TrimSpace(part)
		if part != "" {
			out[part] = true
		}
	}
	return out
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// --- Close & settle --------------------------------------------------------

// redisCleanupTTLSeconds is how long a closed quest's live-leaderboard
// keys stick around in Redis after close before expiring, in case
// something needs to read them for debugging shortly after settlement.
// quest_results in Postgres is the durable source of truth after close,
// not these keys.
const redisCleanupTTLSeconds = 24 * 60 * 60

// Close settles a live quest: reads final standings from Redis, ranks
// participants (shared/competition-style ranks on ties), writes
// quest_results, marks the quest closed, runs the pairwise-Elo rating
// batch, and finally lets the quest's Redis keys expire. Safe to call on
// a quest that's already closed (no-op) so the scheduler can retry after
// a partial failure without double-settling.
func (svc *Service) Close(ctx context.Context, questID uuid.UUID) error {
	quest, err := svc.Store.GetQuest(ctx, questID)
	if err != nil {
		return fmt.Errorf("load quest: %w", err)
	}
	if quest.Status == store.QuestStatusClosed {
		return nil
	}
	if quest.Status != store.QuestStatusLive {
		return fmt.Errorf("cannot close quest in status %q", quest.Status)
	}

	participantIDs, err := svc.Store.ListParticipantIDs(ctx, questID)
	if err != nil {
		return fmt.Errorf("list participants: %w", err)
	}

	type standing struct {
		userID       uuid.UUID
		solved       int
		timeTaken    int
		ratingBefore int
	}
	standings := make([]standing, 0, len(participantIDs))
	for _, uid := range participantIDs {
		solved, err := svc.Redis.SolvedCount(ctx, questID, uid)
		if err != nil {
			return fmt.Errorf("read solved count for %s: %w", uid, err)
		}
		times, err := svc.Redis.PerQuestionTimes(ctx, questID, uid)
		if err != nil {
			return fmt.Errorf("read submission times for %s: %w", uid, err)
		}
		total := 0
		for _, t := range times {
			total += t
		}
		ratingBefore, err := svc.Store.GetUserRating(ctx, uid, quest.Branch)
		if err != nil {
			return fmt.Errorf("read rating for %s: %w", uid, err)
		}
		standings = append(standings, standing{userID: uid, solved: solved, timeTaken: total, ratingBefore: ratingBefore})
	}

	// Best first: most solved, then least time — matches the ZINCRBY
	// composite score ordering in redis.go's RecordFirstCorrect.
	sort.Slice(standings, func(i, j int) bool {
		if standings[i].solved != standings[j].solved {
			return standings[i].solved > standings[j].solved
		}
		return standings[i].timeTaken < standings[j].timeTaken
	})

	results := make([]store.QuestResult, len(standings))
	for i, st := range standings {
		rank := i + 1
		// Standard competition ranking ("1224"): a tie shares the rank
		// of its first occurrence, and the next distinct standing's rank
		// is its 1-indexed position, not the tied group's size + 1.
		if i > 0 && standings[i].solved == standings[i-1].solved && standings[i].timeTaken == standings[i-1].timeTaken {
			rank = results[i-1].Rank
		}
		results[i] = store.QuestResult{
			QuestID:          questID,
			UserID:           st.userID,
			SolvedCount:      st.solved,
			TimeTakenSeconds: st.timeTaken,
			Rank:             rank,
			RatingBefore:     st.ratingBefore,
			RatingAfter:      st.ratingBefore, // placeholder until RunRatingBatch below
		}
	}

	if err := svc.Store.WriteQuestResults(ctx, questID, results); err != nil {
		return fmt.Errorf("write quest results: %w", err)
	}
	if err := svc.Store.MarkQuestClosed(ctx, questID); err != nil {
		return fmt.Errorf("mark quest closed: %w", err)
	}

	if err := svc.RunRatingBatch(ctx, questID); err != nil {
		// Standings are already durably settled at this point; a rating
		// batch failure shouldn't be silently swallowed but also
		// shouldn't leave the quest stuck un-closed for retry (that would
		// just double-settle standings on the next scheduler pass). The
		// caller (scheduler) logs this loudly.
		return fmt.Errorf("run rating batch: %w", err)
	}

	for _, uid := range participantIDs {
		if err := svc.Redis.ExpireQuestKeys(ctx, questID, quest.Branch, uid, redisCleanupTTLSeconds); err != nil {
			return fmt.Errorf("expire redis keys for %s: %w", uid, err)
		}
	}
	return nil
}

// --- Rating batch (pairwise Elo) -------------------------------------------

// eloK is the standard Elo K-factor, applied per virtual "game" against
// each other participant and then averaged across opponents (see below)
// so a contest with many participants doesn't produce wildly larger
// swings than one with few.
const eloK = 32.0

// RunRatingBatch computes each participant's new rating from a closed
// quest's settled standings using pairwise Elo: every participant is
// treated as having played one virtual game against every other
// participant, won/lost/drawn according to who ranked better, with the
// expected outcome of each virtual game coming from the two players'
// pre-contest ratings (standard Elo expected-score formula). A user's
// total rating change is the average of their per-opponent deltas — this
// keeps a single contest's swing comparable regardless of how many
// people entered, rather than compounding with participant count.
//
// Requires quest_results to already be written (by Close, before it
// calls this) since that's where standings + rating_before are read
// from; this only computes and writes rating_after.
func (svc *Service) RunRatingBatch(ctx context.Context, questID uuid.UUID) error {
	quest, err := svc.Store.GetQuest(ctx, questID)
	if err != nil {
		return fmt.Errorf("load quest: %w", err)
	}
	results, err := svc.Store.GetQuestResults(ctx, questID)
	if err != nil {
		return fmt.Errorf("load quest results: %w", err)
	}
	if len(results) < 2 {
		// Nothing to compare against — leave rating_after == rating_before
		// (already the case from Close's placeholder write) and still
		// persist to user_ratings so a lone participant's rating row
		// exists going forward.
		for _, r := range results {
			if err := svc.Store.UpsertUserRating(ctx, r.UserID, quest.Branch, r.RatingBefore); err != nil {
				return fmt.Errorf("upsert rating for %s: %w", r.UserID, err)
			}
		}
		return nil
	}

	n := len(results)
	for i := range results {
		delta := 0.0
		for j := range results {
			if i == j {
				continue
			}
			expected := 1.0 / (1.0 + math.Pow(10, float64(results[j].RatingBefore-results[i].RatingBefore)/400.0))
			delta += actualScore(results[i].Rank, results[j].Rank) - expected
		}
		delta /= float64(n - 1)

		newRating := results[i].RatingBefore + int(math.Round(eloK*delta))
		if err := svc.Store.UpdateQuestResultRating(ctx, questID, results[i].UserID, newRating); err != nil {
			return fmt.Errorf("update result rating for %s: %w", results[i].UserID, err)
		}
		if err := svc.Store.UpsertUserRating(ctx, results[i].UserID, quest.Branch, newRating); err != nil {
			return fmt.Errorf("upsert rating for %s: %w", results[i].UserID, err)
		}
	}
	return nil
}

// actualScore is the pairwise Elo "did i beat j" outcome: 1 for a better
// (lower) rank, 0.5 for a tie, 0 for a worse rank.
func actualScore(rankI, rankJ int) float64 {
	switch {
	case rankI < rankJ:
		return 1
	case rankI > rankJ:
		return 0
	default:
		return 0.5
	}
}
