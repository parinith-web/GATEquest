// Package store holds all server-side state: user accounts, login
// sessions, and the short-lived WebAuthn "ceremony" data that has to
// survive between the /begin and /finish calls of a passkey registration
// or login.
//
// This is an in-memory implementation, guarded by a mutex, which is fine
// for development and small deployments but is NOT persistent — restarting
// the process forgets every user and credential. Before shipping this to
// real users, swap Store's internals for a real database (Postgres,
// SQLite, etc.) behind the same method set so the rest of the app doesn't
// need to change. That is the main thing left "unfinished" here on purpose,
// since it depends on which DB you want to standardize on.
package store

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

var (
	ErrNotFound = errors.New("not found")
	ErrExpired  = errors.New("expired")
)

// User is a single account. It can have originated from Google sign-in,
// passkey registration, or both (the two are linked by email when both
// are used).
type User struct {
	ID        uuid.UUID
	Email     string
	Name      string
	AvatarURL string

	// GoogleSub is Google's stable subject identifier for this user,
	// empty if the account has never signed in with Google.
	GoogleSub string

	Credentials []webauthn.Credential

	CreatedAt time.Time
}

// WebAuthnID, WebAuthnName, WebAuthnDisplayName, WebAuthnCredentials
// implement the webauthn.User interface so *User can be passed directly
// into the go-webauthn ceremony functions.
func (u *User) WebAuthnID() []byte                         { return u.ID[:] }
func (u *User) WebAuthnName() string                       { return u.Email }
func (u *User) WebAuthnDisplayName() string                { return u.displayName() }
func (u *User) WebAuthnCredentials() []webauthn.Credential { return u.Credentials }

func (u *User) displayName() string {
	if u.Name != "" {
		return u.Name
	}
	return u.Email
}

// Session is an issued login session, referenced by an opaque random
// token that lives in an httpOnly cookie. We store it server-side
// (rather than as a signed JWT) so a session can be revoked immediately
// on logout.
type Session struct {
	Token     string
	UserID    uuid.UUID
	CreatedAt time.Time
	ExpiresAt time.Time
}

// Store is all server-side state.
type Store struct {
	mu sync.RWMutex

	usersByID    map[uuid.UUID]*User
	usersByEmail map[string]uuid.UUID
	usersByGoog  map[string]uuid.UUID

	sessions map[string]*Session

	// webauthnCeremonies holds SessionData for an in-flight registration
	// or login, keyed by a random ceremony ID handed to the client via
	// a short-lived cookie.
	webauthnCeremonies map[string]*ceremony
}

type ceremony struct {
	Data      webauthn.SessionData
	ExpiresAt time.Time
}

func New() *Store {
	return &Store{
		usersByID:          make(map[uuid.UUID]*User),
		usersByEmail:       make(map[string]uuid.UUID),
		usersByGoog:        make(map[string]uuid.UUID),
		sessions:           make(map[string]*Session),
		webauthnCeremonies: make(map[string]*ceremony),
	}
}

// --- Users -----------------------------------------------------------

func (s *Store) CreateUser(email, name, avatarURL, googleSub string) *User {
	s.mu.Lock()
	defer s.mu.Unlock()

	u := &User{
		ID:        uuid.New(),
		Email:     email,
		Name:      name,
		AvatarURL: avatarURL,
		GoogleSub: googleSub,
		CreatedAt: time.Now(),
	}
	s.usersByID[u.ID] = u
	if email != "" {
		s.usersByEmail[email] = u.ID
	}
	if googleSub != "" {
		s.usersByGoog[googleSub] = u.ID
	}
	return u
}

func (s *Store) GetUserByID(id uuid.UUID) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.usersByID[id]
	if !ok {
		return nil, ErrNotFound
	}
	return u, nil
}

func (s *Store) GetUserByEmail(email string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.usersByEmail[email]
	if !ok {
		return nil, ErrNotFound
	}
	return s.usersByID[id], nil
}

func (s *Store) GetUserByGoogleSub(sub string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.usersByGoog[sub]
	if !ok {
		return nil, ErrNotFound
	}
	return s.usersByID[id], nil
}

// LinkGoogleAccount attaches a Google subject ID to an existing user
// (e.g. one that was originally created via passkey registration and is
// now also signing in with Google using the same email).
func (s *Store) LinkGoogleAccount(userID uuid.UUID, googleSub string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if u, ok := s.usersByID[userID]; ok {
		u.GoogleSub = googleSub
		s.usersByGoog[googleSub] = userID
	}
}

func (s *Store) AddCredential(userID uuid.UUID, cred webauthn.Credential) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.usersByID[userID]
	if !ok {
		return ErrNotFound
	}
	u.Credentials = append(u.Credentials, cred)
	return nil
}

// UpdateCredential persists an updated credential (e.g. new sign counter)
// after a successful login. go-webauthn returns the updated Credential
// from FinishLogin/FinishPasskeyLogin — the caller must save it back or
// the clone-detection signature counter check becomes useless.
func (s *Store) UpdateCredential(userID uuid.UUID, cred webauthn.Credential) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.usersByID[userID]
	if !ok {
		return ErrNotFound
	}
	for i, c := range u.Credentials {
		if string(c.ID) == string(cred.ID) {
			u.Credentials[i] = cred
			return nil
		}
	}
	return ErrNotFound
}

// GetUserByCredentialUserHandle looks up a user by the raw WebAuthn user
// handle bytes returned during a discoverable (usernameless) passkey
// login. This is the DiscoverableUserHandler callback go-webauthn calls.
func (s *Store) GetUserByCredentialUserHandle(userHandle []byte) (*User, error) {
	id, err := uuid.FromBytes(userHandle)
	if err != nil {
		return nil, ErrNotFound
	}
	return s.GetUserByID(id)
}

// --- Sessions ----------------------------------------------------------

func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (s *Store) CreateSession(userID uuid.UUID, ttl time.Duration) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess := &Session{
		Token:     randomToken(),
		UserID:    userID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(ttl),
	}
	s.sessions[sess.Token] = sess
	return sess
}

func (s *Store) GetSession(token string) (*Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess, ok := s.sessions[token]
	if !ok {
		return nil, ErrNotFound
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil, ErrExpired
	}
	return sess, nil
}

func (s *Store) DeleteSession(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
}

// --- WebAuthn ceremony state --------------------------------------------

// SaveCeremony stashes the SessionData produced by BeginRegistration /
// BeginLogin under a fresh random ID and returns that ID, so it can be
// round-tripped to the client in a short-lived cookie and looked back up
// on the matching /finish call.
func (s *Store) SaveCeremony(data webauthn.SessionData) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := hex.EncodeToString(func() []byte {
		b := make([]byte, 16)
		_, _ = rand.Read(b)
		return b
	}())
	s.webauthnCeremonies[id] = &ceremony{
		Data:      data,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	return id
}

func (s *Store) TakeCeremony(id string) (webauthn.SessionData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.webauthnCeremonies[id]
	if !ok {
		return webauthn.SessionData{}, ErrNotFound
	}
	delete(s.webauthnCeremonies, id) // one-shot: a ceremony is used exactly once
	if time.Now().After(c.ExpiresAt) {
		return webauthn.SessionData{}, ErrExpired
	}
	return c.Data, nil
}
