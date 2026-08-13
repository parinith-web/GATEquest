// Pulse: the CS community feed. Session 2 — data model + core posting
// API. Comments, likes/dislikes, and bookmarks are separate endpoints
// added in a later session; this file only covers creating, listing,
// fetching, and deleting posts, plus the channel/trending tag
// aggregates the sidebar needs.
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

// maxPostContentLength keeps posts tweet-sized rather than essay-sized —
// long-form write-ups belong on the Q&A/discussion side of the product,
// Pulse is for quick updates, links, and resources.
const maxPostContentLength = 2000

// mediaDTO mirrors store.PostMedia for the wire — kept as its own type
// (rather than reusing store.PostMedia directly) so the JSON field
// names are an API contract independent of the store's internal shape.
type mediaDTO struct {
	URL  string `json:"url"`
	Type string `json:"type"`
}

type postDTO struct {
	ID           string     `json:"id"`
	Author       string     `json:"author"`
	AuthorAvatar string     `json:"authorAvatar"`
	Content      string     `json:"content"`
	Media        []mediaDTO `json:"media"`
	// MediaURL/MediaType mirror media[0] for older clients that only
	// know about a single attachment — kept as a read-only convenience,
	// never written to independently of Media.
	MediaURL     *string  `json:"mediaUrl"`
	MediaType    *string  `json:"mediaType"`
	Tags         []string `json:"tags"`
	LikeCount    int      `json:"likeCount"`
	DislikeCount int      `json:"dislikeCount"`
	CommentCount int      `json:"commentCount"`
	ShareCount   int      `json:"shareCount"`
	CreatedAt    string   `json:"createdAt"`
	IsOwner      bool     `json:"isOwner"`

	// UserVote is the viewer's current reaction on this post: 1 (liked),
	// -1 (disliked), or 0 (no reaction / anonymous viewer). Hydrated
	// separately via hydratePostDTOs / store.GetUserVotes — toPostDTO
	// itself doesn't query for it, to keep feed listing at one query
	// for N posts instead of N+1.
	UserVote int `json:"userVote"`
	// IsBookmarked mirrors UserVote's hydration pattern for saved posts.
	IsBookmarked bool `json:"isBookmarked"`
}

func toPostDTO(p store.Post, viewerID uuid.UUID) postDTO {
	media := make([]mediaDTO, 0, len(p.Media))
	for _, m := range p.Media {
		media = append(media, mediaDTO{URL: m.URL, Type: m.Type})
	}
	var legacyURL, legacyType *string
	if len(p.Media) > 0 {
		legacyURL = &p.Media[0].URL
		legacyType = &p.Media[0].Type
	}
	return postDTO{
		ID:           p.ID.String(),
		Author:       p.AuthorName,
		AuthorAvatar: p.AuthorAvatar,
		Content:      p.Content,
		Media:        media,
		MediaURL:     legacyURL,
		MediaType:    legacyType,
		Tags:         p.Tags,
		LikeCount:    p.LikeCount,
		DislikeCount: p.DislikeCount,
		CommentCount: p.CommentCount,
		ShareCount:   p.ShareCount,
		CreatedAt:    p.CreatedAt.Format(time.RFC3339),
		IsOwner:      viewerID != uuid.Nil && viewerID == p.UserID,
	}
}

// hydratePostDTOs fills in UserVote/IsBookmarked for a page of posts in
// two batch queries (rather than 2*N single-row lookups). This is
// no-op work (empty maps back) for an anonymous viewer, since
// GetUserVotes/GetUserBookmarks both short-circuit on uuid.Nil.
func (h *Handlers) hydratePostDTOs(r *http.Request, posts []store.Post, viewerID uuid.UUID) ([]postDTO, error) {
	ids := make([]uuid.UUID, len(posts))
	for i, p := range posts {
		ids[i] = p.ID
	}
	votes, err := h.Store.GetUserVotes(r.Context(), viewerID, ids)
	if err != nil {
		return nil, err
	}
	bookmarks, err := h.Store.GetUserBookmarks(r.Context(), viewerID, ids)
	if err != nil {
		return nil, err
	}

	out := make([]postDTO, 0, len(posts))
	for _, p := range posts {
		dto := toPostDTO(p, viewerID)
		dto.UserVote = votes[p.ID]
		dto.IsBookmarked = bookmarks[p.ID]
		out = append(out, dto)
	}
	return out, nil
}

// currentUserID returns the logged-in user's ID, or uuid.Nil if the
// request is unauthenticated — several Pulse read endpoints (list/get/
// channels/trending) are open to anonymous browsing like the question
// bank, and only need the viewer ID to compute "isOwner" flags.
func currentUserID(r *http.Request) uuid.UUID {
	if u := auth.UserFromContext(r.Context()); u != nil {
		return u.ID
	}
	return uuid.Nil
}

