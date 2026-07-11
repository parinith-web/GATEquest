// Thin client for the Go question-bank API (see backend/internal/api).
// Follows the same fetch/error convention as lib/auth.ts. Read-only
// endpoints, so no credentials needed.

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

async function jsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
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

export interface TopicCount {
  Topic: string;
  Count: number;
}

export interface QuestionListItem {
  id: number;
  subject: string;
  topic: string;
  type: "mcq" | "msq" | "nat";
  questionText: string;
  difficulty: string | null;
  examYear: number | null;
  marks: number | null;
}

export interface Question {
  ID: number;
  QuestionNumber: number | null;
  Subject: string;
  Topic: string;
  Type: "mcq" | "msq" | "nat";
  QuestionText: string;
  OptionA: string | null;
  OptionB: string | null;
  OptionC: string | null;
  OptionD: string | null;
  CorrectOption: string | null;
  CorrectAnswer: string | null;
  AnswerTolerance: string | null;
  Difficulty: string | null;
  ExamYear: number | null;
  Marks: number | null;
  Tags: string | null;
  TheoryTitle: string | null;
  TheoryText: string | null;
  NeedsReview: boolean;
  ReviewReason: string | null;
}

export async function fetchTopics(subject: string): Promise<TopicCount[]> {
  return jsonFetch(`${API_BASE}/topics?subject=${encodeURIComponent(subject)}`);
}

