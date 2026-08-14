import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import {
  fetchProfileActivity,
  updateAvatar,
  updateName,
  type HeatmapDay,
  type HistoryItem,
  type SolveProgress,
} from "@/lib/profile-api";
import { fileToAvatarDataURL } from "@/lib/image";
import { getLevelProgress } from "@/lib/leveling";
import {
  BRANCH_SUBJECT,
  getBranch,
  isWiredBranch,
  fetchQuestRatingHistory,
  type QuestHistoryEntry,
} from "@/lib/gate-api";
import { STREAK_BADGES } from "@/lib/streak-badges";

// ── Heatmap helpers ──────────────────────────────────────────────────────────

// Buckets a raw "attempts that day" count into one of 5 shading levels,
// matching the 5-step HEAT_COLORS legend below.
function levelForCount(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

// Longest run of consecutive active days anywhere in the heatmap window
// (~year). This is the "have they ever maintained a streak this long"
// number that badge unlocking is based on — distinct from the *current*
// streak (which resets the moment a day is missed) shown elsewhere on
// the dashboard. Same computation the Activity Map's "MAX STREAK" stat
// already does, lifted up here so Badges can use it too.
function longestStreakFromHeatmap(heatmap: HeatmapDay[]): number {
  let longest = 0;
  let current = 0;
  for (const d of heatmap) {
    if (d.count > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN${mins === 1 ? "" : "S"} AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} HOUR${hours === 1 ? "" : "S"} AGO`;
  const days = Math.floor(hours / 24);
  return `${days} DAY${days === 1 ? "" : "S"} AGO`;
}

// A livelier blue gradient than a flat 5-step grey→blue scale — each step
// gets noticeably brighter and more saturated, and the top two steps get a
// soft glow (HEAT_GLOW) so a hot streak actually pops off the card instead
// of just being "a slightly different grey square."
const HEAT_COLORS = [
  "#22262F",   // 0 = inactive (a hair bluer than pure grey, ties into the card)
  "#1D3E78",   // 1 = low
  "#2955A8",   // 2 = med
  "#3E7BE0",   // 3 = med-high
  "#8FB6FF",   // 4 = bright
];

// Glow was previously drawn as an outer box-shadow, which bleeds a soft
// blur past each cell's edges — fuzzy rather than crisp, and especially
// messy on the small legend swatches. Kept as an array (same shape as
// HEAT_COLORS) so callers don't need to change, but every level is now
// "none" so cells/swatches render with clean, contained edges.
const HEAT_GLOW = ["none", "none", "none", "none", "none"];

// Fluid cell sizing (percent-based, via flexbox + aspect-square) so the
// grid actually fills the card instead of sitting in a fixed-size island —
// CELL_GAP separates cells within a month, MONTH_GAP separates one
// month's block from the next so the calendar visibly breaks into months.
// MIN_GRID_WIDTH is a floor: below it (narrow phones) the grid stops
// shrinking and the wrapper scrolls horizontally instead of cells turning
// into illegible slivers.
const CELL_GAP = 3;
const MONTH_GAP = 10;
const MIN_GRID_WIDTH = 640;

// ── Sub-components ───────────────────────────────────────────────────────────

interface EditableNameProps {
  name: string;
  /** Persists the new name (API call) — throwing surfaces an inline
   * error and keeps the field open so the user can retry. */
  onSave: (name: string) => Promise<void>;
}

// Click-to-edit profile name (distinct from the immutable @username):
// shows as plain text until clicked, then swaps to an inline input with
// save/cancel controls. Enter saves, Escape cancels.
function EditableName({ name, onSave }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the field in sync if `name` changes from outside while we're
  // not actively editing it (e.g. a fresh /me load).
  useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEditing = () => {
    setValue(name);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setValue(name);
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update your name.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            autoFocus
            value={value}
            maxLength={60}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") cancel();
            }}
            className="bg-transparent border-b border-gq-accent text-gq-accent text-[22px] font-bold leading-tight tracking-tight outline-none w-40 sm:w-56 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            title="Save name"
            className="p-1 rounded text-gq-accent hover:text-white transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            title="Cancel"
            className="p-1 rounded text-gq-text-secondary hover:text-white transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {error && <span className="text-xs text-[#f87171]">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Edit your name"
      className="group flex items-center gap-1.5 text-left w-fit"
    >
      <span className="text-gq-accent text-[22px] font-bold leading-tight tracking-tight">
        {name}
      </span>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gq-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}

interface UserHeaderProps {
  name: string;
  username: string;
  avatarUrl: string;
  uploading: boolean;
  onPickAvatar: () => void;
  onSaveName: (name: string) => Promise<void>;
  xp: number;
  /** Rank from the user's most recent settled quest — there's no
   * separate global leaderboard yet. `null` while still loading, and
   * `undefined` once loaded if the user has never completed a quest. */
  rank: number | null | undefined;
  rankLoading: boolean;
  onLogout: () => void;
}

function UserHeader({
  name,
  username,
  avatarUrl,
  uploading,
  onPickAvatar,
  onSaveName,
  xp,
  rank,
  rankLoading,
  onLogout,
}: UserHeaderProps) {
  const { level, title, xpIntoLevel, xpForNextLevel, percentToNextLevel } =
    getLevelProgress(xp);

  return (
    <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 p-8 rounded-lg border border-gq-border bg-gq-card overflow-hidden relative">
      {/* Subtle corner decoration */}
      <div className="absolute top-0 left-0 w-32 h-28 opacity-10 pointer-events-none" />

      {/* Log out */}
      <button
        type="button"
        onClick={onLogout}
        className="absolute top-12 right-4 sm:right-6 px-3 py-1.5 rounded-[4px] border border-gq-border text-gq-text-secondary text-xs font-medium tracking-wide hover:text-white hover:border-gq-accent/40 transition-colors"
      >
        Log out
      </button>

      {/* Left: avatar + identity — items-start (rather than items-end)
          keeps the name's top edge level with the avatar's top edge
          instead of anchoring it to the avatar's bottom. */}
      <div className="flex items-start gap-6">
        <button
          type="button"
          onClick={onPickAvatar}
          disabled={uploading}
          className="group relative w-24 h-24 rounded-[36px] bg-[#2A2A2A] overflow-hidden border-2 border-black flex-shrink-0 cursor-pointer"
          title="Change profile picture"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${name} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gq-text-secondary">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
              uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-white text-center px-1">
              {uploading ? "Uploading…" : "Change"}
            </span>
          </div>
        </button>
        <div className="flex flex-col gap-2 pt-0.5">
          <EditableName name={name} onSave={onSaveName} />
          {username && (
            <span className="font-mono text-sm text-gq-text-secondary leading-none">
              @{username}
            </span>
          )}
          <span className="font-mono text-sm text-gq-text-secondary leading-none">
            Level {level} {title}
          </span>
        </div>
      </div>

      {/* Middle: Rank */}
      <div className="flex flex-col items-center gap-1.5 sm:px-8">
        <span className="font-bold text-xs tracking-widest text-gq-text-secondary uppercase">
          Rank
        </span>
        <span className="text-gq-accent text-xl font-bold leading-none">
          {rankLoading ? "–" : rank ? `#${rank.toLocaleString()}` : "Unranked"}
        </span>
      </div>

      {/* Right: XP progress */}
      <div className="flex flex-col gap-2 w-full sm:w-96 sm:flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gq-text-secondary">XP PROGRESSION</span>
          <span className="text-sm text-gq-accent font-bold">
            {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-[#353534] rounded-full overflow-hidden">
          <div
            className="h-full bg-gq-accent rounded-full"
            style={{
              width: `${percentToNextLevel}%`,
              boxShadow: "0 0 10px 0 rgba(173,198,255,0.50)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

interface ActivityMapProps {
  heatmap: HeatmapDay[];
  totalContributions: number;
}

function ActivityMap({ heatmap, totalContributions }: ActivityMapProps) {
  // Group by each day's own calendar month — not by "whichever month owns
  // this week-column" like before. That earlier approach dumped an entire
  // 7-day week into one month's block even when a couple of those days
  // actually belonged to the next month (e.g. a week straddling Aug
  // 31/Sep 1 rendered as 7 "August" cells), which is exactly why August
  // was showing 35 cells for a 31-day month.
  //
  // Instead, a boundary week can now be split: the days that are really
  // in August render in August's grid, the days that are really in
  // September render in September's grid, each using its own local
  // column index — so every month's cell count matches its real day
  // count (or less, at the very start/end of the 1-year window).
  interface DayCell {
    date: string;
    count: number;
    globalCol: number;
    row: number; // 0 (Sun) – 6 (Sat)
  }
  interface MonthGroup {
    label: string;
    monthKey: string;
    days: DayCell[];
    cols: number[]; // distinct global week-columns this month's real days touch, in order
  }
  const monthGroups: MonthGroup[] = [];
  heatmap.forEach((d, i) => {
    const date = new Date(`${d.date}T00:00:00Z`);
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const globalCol = Math.floor(i / 7);
    const row = i % 7;

    let group = monthGroups[monthGroups.length - 1];
    if (!group || group.monthKey !== monthKey) {
      group = {
        label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
        monthKey,
        days: [],
        cols: [],
      };
      monthGroups.push(group);
    }
    if (group.cols[group.cols.length - 1] !== globalCol) group.cols.push(globalCol);
    group.days.push({ date: d.date, count: d.count, globalCol, row });
  });

  // Total active days + longest streak, computed straight from the
  // heatmap so the header reads like a real GitHub/LeetCode-style
  // contribution graph instead of a static day count.
  const { activeDays, maxStreak } = useMemo(() => {
    let active = 0;
    let longest = 0;
    let current = 0;
    for (const d of heatmap) {
      if (d.count > 0) {
        active += 1;
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return { activeDays: active, maxStreak: longest };
  }, [heatmap]);

  return (
    <section className="flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card">
      {/* Contribution count + active days / max streak, same row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-gq-text-secondary">
          <span className="text-2xl font-bold text-gq-accent align-middle mr-1.5">
            {totalContributions.toLocaleString()}
          </span>
          submission{totalContributions === 1 ? "" : "s"} in the last year
        </span>

        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-gq-text-secondary">
          <span>
            ACTIVE DAYS: <span className="text-gq-accent font-bold">{activeDays}</span>
          </span>
          <span className="text-gq-border">|</span>
          <span>
            MAX STREAK: <span className="text-gq-accent font-bold">{maxStreak}</span>
          </span>
        </div>
      </div>

      {/* Heatmap grid, broken into one flex item per calendar month so it
          visibly separates by month while still filling the full card
          width — each item's flex-grow is proportional to how many weeks
          that month's real days actually touch, so every column ends up
          the same width and no month borrows another's days. */}
      {heatmap.length === 0 ? (
        <div className="py-10 text-center text-sm text-gq-text-secondary">
          No activity yet — solve a question to light up the map.
        </div>
      ) : (
        (() => {
          // Single unified grid for the whole year, instead of one
          // independent mini-grid per month. That old per-month approach
          // gave every month its own gridTemplateColumns + its own
          // columnGap, so each month's *internal* gaps ate into its own
          // width independently — a month with many week-columns lost a
          // lot of width to gaps (shrinking its cells), while a
          // low-column month (like the current, still-in-progress month)
          // lost almost none, so its cells rendered visibly larger. One
          // grid means one shared columnGap applied uniformly across the
          // whole year, so every real week-column — and therefore every
          // cell — gets exactly the same width no matter which month
          // it's in. Fixed-width spacer columns between months recreate
          // the old visual "month gap" without splitting the grid.
          let col = 0;
          const monthStartCol: number[] = [];
          const templateParts: string[] = [];
          monthGroups.forEach((g, idx) => {
            monthStartCol.push(col);
            col += g.cols.length;
            templateParts.push(`repeat(${g.cols.length}, 1fr)`);
            if (idx < monthGroups.length - 1) {
              templateParts.push(`${MONTH_GAP}px`);
              col += 1;
            }
          });
          const gridTemplateColumns = templateParts.join(" ");

          return (
            <div
              className="overflow-x-auto pb-1 gq-activity-map-scroll"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.gq-activity-map-scroll::-webkit-scrollbar { display: none; }`}</style>
              <div
                className="grid"
                style={{
                  minWidth: MIN_GRID_WIDTH,
                  gridTemplateColumns,
                  columnGap: CELL_GAP,
                  rowGap: CELL_GAP,
                  gridTemplateRows: `auto repeat(7, 1fr)`,
                }}
              >
                {/* Month labels, row 1 */}
                {monthGroups.map((g, idx) => (
                  <span
                    key={`${g.monthKey}-label`}
                    className="font-mono text-xs text-gq-text-secondary truncate pb-1 text-center"
                    style={{
                      gridColumn: `${monthStartCol[idx] + 1} / span ${g.cols.length}`,
                      gridRow: 1,
                      minWidth: 0,
                    }}
                  >
                    {g.label}
                  </span>
                ))}

                {/* Day cells, rows 2–8 */}
                {monthGroups.map((g, idx) => {
                  const colIndex = new Map(g.cols.map((c, i) => [c, i]));
                  return g.days.map((d) => {
                    const level = levelForCount(d.count);
                    return (
                      <div
                        key={d.date}
                        className="aspect-square rounded-[4px] transition-all duration-150 ease-out hover:scale-125 hover:z-10 hover:rounded-[5px] cursor-default"
                        style={{
                          background: HEAT_COLORS[level] ?? HEAT_COLORS[0],
                          boxShadow: HEAT_GLOW[level] ?? HEAT_GLOW[0],
                          gridColumn:
                            monthStartCol[idx] + (colIndex.get(d.globalCol) ?? 0) + 1,
                          gridRow: d.row + 2,
                          minWidth: 0,
                          minHeight: 0,
                        }}
                        title={`${d.date}: ${d.count} question${d.count === 1 ? "" : "s"} attempted`}
                      />
                    );
                  });
                })}
              </div>
            </div>
          );
        })()
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gq-border/30">
        <span className="text-sm text-gq-text-secondary mr-1">Less</span>
        {HEAT_COLORS.map((color, i) => (
          <div
            key={color}
            className="w-3 h-3 rounded-[3px]"
            style={{ background: color, boxShadow: HEAT_GLOW[i] }}
          />
        ))}
        <span className="text-sm text-gq-text-secondary ml-1">More</span>
      </div>
    </section>
  );
}

interface SolveCounterProps {
  progress: SolveProgress;
}

const DIFFICULTY_COLORS = {
  easy: "#60A5FA",
  medium: "#EAB308",
  hard: "#EF4444",
} as const;

function SolveCounter({ progress }: SolveCounterProps) {
  const { easy, medium, hard, totalSolved, totalQuestions, attempting } = progress;

  // Ring drawn as three arcs joined into a loop — one per difficulty —
  // instead of one continuous progress circle. Each arc's *length* is
  // that difficulty's share of the whole question bank (so Medium, with
  // more than double Easy/Hard's question count, visibly takes up more
  // of the ring), and each arc is itself split into a bright leading
  // segment (that difficulty's solved fraction) and a dim trailing
  // segment (what's left) — same read as LeetCode's donut. The ring
  // isn't a closed 360° loop: it's a gauge shape open at the bottom
  // (TOTAL_SWEEP_DEG < 360, centered gap at the bottom), and ARC_GAP_DEG
  // of empty space separates each of the three arcs from its neighbors
  // so they visibly don't touch.
  const size = 200;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const TOTAL_SWEEP_DEG = 270; // ring covers 270° total, leaving a 90° gap at the bottom
  const ARC_GAP_DEG = 14; // empty space between each of the 3 arcs
  const START_DEG = 225; // offset where the ring starts (bottom-left, right after the bottom gap)

  const difficulties = [
    { key: "easy", color: DIFFICULTY_COLORS.easy, data: easy },
    { key: "medium", color: DIFFICULTY_COLORS.medium, data: medium },
    { key: "hard", color: DIFFICULTY_COLORS.hard, data: hard },
  ];

  const availableDeg = TOTAL_SWEEP_DEG - (difficulties.length - 1) * ARC_GAP_DEG;
  const degToLen = (deg: number) => (deg / 360) * circumference;

  let cursorDeg = START_DEG;
  const segments: {
    key: string;
    color: string;
    opacity: number;
    length: number;
    offset: number;
  }[] = [];
  difficulties.forEach((d) => {
    const arcDeg = totalQuestions > 0 ? (d.data.total / totalQuestions) * availableDeg : availableDeg / 3;
    const solvedFraction = d.data.total > 0 ? d.data.solved / d.data.total : 0;
    const solvedDeg = arcDeg * solvedFraction;
    const dimDeg = arcDeg - solvedDeg;

    if (solvedDeg > 0) {
      segments.push({
        key: `${d.key}-solved`,
        color: d.color,
        opacity: 1,
        length: degToLen(solvedDeg),
        offset: degToLen(cursorDeg),
      });
    }
    if (dimDeg > 0) {
      segments.push({
        key: `${d.key}-remaining`,
        color: d.color,
        opacity: 0.22,
        length: degToLen(dimDeg),
        offset: degToLen(cursorDeg + solvedDeg),
      });
    }
    cursorDeg += arcDeg + ARC_GAP_DEG;
  });

  const rows = [
    { label: "Easy", color: DIFFICULTY_COLORS.easy, data: easy },
    { label: "Med.", color: DIFFICULTY_COLORS.medium, data: medium },
    { label: "Hard", color: DIFFICULTY_COLORS.hard, data: hard },
  ];

  return (
    <section className="h-full flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card">
      <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-full max-w-[180px] mx-auto aspect-square flex-shrink-0">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeOpacity={seg.opacity}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                strokeDashoffset={-seg.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-2xl font-bold text-gq-text-primary leading-none">
              {totalSolved.toLocaleString()}
              <span className="text-base font-normal text-gq-text-secondary">
                /{totalQuestions.toLocaleString()}
              </span>
            </span>
            <span className="text-xs font-medium text-gq-text-secondary flex items-center gap-1">
              <span className="text-[#4ADE80]">✓</span> Solved
            </span>
            {attempting > 0 && (
              <span className="text-[11px] text-gq-text-secondary">
                <span className="font-semibold text-gq-text-primary">{attempting.toLocaleString()}</span>{" "}
                Attempting
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:flex-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-3 py-2 rounded-md bg-black/20 border border-gq-border/50"
            >
              <span className="text-sm font-semibold" style={{ color: row.color }}>
                {row.label}
              </span>
              <span className="font-mono text-sm text-gq-text-secondary">
                {row.data.solved.toLocaleString()}/{row.data.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LockIcon({ size = 14 }: { size?: number }) {
  const height = Math.round((size * 16) / 14);
  return (
    <svg width={size} height={height} viewBox="0 0 14 16" fill="none">
      <path
        d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V7C0 6.45 0.195833 5.97917 0.5875 5.5875C0.979167 5.19583 1.45 5 2 5H3V3.5C3 2.53333 3.34167 1.70833 4.025 1.025C4.70833 0.341667 5.53333 0 6.5 0C7.46667 0 8.29167 0.341667 8.975 1.025C9.65833 1.70833 10 2.53333 10 3.5V5H11C11.55 5 12.0208 5.19583 12.4125 5.5875C12.8042 5.97917 13 6.45 13 7V14C13 14.55 12.8042 15.0208 12.4125 15.4125C12.0208 15.8042 11.55 16 11 16H2ZM5 5H8V3.5C8 3.0875 7.85417 2.73438 7.5625 2.44063C7.27083 2.14687 6.9125 2 6.5 2C6.0875 2 5.73438 2.14687 5.44063 2.44063C5.14687 2.73438 5 3.0875 5 3.5V5Z"
        fill="#E5E7EB"
      />
    </svg>
  );
}

interface BadgesProps {
  /** Longest-ever consecutive-day solve streak, from the activity heatmap. */
  maxStreak: number;
}

function Badges({ maxStreak }: BadgesProps) {
  return (
    <section className="h-full flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card">
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 content-center">
        {STREAK_BADGES.map((badge) => {
          const unlocked = maxStreak >= badge.thresholdDays;
          const remaining = badge.thresholdDays - maxStreak;
          return (
            <div
              key={badge.id}
              className={
                unlocked
                  ? "flex flex-col items-center gap-1 p-4 rounded-[4px] border border-gq-accent bg-[rgba(53,53,52,0.30)]"
                  : "flex flex-col items-center gap-1 p-4 rounded-[4px] border border-dashed border-gq-accent/30"
              }
            >
              <div className="mb-2 w-16 h-16 relative">
                <div style={unlocked ? undefined : { filter: "blur(2.5px)", opacity: 0.55 }}>
                  {badge.svg}
                </div>
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/55 backdrop-blur-[1px]">
                      <LockIcon size={13} />
                    </div>
                  </div>
                )}
              </div>
              <span
                className={
                  unlocked
                    ? "font-mono font-bold text-[14px] text-gq-text-primary text-center leading-tight"
                    : "font-mono font-bold text-[14px] text-gq-text-secondary text-center leading-tight"
                }
              >
                {badge.name}
              </span>
              {unlocked ? (
                <span className="text-[10px] text-gq-text-secondary text-center leading-snug mt-1">
                  {badge.desc}
                </span>
              ) : (
                <span className="text-[10px] text-gq-text-secondary text-center leading-snug mt-1">
                  {remaining} day{remaining === 1 ? "" : "s"} to go
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface HistoryProps {
  history: HistoryItem[];
}

function History({ history }: HistoryProps) {
  return (
    <section className="flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card">
      <div className="flex items-center gap-2 border-b border-gq-border pb-3">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 18C6.7 18 4.69583 17.2375 2.9875 15.7125C1.27917 14.1875 0.3 12.2833 0.05 10H2.1C2.33333 11.7333 3.10417 13.1667 4.4125 14.3C5.72083 15.4333 7.25 16 9 16C10.95 16 12.6042 15.3208 13.9625 13.9625C15.3208 12.6042 16 10.95 16 9C16 7.05 15.3208 5.39583 13.9625 4.0375C12.6042 2.67917 10.95 2 9 2C7.85 2 6.775 2.26667 5.775 2.8C4.775 3.33333 3.93333 4.06667 3.25 5H6V7H0V1H2V3.35C2.85 2.28333 3.8875 1.45833 5.1125 0.875C6.3375 0.291667 7.63333 0 9 0C10.25 0 11.4208 0.2375 12.5125 0.7125C13.6042 1.1875 14.5542 1.82917 15.3625 2.6375C16.1708 3.44583 16.8125 4.39583 17.2875 5.4875C17.7625 6.57917 18 7.75 18 9C18 10.25 17.7625 11.4208 17.2875 12.5125C16.8125 13.6042 16.1708 14.5542 15.3625 15.3625C14.5542 16.1708 13.6042 16.8125 12.5125 17.2875C11.4208 17.7625 10.25 18 9 18ZM11.8 13.2L8 9.4V4H10V8.6L13.2 11.8L11.8 13.2Z" fill="#ADC6FF"/>
        </svg>
        <span className="text-base text-gq-text-primary">History</span>
        <span className="font-mono text-xs text-gq-text-secondary ml-auto hidden sm:block">
          LAST 7 DAYS
        </span>
      </div>

      {history.length === 0 ? (
        <div className="py-10 text-center text-sm text-gq-text-secondary">
          No questions solved in the past week yet — go pick one up in Problems.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((item) => (
            <Link
              key={item.questionId}
              to={`/question/${item.questionId}`}
              className="flex items-center justify-between py-3 px-3 border-b border-[rgba(66,71,84,0.30)] last:border-b-0 hover:bg-white/[0.02] transition-colors rounded-[2px]"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.isCorrect ? "#ADC6FF" : "#FFB4AB" }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gq-text-primary truncate">
                    {item.questionText}
                  </span>
                  <span className="font-mono text-xs text-gq-text-secondary tracking-tight uppercase mt-0.5">
                    {item.subject} · {item.topic}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0 ml-4 gap-0.5">
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: item.isCorrect ? "#ADC6FF" : "#FFB4AB" }}
                >
                  {item.isCorrect ? "SOLVED" : "ATTEMPTED"}
                </span>
                <span className="text-[10px] text-gq-text-secondary">
                  {timeAgo(item.attemptedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const [activity, setActivity] = useState<{
    heatmap: HeatmapDay[];
    totalContributions: number;
    history: HistoryItem[];
    xp: number;
    progress: SolveProgress;
  }>({
    heatmap: [],
    totalContributions: 0,
    history: [],
    xp: 0,
    progress: {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 },
      totalSolved: 0,
      totalQuestions: 0,
      attempting: 0,
    },
  });
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Rank shown in the header: the standings from the user's most recent
  // settled quest (there's no separate global leaderboard yet). Someone
  // who has never completed a quest has no rank at all — "Unranked".
  const [questHistory, setQuestHistory] = useState<QuestHistoryEntry[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  // XP is scoped to whichever branch the user picked in onboarding (only
  // CSE and Data Science & AI have a real question bank so far) — same
  // subject value the Problems/Roadmaps pages filter on.
  const branch = getBranch();
  const branchSubject = isWiredBranch(branch) ? BRANCH_SUBJECT[branch] : undefined;

  const maxStreak = useMemo(
    () => longestStreakFromHeatmap(activity.heatmap),
    [activity.heatmap],
  );

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    fetchProfileActivity(branchSubject)
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch((e) => {
        if (!cancelled) setActivityError(e.message);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchSubject]);

  useEffect(() => {
    let cancelled = false;
    setRankLoading(true);
    fetchQuestRatingHistory()
      .then((data) => {
        if (!cancelled) setQuestHistory(data);
      })
      .catch(() => {
        if (!cancelled) setQuestHistory([]);
      })
      .finally(() => {
        if (!cancelled) setRankLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rank = questHistory[0]?.result.rank;

  const handleAvatarFile = async (file: File) => {
    setAvatarError(null);
    setUploading(true);
    try {
      const dataUrl = await fileToAvatarDataURL(file);
      await updateAvatar(dataUrl);
      await refresh();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Couldn't update your avatar.");
    } finally {
      setUploading(false);
    }
  };

  // Re-thrown so EditableName can show the error inline next to the
  // field and keep it open for a retry, rather than us swallowing it
  // here.
  const handleNameSave = async (newName: string) => {
    await updateName(newName);
    await refresh();
  };

  return (
    <Layout>
      <div className="px-6 pb-6 flex flex-col gap-6 max-w-[1200px] mx-auto">
        {/* Hidden file input for avatar uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-selecting the same file later
            if (file) void handleAvatarFile(file);
          }}
        />

        {avatarError && (
          <div className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-4 py-2 text-sm text-[#f87171]">
            {avatarError}
          </div>
        )}

        {/* User identity header */}
        <UserHeader
          name={user?.name || user?.email || "Explorer"}
          username={user?.username || ""}
          avatarUrl={user?.avatarUrl || ""}
          uploading={uploading}
          onPickAvatar={() => fileInputRef.current?.click()}
          onSaveName={handleNameSave}
          xp={activity.xp}
          rank={rank}
          rankLoading={rankLoading}
          onLogout={handleLogout}
        />

        {/* Row 1: Activity Map (full width) */}
        {activityError ? (
          <div className="flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card text-sm text-gq-text-secondary">
            Couldn't load your activity map: {activityError}
          </div>
        ) : activityLoading ? (
          <div className="flex items-center justify-center h-40 rounded-lg border border-gq-border bg-gq-card text-sm text-gq-text-secondary">
            Loading activity…
          </div>
        ) : (
          <ActivityMap
            heatmap={activity.heatmap}
            totalContributions={activity.totalContributions}
          />
        )}

        {/* Row 2: Solve Counter + Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <SolveCounter progress={activity.progress} />
          </div>
          <div className="lg:col-span-8">
            <Badges maxStreak={maxStreak} />
          </div>
        </div>

        {/* Row 3: History (solved questions in the past 7 days) */}
        {!activityLoading && !activityError && <History history={activity.history} />}
      </div>
    </Layout>
  );
}
