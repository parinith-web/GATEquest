// Package quest holds everything specific to the weekly branch-scoped
// quest contests: the live-leaderboard Redis layer (this file) and, in
// later files, the Postgres contest lifecycle (create/join/submit/close)
// and the pairwise-Elo rating batch job.
package quest

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Redis wraps a *redis.Client with the quest-specific key scheme and
// atomic operations. Nothing here talks to Postgres — that happens one
// layer up, once per submission (durable log) and once at contest close
// (settling the final snapshot into quest_results).
type Redis struct {
	client *redis.Client
}

// NewRedis parses url (e.g. "redis://localhost:6379" or the rediss://
// URL Upstash gives you) and returns a wrapper. It does not itself
// verify connectivity — call Ping to do that at startup.
func NewRedis(url string) (*Redis, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parsing REDIS_URL: %w", err)
	}
	return &Redis{client: redis.NewClient(opt)}, nil
}

// Ping verifies the connection, for a clear startup error instead of a
// confusing failure on the first quest submission.
func (r *Redis) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *Redis) Close() error {
	return r.client.Close()
}

// --- Key scheme --------------------------------------------------------
//
// All keys are scoped per quest so they can be dropped wholesale after a
// contest closes and its results are settled into Postgres.

func leaderboardKey(questID uuid.UUID, branch string) string {
	return fmt.Sprintf("quest:%s:branch:%s:leaderboard", questID, branch)
}

func solvedKey(questID, userID uuid.UUID) string {
	return fmt.Sprintf("quest:%s:user:%s:solved", questID, userID)
}

func submissionsKey(questID, userID uuid.UUID) string {
	return fmt.Sprintf("quest:%s:user:%s:submissions", questID, userID)
}

// solveWeight must be strictly larger than the maximum possible summed
// elapsed_seconds across all questions in a contest (25 questions *
// 3600s cap = 90,000 worst case), so that one additional solved question
// always outranks any amount of extra time — this is what makes
// score = solved_count*solveWeight - time_taken_seconds sort correctly
// by (solved_count desc, time_taken_seconds asc) in a single ZSET.
const solveWeight = 10_000_000

// recordFirstCorrect is the Lua script run on every *correct* submission.
// It is a no-op (returns 0) if this question was already solved by this
// user — which is what makes "only the first correct submission counts"
// safe against concurrent/duplicate requests. On success (returns 1) it
// atomically: marks the question solved, records the elapsed time for
// that question, and updates the user's composite leaderboard score.
//
// KEYS[1] = solved set key
// KEYS[2] = leaderboard zset key
// KEYS[3] = submissions hash key
// ARGV[1] = questionID
// ARGV[2] = elapsedSeconds (seconds since quest start, server-computed)
// ARGV[3] = userID (the zset member — NOT a key name)
var recordFirstCorrectScript = redis.NewScript(`
local already = redis.call('SISMEMBER', KEYS[1], ARGV[1])
if already == 1 then
  return 0
end
redis.call('SADD', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[3], ARGV[1], ARGV[2])
redis.call('ZINCRBY', KEYS[2], 10000000, ARGV[3])
redis.call('ZINCRBY', KEYS[2], -tonumber(ARGV[2]), ARGV[3])
return 1
`)

// RecordFirstCorrect should be called once, only when the caller has
// already determined a submission is correct (grading happens in the
// Postgres layer, not here). branch scopes which leaderboard is updated
// (leaderboards are per branch, per quest, since ranking is "branch
// mates only"). Returns true if this was genuinely the first correct
// submission for that question (and the leaderboard was updated), false
// if the user had already solved it before (no-op, safe to call again
// on a retried/duplicate request).
func (r *Redis) RecordFirstCorrect(ctx context.Context, questID, userID uuid.UUID, branch string, questionID int, elapsedSeconds int) (firstCorrect bool, err error) {
	keys := []string{
		solvedKey(questID, userID),
		leaderboardKey(questID, branch),
		submissionsKey(questID, userID),
	}
	args := []interface{}{strconv.Itoa(questionID), strconv.Itoa(elapsedSeconds), userID.String()}

	res, err := recordFirstCorrectScript.Run(ctx, r.client, keys, args...).Int()
	if err != nil {
		return false, fmt.Errorf("recordFirstCorrect script: %w", err)
	}
	return res == 1, nil
}

