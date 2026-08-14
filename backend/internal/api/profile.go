package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/store"
)

// maxAvatarDataURILen caps the base64 data URI we'll accept for an
// avatar. Frontend resizes/compresses the image before sending it, but
// this is a hard backstop against someone hand-crafting a huge request —
// ~1.5MB of base64 is roughly a 1MB image, comfortably more than a
// profile picture needs.
const maxAvatarDataURILen = 1_500_000

type updateAvatarRequest struct {
	// AvatarURL is either a "data:image/...;base64,..." data URI (from
	// the profile page's upload control) or a plain https:// URL. Stored
	// as-is in the users.avatar_url column either way.
	AvatarURL string `json:"avatarUrl"`
}

// POST /api/profile/avatar
func (h *Handlers) UpdateAvatar(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body updateAvatarRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	url := strings.TrimSpace(body.AvatarURL)
	if url == "" {
		writeError(w, http.StatusBadRequest, "avatarUrl is required")
		return
	}
	if len(url) > maxAvatarDataURILen {
		writeError(w, http.StatusBadRequest, "image too large — please use a smaller picture")
		return
	}
	isDataURI := strings.HasPrefix(url, "data:image/")
	isHTTPURL := strings.HasPrefix(url, "https://") || strings.HasPrefix(url, "http://")
	if !isDataURI && !isHTTPURL {
		writeError(w, http.StatusBadRequest, "avatarUrl must be an image data URI or an http(s) URL")
		return
	}

	if err := h.Store.UpdateAvatar(r.Context(), user.ID, url); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update avatar")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "avatarUrl": url})
}

type updateNameRequest struct {
	Name string `json:"name"`
}

// POST /api/profile/name
// Updates the user's display/profile name — distinct from their unique
// @username, this is the free-form name shown next to the avatar
// (e.g. "Parinith Reddy").
func (h *Handlers) UpdateName(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body updateNameRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if len(name) > 60 {
		writeError(w, http.StatusBadRequest, "name must be 60 characters or fewer")
		return
	}

	if err := h.Store.UpdateName(r.Context(), user.ID, name); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update name")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "name": name})
}

type setBranchRequest struct {
	// Branch is the full discipline name, e.g. "Computer Science" (from
	// the main onboarding grid) or any other discipline name (from the
	// free-form "Explore other disciplines" picker).
	Branch string `json:"branch"`
}

// POST /api/profile/branch
// First step of onboarding: pick the engineering discipline that scopes
// this account's weekly quest leaderboard. Stored on the account itself
// (not the browser), so it follows the user to any device they sign in
// from. Can be called again later to change branches from settings.
func (h *Handlers) SetBranch(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body setBranchRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	branch := strings.TrimSpace(body.Branch)
	if branch == "" {
		writeError(w, http.StatusBadRequest, "branch is required")
		return
	}
	if len(branch) > 100 {
		writeError(w, http.StatusBadRequest, "branch name is too long")
		return
	}
	// Stored as-is: quest eligibility is a strict string match against
	// `quests.branch`, so this should line up with whatever an admin
	// types when scoping a quest to a branch — but a free-form value
	// from the "explore other disciplines" picker is fine too, it just
	// won't match any quest until quests exist for that branch.
	if err := h.Store.SetBranch(r.Context(), user.ID, branch); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update branch")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "branch": branch})
}

// usernamePattern mirrors common "handle" rules (GitHub, Discord, etc.):
// letters, digits, and underscores only, 3–20 characters, so it's safe
// to display, URL-embed, and @-mention without further escaping.
var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)

type setUsernameRequest struct {
	Username string `json:"username"`
}

// POST /api/profile/username
// Second and final step of onboarding: claim a unique handle, shown on
// the profile page. Case-insensitively unique across all accounts —
// see migrations/0007_username.sql and store.SetUsername.
func (h *Handlers) SetUsername(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body setUsernameRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	username := strings.TrimSpace(body.Username)
	if !usernamePattern.MatchString(username) {
		writeError(w, http.StatusBadRequest, "username must be 3-20 characters: letters, numbers, and underscores only")
		return
	}

	if err := h.Store.SetUsername(r.Context(), user.ID, username); err != nil {
		if errors.Is(err, store.ErrUsernameTaken) {
			writeError(w, http.StatusConflict, "that username is already taken")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update username")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "username": username})
}
