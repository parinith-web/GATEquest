package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"gatequest-auth/internal/auth"
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
