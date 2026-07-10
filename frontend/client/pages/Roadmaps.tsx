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
  // Position on the "flat" (pre-transform) pyramid grid, in local pixel
  // units centered on the canvas. These get passed through ISO_MATRIX
  // (see below) — the same rotate/skew/scale as the cards and background
  // grid — so pyramid rows come out parallel to the isometric grid lines
  // instead of sitting in plain horizontal rows.
  gridPos: { x: number; y: number };
  size: CardSize;
}

type SubjectSeed = Omit<Subject, "gridPos">;

const SUBJECT_SEEDS: SubjectSeed[] = [
  {
    id: "eng-math",
    name: "Eng. Mathematics",
    topics: 24,
    progress: 100,
    status: "completed",
    size: "md",
  },
  {
    id: "dsa",
    name: "Data Structures & Algo",
    topics: 42,
    progress: 65,
    status: "in-progress",
    highlighted: true,
    size: "md",
  },
  {
    id: "operating-sys",
    name: "Operating Sys",
    status: "locked",
    size: "md",
  },
  {
    id: "compiler-design",
    name: "Compiler Design",
    status: "locked",
    size: "md",
  },
  {
    id: "databases",
    name: "Databases",
    status: "locked",
    size: "md",
  },
  {
    id: "digital-logic",
    name: "Digital Logic",
    topics: 15,
    progress: 75,
    status: "active",
    size: "md",
  },
  {
    id: "comp-org",
    name: "Comp. Organization",
    topics: 18,
    progress: 40,
    status: "active",
    size: "md",
  },
  {
    id: "theory-of-comp",
    name: "Theory of Comp",
    status: "locked",
    size: "md",
  },
];

// ─── Isometric transform ──────────────────────────────────────────────────────

// Shared isometric tilt — used by the cards, their glow, and the background
// grid so the whole canvas reads as one consistently-angled plane.
const ISO_ROTATE_DEG = -38;
const ISO_SKEW_DEG = 16;
const ISO_SCALE_Y = 0.72;
const ISO_TRANSFORM = `rotate(${ISO_ROTATE_DEG}deg) skewY(${ISO_SKEW_DEG}deg) scaleY(${ISO_SCALE_Y})`;

// 2x2 linear matrix equivalent to the CSS transform above, used to map flat
// pyramid-grid coordinates into the same rotated/skewed/scaled screen space
// as the cards and background grid. CSS composes `rotate skewY scaleY` by
// applying scaleY first, then skewY, then rotate (i.e. M = R * SkewY * Sy).
type Mat2 = [[number, number], [number, number]];

function matMul(A: Mat2, B: Mat2): Mat2 {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1],
    ],
  ];
}

const ISO_MATRIX: Mat2 = (() => {
  const rot = (ISO_ROTATE_DEG * Math.PI) / 180;
  const skew = (ISO_SKEW_DEG * Math.PI) / 180;
  const R: Mat2 = [
    [Math.cos(rot), -Math.sin(rot)],
    [Math.sin(rot), Math.cos(rot)],
  ];
  const Sk: Mat2 = [
    [1, 0],
    [Math.tan(skew), 1],
  ];
  const Sy: Mat2 = [
    [1, 0],
    [0, ISO_SCALE_Y],
  ];
  return matMul(matMul(R, Sk), Sy);
})();

function projectIso(localX: number, localY: number) {
  return {
    x: ISO_MATRIX[0][0] * localX + ISO_MATRIX[0][1] * localY,
    y: ISO_MATRIX[1][0] * localX + ISO_MATRIX[1][1] * localY,
  };
}

// Local grid spacing (pre-transform pixel units) between cards within a
// pyramid row, and between successive pyramid rows.
const COL_UNIT = 245;
const ROW_UNIT = 250;

// Pyramid layout: row 0 gets 1 card, row 1 gets 2, row 2 gets 3, row 3 gets
// 4, and so on, each row centered — so the cards form a widening "reverse V"
// as you go down. If there aren't enough items to fill a row to its target
// size, that final row just takes whatever's left (still centered).
//
// Rows are laid out flat first (row = constant local y, columns spread
// along local x), then projected through the same rotate/skew/scale as the
// cards and background grid, so the rows come out parallel to the
// isometric grid lines instead of sitting flat. Because the skew mixes x
// and y asymmetrically, the projected pyramid's bounding box isn't
// centered on the local origin — so after projecting, we shift every point
// by the bounding-box center, which keeps the whole pyramid centered under
// the canvas (and the sidebar-aware content area) instead of drifting to
// one side.
function computeTrianglePositions(n: number): { x: number; y: number }[] {
  if (n <= 0) return [];

  const rowSizes: number[] = [];
  let remaining = n;
  let nextSize = 1;
  while (remaining > 0) {
    const take = Math.min(nextSize, remaining);
    rowSizes.push(take);
    remaining -= take;
    nextSize += 1;
  }

  const rows = rowSizes.length;

  const localPositions: { x: number; y: number }[] = [];
  rowSizes.forEach((count, r) => {
    const localY = (r - (rows - 1) / 2) * ROW_UNIT;
    for (let c = 0; c < count; c++) {
      const localX = (c - (count - 1) / 2) * COL_UNIT;
      localPositions.push({ x: localX, y: localY });
    }
  });

  const projected = localPositions.map((p) => projectIso(p.x, p.y));
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  return projected.map((p) => ({ x: p.x - centerX, y: p.y - centerY }));
}

