// Google sign-in implemented directly against Google's OAuth endpoints
// with the standard library, rather than pulling in a client SDK. It's
// the standard Authorization Code + PKCE flow:
//
//  1. GET /api/auth/google/login   -> redirect browser to Google's consent screen
//  2. Google redirects back to     -> GET /api/auth/google/callback?code=...&state=...
//  3. We exchange the code for tokens, fetch the user's profile, and
//     create/find the local user, then issue our own session cookie and
//     redirect back to the frontend.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"gatequest-auth/internal/store"
)

const (
	googleAuthURL     = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenURL    = "https://oauth2.googleapis.com/token"
	googleUserinfoURL = "https://openidconnect.googleapis.com/v1/userinfo"

	oauthStateCookie = "gq_oauth_state"
	oauthPKCECookie  = "gq_oauth_pkce"
)

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type googleUserinfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func randomURLSafe(nBytes int) string {
	b := make([]byte, nBytes)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// GoogleLogin starts the flow: generate CSRF state + a PKCE verifier,
// stash both in short-lived cookies, and redirect to Google.
func (m *Manager) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state := randomURLSafe(24)
	verifier := randomURLSafe(32)
	challenge := pkceChallenge(verifier)

	http.SetCookie(w, m.baseCookie(oauthStateCookie, state, 10*60))
	http.SetCookie(w, m.baseCookie(oauthPKCECookie, verifier, 10*60))

	q := url.Values{}
	q.Set("client_id", m.Cfg.GoogleClientID)
	q.Set("redirect_uri", m.Cfg.GoogleRedirectURL)
	q.Set("response_type", "code")
	q.Set("scope", "openid email profile")
	q.Set("state", state)
	q.Set("code_challenge", challenge)
	q.Set("code_challenge_method", "S256")
	// Only ask for a refresh token / re-consent when we actually need it;
	// for plain "log in with Google" this can be omitted. Left here as a
	// reminder of where it would go:
	// q.Set("access_type", "offline")
	// q.Set("prompt", "consent")

	http.Redirect(w, r, googleAuthURL+"?"+q.Encode(), http.StatusFound)
}

// GoogleCallback validates state, exchanges the code for tokens using the
// PKCE verifier, fetches the user's profile, upserts the local user, and
// logs them in.
func (m *Manager) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if errParam := r.URL.Query().Get("error"); errParam != "" {
		m.redirectToFrontendWithError(w, r, "google_denied")
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		m.redirectToFrontendWithError(w, r, "missing_code_or_state")
		return
	}

	stateCookie, err1 := r.Cookie(oauthStateCookie)
	verifierCookie, err2 := r.Cookie(oauthPKCECookie)
	if err1 != nil || err2 != nil || stateCookie.Value != state {
		m.redirectToFrontendWithError(w, r, "state_mismatch")
		return
	}
	// One-shot: clear the temporary cookies now that we've read them.
	http.SetCookie(w, m.baseCookie(oauthStateCookie, "", -1))
	http.SetCookie(w, m.baseCookie(oauthPKCECookie, "", -1))

	tok, err := m.exchangeGoogleCode(code, verifierCookie.Value)
	if err != nil {
		m.redirectToFrontendWithError(w, r, "token_exchange_failed")
		return
	}

	profile, err := m.fetchGoogleUserinfo(tok.AccessToken)
	if err != nil {
		m.redirectToFrontendWithError(w, r, "userinfo_failed")
		return
	}
	if !profile.EmailVerified {
		m.redirectToFrontendWithError(w, r, "email_not_verified")
		return
	}

	user, err := m.findOrCreateGoogleUser(profile)
	if err != nil {
		m.redirectToFrontendWithError(w, r, "user_upsert_failed")
		return
	}

	m.IssueSession(w, user.ID)
	http.Redirect(w, r, m.Cfg.FrontendURL+"/", http.StatusFound)
}

func (m *Manager) exchangeGoogleCode(code, verifier string) (*googleTokenResponse, error) {
	form := url.Values{}
	form.Set("client_id", m.Cfg.GoogleClientID)
	form.Set("client_secret", m.Cfg.GoogleClientSecret)
	form.Set("code", code)
	form.Set("code_verifier", verifier)
	form.Set("grant_type", "authorization_code")
	form.Set("redirect_uri", m.Cfg.GoogleRedirectURL)

	req, err := http.NewRequest(http.MethodPost, googleTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tok googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tok); err != nil {
		return nil, err
	}
	if tok.Error != "" {
		return nil, errors.New(tok.Error + ": " + tok.ErrorDesc)
	}
	return &tok, nil
}

func (m *Manager) fetchGoogleUserinfo(accessToken string) (*googleUserinfo, error) {
	req, err := http.NewRequest(http.MethodGet, googleUserinfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var info googleUserinfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	if info.Sub == "" {
		return nil, errors.New("empty userinfo response")
	}
	return &info, nil
}

func (m *Manager) findOrCreateGoogleUser(p *googleUserinfo) (*store.User, error) {
	if u, err := m.Store.GetUserByGoogleSub(p.Sub); err == nil {
		return u, nil
	}
	// Not seen this Google account before. If a passkey account already
	// exists with the same email, link them instead of creating a
	// duplicate user.
	if u, err := m.Store.GetUserByEmail(p.Email); err == nil {
		m.Store.LinkGoogleAccount(u.ID, p.Sub)
		return u, nil
	}
	return m.Store.CreateUser(p.Email, p.Name, p.Picture, p.Sub), nil
}

func (m *Manager) redirectToFrontendWithError(w http.ResponseWriter, r *http.Request, code string) {
	q := url.Values{}
	q.Set("auth_error", code)
	http.Redirect(w, r, m.Cfg.FrontendURL+"/login?"+q.Encode(), http.StatusFound)
}
