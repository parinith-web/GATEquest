import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { SectionEyebrow } from "@/components/landing/LandingUI";

/* ------------------------------------------------------------------ */
/*  RoadmapShowcase                                                    */
/*                                                                      */
/*  A dedicated, highlighted section that recreates — pixel-for-pixel  */
/*  in approach — the isometric subject grid from the real product's   */
/*  GATEquest-main/frontend/client/pages/Roadmaps.tsx (IsometricRoadmap */
/*  + SubjectCard + background grid / ambient light / vignette). This  */
/*  is the same rotate/skewY/scaleY transform, the same pyramid-row    */
/*  layout math, and the same card visual language — just fed a fixed  */
/*  10-subject CSE seed set so it can render as a static hero visual   */
/*  without the live API. Kept in its own file (rather than folded     */
/*  into RoadmapsQuestsSplit, which is copy-only) so the feature gets  */
/*  its own moment on the page.                                        */
/* ------------------------------------------------------------------ */

type CardSize = "sm" | "md" | "lg";

interface Subject {
  id: string;
  name: string;
  topics: number;
  gridPos: { x: number; y: number };
  size: CardSize;
}

type SubjectSeed = Omit<Subject, "gridPos" | "size">;

// Same 10 CSE-core subjects, in the same reading order, as the product
// screenshot this section recreates.
const SUBJECT_SEEDS: SubjectSeed[] = [
  { id: "eng-math", name: "Engineering Mathematics", topics: 39 },
  { id: "digital-logic", name: "Digital Logic", topics: 21 },
  { id: "comp-org", name: "Computer Organization and Architecture", topics: 30 },
  { id: "prog-ds", name: "Programming and Data Structures", topics: 33 },
  { id: "algorithms", name: "Algorithms", topics: 25 },
  { id: "toc", name: "Theory of Computation", topics: 23 },
  { id: "compiler-design", name: "Compiler Design", topics: 21 },
  { id: "operating-sys", name: "Operating System", topics: 25 },
  { id: "databases", name: "Databases", topics: 25 },
  { id: "comp-networks", name: "Computer Networks", topics: 27 },
];

// ─── Isometric transform (identical to Roadmaps.tsx) ──────────────────────────

const ISO_ROTATE_DEG = -38;
const ISO_SKEW_DEG = 16;
const ISO_SCALE_Y = 0.72;
const ISO_TRANSFORM = `rotate(${ISO_ROTATE_DEG}deg) skewY(${ISO_SKEW_DEG}deg) scaleY(${ISO_SCALE_Y})`;

type Mat2 = [[number, number], [number, number]];

function matMul(A: Mat2, B: Mat2): Mat2 {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
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

const CARD_DIMS: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 168, h: 112 },
  md: { w: 228, h: 148 },
  lg: { w: 280, h: 182 },
};

function projectedCardHalfExtent(size: CardSize) {
  const { w, h } = CARD_DIMS[size];
  const corners = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  const projected = corners.map(([x, y]) => projectIso(x, y));
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  return {
    halfW: (Math.max(...xs) - Math.min(...xs)) / 2,
    halfH: (Math.max(...ys) - Math.min(...ys)) / 2,
  };
}

const TOP_MARGIN = 28;
const BOTTOM_MARGIN = 32;
const SHIFT_X = 64;
const COL_UNIT = 245;
const ROW_UNIT = 250;

// Pyramid layout: row 0 gets 1 card, row 1 gets 2, row 2 gets 3, row 3 gets
// 4 — the same "reverse V" pyramid as the real Roadmaps page, projected
// through the shared isometric matrix so rows stay parallel to the grid.
function computeTrianglePositions(n: number, size: CardSize = "md") {
  if (n <= 0) return { positions: [] as { x: number; y: number }[], canvasHeight: 0 };

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
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const { halfH } = projectedCardHalfExtent(size);
  const offsetX = -centerX + SHIFT_X;
  const offsetY = TOP_MARGIN + halfH - minY;

  const positions = projected.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
  const canvasHeight = maxY + offsetY + halfH + BOTTOM_MARGIN;

  return { positions, canvasHeight };
}

const LAYOUT = computeTrianglePositions(SUBJECT_SEEDS.length);
const SUBJECTS: Subject[] = SUBJECT_SEEDS.map((seed, i) => ({
  ...seed,
  size: "md",
  gridPos: LAYOUT.positions[i],
}));
const CANVAS_HEIGHT = LAYOUT.canvasHeight;

function isoPos(x: number, y: number) {
  return { left: `calc(50% + ${x}px)`, top: `${y}px` };
}

