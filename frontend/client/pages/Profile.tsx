import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import {
  fetchProfileActivity,
  updateAvatar,
  type HeatmapDay,
  type HistoryItem,
} from "@/lib/profile-api";
import { fileToAvatarDataURL } from "@/lib/image";
import { getLevelProgress } from "@/lib/leveling";
import { BRANCH_SUBJECT, getBranch, isWiredBranch } from "@/lib/gate-api";

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

interface UserHeaderProps {
  name: string;
  avatarUrl: string;
  uploading: boolean;
  onPickAvatar: () => void;
  xp: number;
}

function UserHeader({ name, avatarUrl, uploading, onPickAvatar, xp }: UserHeaderProps) {
  const { level, title, xpIntoLevel, xpForNextLevel, percentToNextLevel } =
    getLevelProgress(xp);

  return (
    <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-8 rounded-lg border border-gq-border bg-gq-card overflow-hidden relative">
      {/* Subtle corner decoration */}
      <div className="absolute top-0 left-0 w-32 h-28 opacity-10 pointer-events-none" />

      {/* Left: avatar + identity */}
      <div className="flex items-center gap-6">
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
        <div className="flex flex-col gap-1">
          <span className="text-gq-accent text-[22px] font-bold leading-none tracking-tight">
            {name}
          </span>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <div className="px-3 py-1 bg-gq-rank-bg rounded-[2px]">
              <span className="font-bold text-xs tracking-widest text-[#AEB9D0] uppercase">
                RANK: #1,240
              </span>
            </div>
            <span className="font-mono text-sm text-gq-text-secondary">
              Level {level} {title}
            </span>
          </div>
        </div>
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gq-border pb-3">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M0 8V0H8V8H0ZM0 18V10H8V18H0ZM10 8V0H18V8H10ZM10 18V10H18V18H10ZM2 6H6V2H2V6ZM12 6H16V2H12V6ZM12 16H16V12H12V16ZM2 16H6V12H2V16Z" fill="#ADC6FF"/>
          </svg>
          <span className="text-base text-gq-text-primary">Activity Map</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-gq-text-secondary">
          <span>
            ACTIVE DAYS: <span className="text-gq-accent font-bold">{activeDays}</span>
          </span>
          <span className="text-gq-border">|</span>
          <span>
            MAX STREAK: <span className="text-gq-accent font-bold">{maxStreak}</span>
          </span>
        </div>
      </div>

      {/* Contribution count, LeetCode-style */}
      <span className="text-sm text-gq-text-secondary">
        <span className="text-2xl font-bold text-gq-accent align-middle mr-1.5">
          {totalContributions.toLocaleString()}
        </span>
        question{totalContributions === 1 ? "" : "s"} attempted in the last year
      </span>

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
            <div className="overflow-x-auto pb-1">
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

function TacticalMastery() {
  return (
    <section className="flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card">
      <div className="flex items-center gap-2 border-b border-gq-border pb-3">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C10.9333 18 11.8125 17.8542 12.6375 17.5625C13.4625 17.2708 14.2167 16.8583 14.9 16.325L13.475 14.9C12.9917 15.25 12.4542 15.5208 11.8625 15.7125C11.2708 15.9042 10.65 16 10 16C8.33333 16 6.91667 15.4167 5.75 14.25C4.58333 13.0833 4 11.6667 4 10C4 8.33333 4.58333 6.91667 5.75 5.75C6.91667 4.58333 8.33333 4 10 4C11.6667 4 13.0833 4.58333 14.25 5.75C15.4167 6.91667 16 8.33333 16 10C16 10.65 15.9 11.275 15.7 11.875C15.5 12.475 15.225 13.0167 14.875 13.5L16.3 14.925C16.8333 14.2417 17.25 13.4833 17.55 12.65C17.85 11.8167 18 10.9333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill="#ADC6FF"/>
        </svg>
        <span className="text-base text-gq-text-primary">Tactical Mastery</span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-[200px] mx-auto aspect-square">
          <svg viewBox="0 0 260 260" fill="none" className="w-full h-full">
            {/* Grid circles */}
            <circle cx="130" cy="130" r="117" stroke="#2D2D2D" strokeWidth="1.3"/>
            <circle cx="130" cy="130" r="78" stroke="#2D2D2D" strokeWidth="1.3"/>
            <circle cx="130" cy="130" r="39" stroke="#2D2D2D" strokeWidth="1.3"/>
            {/* Grid lines */}
            <line x1="130" y1="13" x2="130" y2="247" stroke="#2D2D2D" strokeWidth="1.3"/>
            <line x1="13" y1="130" x2="247" y2="130" stroke="#2D2D2D" strokeWidth="1.3"/>
            {/* Radar polygon */}
            <path
              d="M130 39L221 130L169 207H91L39 130L130 39Z"
              fill="#ADC6FF"
              fillOpacity="0.2"
              stroke="#ADC6FF"
              strokeWidth="3.9"
            />
          </svg>
          {/* Labels */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 font-mono text-[9px] text-gq-text-secondary">OS</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[9px] text-gq-text-secondary">Algorithms</span>
          <span className="absolute bottom-0 right-4 font-mono text-[9px] text-gq-text-secondary">Logic</span>
          <span className="absolute bottom-0 left-4 font-mono text-[9px] text-gq-text-secondary">Math</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[9px] text-gq-text-secondary">DS</span>
        </div>
      </div>
    </section>
  );
}

function Badges() {
  const badges = [
    {
      icon: (
        <svg width="24" height="39" viewBox="0 0 24 39" fill="none">
          <path d="M12 24C13.65 24 15.0625 23.4125 16.2375 22.2375C17.4125 21.0625 18 19.65 18 18V12C18 10.35 17.4125 8.9375 16.2375 7.7625C15.0625 6.5875 13.65 6 12 6C10.35 6 8.9375 6.5875 7.7625 7.7625C6.5875 8.9375 6 10.35 6 12V18C6 19.65 6.5875 21.0625 7.7625 22.2375C8.9375 23.4125 10.35 24 12 24ZM9 19.5H15V16.5H9V19.5ZM9 13.5H15V10.5H9V13.5ZM12 27C10.375 27 8.86875 26.6 7.48125 25.8C6.09375 25 5 23.9 4.2 22.5H0V19.5H3.15C3.075 19 3.03125 18.5 3.01875 18C3.00625 17.5 3 17 3 16.5H0V13.5H3C3 13 3.00625 12.5 3.01875 12C3.03125 11.5 3.075 11 3.15 10.5H0V7.5H4.2C4.55 6.925 4.94375 6.3875 5.38125 5.8875C5.81875 5.3875 6.325 4.95 6.9 4.575L4.5 2.1L6.6 0L9.825 3.225C10.525 3 11.2375 2.8875 11.9625 2.8875C12.6875 2.8875 13.4 3 14.1 3.225L17.4 0L19.5 2.1L17.025 4.575C17.6 4.95 18.1187 5.38125 18.5812 5.86875C19.0437 6.35625 19.45 6.9 19.8 7.5H24V10.5H20.85C20.925 11 20.9688 11.5 20.9813 12C20.9938 12.5 21 13 21 13.5H24V16.5H21C21 17 20.9938 17.5 20.9813 18C20.9688 18.5 20.925 19 20.85 19.5H24V22.5H19.8C19 23.9 17.9062 25 16.5187 25.8C15.1312 26.6 13.625 27 12 27Z" fill="#ADC6FF"/>
        </svg>
      ),
      name: "Exterminator",
      desc: "100+ Debugged\nSessions",
    },
    {
      icon: (
        <svg width="24" height="42" viewBox="0 0 24 42" fill="none">
          <path d="M9.825 24.3L17.5875 15H11.5875L12.675 6.4875L5.7375 16.5H10.95L9.825 24.3ZM6 30L7.5 19.5H0L13.5 0H16.5L15 12H24L9 30H6Z" fill="#ADC6FF"/>
        </svg>
      ),
      name: "Overclocked",
      desc: "Solved 5 Quests\n< 1hr",
    },
    {
      icon: (
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none">
          <path d="M15 30C12.925 30 10.975 29.6063 9.15 28.8188C7.325 28.0312 5.7375 26.9625 4.3875 25.6125C3.0375 24.2625 1.96875 22.675 1.18125 20.85C0.39375 19.025 0 17.075 0 15C0 12.925 0.39375 10.975 1.18125 9.15C1.96875 7.325 3.0375 5.7375 4.3875 4.3875C5.7375 3.0375 7.325 1.96875 9.15 1.18125C10.975 0.39375 12.925 0 15 0C17.075 0 19.025 0.39375 20.85 1.18125C22.675 1.96875 24.2625 3.0375 25.6125 4.3875C26.9625 5.7375 28.0312 7.325 28.8188 9.15C29.6063 10.975 30 12.925 30 15C30 17.075 29.6063 19.025 28.8188 20.85C28.0312 22.675 26.9625 24.2625 25.6125 25.6125C24.2625 26.9625 22.675 28.0312 20.85 28.8188C19.025 29.6063 17.075 30 15 30ZM15 27C18.35 27 21.1875 25.8375 23.5125 23.5125C25.8375 21.1875 27 18.35 27 15C27 11.65 25.8375 8.8125 23.5125 6.4875C21.1875 4.1625 18.35 3 15 3C11.65 3 8.8125 4.1625 6.4875 6.4875C4.1625 8.8125 3 11.65 3 15C3 18.35 4.1625 21.1875 6.4875 23.5125C8.8125 25.8375 11.65 27 15 27Z" fill="#ADC6FF"/>
      </svg>
    ),
      name: "Syntax\nSniper",
      desc: "First-try\nAcceptances",
    },
    {
      icon: (
        <svg width="27" height="39" viewBox="0 0 27 39" fill="none">
          <path d="M9 18V9H18V18H9ZM12 15H15V12H12V15ZM9 27V24H6C5.175 24 4.46875 23.7062 3.88125 23.1187C3.29375 22.5312 3 21.825 3 21V18H0V15H3V12H0V9H3V6C3 5.175 3.29375 4.46875 3.88125 3.88125C4.46875 3.29375 5.175 3 6 3H9V0H12V3H15V0H18V3H21C21.825 3 22.5312 3.29375 23.1187 3.88125C23.7062 4.46875 24 5.175 24 6V9H27V12H24V15H27V18H24V21C24 21.825 23.7062 22.5312 23.1187 23.1187C22.5312 23.7062 21.825 24 21 24H18V27H15V24H12V27H9ZM21 21V6H6V21H21Z" fill="#ADC6FF"/>
        </svg>
      ),
      name: "Core\nMaster",
      desc: "OS Concept\nCompletion",
    },
  ];

  const LockIcon = () => (
    <svg width="20" height="27" viewBox="0 0 20 27" fill="none">
      <path d="M2.5 26.25C1.8125 26.25 1.22396 26.0052 0.734375 25.5156C0.244792 25.026 0 24.4375 0 23.75V11.25C0 10.5625 0.244792 9.97396 0.734375 9.48438C1.22396 8.99479 1.8125 8.75 2.5 8.75H3.75V6.25C3.75 4.52083 4.35938 3.04688 5.57812 1.82812C6.79688 0.609375 8.27083 0 10 0C11.7292 0 13.2031 0.609375 14.4219 1.82812C15.6406 3.04688 16.25 4.52083 16.25 6.25V8.75H17.5C18.1875 8.75 18.776 8.99479 19.2656 9.48438C19.7552 9.97396 20 10.5625 20 11.25V23.75C20 24.4375 19.7552 25.026 19.2656 25.5156C18.776 26.0052 18.1875 26.25 17.5 26.25H2.5ZM2.5 23.75H17.5V11.25H2.5V23.75ZM10 20C10.6875 20 11.276 19.7552 11.7656 19.2656C12.2552 18.776 12.5 18.1875 12.5 17.5C12.5 16.8125 12.2552 16.224 11.7656 15.7344C11.276 15.2448 10.6875 15 10 15C9.3125 15 8.72396 15.2448 8.23438 15.7344C7.74479 16.224 7.5 16.8125 7.5 17.5C7.5 18.1875 7.74479 18.776 8.23438 19.2656C8.72396 19.7552 9.3125 20 10 20ZM6.25 8.75H13.75V6.25C13.75 5.20833 13.3854 4.32292 12.6562 3.59375C11.9271 2.86458 11.0417 2.5 10 2.5C8.95833 2.5 8.07292 2.86458 7.34375 3.59375C6.61458 4.32292 6.25 5.20833 6.25 6.25V8.75Z" fill="#E5E2E1"/>
    </svg>
  );

  return (
    <section className="flex flex-col gap-6 p-6 rounded-lg border border-gq-border bg-gq-card">
      <div className="flex items-center gap-2 border-b border-gq-border pb-3">
        <svg width="10" height="20" viewBox="0 0 10 20" fill="none">
          <path d="M0 0H10V7.85C10 8.23333 9.91667 8.575 9.75 8.875C9.58333 9.175 9.35 9.41667 9.05 9.6L5.5 11.7L6.2 14H10L6.9 16.2L8.1 20L5 17.65L1.9 20L3.1 16.2L0 14H3.8L4.5 11.7L0.95 9.6C0.65 9.41667 0.416667 9.175 0.25 8.875C0.0833333 8.575 0 8.23333 0 7.85V0ZM2 2V7.85L4 9.05V2H2ZM8 2H6V9.05L8 7.85V2Z" fill="#ADC6FF"/>
        </svg>
        <span className="text-base text-gq-text-primary">Badges</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {badges.map((badge, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 p-4 rounded-[4px] border border-gq-accent bg-[rgba(53,53,52,0.30)]"
          >
            <div className="mb-2">{badge.icon}</div>
            <span className="font-mono font-bold text-[14px] text-gq-text-primary text-center whitespace-pre-line leading-tight">
              {badge.name}
            </span>
            <span className="text-[10px] text-gq-text-secondary text-center whitespace-pre-line leading-snug mt-1">
              {badge.desc}
            </span>
          </div>
        ))}

        {/* Empty slots */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center justify-center h-28 rounded-[4px] border border-dashed border-gq-accent/30 opacity-30"
          >
            <LockIcon />
          </div>
        ))}
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
  const { user, refresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activity, setActivity] = useState<{
    heatmap: HeatmapDay[];
    totalContributions: number;
    history: HistoryItem[];
    xp: number;
  }>({ heatmap: [], totalContributions: 0, history: [], xp: 0 });
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // XP is scoped to whichever branch the user picked in onboarding (only
  // CSE and Data Science & AI have a real question bank so far) — same
  // subject value the Problems/Roadmaps pages filter on.
  const branch = getBranch();
  const branchSubject = isWiredBranch(branch) ? BRANCH_SUBJECT[branch] : undefined;

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
          avatarUrl={user?.avatarUrl || ""}
          uploading={uploading}
          onPickAvatar={() => fileInputRef.current?.click()}
          xp={activity.xp}
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

        {/* Row 2: Tactical Mastery + Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <TacticalMastery />
          </div>
          <div className="lg:col-span-8">
            <Badges />
          </div>
        </div>

        {/* Row 3: History (solved questions in the past 7 days) */}
        {!activityLoading && !activityError && <History history={activity.history} />}
      </div>
    </Layout>
  );
}
