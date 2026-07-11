// Pulse: session 4 — likes/dislikes, comments, bookmarks, and share on
// top of posts (pulse.go). See store/pulse_interactions.go for the data
// layer these handlers call into.
package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// maxCommentLength keeps a reply shorter than a full post would be
// pointless to enforce tighter, but still bounded so one comment can't
// blow up a thread's payload size.
const maxCommentLength = 1000

type voteRequest struct {
	Value int `json:"value"`
}

type voteResponse struct {
	LikeCount    int `json:"likeCount"`
	DislikeCount int `json:"dislikeCount"`
	UserVote     int `json:"userVote"`
}

// POST /api/pulse/posts/{id}/vote
// Body: {"value": 1}  to like, {"value": -1} to dislike, {"value": 0}
// to clear the caller's reaction. Liking a post you'd disliked (or vice
// versa) replaces the old reaction rather than requiring a clear-first
// call.
func (h *Handlers) VotePost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	postID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	var body voteRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	likeCount, dislikeCount, userVote, err := h.Store.VotePost(r.Context(), postID, user.ID, body.Value)
	if err != nil {
		switch err {
		case store.ErrInvalidVoteValue:
			writeError(w, http.StatusBadRequest, "value must be 1, -1, or 0")
		case store.ErrNotFound:
			writeError(w, http.StatusNotFound, "post not found")
		default:
			writeError(w, http.StatusInternalServerError, "failed to record vote")
		}
		return
	}

	writeJSON(w, http.StatusOK, voteResponse{
		LikeCount:    likeCount,
		DislikeCount: dislikeCount,
		UserVote:     userVote,
	})
}

type commentDTO struct {
	ID           string `json:"id"`
	PostID       string `json:"postId"`
	Author       string `json:"author"`
	AuthorAvatar string `json:"authorAvatar"`
	Content      string `json:"content"`
	CreatedAt    string `json:"createdAt"`
	IsOwner      bool   `json:"isOwner"`
}

func toCommentDTO(c store.Comment, viewerID uuid.UUID) commentDTO {
	return commentDTO{
		ID:           c.ID.String(),
		PostID:       c.PostID.String(),
		Author:       c.AuthorName,
		AuthorAvatar: c.AuthorAvatar,
		Content:      c.Content,
		CreatedAt:    c.CreatedAt.Format(time.RFC3339),
		IsOwner:      viewerID != uuid.Nil && viewerID == c.UserID,
	}
}

type createCommentRequest struct {
	Content string `json:"content"`
}

// POST /api/pulse/posts/{id}/comments
func (h *Handlers) CreateComment(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	postID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	var body createCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	content := strings.TrimSpace(body.Content)
	if content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}
	if len(content) > maxCommentLength {
		writeError(w, http.StatusBadRequest, "content is too long")
		return
	}

	comment, err := h.Store.CreateComment(r.Context(), postID, user.ID, content)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to add comment")
		return
	}
	writeJSON(w, http.StatusCreated, toCommentDTO(*comment, user.ID))
}

// GET /api/pulse/posts/{id}/comments?limit=&offset=
// Public — reading a comment thread doesn't require login, same as the
// posts themselves.
func (h *Handlers) ListComments(w http.ResponseWriter, r *http.Request) {
	postID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	comments, err := h.Store.ListComments(r.Context(), postID, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load comments")
		return
	}
	total, err := h.Store.CountComments(r.Context(), postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count comments")
		return
	}

	viewerID := currentUserID(r)
	out := make([]commentDTO, 0, len(comments))
	for _, c := range comments {
		out = append(out, toCommentDTO(c, viewerID))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"comments": out,
		"total":    total,
	})
}

// DELETE /api/pulse/comments/{id}
// Only the comment's author can delete it.
func (h *Handlers) DeleteComment(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid comment id")
		return
	}

	if err := h.Store.DeleteComment(r.Context(), id, user.ID); err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "comment not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete comment")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/pulse/posts/{id}/bookmark
func (h *Handlers) BookmarkPost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	postID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}
	if err := h.Store.BookmarkPost(r.Context(), postID, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to bookmark post")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "bookmarked": true})
}

// DELETE /api/pulse/posts/{id}/bookmark
func (h *Handlers) UnbookmarkPost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	postID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}
	if err := h.Store.UnbookmarkPost(r.Context(), postID, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove bookmark")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "bookmarked": false})
}

// GET /api/pulse/bookmarks?limit=&offset=
// The caller's saved posts, most-recently-bookmarked first.
func (h *Handlers) ListBookmarks(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	posts, err := h.Store.ListBookmarkedPosts(r.Context(), user.ID, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load bookmarks")
		return
	}
	total, err := h.Store.CountBookmarkedPosts(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count bookmarks")
		return
	}

	out := make([]postDTO, 0, len(posts))
	for _, p := range posts {
		dto := toPostDTO(p, user.ID)
		dto.IsBookmarked = true // every post on this page is, by definition
		out = append(out, dto)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"posts": out,
		"total": total,
	})
}

// POST /api/pulse/posts/{id}/share
// Public — bumps the share counter when a user copies a post's link.
// No auth required and no per-user dedup: it's a lightweight "this got
// shared" signal, not an audit log.
func (h *Handlers) SharePost(w http.ResponseWriter, r *http.Request) {
	postID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}
	shareCount, err := h.Store.IncrementShareCount(r.Context(), postID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to record share")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"shareCount": shareCount})
}
