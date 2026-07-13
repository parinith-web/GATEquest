// Package debrief is the authorization/business-rule layer between the
// HTTP handlers (Session 4) and the store (Session 2) for Pulse Debrief:
// the temporary, branch-scoped chat room that opens once a weekly quest
// closes.
//
// The one rule everything here exists to enforce: a room is never
// resolved from a client-supplied ID. Every method takes the caller's
// *store.User and derives the room from user.Branch + the server's own
// clock via store.GetActiveQuestForBranch — the same function
// store/debrief.go deliberately made the *only* way to look up a room.
// That's what makes branch isolation structural rather than a filter
// someone could forget to apply: there is no code path in this package
// that can return branch A's room to a branch B user, because branch B
// is never even part of the query.
package debrief

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gatequest-auth/internal/store"
)

var (
	// ErrRoomNotOpen is returned whenever the caller's branch has no
	// debrief room currently open — whether that's because this
	// week's contest hasn't closed yet, the 12h window already
	// lapsed, or the user has no branch set at all. Deliberately one
	// error for all three cases: the API layer turns this into a 404
	// either way, and distinguishing the reasons would mean leaking
	// timing info about other branches' contests to someone probing
	// the endpoint.
	ErrRoomNotOpen = errors.New("debrief room is not currently open for your branch")

	// ErrMessageEmpty and ErrMessageTooLong are the two content
	// validation failures for PostMessage.
	ErrMessageEmpty   = errors.New("message cannot be empty")
	ErrMessageTooLong = errors.New("message is too long")

	// ErrRateLimited is returned when a user posts again before
	// messageCooldown has passed since their last message.
	ErrRateLimited = errors.New("you're sending messages too fast")
)

// MaxMessageLength matches both the frontend composer's maxLength and
// the DB-level CHECK constraint in migrations/0008_pulse_debrief.sql —
// enforced here too so the error is a clean 4xx with a clear message
// instead of a raw Postgres constraint violation bubbling up.
const MaxMessageLength = 300

// messageCooldown is the minimum gap between two messages from the same
// user — a basic abuse guard (accidental double-submit, someone holding
// down Enter) rather than a serious anti-spam system. Nothing fancier
// is warranted for a 12h, single-room-per-branch chat; if that changes,
// this is the one spot to swap for something smarter.
const messageCooldown = 2 * time.Second

// Service is the debrief chat's authorization + business-rule layer.
// Safe for concurrent use.
type Service struct {
	Store   *store.Store
	limiter *rateLimiter
}

func NewService(st *store.Store) *Service {
	return &Service{
		Store:   st,
		limiter: newRateLimiter(messageCooldown),
	}
}

// GetRoom resolves the debrief room currently open for user's own
// branch, or ErrRoomNotOpen if none is. This is the single choke point
// every other method in this file (and every HTTP handler in Session 4)
// must go through — never store.GetActiveQuestForBranch directly, and
// never anything that accepts a quest_id from the request.
func (svc *Service) GetRoom(ctx context.Context, user *store.User) (*store.Quest, error) {
	if user == nil || strings.TrimSpace(user.Branch) == "" {
		return nil, ErrRoomNotOpen
	}
	quest, err := svc.Store.GetActiveQuestForBranch(ctx, user.Branch, time.Now())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, ErrRoomNotOpen
		}
		return nil, fmt.Errorf("resolve debrief room: %w", err)
	}
	return quest, nil
}

// RoomWindow returns the open/close bounds of quest's debrief room.
// quest must be one already returned by GetRoom (so ClosedAt is
// guaranteed non-nil) — Session 4's "room metadata" endpoint uses this
// to tell the client when the room opened and when it'll close.
func RoomWindow(quest *store.Quest) (opensAt, closesAt time.Time) {
	opensAt = *quest.ClosedAt
	closesAt = opensAt.Add(store.DebriefWindow)
	return opensAt, closesAt
}

// ListMessages returns every message posted in the caller's branch's
// room after `since`, oldest first. Resolves the room fresh from
// user.Branch on every call rather than trusting a previously-resolved
// quest ID, so a room that expires mid-session stops being readable the
// moment the window closes rather than at the next page load.
func (svc *Service) ListMessages(ctx context.Context, user *store.User, since time.Time) ([]*store.DebriefMessage, error) {
	quest, err := svc.GetRoom(ctx, user)
	if err != nil {
		return nil, err
	}
	msgs, err := svc.Store.ListDebriefMessagesSince(ctx, quest.ID, since)
	if err != nil {
		return nil, fmt.Errorf("list debrief messages: %w", err)
	}
	return msgs, nil
}

// PostMessage validates and writes a new chat message from user into
// their branch's currently-open debrief room. Returns the fully
// hydrated message (author name/avatar attached), ready to hand
// straight to the broadcaster (Session 5) and the HTTP response
// (Session 4).
func (svc *Service) PostMessage(ctx context.Context, user *store.User, rawContent string) (*store.DebriefMessage, error) {
	quest, err := svc.GetRoom(ctx, user)
	if err != nil {
		return nil, err
	}

	content := strings.TrimSpace(rawContent)
	if content == "" {
		return nil, ErrMessageEmpty
	}
	if len(content) > MaxMessageLength {
		return nil, ErrMessageTooLong
	}

	if !svc.limiter.Allow(user.ID) {
		return nil, ErrRateLimited
	}

	msg, err := svc.Store.InsertDebriefMessage(ctx, quest.ID, user.ID, content)
	if err != nil {
		return nil, fmt.Errorf("insert debrief message: %w", err)
	}
	return msg, nil
}
