// Package store holds all server-side state: user accounts, login
// sessions, and the short-lived WebAuthn "ceremony" data that has to
// survive between the /begin and /finish calls of a passkey registration
// or login.
//
// This is a Postgres-backed implementation (tested against Neon). It
// keeps the exact same public API the earlier in-memory version had, so
// nothing else in the codebase needs to change — auth/*.go calls these
// methods without knowing or caring where the data actually lives.
package store

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
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

	// Branch scopes weekly quest leaderboards to "your branch mates
	// only" (e.g. "Computer Science", "Data Science and Artificial
	// Intelligence", matching the same values used as questions.subject).
	// Empty until the user sets it (onboarding or profile settings).
	Branch string

	// Username is the unique, user-chosen handle set during onboarding
	// (after branch selection) and shown on the profile page in place
	// of the account's real name. Empty until the user sets it —
	// onboarding isn't considered complete until both Branch and
	// Username are non-empty (see (u *User) OnboardingComplete).
	Username string

	// IsAdmin gates who can create/close quests server-side.
	IsAdmin bool

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

// OnboardingComplete reports whether this account has finished the
// post-login setup flow: pick a branch, then claim a username. The
// frontend gates every real page behind this so a signed-in user with
// only one of the two set is always routed back to finish onboarding
// rather than being able to skip a step by navigating directly.
func (u *User) OnboardingComplete() bool {
	return u.Branch != "" && u.Username != ""
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

// Store is all server-side state, backed by a Postgres connection pool.
type Store struct {
	db *pgxpool.Pool
}

// New opens a connection pool against dsn (a standard Postgres
// connection string — Neon's "Connection string" from its dashboard
// works as-is, e.g. postgres://user:pass@host/db?sslmode=require) and
// verifies it with a ping. Callers should call Close when done (e.g. on
// shutdown); a canceled ctx or unreachable database returns an error
// instead of panicking so main() can fail fast with a clear message.
//
// Pool sizing is tuned for a free-tier Neon compute that periodically
// auto-suspends: MinConns keeps a small floor of connections open once
// the DB is awake, so a burst of requests right after a cold start
// doesn't force a fresh TCP+TLS handshake per request on top of the
// compute resume itself. MaxConnIdleTime is set slightly under Render's
// own idle-sleep window so idle pool connections get recycled on our
// terms rather than getting cut from underneath us.
func New(ctx context.Context, dsn string) (*Store, error) {
	poolCfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	poolCfg.MinConns = 2
	poolCfg.MaxConns = 10
	poolCfg.MaxConnIdleTime = 4 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{db: pool}, nil
}

func (s *Store) Close() {
	s.db.Close()
}

// Ping verifies the database connection is alive and responsive. Used by
// the /healthz route so external uptime pingers (and the process itself)
// can confirm the DB — not just the Go process — is actually reachable.
// On Neon's free tier this also serves to nudge an auto-suspended compute
// back awake as part of a keep-warm ping, rather than leaving that to the
// first real user request.
func (s *Store) Ping(ctx context.Context) error {
	return s.db.Ping(ctx)
}

// --- Users -----------------------------------------------------------

func (s *Store) CreateUser(email, name, avatarURL, googleSub string) *User {
	ctx := context.Background()
	u := &User{
		ID:        uuid.New(),
		Email:     email,
		Name:      name,
		AvatarURL: avatarURL,
		GoogleSub: googleSub,
		CreatedAt: time.Now(),
	}

	var email_, googleSub_ *string
	if email != "" {
		email_ = &email
	}
	if googleSub != "" {
		googleSub_ = &googleSub
	}

	// Errors here are swallowed to keep this method's signature matching
	// the previous in-memory version (which couldn't fail). In practice
	// this only fails on a broken connection or a duplicate email/sub,
	// which auth/*.go should be preventing upstream by checking
	// GetUserByEmail / GetUserByGoogleSub first.
	_, _ = s.db.Exec(ctx,
		`INSERT INTO users (id, email, name, avatar_url, google_sub, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		u.ID, email_, u.Name, u.AvatarURL, googleSub_, u.CreatedAt,
	)
	return u
}

func (s *Store) GetUserByID(id uuid.UUID) (*User, error) {
	return s.loadUser(context.Background(), "id = $1", id)
}

func (s *Store) GetUserByEmail(email string) (*User, error) {
	return s.loadUser(context.Background(), "email = $1", email)
}

func (s *Store) GetUserByGoogleSub(sub string) (*User, error) {
	return s.loadUser(context.Background(), "google_sub = $1", sub)
}

// GetUsersByIDs batch-loads basic display info (id, name, email,
// avatar) for a set of user IDs in one query, rather than N+1 individual
// GetUserByID calls. Used to attach display names to quest leaderboard /
// results rows, which only carry user IDs from Redis/Postgres. Missing
// IDs (shouldn't normally happen — a FK violation would have stopped
// the row being written) are simply absent from the returned map rather
// than erroring the whole batch.
func (s *Store) GetUsersByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]*User, error) {
	out := make(map[uuid.UUID]*User, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := s.db.Query(ctx,
		`SELECT id, email, name, avatar_url FROM users WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var u User
		var email *string
		if err := rows.Scan(&u.ID, &email, &u.Name, &u.AvatarURL); err != nil {
			return nil, err
		}
		if email != nil {
			u.Email = *email
		}
		out[u.ID] = &u
	}
	return out, rows.Err()
}

// loadUser fetches a user row by the given WHERE clause/arg, then loads
// their credentials in a second query.
func (s *Store) loadUser(ctx context.Context, where string, arg any) (*User, error) {
	var u User
	var email, googleSub *string
	row := s.db.QueryRow(ctx,
		`SELECT id, email, name, avatar_url, google_sub, branch, username, is_admin, created_at FROM users WHERE `+where,
		arg,
	)
	if err := row.Scan(&u.ID, &email, &u.Name, &u.AvatarURL, &googleSub, &u.Branch, &u.Username, &u.IsAdmin, &u.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if email != nil {
		u.Email = *email
	}
	if googleSub != nil {
		u.GoogleSub = *googleSub
	}

	creds, err := s.loadCredentials(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	u.Credentials = creds
	return &u, nil
}

func (s *Store) loadCredentials(ctx context.Context, userID uuid.UUID) ([]webauthn.Credential, error) {
	rows, err := s.db.Query(ctx, `SELECT data FROM credentials WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []webauthn.Credential
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var c webauthn.Credential
		if err := json.Unmarshal(raw, &c); err != nil {
			return nil, err
		}
		creds = append(creds, c)
	}
	return creds, rows.Err()
}

// UpdateAvatar sets a user's avatar_url — either a plain image URL (e.g.
// the one Google supplied at signup) or a "data:image/...;base64,..."
// data URI when the user uploads their own picture from the profile
// page. Storing the data URI directly in Postgres avoids needing any
// object-storage/CDN setup; avatar_url is TEXT with no length cap.
func (s *Store) UpdateAvatar(ctx context.Context, userID uuid.UUID, avatarURL string) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE users SET avatar_url = $1 WHERE id = $2`, avatarURL, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SetBranch sets the branch (e.g. "Computer Science") a user belongs to,
// which scopes which weekly quest leaderboard they compete on. Can be
// changed later from the profile page; a user only ever competes on
// whatever branch they're currently set to at the time a quest starts.
func (s *Store) SetBranch(ctx context.Context, userID uuid.UUID, branch string) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE users SET branch = $1 WHERE id = $2`, branch, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ErrUsernameTaken is returned by SetUsername when another account
// already holds that username (case-insensitively).
var ErrUsernameTaken = errors.New("username already taken")

// SetUsername claims a unique, user-chosen handle for userID — the
// second and final step of onboarding, after SetBranch. Uniqueness is
// enforced case-insensitively by a partial unique index on
// lower(username) (see migrations/0007_username.sql); a violation of
// that index is translated into ErrUsernameTaken so callers don't need
// to know about Postgres error codes.
func (s *Store) SetUsername(ctx context.Context, userID uuid.UUID, username string) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE users SET username = $1 WHERE id = $2`, username, userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrUsernameTaken
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) GetUserByUsername(username string) (*User, error) {
	return s.loadUser(context.Background(), "lower(username) = lower($1)", username)
}

// LinkGoogleAccount attaches a Google subject ID to an existing user
// (e.g. one that was originally created via passkey registration and is
// now also signing in with Google using the same email).
func (s *Store) LinkGoogleAccount(userID uuid.UUID, googleSub string) {
	_, _ = s.db.Exec(context.Background(),
		`UPDATE users SET google_sub = $1 WHERE id = $2`, googleSub, userID)
}

func (s *Store) AddCredential(userID uuid.UUID, cred webauthn.Credential) error {
	data, err := json.Marshal(cred)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(context.Background(),
		`INSERT INTO credentials (credential_id, user_id, data) VALUES ($1, $2, $3)`,
		cred.ID, userID, data,
	)
	return err
}

// UpdateCredential persists an updated credential (e.g. new sign counter)
// after a successful login. go-webauthn returns the updated Credential
// from FinishLogin/FinishPasskeyLogin — the caller must save it back or
// the clone-detection signature counter check becomes useless.
func (s *Store) UpdateCredential(userID uuid.UUID, cred webauthn.Credential) error {
	data, err := json.Marshal(cred)
	if err != nil {
		return err
	}
	tag, err := s.db.Exec(context.Background(),
		`UPDATE credentials SET data = $1 WHERE credential_id = $2 AND user_id = $3`,
		data, cred.ID, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
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
	sess := &Session{
		Token:     randomToken(),
		UserID:    userID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(ttl),
	}
	_, _ = s.db.Exec(context.Background(),
		`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)`,
		sess.Token, sess.UserID, sess.CreatedAt, sess.ExpiresAt,
	)
	return sess
}

func (s *Store) GetSession(token string) (*Session, error) {
	var sess Session
	row := s.db.QueryRow(context.Background(),
		`SELECT token, user_id, created_at, expires_at FROM sessions WHERE token = $1`, token)
	if err := row.Scan(&sess.Token, &sess.UserID, &sess.CreatedAt, &sess.ExpiresAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil, ErrExpired
	}
	return &sess, nil
}

func (s *Store) DeleteSession(token string) {
	_, _ = s.db.Exec(context.Background(), `DELETE FROM sessions WHERE token = $1`, token)
}

// DeleteExpiredSessions purges sessions whose expires_at has already
// passed. Expired sessions are already rejected by GetSession (which
// checks expires_at on every lookup), so this is pure storage hygiene —
// nothing user-facing depends on it running promptly, same as
// debrief.Cleaner's purge of lapsed debrief rooms. Without it the table
// only ever grows (30-day TTL sessions, never deleted just for expiring),
// which eventually slows down the GetSession lookup this whole auth flow
// runs on every request.
//
// Returns the number of rows deleted, for the cleanup job's logging.
func (s *Store) DeleteExpiredSessions(ctx context.Context, now time.Time) (int64, error) {
	tag, err := s.db.Exec(ctx, `DELETE FROM sessions WHERE expires_at < $1`, now)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// --- WebAuthn ceremony state --------------------------------------------

// SaveCeremony stashes the SessionData produced by BeginRegistration /
// BeginLogin under a fresh random ID and returns that ID, so it can be
// round-tripped to the client in a short-lived cookie and looked back up
// on the matching /finish call.
func (s *Store) SaveCeremony(data webauthn.SessionData) string {
	id := hex.EncodeToString(func() []byte {
		b := make([]byte, 16)
		_, _ = rand.Read(b)
		return b
	}())

	raw, err := json.Marshal(data)
	if err != nil {
		return id // caller will get ErrNotFound on TakeCeremony; nothing more we can do here
	}
	expiresAt := time.Now().Add(5 * time.Minute)
	_, _ = s.db.Exec(context.Background(),
		`INSERT INTO webauthn_ceremonies (id, data, expires_at) VALUES ($1, $2, $3)`,
		id, raw, expiresAt,
	)
	return id
}

func (s *Store) TakeCeremony(id string) (webauthn.SessionData, error) {
	ctx := context.Background()
	var raw []byte
	var expiresAt time.Time

	// One-shot: delete-and-return in a single round trip so a ceremony
	// can't be replayed even under concurrent requests.
	row := s.db.QueryRow(ctx,
		`DELETE FROM webauthn_ceremonies WHERE id = $1 RETURNING data, expires_at`, id)
	if err := row.Scan(&raw, &expiresAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return webauthn.SessionData{}, ErrNotFound
		}
		return webauthn.SessionData{}, err
	}
	if time.Now().After(expiresAt) {
		return webauthn.SessionData{}, ErrExpired
	}

	var data webauthn.SessionData
	if err := json.Unmarshal(raw, &data); err != nil {
		return webauthn.SessionData{}, err
	}
	return data, nil
}

// DeleteExpiredCeremonies purges WebAuthn ceremony rows whose 5-minute
// window has lapsed. TakeCeremony already deletes a ceremony the moment
// it's successfully used (one-shot, see its doc comment) and rejects
// anything past expires_at, so the only rows this ever finds are ones
// that were started and then abandoned — a register/login flow the user
// never finished. Same "storage hygiene, not correctness" reasoning as
// DeleteExpiredSessions above.
func (s *Store) DeleteExpiredCeremonies(ctx context.Context, now time.Time) (int64, error) {
	tag, err := s.db.Exec(ctx, `DELETE FROM webauthn_ceremonies WHERE expires_at < $1`, now)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