const SubjectCard = ({ subject }: { subject: Subject }) => {
  const { name, topics, size, gridPos } = subject;
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
      }}
    >
      <div
        className="absolute inset-0 rounded-xl border border-white/[0.10] bg-[rgba(255,255,255,0.04)] p-3 flex flex-col justify-between overflow-hidden transition-all duration-200 hover:border-gq-blue/50 hover:bg-blue-950/20"
        style={{ transform: ISO_TRANSFORM, transformOrigin: "center center" }}
      >
        <div className="flex items-start justify-between">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold bg-white/10 text-white/60 flex-shrink-0">
            ○
          </div>
        </div>
        <div>
          <div className="font-semibold leading-tight text-[13px] text-white">
            {name}
          </div>
          <div className="text-[10px] mt-0.5 text-zinc-500">{topics} Questions</div>
        </div>
      </div>
    </div>
  );
};

export function RoadmapShowcase() {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef as React.RefObject<HTMLElement>,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0.1, 0.4, 0.75, 1], [0, 1, 1, 0]);
  const blur = useTransform(
    scrollYProgress,
    [0.1, 0.4, 0.75, 1],
    ["blur(12px)", "blur(0px)", "blur(0px)", "blur(12px)"],
  );

  return (
    <section
      id="roadmaps"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-t border-white/[0.06] px-6 py-24"
    >
      {/* Rebuilt on Nest's BeautifullyCrafted.tsx template — a pinned,
          radially-masked canvas that fades/blurs in and out as it scrolls
          through view, with small stat mocks flanking a centered label,
          instead of the previous static bordered frame. This is the one
          Nest layout that's uniquely suited to a full-bleed hero visual
          like the roadmap grid, so it gets the treatment here rather
          than the boxed-card style used by every other section. */}
      <div className="relative -ml-16 flex w-full max-w-[1800px] items-center gap-0 md:-ml-24 lg:-ml-32">
        {/* Title — sits outside the masked/blurred canvas entirely, in the
            empty space to its left, so it stays crisp regardless of the
            canvas's scroll-driven opacity/blur. */}
        <h2 className="hidden shrink-0 pl-40 text-left font-display text-xl tracking-tight text-white md:block md:text-5xl lg:pl-48 lg:text-6xl">
          Roadmaps
          <br />
          Reimagined
        </h2>

        <div
          className="relative flex h-screen w-full min-w-0 flex-1 translate-x-4 items-center justify-center md:translate-x-8 lg:translate-x-12"
          style={{
            WebkitMaskImage: "radial-gradient(circle, black 35%, transparent 85%)",
            maskImage: "radial-gradient(circle, black 35%, transparent 85%)",
          }}
        >
          <motion.div
            style={{ opacity, filter: blur }}
            className="pointer-events-none z-0 flex w-full select-none flex-col items-center justify-center gap-2"
          >
          {/* Flanking stat mocks either side of the canvas — same role as
              Nest's toast/dropdown mocks bracketing its center heading. */}
          <div className="mb-2 hidden w-full items-end justify-between px-4 md:flex">
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 shadow-2xl">
                <div className="font-mono text-lg font-semibold text-gq-blue">5,000+</div>
                <div className="text-[11px] text-gq-text-muted">Practice Questions</div>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-right">
              <div className="rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 shadow-2xl">
                <div className="font-mono text-lg font-semibold text-gq-blue">10</div>
                <div className="text-[11px] text-gq-text-muted">Subjects Mapped</div>
              </div>
            </div>
          </div>

          {/* Isometric canvas grid — identical construction to the real
              Roadmaps page: lines start at 0/90deg and get the same
              ISO_TRANSFORM as the cards, so they land exactly parallel
              to them instead of crossing at a mismatched angle. */}
          <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#08080b]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
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

            {/* ── Isometric roadmap (desktop) ── */}
            <div
              className="hidden md:block relative z-10 w-full"
              style={{ height: CANVAS_HEIGHT, minHeight: 420 }}
            >
              {SUBJECTS.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>

            {/* ── Mobile fallback: simple stacked list ── */}
            <div className="md:hidden relative z-10 flex flex-col gap-3 p-5">
              {SUBJECTS.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="font-semibold text-sm text-white">
                    {subject.name}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {subject.topics} Questions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        </div>
      </div>

      {/* Mobile-only heading + CTA (the radial-masked canvas above is
          desktop-oriented; phones get the plain stacked list + copy). */}
      <div className="relative z-10 mt-6 max-w-2xl text-center md:hidden">
        <SectionEyebrow>Roadmaps</SectionEyebrow>
        <h2 className="font-display text-3xl font-bold leading-snug tracking-[-0.5px]">
          A complete map of every subject you need to clear
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-gq-text-secondary">
          Subjects sit on a grid, sized and positioned by how much ground
          they cover — for every GATE branch, not just a handful.
        </p>
      </div>

    </section>
  );
}