// LeaderboardEntry is one row of a live (still-open) contest leaderboard.
type LeaderboardEntry struct {
	UserID uuid.UUID
	Rank   int // 1-indexed position in the current ZSET order
	Score  int64
}

// Leaderboard returns the top `limit` users for a quest+branch, ordered
// best-first (most solved, then least time — see solveWeight above).
// This reads Redis directly and is meant for the *live* view while the
// contest is running; after close, reads should come from quest_results
// in Postgres instead (Redis keys get TTL'd out post-settlement).
func (r *Redis) Leaderboard(ctx context.Context, questID uuid.UUID, branch string, limit int64) ([]LeaderboardEntry, error) {
	zs, err := r.client.ZRevRangeWithScores(ctx, leaderboardKey(questID, branch), 0, limit-1).Result()
	if err != nil {
		return nil, err
	}
	out := make([]LeaderboardEntry, 0, len(zs))
	for i, z := range zs {
		uid, err := uuid.Parse(z.Member.(string))
		if err != nil {
			continue // shouldn't happen; skip a corrupt member rather than fail the whole leaderboard
		}
		out = append(out, LeaderboardEntry{
			UserID: uid,
			Rank:   i + 1,
			Score:  int64(z.Score),
		})
	}
	return out, nil
}

// UserRank returns a single user's live 1-indexed rank, or (0, false) if
// they have no score yet (haven't solved anything).
func (r *Redis) UserRank(ctx context.Context, questID uuid.UUID, branch string, userID uuid.UUID) (int, bool, error) {
	rank, err := r.client.ZRevRank(ctx, leaderboardKey(questID, branch), userID.String()).Result()
	if err == redis.Nil {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return int(rank) + 1, true, nil
}

// SolvedCount returns how many distinct questions a user has solved so
// far in this quest — the size of their solved SET.
func (r *Redis) SolvedCount(ctx context.Context, questID, userID uuid.UUID) (int, error) {
	n, err := r.client.SCard(ctx, solvedKey(questID, userID)).Result()
	return int(n), err
}

// PerQuestionTimes returns questionID -> elapsedSeconds for every
// question a user has solved, read from their submissions HASH. Used at
// contest close to bulk-write quest_submissions rows without recomputing
// anything.
func (r *Redis) PerQuestionTimes(ctx context.Context, questID, userID uuid.UUID) (map[int]int, error) {
	raw, err := r.client.HGetAll(ctx, submissionsKey(questID, userID)).Result()
	if err != nil {
		return nil, err
	}
	out := make(map[int]int, len(raw))
	for qidStr, secStr := range raw {
		qid, err := strconv.Atoi(qidStr)
		if err != nil {
			continue
		}
		sec, err := strconv.Atoi(secStr)
		if err != nil {
			continue
		}
		out[qid] = sec
	}
	return out, nil
}

// ExpireQuestKeys sets a TTL on all of a single user's per-quest keys
// plus the branch leaderboard, so Redis cleans itself up a while after a
// contest closes instead of accumulating stale contests forever. Safe to
// call redundantly (e.g. once per participant during close-out).
func (r *Redis) ExpireQuestKeys(ctx context.Context, questID uuid.UUID, branch string, userID uuid.UUID, ttlSeconds int) error {
	pipe := r.client.Pipeline()
	pipe.Expire(ctx, leaderboardKey(questID, branch), secondsToDuration(ttlSeconds))
	pipe.Expire(ctx, solvedKey(questID, userID), secondsToDuration(ttlSeconds))
	pipe.Expire(ctx, submissionsKey(questID, userID), secondsToDuration(ttlSeconds))
	_, err := pipe.Exec(ctx)
	return err
}

func secondsToDuration(s int) time.Duration {
	return time.Duration(s) * time.Second
}
