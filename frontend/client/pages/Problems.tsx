import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  getBranch,
  isWiredBranch,
  BRANCH_SUBJECT,
  BRANCH_LABEL,
  fetchTopics,
  fetchQuestions,
  type TopicCount,
  type QuestionListItem,
} from "@/lib/gate-api";

// ─── Data ─────────────────────────────────────────────────────────────────────

const problems = [
  {
    id: 1,
    solved: true,
    title: "AVL Tree Rotations",
    difficulty: "Easy" as const,
    success: "65.4%",
    tags: ["GATE 2023", "Balanced Trees"],
  },
  {
    id: 2,
    solved: false,
    title: "Graph Breadth First Search",
    difficulty: "Medium" as const,
    success: "52.1%",
    tags: ["PSU Preferred", "Algorithms"],
  },
  {
    id: 3,
    solved: false,
    title: "Matrix Chain Multiplication",
    difficulty: "Hard" as const,
    success: "34.8%",
    tags: ["Dynamic Prog."],
  },
  {
    id: 4,
    solved: true,
    title: "Dijkstra's Algorithm Complexity",
    difficulty: "Medium" as const,
    success: "47.6%",
    tags: ["GATE 2021"],
  },
  {
    id: 5,
    solved: false,
    title: "Topological Sorting DFS",
    difficulty: "Easy" as const,
    success: "71.0%",
    tags: ["DAG", "Basics"],
  },
  {
    id: 6,
    solved: false,
    title: "B+ Tree Node Capacity",
    difficulty: "Hard" as const,
    success: "28.9%",
    tags: ["DB Concepts", "Numerical"],
  },
  {
    id: 7,
    solved: false,
    title: "B+ Tree Node Capacity",
    difficulty: "Hard" as const,
    success: "28.9%",
    tags: ["DB Concepts", "Numerical"],
  },
];

// ─── Icon SVGs ────────────────────────────────────────────────────────────────

function IconDSA() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
      <path
        d="M6 12L0 6L6 0L7.425 1.425L2.825 6.025L7.4 10.6L6 12ZM14 12L12.575 10.575L17.175 5.975L12.6 1.4L14 0L20 6L14 12Z"
        fill="#AEB9D0"
      />
    </svg>
  );
}

function IconOS() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M6 12V6H12V12H6ZM8 10H10V8H8V10ZM6 18V16H4C3.45 16 2.97917 15.8042 2.5875 15.4125C2.19583 15.0208 2 14.55 2 14V12H0V10H2V8H0V6H2V4C2 3.45 2.19583 2.97917 2.5875 2.5875C2.97917 2.19583 3.45 2 4 2H6V0H8V2H10V0H12V2H14C14.55 2 15.0208 2.19583 15.4125 2.5875C15.8042 2.97917 16 3.45 16 4V6H18V8H16V10H18V12H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H12V18H10V16H8V18H6ZM14 14V4H4V14H14Z"
        fill="#C2C6D6"
      />
    </svg>
  );
}

