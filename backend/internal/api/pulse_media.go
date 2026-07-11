// Pulse: session 5 — real image/video upload for post attachments,
// replacing the base64 data URI that used to get sent straight in the
// createPost body. The compose box now uploads the file here first and
// gets back a Cloudinary URL to include as mediaUrl on the actual post.
package api

import (
	"io"
	"net/http"
	"strings"

	"gatequest-auth/internal/auth"
)

// maxUploadBytes caps request size before we even try to parse the
// multipart body — well above what a compressed phone photo or a short
// clip needs, but nowhere near large enough to be a denial-of-service
// vector. Cloudinary's own free-tier per-file limits are more
// permissive than this; this is about protecting our server's memory
// and the user's upload time, not Cloudinary's quota.
const maxUploadBytes = 25 << 20 // 25MB

type uploadMediaResponse struct {
	URL       string `json:"url"`
	MediaType string `json:"mediaType"` // "image" or "video"
}

// POST /api/pulse/upload
// Multipart form, single field "file". Requires auth for the same
// reason CreatePost does — an open upload endpoint on someone else's
// Cloudinary quota is an abuse magnet.
func (h *Handlers) UploadMedia(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	if !h.Media.Configured() {
		writeError(w, http.StatusServiceUnavailable, "media upload is not configured on this server yet")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file is too large or the request is malformed (25MB max)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	// Sniff the real content type from the file bytes rather than
	// trusting header.Header.Get("Content-Type"), which is just
	// whatever the browser claimed and easy to spoof.
	sniffBuf := make([]byte, 512)
	n, _ := io.ReadFull(file, sniffBuf)
	sniffBuf = sniffBuf[:n]
	contentType := http.DetectContentType(sniffBuf)

	var mediaType string
	switch {
	case strings.HasPrefix(contentType, "image/"):
		mediaType = "image"
	case strings.HasPrefix(contentType, "video/"):
		mediaType = "video"
	default:
		writeError(w, http.StatusBadRequest, "only image or video files are supported")
		return
	}

	// Reassemble a reader over the bytes we already sniffed plus
	// whatever's left in the underlying file, so Cloudinary gets the
	// whole thing rather than missing its first 512 bytes.
	fullContent := io.MultiReader(strings.NewReader(string(sniffBuf)), file)

	result, err := h.Media.Upload(r.Context(), header.Filename, fullContent, "pulse")
	if err != nil {
		writeError(w, http.StatusBadGateway, "upload failed: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, uploadMediaResponse{
		URL:       result.SecureURL,
		MediaType: mediaType,
	})
}
