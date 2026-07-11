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

export interface PulsePost {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  hashtags: string[];
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string; // ISO timestamp
  isOwner: boolean;
}

export interface ChannelCount {
  hashtag: string;
  count: number;
}

export type PulseSort = "hot" | "new" | "top";

export interface PulseFeedQuery {
  hashtag?: string;
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
  if (q.hashtag) params.set("hashtag", q.hashtag);
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
  mediaUrl?: string;
  mediaType?: "image" | "video";
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