type createPostRequest struct {
	Content string `json:"content"`
	// Media is the list of attachments the compose box uploaded before
	// posting (see UploadMedia) — one createPost call can now carry
	// several. Client-supplied, so always routed through
	// store.SanitizeMedia before it reaches the database.
	Media []mediaDTO `json:"media"`
	// MediaURL/MediaType are accepted for backward compatibility with
	// the single-attachment shape — folded into Media below when
	// present and Media itself is empty.
	MediaURL  *string `json:"mediaUrl"`
	MediaType *string `json:"mediaType"`
	// Tags are the personalized labels picked in the compose box's
	// "Add tags" control — the only tagging mechanism a post has.
	// Client-supplied, so always routed through store.SanitizeTags
	// before it reaches the database, same trust posture as every
	// other user-entered field.
	Tags []string `json:"tags"`
}

// POST /api/pulse/posts
// Creates a post. Tags are freeform labels the author chose in the
// compose box, sanitized via store.SanitizeTags before storage — they
// never touch content and content is never parsed for them.
func (h *Handlers) CreatePost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var body createPostRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	content := strings.TrimSpace(body.Content)
	if content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}
	if len(content) > maxPostContentLength {
		writeError(w, http.StatusBadRequest, "content is too long")
		return
	}

	// Fold the legacy single-attachment fields into Media when the
	// caller used those instead of the new list.
	if len(body.Media) == 0 && body.MediaURL != nil && strings.TrimSpace(*body.MediaURL) != "" {
		mt := ""
		if body.MediaType != nil {
			mt = *body.MediaType
		}
		body.Media = []mediaDTO{{URL: *body.MediaURL, Type: mt}}
	}

	media := make([]store.PostMedia, 0, len(body.Media))
	for _, m := range body.Media {
		media = append(media, store.PostMedia{URL: m.URL, Type: m.Type})
	}

	post, err := h.Store.CreatePost(r.Context(), user.ID, content, store.SanitizeMedia(media), store.SanitizeTags(body.Tags))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create post")
		return
	}
	writeJSON(w, http.StatusCreated, toPostDTO(*post, user.ID))
}

// GET /api/pulse/posts?tag=os&sort=hot&limit=20&offset=0
// Public — no auth required to browse the feed, same as the question
// bank. sort is one of "hot" (default), "new", "top".
func (h *Handlers) ListPosts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	filter := store.PostFilter{
		Tag:    q.Get("tag"),
		Sort:   q.Get("sort"),
		Limit:  limit,
		Offset: offset,
	}

	posts, err := h.Store.ListPosts(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load posts")
		return
	}

	total, err := h.Store.CountPosts(r.Context(), filter.Tag)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count posts")
		return
	}

	viewerID := currentUserID(r)
	out, err := h.hydratePostDTOs(r, posts, viewerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load reactions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"posts": out,
		"total": total,
	})
}

// GET /api/pulse/posts/{id}
func (h *Handlers) GetPost(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	post, err := h.Store.GetPost(r.Context(), id)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load post")
		return
	}
	viewerID := currentUserID(r)
	out, err := h.hydratePostDTOs(r, []store.Post{*post}, viewerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load reactions")
		return
	}
	writeJSON(w, http.StatusOK, out[0])
}

// DELETE /api/pulse/posts/{id}
// Only the author can delete their own post.
func (h *Handlers) DeletePost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	if err := h.Store.DeletePost(r.Context(), id, user.ID); err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete post")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type channelDTO struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

// GET /api/pulse/channels?limit=20
// Replaces the hardcoded `channels` sidebar array — real tag usage
// counts across all of Pulse, most-used first.
func (h *Handlers) ListChannels(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	channels, err := h.Store.ListChannels(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load channels")
		return
	}
	out := make([]channelDTO, 0, len(channels))
	for _, c := range channels {
		out = append(out, channelDTO{Tag: c.Tag, Count: c.Count})
	}
	writeJSON(w, http.StatusOK, out)
}

// GET /api/pulse/trending?limit=10
// Same shape as channels, but scoped to the last 48h so a tag that was
// huge last month doesn't sit at the top of "trending" forever.
func (h *Handlers) TrendingTags(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	tags, err := h.Store.ListTrendingTags(r.Context(), 48*time.Hour, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load trending topics")
		return
	}
	out := make([]channelDTO, 0, len(tags))
	for _, c := range tags {
		out = append(out, channelDTO{Tag: c.Tag, Count: c.Count})
	}
	writeJSON(w, http.StatusOK, out)
}
