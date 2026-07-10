import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import {
  getBranch,
  isWiredBranch,
  BRANCH_SUBJECT,
  BRANCH_LABEL,
  BRANCH_TOPIC_ORDER,
  fetchTopics,
  type WiredBranch,
} from "@/lib/gate-api";

// ─── Subject data ─────────────────────────────────────────────────────────────

type SubjectStatus = "completed" | "in-progress" | "active" | "locked";
type CardSize = "sm" | "md" | "lg";

interface Subject {
  id: string;
  name: string;
  topics?: number;
  progress?: number;
  status: SubjectStatus;
  highlighted?: boolean;
  gridPos: { col: number; row: number };
  size: CardSize;
}

const SUBJECTS: Subject[] = [
  {
    id: "eng-math",
    name: "Eng. Mathematics",
    topics: 24,
    progress: 100,
    status: "completed",
    gridPos: { col: 3, row: 2 },
    size: "md",
  },
  {
    id: "dsa",
    name: "Data Structures & Algo",
    topics: 42,
    progress: 65,
    status: "in-progress",
    highlighted: true,
    gridPos: { col: 4, row: 3 },
    size: "lg",
  },
  {
    id: "digital-logic",
    name: "Digital Logic",
    topics: 15,
    progress: 75,
    status: "active",
    gridPos: { col: 2, row: 4 },
    size: "md",
  },
  {
    id: "comp-org",
    name: "Comp. Organization",
    topics: 18,
    progress: 40,
    status: "active",
    gridPos: { col: 6, row: 4 },
    size: "md",
  },
  {
    id: "databases",
    name: "Databases",
    status: "locked",
    gridPos: { col: 1, row: 3 },
    size: "sm",
  },
  {
    id: "operating-sys",
    name: "Operating Sys",
    status: "locked",
    gridPos: { col: 6, row: 2 },
    size: "sm",
  },
  {
    id: "compiler-design",
    name: "Compiler Design",
    status: "locked",
    gridPos: { col: 8, row: 1.5 },
    size: "sm",
  },
  {
    id: "theory-of-comp",
    name: "Theory of Comp",
    status: "locked",
    gridPos: { col: 8, row: 3 },
    size: "sm",
  },
];

// ─── Isometric Card ──────────────────────────────────────────────────────────

const CARD_DIMS: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 160, h: 100 },
  md: { w: 220, h: 138 },
  lg: { w: 270, h: 170 },
};

// Isometric grid unit sizes (desktop) — kept in step with the background
// lattice tile size below so cards sit on the grid rather than crowding it.
const ISO_COL = 190; // px per grid column
const ISO_ROW = 165; // px per grid row

function isoPos(col: number, row: number) {
  return {
    left: col * ISO_COL,
    top: row * ISO_ROW,
  };
}

