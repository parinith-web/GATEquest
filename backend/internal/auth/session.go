package auth

import (
	"context"
	"net/http"
	"time"

	"gatequest-auth/internal/config"
	"gatequest-auth/internal/store"

	"github.com/google/uuid"
)

const (
	sessionCookieName  = "gq_session"
	ceremonyCookieName = "gq_webauthn_ceremony"
	sessionTTL         = 30 * 24 * time.Hour // 30 days
)

type contextKey string

const userContextKey contextKey = "user"

// Manager wires together the store + config for issuing/reading cookies.
type Manager struct {
	Store *store.Store
	Cfg   *config.Config
}

func NewManager(s *store.Store, cfg *config.Config) *Manager {
	return &Manager{Store: s, Cfg: cfg}
}

func (m *Manager) baseCookie(name, value string, maxAge int) *http.Cookie {
	// The frontend (Vercel) and this backend live on different domains in
	// production, so the session/ceremony cookies are cross-site from the
	// browser's point of view. Cross-site cookies require SameSite=None,
	// which in turn requires Secure=true (browsers reject SameSite=None
	// without Secure). Locally, both run on http://localhost on different
	// ports, which browsers also treat as cross-site for cookie purposes —
	// but SameSite=None without HTTPS is rejected there too, so we fall
	// back to Lax for local dev (works because Vite's dev proxy makes
	// requests look same-origin to the browser).
	sameSite := http.SameSiteLaxMode
	if m.Cfg.CookieSecure {
		sameSite = http.SameSiteNoneMode
	}
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.Cfg.CookieSecure,
		SameSite: sameSite,
		Domain:   m.Cfg.CookieDomain,
		MaxAge:   maxAge,
	}
}

// IssueSession creates a new server-side session for userID and sets the
// session cookie on the response.
func (m *Manager) IssueSession(w http.ResponseWriter, userID uuid.UUID) {
	sess := m.Store.CreateSession(userID, sessionTTL)
	http.SetCookie(w, m.baseCookie(sessionCookieName, sess.Token, int(sessionTTL.Seconds())))
}

// ClearSession deletes the session server-side and expires the cookie.
func (m *Manager) ClearSession(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookieName); err == nil {
		m.Store.DeleteSession(c.Value)
	}
	http.SetCookie(w, m.baseCookie(sessionCookieName, "", -1))
}

// CurrentUser resolves the logged-in user from the request's session
// cookie, or returns nil if there isn't a valid one.
func (m *Manager) CurrentUser(r *http.Request) *store.User {
	c, err := r.Cookie(sessionCookieName)
	if err != nil {
		return nil
	}
	sess, err := m.Store.GetSession(c.Value)
	if err != nil {
		return nil
	}
	u, err := m.Store.GetUserByID(sess.UserID)
	if err != nil {
		return nil
	}
	return u
}

// RequireAuth is middleware that rejects requests with no valid session
// and otherwise attaches the *store.User to the request context.
func (m *Manager) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := m.CurrentUser(r)
		if u == nil {
			http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, u)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAdmin builds on RequireAuth: it must be mounted inside a group
// that already ran RequireAuth (so the user is in context), and further
// rejects any request from a non-admin user. Used to gate quest
// creation/close endpoints to whoever sets up the weekly contest.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := UserFromContext(r.Context())
		if u == nil || !u.IsAdmin {
			http.Error(w, `{"error":"admin access required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func UserFromContext(ctx context.Context) *store.User {
	u, _ := ctx.Value(userContextKey).(*store.User)
	return u
}

// --- WebAuthn ceremony cookie (short-lived, separate from the login session) ---

func (m *Manager) setCeremonyCookie(w http.ResponseWriter, ceremonyID string) {
	http.SetCookie(w, m.baseCookie(ceremonyCookieName, ceremonyID, 5*60))
}

func (m *Manager) takeCeremonyCookie(r *http.Request) (string, bool) {
	c, err := r.Cookie(ceremonyCookieName)
	if err != nil {
		return "", false
	}
	return c.Value, true
}

func (m *Manager) clearCeremonyCookie(w http.ResponseWriter) {
	http.SetCookie(w, m.baseCookie(ceremonyCookieName, "", -1))
}
