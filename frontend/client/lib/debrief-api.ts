// Thin client for the Pulse Debrief endpoints in
// backend/internal/api/pulse_debrief.go and pulse_debrief_stream.go.
//
// "Which room" is never a parameter here — every endpoint resolves it
// server-side from the caller's own branch (see that file's doc
// comment). This client just mirrors that: no room ID is ever passed
// in, only read back from the response.
//
// Field names below intentionally match the mock's DebriefMessage
// shape from the old lib/pulse-chat.ts (author/authorAvatar/content/
// createdAt) — that was deliberate on the backend DTO side so this
// swap wouldn't need to touch component-level field access, only
// where the data comes from.

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

export interface DebriefRoom {
  questId: string;
  branch: string;
  opensAt: string; // ISO timestamp
  closesAt: string; // ISO timestamp
}

export interface DebriefMessage {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string; // ISO timestamp
  isOwner: boolean;
}

// Carries the HTTP status alongside the message so callers can branch
// on 429 (rate limited) vs 400 (bad content) vs everything else,
// rather than string-matching the error text.
export class DebriefApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "DebriefApiError";
    this.status = status;
  }
}

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
    throw new DebriefApiError(res.status, message);
  }
  return res.json();
}

/**
 * Resolves the caller's own branch's debrief room, if one's open right
 * now. Returns null (not an error) when nothing's open — the backend
 * uses 404 for "not open yet", "already closed", and "no branch set"
 * alike, and the frontend shouldn't try to tell those apart either.
 */
export async function getActiveDebriefRoom(): Promise<DebriefRoom | null> {
  try {
    return await jsonFetch<DebriefRoom>(`${API_BASE}/pulse/debrief/active`);
  } catch (err) {
    if (err instanceof DebriefApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Fetches message history for the currently open room. Pass `since`
 * (an ISO timestamp) to page forward from a known point — e.g. the
 * createdAt of the last message already in state, when catching up
 * after a dropped SSE connection. Omit it for full history, which is
 * fine here since a room's whole lifetime is bounded to 12h of
 * low-throughput chat.
 */
export async function listDebriefMessages(
  since?: string,
): Promise<DebriefMessage[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const { messages } = await jsonFetch<{ messages: DebriefMessage[] }>(
    `${API_BASE}/pulse/debrief/active/messages${qs}`,
  );
  return messages;
}

/**
 * Posts a message to the caller's own room. Throws DebriefApiError —
 * check `.status` for 429 (rate limited) or 400 (empty/too long) to
 * show a specific inline error rather than a generic failure toast.
 */
export async function postDebriefMessage(
  content: string,
): Promise<DebriefMessage> {
  return jsonFetch<DebriefMessage>(`${API_BASE}/pulse/debrief/active/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/**
 * Opens the SSE connection for live message delivery. Returns the raw
 * EventSource so the caller (the room hook, session 7b) owns its
 * lifecycle — when to close it, how to react to onerror, etc. This
 * function only knows how to parse frames, not room lifecycle.
 *
 * Note: the server also writes bare SSE comment lines (heartbeats,
 * and a final ": room closed" line) — those never reach onmessage,
 * EventSource only surfaces "data:" frames. Detecting room-close has
 * to happen client-side off the room's closesAt, not from the stream.
 */
export function openDebriefStream(
  onMessage: (msg: DebriefMessage) => void,
  onError?: (ev: Event) => void,
): EventSource {
  const es = new EventSource(`${API_BASE}/pulse/debrief/active/stream`, {
    withCredentials: true,
  });
  es.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data) as DebriefMessage);
    } catch {
      // Malformed frame — skip it rather than tearing down an
      // otherwise-healthy connection over one bad payload.
    }
  };
  if (onError) es.onerror = onError;
  return es;
}