const SubjectCard = ({ subject, onOpen }: { subject: Subject; onOpen?: (s: Subject) => void }) => {
  const { name, topics, progress, status, highlighted, size, gridPos } = subject;
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isInProgress = status === "in-progress";
  const navigate = useNavigate();

  const { w, h } = CARD_DIMS[size];
  const pos = isoPos(gridPos.col, gridPos.row);

  return (
    <div
      className="absolute"
      style={{
        left: pos.left,
        top: pos.top,
        width: w,
        height: h,
        transform: "translate(-50%, -50%)",
        zIndex: highlighted ? 10 : isCompleted ? 8 : isLocked ? 2 : 5,
      }}
    >
      {/* Glow for highlighted card */}
      {highlighted && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: "0 0 70px 16px rgba(99, 110, 255, 0.3)",
            transform: "rotate(-32deg) skewY(12deg) scaleY(0.78)",
            transformOrigin: "center center",
          }}
        />
      )}

      {/* Card */}
      <div
        onClick={() => {
          if (!isLocked) {
            onOpen ? onOpen(subject) : navigate("/problems");
          }
        }}
        className={cn(
          "absolute inset-0 rounded-xl border flex flex-col justify-between p-3 overflow-hidden cursor-pointer transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-950/20",
          highlighted
            ? "border-white/25 bg-[rgba(22,32,72,0.85)]"
            : isCompleted
            ? "border-emerald-500/35 bg-[rgba(8,22,14,0.75)]"
            : isLocked
            ? "border-indigo-400/[0.10] bg-[rgba(120,130,255,0.035)] opacity-70 hover:opacity-100"
            : "border-white/[0.10] bg-[rgba(255,255,255,0.04)]"
        )}
        style={{
          transform: "rotate(-32deg) skewY(12deg) scaleY(0.78)",
          transformOrigin: "center center",
        }}
      >
        {/* Completed top stripe */}
        {isCompleted && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-t-xl" />
        )}

        {/* Highlighted inner circuit pattern */}
        {highlighted && (
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 14px)",
            }}
          />
        )}

        {/* Top row: icon + badge */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0",
              highlighted
                ? "bg-blue-500/30 text-blue-300"
                : isCompleted
                ? "bg-emerald-500/25 text-emerald-400"
                : isLocked
                ? "bg-indigo-400/10 text-indigo-300/50"
                : "bg-white/10 text-white/60"
            )}
          >
            {isCompleted ? "✓" : isInProgress ? "▶" : "○"}
          </div>

          {isInProgress && (
            <span className="text-[8px] text-emerald-400 font-semibold uppercase tracking-wider">
              In Progress
            </span>
          )}
          {isCompleted && (
            <span className="text-[9px] text-emerald-400 font-semibold">100%</span>
          )}
        </div>

        {/* Name + meta */}
        <div>
          <div
            className={cn(
              "font-semibold leading-tight",
              size === "sm" ? "text-[9px]" : size === "lg" ? "text-[13px]" : "text-[11px]",
              isLocked ? "text-zinc-500" : "text-white"
            )}
          >
            {name}
          </div>
          {topics ? (
            <div className={cn("text-[8px] mt-0.5", isLocked ? "text-indigo-300/40" : "text-zinc-500")}>
              {topics} Topics
            </div>
          ) : isLocked ? (
            <div className="text-[8px] text-indigo-300/40 mt-0.5">Coming up</div>
          ) : null}
        </div>

        {/* Progress bar */}
        {progress !== undefined && !isLocked && (
          <div className="h-[3px] rounded-full bg-white/10 mt-1">
            <div
              className={cn(
                "h-full rounded-full",
                isCompleted
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-blue-500 to-blue-400"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Roadmap Grid (desktop) ───────────────────────────────────────────────────

const IsometricRoadmap = ({
  subjects,
  onOpen,
}: {
  subjects: Subject[];
  onOpen?: (s: Subject) => void;
}) => (
  <div className="relative w-full overflow-x-auto min-w-[1500px]" style={{ height: 760 }}>
    {subjects.map((subject) => (
      <SubjectCard key={subject.id} subject={subject} onOpen={onOpen} />
    ))}
  </div>
);

// ─── Mobile subject list ──────────────────────────────────────────────────────

const MobileSubjectCard = ({ subject, onOpen }: { subject: Subject; onOpen?: (s: Subject) => void }) => {
  const { name, topics, progress, status, highlighted } = subject;
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isInProgress = status === "in-progress";
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        if (!isLocked) {
          onOpen ? onOpen(subject) : navigate("/problems");
        }
      }}
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2 cursor-pointer transition-all hover:bg-white/[0.06]",
        highlighted
          ? "border-blue-500/30 bg-blue-950/30"
          : isCompleted
          ? "border-emerald-500/25 bg-emerald-950/20"
          : isLocked
          ? "border-indigo-400/[0.10] bg-[rgba(120,130,255,0.03)] opacity-70"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-semibold text-sm",
            isLocked ? "text-zinc-400" : "text-white"
          )}
        >
          {name}
        </span>
        {isCompleted && (
          <span className="text-[10px] font-semibold text-emerald-400">100%</span>
        )}
        {isInProgress && (
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
            In Progress
          </span>
        )}
      </div>

      {topics ? (
        <span className={cn("text-xs", isLocked ? "text-indigo-300/40" : "text-zinc-500")}>
          {topics} Topics
        </span>
      ) : isLocked ? (
        <span className="text-xs text-indigo-300/40">Coming up</span>
      ) : null}

      {progress !== undefined && !isLocked && (
        <div className="h-1 rounded-full bg-white/10 mt-1">
          <div
            className={cn(
              "h-full rounded-full",
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-blue-500 to-blue-400"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Live roadmap (CS / DA) ────────────────────────────────────────────────
//
// Unlike SUBJECTS above (hand-placed mock grid coordinates), a live topic
// list has a variable length that comes from the DB, so positions are
// generated with a simple wave pattern instead of being hand-authored.
// This keeps the same isometric-card visual language for real topics.

function generateGridPositions(n: number): { col: number; row: number }[] {
  const positions: { col: number; row: number }[] = [];
  for (let i = 0; i < n; i++) {
    positions.push({
      col: 1.5 + i * 1.4,
      row: 2.6 + Math.sin(i * 1.05) * 1.5,
    });
  }
  return positions;
}

const LIVE_CARD_SIZES: CardSize[] = ["md", "lg", "sm"];

function useLiveTopics(branch: WiredBranch | null) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branch) return;
    let cancelled = false;

    fetchTopics(BRANCH_SUBJECT[branch])
      .then((counts) => {
        if (cancelled) return;
        const countByTopic = new Map(counts.map((c) => [c.Topic, c.Count]));
        const order = BRANCH_TOPIC_ORDER[branch];
        const positions = generateGridPositions(order.length);

        const built: Subject[] = order.map((topic, i) => ({
          id: topic,
          name: topic,
          topics: countByTopic.get(topic) ?? 0,
          status: "active",
          gridPos: positions[i],
          size: LIVE_CARD_SIZES[i % LIVE_CARD_SIZES.length],
        }));
        setSubjects(built);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load topics");
      });

    return () => {
      cancelled = true;
    };
  }, [branch]);

  return { subjects, error };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoadmapsPage() {
  const navigate = useNavigate();
  const branch = getBranch();
  const wired = isWiredBranch(branch) ? branch : null;
  const { subjects: liveSubjects, error: liveError } = useLiveTopics(wired);

  const openTopic = (subject: Subject) => {
    navigate(`/problems?topic=${encodeURIComponent(subject.name)}`);
  };

  // Non-wired branches (ECE, EE, CE, ME, Other) keep the exact original
  // mockup below, unchanged.
  const subjects = wired ? liveSubjects : SUBJECTS;

  return (
    <Layout>
      <div className="relative overflow-hidden min-h-[calc(100vh-65px)] px-6 pb-8 bg-[#08080b]">
        {/* Isometric canvas grid — same tilt as the cards, large cells, oversized so rotation doesn't clip corners */}
        <div
          className="absolute pointer-events-none overflow-hidden inset-0"
        >
          <div
            className="absolute"
            style={{
              inset: "-60%",
              backgroundImage: `
                repeating-linear-gradient(45deg, rgba(148,163,255,0.10) 0, rgba(148,163,255,0.10) 1.5px, transparent 1.5px, transparent 220px),
                repeating-linear-gradient(-45deg, rgba(148,163,255,0.10) 0, rgba(148,163,255,0.10) 1.5px, transparent 1.5px, transparent 220px)
              `,
              transform: "rotate(-32deg) skewY(12deg) scaleY(0.78)",
              transformOrigin: "center center",
            }}
          />
        </div>

        {/* Ambient purple-blue light source, emanating from the canvas center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 55% 50% at 48% 52%, rgba(99,102,241,0.22) 0%, rgba(79,70,229,0.10) 35%, transparent 68%),
              radial-gradient(ellipse 40% 38% at 60% 42%, rgba(56,131,255,0.16) 0%, transparent 65%)
            `,
            mixBlendMode: "screen",
          }}
        />

        {/* Edge vignette to seat the isometric plane inside the canvas */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 85% 75% at 50% 55%, transparent 0%, rgba(8,8,11,0.5) 60%, rgba(8,8,11,0.95) 100%)",
          }}
        />

        {wired && !subjects && !liveError && (
          <div className="relative z-10 text-zinc-500 text-sm py-8">Loading topics…</div>
        )}
        {wired && liveError && (
          <div className="relative z-10 text-red-400 text-sm py-8">
            Couldn't load topics: {liveError}
          </div>
        )}

        {subjects && (
          <>
            {/* ── Isometric roadmap (desktop) ── */}
            <div className="hidden md:block relative z-10 pb-8 overflow-x-auto">
              <IsometricRoadmap subjects={subjects} onOpen={wired ? openTopic : undefined} />
            </div>

            {/* ── Mobile card list ── */}
            <div className="md:hidden relative z-10 pb-8">
              <div className="flex flex-col gap-3">
                {subjects.map((subject) => (
                  <MobileSubjectCard
                    key={subject.id}
                    subject={subject}
                    onOpen={wired ? openTopic : undefined}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