function IconSearch({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.28)} viewBox="0 0 14 18" fill="none">
      <path
        d="M12.45 13.5L7.725 8.775C7.35 9.075 6.91875 9.3125 6.43125 9.4875C5.94375 9.6625 5.425 9.75 4.875 9.75C3.5125 9.75 2.35938 9.27813 1.41563 8.33438C0.471875 7.39063 0 6.2375 0 4.875C0 3.5125 0.471875 2.35938 1.41563 1.41563C2.35938 0.471875 3.5125 0 4.875 0C6.2375 0 7.39063 0.471875 8.33438 1.41563C9.27813 2.35938 9.75 3.5125 9.75 4.875C9.75 5.425 9.6625 5.94375 9.4875 6.43125C9.3125 6.91875 9.075 7.35 8.775 7.725L13.5 12.45L12.45 13.5ZM4.875 8.25C5.8125 8.25 6.60938 7.92188 7.26562 7.26562C7.92188 6.60938 8.25 5.8125 8.25 4.875C8.25 3.9375 7.92188 3.14062 7.26562 2.48438C6.60938 1.82812 5.8125 1.5 4.875 1.5C3.9375 1.5 3.14062 1.82812 2.48438 2.48438C1.82812 3.14062 1.5 3.9375 1.5 4.875C1.5 5.8125 1.82812 6.60938 2.48438 7.26562C3.14062 7.92188 3.9375 8.25 4.875 8.25Z"
        fill="#C2C6D6"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M5.1375 11.1187L7.5 9.69375L9.8625 11.1375L9.24375 8.4375L11.325 6.6375L8.5875 6.39375L7.5 3.84375L6.4125 6.375L3.675 6.61875L5.75625 8.4375L5.1375 11.1187ZM2.86875 14.25L4.0875 8.98125L0 5.4375L5.4 4.96875L7.5 0L9.6 4.96875L15 5.4375L10.9125 8.98125L12.1312 14.25L7.5 11.4562L2.86875 14.25Z"
        fill="#ADC6FF"
      />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
      <path
        d="M1.5 12C1.0875 12 0.734375 11.8531 0.440625 11.5594C0.146875 11.2656 0 10.9125 0 10.5V1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0H6L7.5 1.5H13.5C13.9125 1.5 14.2656 1.64688 14.5594 1.94063C14.8531 2.23438 15 2.5875 15 3V10.5C15 10.9125 14.8531 11.2656 14.5594 11.5594C14.2656 11.8531 13.9125 12 13.5 12H1.5ZM1.5 10.5H13.5V3H6.88125L5.38125 1.5H1.5V10.5Z"
        fill="#E5E2E1"
      />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
      <path d="M4.5 5.55L0 1.05L1.05 0L4.5 3.45L7.95 0L9 1.05L4.5 5.55Z" fill="#C2C6D6" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M10 16V14H12.6L9.425 10.825L10.85 9.4L14 12.55V10H16V16H10ZM1.4 16L0 14.6L12.6 2H10V0H16V6H14V3.4L1.4 16ZM5.175 6.575L0 1.4L1.4 0L6.575 5.175L5.175 6.575Z"
        fill="#C2C6D6"
      />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg width="24" height="23" viewBox="0 0 24 23" fill="none">
      <path
        d="M6 23C5.16667 23 4.45833 22.7083 3.875 22.125C3.29167 21.5417 3 20.8333 3 20C3 19.1667 3.29167 18.4583 3.875 17.875C4.45833 17.2917 5.16667 17 6 17C6.23333 17 6.45 17.025 6.65 17.075C6.85 17.125 7.04167 17.1917 7.225 17.275L8.65 15.5C8.18333 14.9833 7.85833 14.4 7.675 13.75C7.49167 13.1 7.45 12.45 7.55 11.8L5.525 11.125C5.24167 11.5417 4.88333 11.875 4.45 12.125C4.01667 12.375 3.53333 12.5 3 12.5C2.16667 12.5 1.45833 12.2083 0.875 11.625C0.291667 11.0417 0 10.3333 0 9.5C0 8.66667 0.291667 7.95833 0.875 7.375C1.45833 6.79167 2.16667 6.5 3 6.5C3.83333 6.5 4.54167 6.79167 5.125 7.375C5.70833 7.95833 6 8.66667 6 9.5C6 9.53333 6 9.56667 6 9.6C6 9.63333 6 9.66667 6 9.7L8.025 10.4C8.35833 9.8 8.80417 9.29167 9.3625 8.875C9.92083 8.45833 10.55 8.19167 11.25 8.075V5.9C10.6 5.71667 10.0625 5.3625 9.6375 4.8375C9.2125 4.3125 9 3.7 9 3C9 2.16667 9.29167 1.45833 9.875 0.875C10.4583 0.291667 11.1667 0 12 0C12.8333 0 13.5417 0.291667 14.125 0.875C14.7083 1.45833 15 2.16667 15 3C15 3.7 14.7833 4.3125 14.35 4.8375C13.9167 5.3625 13.3833 5.71667 12.75 5.9V8.075C13.45 8.19167 14.0792 8.45833 14.6375 8.875C15.1958 9.29167 15.6417 9.8 15.975 10.4L18 9.7C18 9.66667 18 9.63333 18 9.6C18 9.56667 18 9.53333 18 9.5C18 8.66667 18.2917 7.95833 18.875 7.375C19.4583 6.79167 20.1667 6.5 21 6.5C21.8333 6.5 22.5417 6.79167 23.125 7.375C23.7083 7.95833 24 8.66667 24 9.5C24 10.3333 23.7083 11.0417 23.125 11.625C22.5417 12.2083 21.8333 12.5 21 12.5C20.4667 12.5 19.9792 12.375 19.5375 12.125C19.0958 11.875 18.7417 11.5417 18.475 11.125L16.45 11.8C16.55 12.45 16.5083 13.0958 16.325 13.7375C16.1417 14.3792 15.8167 14.9667 15.35 15.5L16.775 17.25C16.9583 17.1667 17.15 17.1042 17.35 17.0625C17.55 17.0208 17.7667 17 18 17C18.8333 17 19.5417 17.2917 20.125 17.875C20.7083 18.4583 21 19.1667 21 20C21 20.8333 20.7083 21.5417 20.125 22.125C19.5417 22.7083 18.8333 23 18 23C17.1667 23 16.4583 22.7083 15.875 22.125C15.2917 21.5417 15 20.8333 15 20C15 19.6667 15.0542 19.3458 15.1625 19.0375C15.2708 18.7292 15.4167 18.45 15.6 18.2L14.175 16.425C13.4917 16.8083 12.7625 17 11.9875 17C11.2125 17 10.4833 16.8083 9.8 16.425L8.4 18.2C8.58333 18.45 8.72917 18.7292 8.8375 19.0375C8.94583 19.3458 9 19.6667 9 20C9 20.8333 8.70833 21.5417 8.125 22.125C7.54167 22.7083 6.83333 23 6 23Z"
        fill="#ADC6FF"
      />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 16C5.76667 16 3.875 15.225 2.325 13.675C0.775 12.125 0 10.2333 0 8C0 5.76667 0.775 3.875 2.325 2.325C3.875 0.775 5.76667 0 8 0C9.15 0 10.25 0.2375 11.3 0.7125C12.35 1.1875 13.25 1.86667 14 2.75V0H16V7H9V5H13.2C12.6667 4.06667 11.9375 3.33333 11.0125 2.8C10.0875 2.26667 9.08333 2 8 2C6.33333 2 4.91667 2.58333 3.75 3.75C2.58333 4.91667 2 6.33333 2 8C2 9.66667 2.58333 11.0833 3.75 12.25C4.91667 13.4167 6.33333 14 8 14C9.28333 14 10.4417 13.6333 11.475 12.9C12.5083 12.1667 13.2333 11.2 13.65 10H15.75C15.2833 11.7667 14.3333 13.2083 12.9 14.325C11.4667 15.4417 9.83333 16 8 16Z"
        fill="#C2C6D6"
      />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4.5-4.5 1.41-1.41L10 13.67l7.18-7.18L18.6 7.9l-8.6 8.6z"
        fill="#ADC6FF"
      />
    </svg>
  );
}