const MOCK_TRIANGLE = computeTrianglePositions(SUBJECT_SEEDS.length);
const SUBJECTS: Subject[] = SUBJECT_SEEDS.map((seed, i) => ({
  ...seed,
  gridPos: MOCK_TRIANGLE[i],
}));

const CARD_DIMS: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 168, h: 112 },
  md: { w: 228, h: 148 },
  lg: { w: 280, h: 182 },
};

// gridPos.x / gridPos.y are already-projected, already-centered screen
// pixel offsets from computeTrianglePositions above — just add them to the
// canvas center.
function isoPos(x: number, y: number) {
  return {
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
  };
}

const SubjectCard = ({ subject, onOpen }: { subject: Subject; onOpen?: (s: Subject) => void }) => {
  const { name, topics, progress, status, highlighted, size, gridPos } = subject;
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isInProgress = status === "in-progress";
  const navigate = useNavigate();

  const { w, h } = CARD_DIMS[size];
  const pos = isoPos(gridPos.x, gridPos.y);

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
            transform: ISO_TRANSFORM,
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
            ? "border-blue-400/[0.10] bg-[rgba(70,140,255,0.04)] opacity-70 hover:opacity-100"
            : "border-white/[0.10] bg-[rgba(255,255,255,0.04)]"
        )}
        style={{
          transform: ISO_TRANSFORM,
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
                ? "bg-blue-400/10 text-blue-300/50"
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
              size === "sm" ? "text-[11px]" : size === "lg" ? "text-[16px]" : "text-[13px]",
              isLocked ? "text-zinc-500" : "text-white"
            )}
          >
            {name}
          </div>
          {topics ? (
            <div className={cn("text-[10px] mt-0.5", isLocked ? "text-blue-300/40" : "text-zinc-500")}>
              {topics} Questions
            </div>
          ) : isLocked ? (
            <div className="text-[10px] text-blue-300/40 mt-0.5">Coming up</div>
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
  <div className="relative w-full" style={{ height: "min(78vh, 780px)", minHeight: 560 }}>
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
          ? "border-blue-400/[0.10] bg-[rgba(70,140,255,0.035)] opacity-70"
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
        <span className={cn("text-xs", isLocked ? "text-blue-300/40" : "text-zinc-500")}>
          {topics} Questions
        </span>
      ) : isLocked ? (
        <span className="text-xs text-blue-300/40">Coming up</span>
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
// A live topic list has a variable length that comes from the DB, so it
// shares the same computeTrianglePositions pyramid layout used for the mock
// SUBJECTS above, with every card the same size.

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
        const positions = computeTrianglePositions(order.length);

        const built: Subject[] = order.map((topic, i) => ({
          id: topic,
          name: topic,
          topics: countByTopic.get(topic) ?? 0,
          status: "active",
          gridPos: positions[i],
          size: "md",
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
        {/* Isometric canvas grid — lines start at 0/90deg (same as the card's
            own rectangle edges) and get the identical ISO_TRANSFORM, so they
            land exactly parallel/perpendicular to the cards instead of
            crossing at a mismatched angle. Oversized so rotation doesn't clip corners. */}
        <div
          className="absolute pointer-events-none overflow-hidden inset-0"
        >
          <div
            className="absolute"
            style={{
              inset: "-60%",
              backgroundImage: `
                repeating-linear-gradient(0deg, rgba(90,155,255,0.16) 0, rgba(90,155,255,0.16) 1.5px, transparent 1.5px, transparent 220px),
                repeating-linear-gradient(90deg, rgba(90,155,255,0.16) 0, rgba(90,155,255,0.16) 1.5px, transparent 1.5px, transparent 220px)
              `,
              transform: ISO_TRANSFORM,
              transformOrigin: "center center",
            }}
          />
        </div>

        {/* Ambient purple-blue light source, emanating from the canvas center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 55% 50% at 48% 52%, rgba(59,130,246,0.13) 0%, rgba(37,99,235,0.06) 35%, transparent 68%),
              radial-gradient(ellipse 40% 38% at 60% 42%, rgba(56,131,255,0.09) 0%, transparent 65%)
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
            <div className="hidden md:block relative z-10 pb-8">
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
