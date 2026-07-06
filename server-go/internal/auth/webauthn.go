// Passkey registration and login, built on github.com/go-webauthn/webauthn.
//
// Two ceremonies, each split into a /begin and /finish call:
//
//	Registration (creating a new passkey for a new or existing account):
//	  POST /api/auth/passkey/register/begin   {email, name}
//	  POST /api/auth/passkey/register/finish  {attestation response from browser}
//
//	Login (usernameless / "discoverable" — the browser's platform
//	authenticator picks which credential to use, so the user doesn't
//	have to type anything):
//	  POST /api/auth/passkey/login/begin
//	  POST /api/auth/passkey/login/finish     {assertion response from browser}
package auth

import (
	"encoding/json"
	"net/http"

	"gatequest-auth/internal/store"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// WebAuthnHandlers bundles the *webauthn.WebAuthn instance alongside the
// shared Manager (store + cookies) so handlers can be simple methods.
type WebAuthnHandlers struct {
	*Manager
	WA *webauthn.WebAuthn
}

func NewWebAuthnHandlers(m *Manager) (*WebAuthnHandlers, error) {
	wa, err := webauthn.New(&webauthn.Config{
		RPID:          m.Cfg.RPID,
		RPDisplayName: m.Cfg.RPDisplayName,
		RPOrigins:     m.Cfg.RPOrigins,
	})
	if err != nil {
		return nil, err
	}
	return &WebAuthnHandlers{Manager: m, WA: wa}, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// --- Registration --------------------------------------------------------

type registerBeginRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// RegisterBegin creates the user record if it doesn't exist yet (or reuses
// it if this email already has a Google-linked account) and returns
// WebAuthn creation options for the browser to pass to
// navigator.credentials.create().
func (h *WebAuthnHandlers) RegisterBegin(w http.ResponseWriter, r *http.Request) {
	var req registerBeginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		writeErr(w, http.StatusBadRequest, "email is required")
		return
	}

	user, err := h.Store.GetUserByEmail(req.Email)
	if err != nil {
		user = h.Store.CreateUser(req.Email, req.Name, "", "")
	}

	options, sessionData, err := h.WA.BeginRegistration(user)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not begin registration")
		return
	}

	ceremonyID := h.Store.SaveCeremony(*sessionData)
	h.setCeremonyCookie(w, ceremonyID)

	writeJSON(w, http.StatusOK, options)
}

// RegisterFinish verifies the browser's attestation response against the
// stashed challenge, stores the new credential, and logs the user in.
func (h *WebAuthnHandlers) RegisterFinish(w http.ResponseWriter, r *http.Request) {
	ceremonyID, ok := h.takeCeremonyCookie(r)
	if !ok {
		writeErr(w, http.StatusBadRequest, "missing or expired registration session")
		return
	}
	h.clearCeremonyCookie(w)

	sessionData, err := h.Store.TakeCeremony(ceremonyID)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "registration session expired, please retry")
		return
	}

	uid, err := uuid.FromBytes(sessionData.UserID)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "corrupt registration session")
		return
	}
	user, err := h.Store.GetUserByID(uid)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "unknown user for this registration session")
		return
	}

	credential, err := h.WA.FinishRegistration(user, sessionData, r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "passkey verification failed: "+err.Error())
		return
	}

	if err := h.Store.AddCredential(user.ID, *credential); err != nil {
		writeErr(w, http.StatusInternalServerError, "could not save passkey")
		return
	}

	h.IssueSession(w, user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "user": userDTO(user)})
}

// --- Login (usernameless / discoverable) ----------------------------------

// LoginBegin returns WebAuthn request options for a discoverable login:
// the user just taps their platform authenticator and it presents
// whichever passkeys it has for this site, with no username typed first.
func (h *WebAuthnHandlers) LoginBegin(w http.ResponseWriter, r *http.Request) {
	options, sessionData, err := h.WA.BeginDiscoverableLogin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not begin login")
		return
	}

	ceremonyID := h.Store.SaveCeremony(*sessionData)
	h.setCeremonyCookie(w, ceremonyID)

	writeJSON(w, http.StatusOK, options)
}

// LoginFinish verifies the assertion, identifies which user it belongs to
// via the credential's user handle, persists the updated signature
// counter, and logs the user in.
func (h *WebAuthnHandlers) LoginFinish(w http.ResponseWriter, r *http.Request) {
	ceremonyID, ok := h.takeCeremonyCookie(r)
	if !ok {
		writeErr(w, http.StatusBadRequest, "missing or expired login session")
		return
	}
	h.clearCeremonyCookie(w)

	sessionData, err := h.Store.TakeCeremony(ceremonyID)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "login session expired, please retry")
		return
	}

	handler := func(rawID, userHandle []byte) (webauthn.User, error) {
		return h.Store.GetUserByCredentialUserHandle(userHandle)
	}

	user, credential, err := h.WA.FinishPasskeyLogin(handler, sessionData, r)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "passkey login failed: "+err.Error())
		return
	}

	su := user.(*store.User)
	_ = h.Store.UpdateCredential(su.ID, *credential)

	h.IssueSession(w, su.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "user": userDTO(su)})
}

// --- shared helpers --------------------------------------------------------

func userDTO(u *store.User) map[string]any {
	return map[string]any{
		"id":         u.ID.String(),
		"email":      u.Email,
		"name":       u.Name,
		"avatarUrl":  u.AvatarURL,
		"hasPasskey": len(u.Credentials) > 0,
		"hasGoogle":  u.GoogleSub != "",
	}
}