function IconCircleEmpty() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
        fill="#424754"
      />
    </svg>
  );
}

// ─── Progress Widget ───────────────────────────────────────────────────────────

function ProgressWidget() {
  const total = 814;
  const solved = 61;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const progress = solved / total;
  const filled = circ * progress;

  const bars = [
    { label: "Easy", done: 24, total: 186, color: "#ADC6FF" },
    { label: "Medium", done: 34, total: 474, color: "#EAB308" },
    { label: "Hard", done: 3, total: 154, color: "#FFB4AB" },
  ];

  return (
    <div className="rounded-lg border border-gq-border bg-gq-card p-6 flex flex-col gap-1 backdrop-blur-sm">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-[4px] bg-[rgba(77,142,255,0.20)] flex items-center justify-center">
          <IconNetwork />
        </div>
        <button className="opacity-70 hover:opacity-100 transition-opacity">
          <IconRefresh />
        </button>
      </div>

      {/* Title */}
      <div className="pt-3">
        <h3 className="text-gq-text text-[32px] font-semibold leading-[1.25] tracking-[-0.32px]">
          Data
          <br />
          Structures
        </h3>
      </div>
      <p className="text-gq-muted text-sm">Mastery: GATE Prep CS</p>

      {/* Circular progress */}
      <div className="flex justify-center pt-5">
        <div className="relative w-[110px] h-[106px]">
          <svg viewBox="0 0 110 106" width="110" height="106">
            <ellipse cx="55" cy="53" rx="54" ry="53" fill="transparent" />
            <circle
              cx="55"
              cy="53"
              r={r}
              fill="transparent"
              stroke="#2A2A2A"
              strokeWidth="7"
            />
            <circle
              cx="55"
              cy="53"
              r={r}
              fill="transparent"
              stroke="#ADC6FF"
              strokeWidth="7"
              strokeDasharray={`${filled} ${circ - filled}`}
              strokeDashoffset={circ * 0.25}
              strokeLinecap="round"
              transform="rotate(-90 55 53)"
              style={{ transformOrigin: "55px 53px" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-gq-text text-[32px] font-semibold leading-[1.25] tracking-[-0.32px]">
              {solved}
            </span>
            <span className="text-gq-muted text-[12px] font-semibold tracking-[0.6px]">
              / {total} Solved
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <span className="text-gq-blue text-[12px] font-semibold tracking-[0.6px] uppercase">
          progress
        </span>
      </div>

      {/* Difficulty breakdown */}
      <div className="flex flex-col gap-3 pt-7">
        {bars.map(({ label, done, total: t, color }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-gq-muted text-xs font-semibold tracking-[0.6px]">
                {label}
              </span>
              <span className="text-gq-text text-xs font-bold tracking-[0.6px]">
                {done} / {t}
              </span>
            </div>
            <div className="h-[6px] w-full bg-gq-row rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(done / t) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Topic Filters ─────────────────────────────────────────────────────────────

function TopicFilters() {
  const topics = [
    { name: "Linked Lists", count: 84, starred: true },
    { name: "Stacks", count: 120, starred: false },
    { name: "Queues", count: 42, starred: false },
    { name: "Trees", count: 156, starred: false },
    { name: "Graphs", count: 212, starred: false },
  ];

  return (
    <div className="rounded-lg border border-gq-border bg-gq-card p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-gq-muted text-xs font-semibold tracking-[0.6px] uppercase">
          Topics
        </span>
        <button className="opacity-70 hover:opacity-100 transition-opacity">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M4.5 6H0V4.5H4.5V0H6V4.5H10.5V6H6V10.5H4.5V6Z" fill="#C2C6D6" />
          </svg>
        </button>
      </div>

      {/* Topic list */}
      <div className="flex flex-col gap-1">
        {topics.map(({ name, count, starred }) => (
          <div
            key={name}
            className={`flex items-center justify-between px-2 py-2 rounded-sm cursor-pointer transition-colors ${
              starred ? "" : "hover:bg-gq-nav-active/20"
            }`}
          >
            <div className="flex items-center gap-2.5 pl-0.5">
              <div className="flex items-center justify-center h-6 shrink-0">
                {starred ? <IconStar /> : <IconFolder />}
              </div>
              <span
                className={`text-base font-${starred ? "bold" : "normal"} leading-6 ${
                  starred ? "text-gq-blue" : "text-gq-text"
                }`}
              >
                {name}
              </span>
            </div>
            {starred ? (
              <div className="bg-gq-blue/20 rounded-sm px-[6px]">
                <span className="text-gq-blue text-[10px] font-bold leading-6">{count}</span>
              </div>
            ) : (
              <span className="text-gq-muted text-[10px] font-normal leading-6">{count}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Difficulty Badge ──────────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: "Easy" | "Medium" | "Hard" }) {
  const colors: Record<string, string> = {
    Easy: "text-gq-blue",
    Medium: "text-gq-yellow",
    Hard: "text-gq-red",
  };
  return (
    <span className={`text-xs font-bold tracking-[0.6px] ${colors[level]}`}>
      {level}
    </span>
  );
}

// ─── Problems Table ────────────────────────────────────────────────────────────

function ProblemsTable() {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg border border-gq-border bg-gq-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gq-border bg-gq-row/30">
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase w-[115px]">
                Status
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase">
                Title
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase w-[140px]">
                Difficulty
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase w-[120px]">
                Success
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase">
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/question/${p.id}`)}
                className={`cursor-pointer hover:bg-gq-nav-active/20 transition-colors ${
                  i > 0 ? "border-t border-gq-border" : ""
                }`}
              >
                {/* Status */}
                <td className="px-6 py-6">
                  {p.solved ? <IconCheckCircle /> : <IconCircleEmpty />}
                </td>

                {/* Title */}
                <td className="px-6 py-4">
                  <span className="text-gq-text text-base leading-tight">
                    {p.title}
                  </span>
                </td>

                {/* Difficulty */}
                <td className="px-6 py-6">
                  <DifficultyBadge level={p.difficulty} />
                </td>

                {/* Success */}
                <td className="px-6 py-6">
                  <span className="text-gq-muted text-base">{p.success}</span>
                </td>

                {/* Tags */}
                <td className="px-6 py-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gq-tag text-gq-muted text-[10px] font-normal rounded-sm px-2 py-0.5 whitespace-nowrap"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Filter Header ─────────────────────────────────────────────────────────────

function FiltersHeader() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-gq-border bg-gq-card flex-wrap">
      {/* Search input */}
      <div className="flex-1 min-w-[160px] relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <IconSearch size={14} />
        </div>
        <input
          placeholder="Search questions..."
          className="w-full bg-gq-bg border border-gq-border rounded-[4px] py-[9px] pl-10 pr-4 text-sm text-gq-dim focus:outline-none focus:border-gq-blue/50 transition-colors"
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {["Status", "Difficulty", "Tags"].map((label) => (
          <button
            key={label}
            className="flex items-center gap-2.5 px-4 py-[7px] border border-gq-border rounded-[4px] text-gq-muted text-base hover:border-gq-blue/50 transition-colors"
          >
            <span>{label}</span>
            <IconChevronDown />
          </button>
        ))}
        <button className="p-2 hover:text-gq-text text-gq-muted transition-colors">
          <IconExpand />
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination() {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-gq-muted text-sm">Showing 1-20 of 814 questions</span>
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button className="p-2 opacity-20 cursor-not-allowed">
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
            <path d="M6 12L0 6L6 0L7.4 1.4L2.8 6L7.4 10.6L6 12Z" fill="#C2C6D6" />
          </svg>
        </button>

        {/* Page 1 — active */}
        <button className="w-9 h-8 flex items-center justify-center rounded-sm border border-gq-blue bg-gq-blue/20 text-gq-blue text-base">
          1
        </button>

        {["2", "3"].map((p) => (
          <button
            key={p}
            className="w-9 h-8 flex items-center justify-center rounded-sm text-gq-muted text-base hover:bg-gq-nav-active/30 transition-colors"
          >
            {p}
          </button>
        ))}

        <span className="px-2 text-gq-muted text-base">...</span>

        <button className="w-9 h-8 flex items-center justify-center rounded-sm text-gq-muted text-base hover:bg-gq-nav-active/30 transition-colors">
          41
        </button>

        {/* Next */}
        <button className="p-2 text-gq-muted hover:text-gq-text transition-colors">
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
            <path d="M4.6 6L0 1.4L1.4 0L7.4 6L1.4 12L0 10.6L4.6 6Z" fill="#C2C6D6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Live versions (CS / DA, real data from Neon) ─────────────────────────
//
// These mirror the static components above but read real topics/questions
// from the API. Non-wired branches never render these — they keep using
// the original mock components untouched.

function LiveProgressWidget({
  subjectLabel,
  topic,
  questions,
}: {
  subjectLabel: string;
  topic: string | null;
  questions: QuestionListItem[];
}) {
  const total = questions.length;
  const r = 44;
  const circ = 2 * Math.PI * r;

  const byDifficulty = useMemo(() => {
    const counts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    for (const q of questions) {
      const d = q.difficulty ?? "Medium";
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return counts;
  }, [questions]);

  const bars = [
    { label: "Easy", count: byDifficulty.Easy ?? 0, color: "#ADC6FF" },
    { label: "Medium", count: byDifficulty.Medium ?? 0, color: "#EAB308" },
    { label: "Hard", count: byDifficulty.Hard ?? 0, color: "#FFB4AB" },
  ];
  const maxCount = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="rounded-lg border border-gq-border bg-gq-card p-6 flex flex-col gap-1 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-[4px] bg-[rgba(77,142,255,0.20)] flex items-center justify-center">
          <IconNetwork />
        </div>
      </div>

      <div className="pt-3">
        <h3 className="text-gq-text text-[26px] font-semibold leading-[1.25] tracking-[-0.32px]">
          {topic ?? "All Topics"}
        </h3>
      </div>
      <p className="text-gq-muted text-sm">GATE Prep · {subjectLabel}</p>

      <div className="flex justify-center pt-5">
        <div className="relative w-[110px] h-[106px]">
          <svg viewBox="0 0 110 106" width="110" height="106">
            <ellipse cx="55" cy="53" rx="54" ry="53" fill="transparent" />
            <circle cx="55" cy="53" r={r} fill="transparent" stroke="#2A2A2A" strokeWidth="7" />
            <circle
              cx="55"
              cy="53"
              r={r}
              fill="transparent"
              stroke="#ADC6FF"
              strokeWidth="7"
              strokeDasharray={`${circ} ${0}`}
              strokeLinecap="round"
              transform="rotate(-90 55 53)"
              style={{ transformOrigin: "55px 53px" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-gq-text text-[32px] font-semibold leading-[1.25] tracking-[-0.32px]">
              {total}
            </span>
            <span className="text-gq-muted text-[12px] font-semibold tracking-[0.6px] text-center px-2">
              Questions
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-7">
        {bars.map(({ label, count, color }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-gq-muted text-xs font-semibold tracking-[0.6px]">{label}</span>
              <span className="text-gq-text text-xs font-bold tracking-[0.6px]">{count}</span>
            </div>
            <div className="h-[6px] w-full bg-gq-row rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveTopicFilters({
  topics,
  selected,
  onSelect,
}: {
  topics: TopicCount[];
  selected: string | null;
  onSelect: (topic: string | null) => void;
}) {
  return (
    <div className="rounded-lg border border-gq-border bg-gq-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-gq-muted text-xs font-semibold tracking-[0.6px] uppercase">Topics</span>
      </div>
      <div className="flex flex-col gap-1">
        {topics.map(({ Topic, Count }) => {
          const isSelected = Topic === selected;
          return (
            <div
              key={Topic}
              onClick={() => onSelect(isSelected ? null : Topic)}
              className={`flex items-center justify-between px-2 py-2 rounded-sm cursor-pointer transition-colors hover:bg-gq-nav-active/20`}
            >
              <div className="flex items-center gap-2.5 pl-0.5">
                <div className="flex items-center justify-center h-6 shrink-0">
                  {isSelected ? <IconStar /> : <IconFolder />}
                </div>
                <span
                  className={`text-base leading-6 ${isSelected ? "font-bold text-gq-blue" : "font-normal text-gq-text"}`}
                >
                  {Topic}
                </span>
              </div>
              {isSelected ? (
                <div className="bg-gq-blue/20 rounded-sm px-[6px]">
                  <span className="text-gq-blue text-[10px] font-bold leading-6">{Count}</span>
                </div>
              ) : (
                <span className="text-gq-muted text-[10px] font-normal leading-6">{Count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveProblemsTable({ questions }: { questions: QuestionListItem[] }) {
  const navigate = useNavigate();

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-gq-border bg-gq-card p-10 text-center text-gq-muted">
        No questions found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gq-border bg-gq-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gq-border bg-gq-row/30">
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase w-[90px]">
                Type
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase">
                Question
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase w-[140px]">
                Difficulty
              </th>
              <th className="text-left px-6 py-4 text-gq-muted text-base font-bold tracking-[0.8px] uppercase w-[100px]">
                Year
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr
                key={q.id}
                onClick={() => navigate(`/question/${q.id}`)}
                className={`cursor-pointer hover:bg-gq-nav-active/20 transition-colors ${
                  i > 0 ? "border-t border-gq-border" : ""
                }`}
              >
                <td className="px-6 py-6">
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-gq-tag text-gq-muted rounded-sm px-2 py-1">
                    {q.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gq-text text-base leading-tight line-clamp-2">
                    {q.questionText}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <DifficultyBadge level={(q.difficulty as any) ?? "Medium"} />
                </td>
                <td className="px-6 py-6">
                  <span className="text-gq-muted text-base">{q.examYear ?? "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LivePagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  totalItems: number;
  pageSize: number;
}) {
  const start = totalItems === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-gq-muted text-sm">
        Showing {start}-{end} of {totalItems} questions
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className={`p-2 transition-colors ${page === 0 ? "opacity-20 cursor-not-allowed" : "text-gq-muted hover:text-gq-text"}`}
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
            <path d="M6 12L0 6L6 0L7.4 1.4L2.8 6L7.4 10.6L6 12Z" fill="#C2C6D6" />
          </svg>
        </button>
        {Array.from({ length: pageCount }, (_, i) => i).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={
              p === page
                ? "w-9 h-8 flex items-center justify-center rounded-sm border border-gq-blue bg-gq-blue/20 text-gq-blue text-base"
                : "w-9 h-8 flex items-center justify-center rounded-sm text-gq-muted text-base hover:bg-gq-nav-active/30 transition-colors"
            }
          >
            {p + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className={`p-2 transition-colors ${page >= pageCount - 1 ? "opacity-20 cursor-not-allowed" : "text-gq-muted hover:text-gq-text"}`}
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
            <path d="M4.6 6L0 1.4L1.4 0L7.4 6L1.4 12L0 10.6L4.6 6Z" fill="#C2C6D6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

function LiveProblemsView({ branch }: { branch: "cse" | "da" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTopic = searchParams.get("topic");
  const subject = BRANCH_SUBJECT[branch];

  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionListItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics(subject).then(setTopics).catch((e) => setError(e.message));
  }, [subject]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(0);
    fetchQuestions({ subject, topic: selectedTopic ?? undefined, limit: 500 })
      .then(setAllQuestions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject, selectedTopic]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allQuestions;
    const q = search.toLowerCase();
    return allQuestions.filter((item) => item.questionText.toLowerCase().includes(q));
  }, [allQuestions, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="p-8">
      <div className="flex flex-col xl:flex-row gap-6 w-full">
        {/* Left panel */}
        <div className="xl:w-[290px] shrink-0 flex flex-col gap-6">
          <LiveProgressWidget subjectLabel={BRANCH_LABEL[branch]} topic={selectedTopic} questions={allQuestions} />
          <LiveTopicFilters
            topics={topics}
            selected={selectedTopic}
            onSelect={(topic) =>
              setSearchParams(topic ? { topic } : {}, { replace: true })
            }
          />
        </div>

        {/* Problems section */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 pb-12">
          <div className="flex items-center gap-4 p-4 rounded-lg border border-gq-border bg-gq-card flex-wrap">
            <div className="flex-1 min-w-[160px] relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <IconSearch size={14} />
              </div>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search questions..."
                className="w-full bg-gq-bg border border-gq-border rounded-[4px] py-[9px] pl-10 pr-4 text-sm text-gq-dim focus:outline-none focus:border-gq-blue/50 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
              Couldn't load questions: {error}
            </div>
          )}
          {loading ? (
            <div className="rounded-lg border border-gq-border bg-gq-card p-10 text-center text-gq-muted">
              Loading questions…
            </div>
          ) : (
            <>
              <LiveProblemsTable questions={pageItems} />
              <LivePagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProblemsPage() {
  const branch = getBranch();

  if (isWiredBranch(branch)) {
    return (
      <Layout>
        <LiveProblemsView branch={branch} />
      </Layout>
    );
  }

  // Every other branch keeps the original static mockup, unchanged.
  return (
    <Layout>
      <div className="p-8">
        <div className="flex flex-col xl:flex-row gap-6 w-full">
          {/* Left panel */}
          <div className="xl:w-[290px] shrink-0 flex flex-col gap-6">
            <ProgressWidget />
            <TopicFilters />
          </div>

          {/* Problems section */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 pb-12">
            <FiltersHeader />
            <ProblemsTable />
            <Pagination />
          </div>
        </div>
      </div>
    </Layout>
  );
}
