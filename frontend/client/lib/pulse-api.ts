// Thin client for the Pulse endpoints in backend/internal/api/pulse.go.
// Reading the feed (list/get/channels/trending) works without a
// session; creating/deleting a post needs one, so those calls send
// credentials the same way lib/profile-api.ts does.

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore parse errors, use default message */
    }
    throw new Error(message);
  }
  return res.json();
}

export interface PulseMedia {
  url: string;
  type: "image" | "video";
}

export interface PulsePost {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  // Every attachment on the post, in upload order. Empty when there's
  // none. mediaUrl/mediaType below mirror media[0] and are kept only
  // for older callers — new code should read `media`.
  media: PulseMedia[];
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  // Personalized tags the author picked via the compose box's "Add
  // tags" control — the only tagging mechanism a post has. Renders as
  // the top-right badge and drives the channel/trending sidebars; a
  // tag is never part of the post text itself.
  tags: string[];
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string; // ISO timestamp
  isOwner: boolean;
  // Session 4: the viewer's own reaction/save state, hydrated by the
  // backend alongside the post itself so the feed never needs a
  // separate round trip per card to know "did I already like this".
  userVote: 1 | -1 | 0;
  isBookmarked: boolean;
}

export interface PulseComment {
  id: string;
  postId: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  isOwner: boolean;
}

export interface PulseCommentsResult {
  comments: PulseComment[];
  total: number;
}

export interface PulseVoteResult {
  likeCount: number;
  dislikeCount: number;
  userVote: 1 | -1 | 0;
}

export interface ChannelCount {
  tag: string;
  count: number;
}

export type PulseSort = "hot" | "new" | "top";

export interface PulseFeedQuery {
  tag?: string;
  sort?: PulseSort;
  limit?: number;
  offset?: number;
}

export interface PulseFeedResult {
  posts: PulsePost[];
  total: number;
}

export async function fetchPulseFeed(q: PulseFeedQuery): Promise<PulseFeedResult> {
  const params = new URLSearchParams();
  if (q.tag) params.set("tag", q.tag);
  if (q.sort) params.set("sort", q.sort);
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  return jsonFetch(`${API_BASE}/pulse/posts?${params.toString()}`);
}

export async function fetchPulsePost(id: string): Promise<PulsePost> {
  return jsonFetch(`${API_BASE}/pulse/posts/${id}`);
}

export async function createPulsePost(input: {
  content: string;
  media?: PulseMedia[];
  tags?: string[];
}): Promise<PulsePost> {
  return jsonFetch(`${API_BASE}/pulse/posts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deletePulsePost(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/pulse/posts/${id}`, { method: "DELETE" });
}

export async function fetchPulseChannels(limit = 20): Promise<ChannelCount[]> {
  return jsonFetch(`${API_BASE}/pulse/channels?limit=${limit}`);
}

export async function fetchPulseTrending(limit = 10): Promise<ChannelCount[]> {
  return jsonFetch(`${API_BASE}/pulse/trending?limit=${limit}`);
}

// --- Reactions (session 4) -------------------------------------------------

/** value: 1 to like, -1 to dislike, 0 to clear the caller's reaction. */
export async function votePulsePost(
  id: string,
  value: 1 | -1 | 0,
): Promise<PulseVoteResult> {
  return jsonFetch(`${API_BASE}/pulse/posts/${id}/vote`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function fetchPulseComments(
  id: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<PulseCommentsResult> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return jsonFetch(`${API_BASE}/pulse/posts/${id}/comments${qs ? `?${qs}` : ""}`);
}

export async function createPulseComment(
  postId: string,
  content: string,
): Promise<PulseComment> {
  return jsonFetch(`${API_BASE}/pulse/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deletePulseComment(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/pulse/comments/${id}`, { method: "DELETE" });
}

export async function bookmarkPulsePost(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/pulse/posts/${id}/bookmark`, { method: "POST" });
}

export async function unbookmarkPulsePost(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/pulse/posts/${id}/bookmark`, { method: "DELETE" });
}

export async function fetchPulseBookmarks(
  opts: { limit?: number; offset?: number } = {},
): Promise<PulseFeedResult> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  return jsonFetch(`${API_BASE}/pulse/bookmarks?${params.toString()}`);
}

/** The caller's own posts, most-recently-published first — backs the
 * "My posts" view alongside bookmarks. */
export async function fetchPulseMyPosts(
  opts: { limit?: number; offset?: number } = {},
): Promise<PulseFeedResult> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  return jsonFetch(`${API_BASE}/pulse/my-posts?${params.toString()}`);
}

/** Bumps the post's share counter server-side; call alongside the
 * clipboard copy so the count survives a refresh instead of living only
 * in local component state. */
export async function sharePulsePost(id: string): Promise<{ shareCount: number }> {
  return jsonFetch(`${API_BASE}/pulse/posts/${id}/share`, { method: "POST" });
}

// --- Media upload (session 5) ----------------------------------------------
// Files are uploaded to Cloudinary via the backend (see
// backend/internal/api/pulse_media.go) rather than embedded as a base64
// data URI in the post body — that kept the JSON payload huge and every
// full-res photo landed straight in the Postgres row. This replaces
// that: the compose box uploads the file first and gets back a real
// URL to attach as mediaUrl on the post.

export interface UploadMediaResult {
  url: string;
  mediaType: "image" | "video";
}

/**
 * Uploads a file with progress reporting. Uses XMLHttpRequest instead
 * of fetch because fetch has no upload-progress event — videos in
 * particular can take a while, and a frozen-looking compose box reads
 * as broken rather than working.
 */
export function uploadPulseMedia(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadMediaResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/pulse/upload`);
    xhr.withCredentials = true;

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to status-based handling below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve({ url: body.url, mediaType: body.mediaType });
      } else {
        reject(new Error(body?.error ?? `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection"));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

// --- Display helpers ------------------------------------------------------

/** "2h ago" / "5d ago" / "just now" style relative time for post cards. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
