package auth

import "net/http"

// Me returns the current logged-in user, or 401 if there is none. The
// frontend calls this on load to decide whether to show the app or the
// login page.
func (m *Manager) Me(w http.ResponseWriter, r *http.Request) {
	u := m.CurrentUser(r)
	if u == nil {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": userDTO(u)})
}

// Logout clears the session, both server-side and the cookie.
func (m *Manager) Logout(w http.ResponseWriter, r *http.Request) {
	m.ClearSession(w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
