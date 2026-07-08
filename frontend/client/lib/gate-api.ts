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

export function getBranch(): string | null {
  return localStorage.getItem("gatequest_branch");
}
