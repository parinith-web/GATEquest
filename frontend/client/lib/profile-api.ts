// Thin client for the profile-related endpoints in backend/internal/api
// (avatar updates, activity heatmap + recent history) and the
// attempt-recording endpoint used from the question page. Same
// credentials-included convention as lib/auth.ts, since all of these
// require a logged-in session.

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

// --- Avatar ------------------------------------------------------------

/**
 * Updates the current user's avatar. `avatarUrl` can be a plain image
 * URL or a "data:image/...;base64,..." data URI (what the profile
 * page's upload control sends after client-side resizing).
 */
export async function updateAvatar(avatarUrl: string): Promise<string> {
  const data = await jsonFetch<{ ok: boolean; avatarUrl: string }>(
    `${API_BASE}/profile/avatar`,
    { method: "POST", body: JSON.stringify({ avatarUrl }) },
  );
  return data.avatarUrl;
}

// --- Activity (heatmap + history) --------------------------------------

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface HistoryItem {
  questionId: number;
  subject: string;
  topic: string;
  questionText: string;
  isCorrect: boolean;
  attemptedAt: string; // ISO timestamp
}

export interface DifficultyCount {
  solved: number;
  total: number;
}

export interface SolveProgress {
  easy: DifficultyCount;
  medium: DifficultyCount;
  hard: DifficultyCount;
  totalSolved: number;
  totalQuestions: number;
  attempting: number;
}

export interface ProfileActivity {
  heatmap: HeatmapDay[];
  totalContributions: number;
  history: HistoryItem[];
  /** Total XP earned from correctly-solved questions (see lib/leveling.ts
   * for how this turns into a level). Scoped to `subject` when one is
   * passed to fetchProfileActivity. */
  xp: number;
  /** Distinct questions solved (correctly, ever) vs. the size of the
   * question bank, broken down by difficulty — powers the LeetCode-style
   * solved counter on the profile page. Scoped to `subject` the same way
   * as `xp`. */
  progress: SolveProgress;
}

/**
 * `subject` scopes the returned XP to a single branch's question bank
 * (e.g. "Computer Science" for the CSE branch) — pass
 * BRANCH_SUBJECT[branch] from lib/gate-api.ts. Omit it to total XP
 * across every subject the user has answered questions in.
 */
export async function fetchProfileActivity(subject?: string): Promise<ProfileActivity> {
  const qs = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return jsonFetch(`${API_BASE}/profile/activity${qs}`);
}

// --- Attempts ------------------------------------------------------------

/** Records that the user submitted an answer for a question (for the
 * activity map / history feed — grading itself already happened
 * client-side by the time this is called). Fire-and-forget from the
 * caller's point of view is fine; failures here shouldn't block the UI
 * from showing the result the user just earned. */
export async function recordAttempt(
  questionId: number | string,
  isCorrect: boolean,
): Promise<void> {
  await jsonFetch(`${API_BASE}/questions/${questionId}/attempt`, {
    method: "POST",
    body: JSON.stringify({ isCorrect }),
  });
}