export interface QuestionQuery {
  subject?: string;
  topic?: string;
  type?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

export async function fetchQuestions(q: QuestionQuery): Promise<QuestionListItem[]> {
  const params = new URLSearchParams();
  if (q.subject) params.set("subject", q.subject);
  if (q.topic) params.set("topic", q.topic);
  if (q.type) params.set("type", q.type);
  if (q.difficulty) params.set("difficulty", q.difficulty);
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  return jsonFetch(`${API_BASE}/questions?${params.toString()}`);
}

export async function fetchQuestion(id: number | string): Promise<Question> {
  return jsonFetch(`${API_BASE}/questions/${id}`);
}

// ─── Branch configuration ──────────────────────────────────────────────────
//
// GATEquest only has a real question bank for two branches so far: CSE and
// Data Science & AI. Every other branch (ECE, EE, CE, ME, "Other") keeps
// using the original static mockup pages — nothing changes for them.

export type WiredBranch = "cse" | "da";

export function isWiredBranch(branch: string | null): branch is WiredBranch {
  return branch === "cse" || branch === "da";
}

// Maps a branch id to the exact `subject` value stored in Neon.
export const BRANCH_SUBJECT: Record<WiredBranch, string> = {
  cse: "Computer Science",
  da: "Data Science and Artificial Intelligence",
};

export const BRANCH_LABEL: Record<WiredBranch, string> = {
  cse: "CS",
  da: "Data Science & AI",
};

// Human-readable label for ANY branch value, wired or not. Non-wired
// branches already persist a readable label (e.g. "Electronics",
// "Mechanical", or a custom "Other" entry), so this just passes it
// through; wired branches get their short display label instead.
export function BRANCH_LABEL_ANY(branch: string): string {
  return isWiredBranch(branch) ? BRANCH_LABEL[branch] : branch;
}

// The order topics should appear in the roadmap/sidebar — this is
// curriculum order, not alphabetical, so it's specified explicitly
// rather than derived from the DB.
export const BRANCH_TOPIC_ORDER: Record<WiredBranch, string[]> = {
  cse: [
    "Engineering Mathematics",
    "Digital Logic",
    "Computer Organization and Architecture",
    "Programming and Data Structures",
    "Algorithms",
    "Theory of Computation",
    "Compiler Design",
    "Operating System",
    "Databases",
    "Computer Networks",
  ],
  // Assumption: no explicit order was given for DA, so this follows a
  // similar "foundations -> core CS -> ML" progression. Reorder this
  // array if you want a different sequence — the rest of the app just
  // reads from it.
  da: [
    "Calculus",
    "Linear Algebra",
    "Discrete Mathematics",
    "Probability and Statistics",
    "Programming and Data Structures",
    "Algorithms",
    "Databases",
    "Machine Learning",
    "Artificial Intelligence",
  ],
};

// Reverse of BRANCH_SUBJECT, so a full subject name coming back from the
// account (e.g. "Computer Science") can be mapped back to the short id
// (e.g. "cse") the rest of the app already keys off of.
const SUBJECT_TO_BRANCH: Record<string, WiredBranch> = Object.fromEntries(
  Object.entries(BRANCH_SUBJECT).map(([id, subject]) => [subject, id as WiredBranch]),
);

// ─── Account branch cache ──────────────────────────────────────────────────
//
// The branch itself lives on the account server-side (see
// backend/internal/store.User.Branch) — this is just a synchronous,
// in-memory mirror of it, kept in sync by AuthProvider (lib/auth-context)
// every time the logged-in user loads or changes. Every page that reads
// getBranch() does so synchronously outside of React's render/effect
// cycle in a couple of spots, so a plain module-level variable (rather
// than requiring every caller to thread the user object through) keeps
// those call sites unchanged.
let accountBranch: string | null = null;

/**
 * Called by AuthProvider whenever the current user is loaded/refreshed.
 * `rawBranch` is the account's stored branch (e.g. "Computer Science"),
 * or "" if the user hasn't completed onboarding yet.
 */
export function setAccountBranch(rawBranch: string | null | undefined): void {
  accountBranch = rawBranch || null;
}

/**
 * Returns the short branch id (e.g. "cse") for the signed-in account, or
 * null if they haven't picked one yet. Backed by the account itself, not
 * the browser — signing in on a different device returns the same value.
 */
export function getBranch(): string | null {
  if (!accountBranch) return null;
  return SUBJECT_TO_BRANCH[accountBranch] ?? accountBranch;
}

// ─── Quests (weekly mock arena) ─────────────────────────────────────────────
//
// Thin client for backend/internal/api/quest.go. Unlike the questions/topics
// endpoints above, these carry the session cookie (credentials: "include")
// since every quest route requires an authenticated user.

async function questFetch<T>(url: string, init?: RequestInit): Promise<T> {
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
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type QuestStatus = "scheduled" | "live" | "closed";

export interface QuestSummary {
  id: string;
  branch: string;
  weekNumber: number;
  title: string;
  startsAt: string; // RFC3339
  durationSeconds: number;
  status: QuestStatus;
}

export interface QuestSafeQuestion {
  id: number;
  orderIndex: number;
  subject: string;
  topic: string;
  type: "mcq" | "msq" | "nat";
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  difficulty: string | null;
  marks: number | null;
}

export interface QuestDetail extends QuestSummary {
  questions: QuestSafeQuestion[];
  isParticipant: boolean;
  userRating: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score?: number;
}

export interface QuestResultEntry {
  rank: number;
  userId: string;
  name: string;
  solvedCount: number;
  timeTakenSeconds: number;
  ratingBefore: number;
  ratingAfter: number;
}

export interface QuestHistoryEntry {
  quest: QuestSummary;
  result: QuestResultEntry;
}

export async function fetchQuests(branch?: string): Promise<QuestSummary[]> {
  const params = branch ? `?branch=${encodeURIComponent(branch)}` : "";
  return questFetch(`${API_BASE}/quests${params}`);
}

export async function fetchQuestDetail(id: string): Promise<QuestDetail> {
  return questFetch(`${API_BASE}/quests/${id}`);
}

export async function joinQuest(id: string): Promise<void> {
  await questFetch(`${API_BASE}/quests/${id}/join`, { method: "POST" });
}

export async function submitQuestAnswer(
  id: string,
  questionId: number,
  answer: string,
): Promise<void> {
  await questFetch(`${API_BASE}/quests/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ questionId, answer }),
  });
}

export async function fetchQuestLeaderboard(id: string): Promise<LeaderboardEntry[]> {
  return questFetch(`${API_BASE}/quests/${id}/leaderboard`);
}

export async function fetchQuestResults(id: string): Promise<QuestResultEntry[]> {
  return questFetch(`${API_BASE}/quests/${id}/results`);
}

export async function fetchQuestRatingHistory(): Promise<QuestHistoryEntry[]> {
  return questFetch(`${API_BASE}/quests/rating-history`);
}

// ── Weekly cadence helper ───────────────────────────────────────────────────
//
// Weekly mocks land every Sunday at 6:30 PM local time. Used as the
// countdown target when there's no live/scheduled quest to point at yet
// (e.g. next week's hasn't been created), so the arena card always has
// something meaningful to count down to.
export function nextSunday630pm(from: Date = new Date()): Date {
  const target = new Date(from);
  target.setHours(18, 30, 0, 0);
  const daysUntilSunday = (7 - target.getDay()) % 7;
  if (daysUntilSunday === 0 && target.getTime() <= from.getTime()) {
    target.setDate(target.getDate() + 7);
  } else {
    target.setDate(target.getDate() + daysUntilSunday);
  }
  return target;
}
