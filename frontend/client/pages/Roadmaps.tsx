import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
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
  sm: { w: 140, h: 88 },
  md: { w: 200, h: 126 },
  lg: { w: 248, h: 156 },
};

// Isometric grid unit sizes (desktop)
const ISO_COL = 130; // px per grid column
const ISO_ROW = 115; // px per grid row

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
            boxShadow: "0 0 60px 12px rgba(80, 120, 255, 0.25)",
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
            ? "border-white/[0.06] bg-[rgba(255,255,255,0.025)] opacity-60 hover:opacity-100"
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
          {isLocked ? (
            <Lock className="w-3 h-3 text-zinc-600 mt-0.5" />
          ) : (
            <div
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                highlighted
                  ? "bg-blue-500/30 text-blue-300"
                  : isCompleted
                  ? "bg-emerald-500/25 text-emerald-400"
                  : "bg-white/10 text-white/60"
              )}
            >
              {isCompleted ? "✓" : isInProgress ? "▶" : "○"}
            </div>
          )}

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
          {isLocked ? (
            <div className="text-[8px] text-zinc-600 mt-0.5">Locked</div>
          ) : topics ? (
            <div className="text-[8px] text-zinc-500 mt-0.5">{topics} Topics</div>
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
  <div className="relative w-full overflow-x-auto min-w-[1100px]" style={{ height: 620 }}>
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
          ? "border-white/[0.06] bg-white/[0.02] opacity-60"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-semibold text-sm",
            isLocked ? "text-zinc-500" : "text-white"
          )}
        >
          {name}
        </span>
        {isLocked && <Lock className="w-3.5 h-3.5 text-zinc-600" />}
        {isCompleted && (
          <span className="text-[10px] font-semibold text-emerald-400">100%</span>
        )}
        {isInProgress && (
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
            In Progress
          </span>
        )}
      </div>

      {topics && (
        <span className="text-xs text-zinc-500">{topics} Topics</span>
      )}
      {isLocked && (
        <span className="text-xs text-zinc-600">Locked</span>
      )}

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
      col: 1.5 + i * 1.15,
      row: 2.6 + Math.sin(i * 1.05) * 1.35,
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
      <div className="relative overflow-hidden min-h-[calc(100vh-65px)] px-6 pb-8">
        {/* Diamond grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(255,255,255,0.032) 0, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 50%),
              repeating-linear-gradient(-45deg, rgba(255,255,255,0.032) 0, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 50%)
            `,
            backgroundSize: "68px 68px",
          }}
        />

        {/* Radial fade overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 60%, transparent 0%, rgba(14,14,14,0.55) 65%, rgba(14,14,14,0.92) 100%)",
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
