import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Map,
  Code2,
  Trophy,
  Activity,
  User,
  Search,
  Bell,
  ChevronDown,
  MoreHorizontal,
  Settings,
  HelpCircle,
} from "lucide-react";
import { USERS } from "@/components/landing/mocks/avatars";

/* ------------------------------------------------------------------ */
/*  A condensed, fake-data replica of the real Overview dashboard      */
/*  (GATEquest-main/frontend/client/pages/Index.tsx +                  */
/*  components/Sidebar.tsx) — same gq design tokens, same card radii   */
/*  and layout rhythm, scaled down and given a light bit of state      */
/*  (the CSE/Global tab) so it reads as "alive" rather than a static   */
/*  screenshot, the way Nest's CollectionsHeroMock does.                */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Roadmaps", icon: Map, active: false },
  { label: "Problems", icon: Code2, active: false },
  { label: "Quests", icon: Trophy, active: false },
  { label: "Pulse", icon: Activity, active: false },
  { label: "Profile", icon: User, active: false },
];

const FOOTER_NAV_ITEMS = [
  { label: "Settings", icon: Settings },
  { label: "Support", icon: HelpCircle },
];

const STATS = [
  { label: "Current Streak", value: "12 Days", hint: "↗ Personal best" },
  { label: "Total XP", value: "3,420", hint: "↗ 180 solved this week" },
  { label: "Current Level", value: "7", hint: "↗ 64% to next" },
  { label: "Rank", value: "#284", hint: "↗ Top 9% this week" },
];

const RECENT_TOPICS = [
  { name: "Binary Search Trees", meta: "Programming & DS · 2h ago" },
  { name: "Karnaugh Maps", meta: "Digital Logic · Yesterday" },
  { name: "Process Scheduling", meta: "Operating Systems · 2 days ago" },
];

const TRENDS: Record<
  "cse" | "global",
  { tag: string; title: string; meta: string; badge?: string }[]
> = {
  cse: [
    { tag: "ALGORITHMS", title: "Graph Theory Masterclass", meta: "42 Doubts", badge: "Hot" },
    { tag: "OPERATING SYSTEMS", title: "Paging vs Segmentation", meta: "128 Doubts" },
    { tag: "DBMS", title: "Normal Forms Cheat Sheet", meta: "56 Doubts", badge: "Active" },
    { tag: "DIGITAL LOGIC", title: "K-Map Simplification Tricks", meta: "89 Doubts" },
  ],
  global: [
    { tag: "MATHEMATICS", title: "Eigenvalues, Fast", meta: "97 Doubts", badge: "Hot" },
    { tag: "SIGNALS", title: "Z-Transform Shortcuts", meta: "61 Doubts" },
    { tag: "THERMO", title: "Entropy Intuition Thread", meta: "38 Doubts" },
    { tag: "NETWORKS", title: "Subnetting Speed Drills", meta: "44 Doubts" },
  ],
};

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex min-h-[74px] flex-col justify-between rounded-[10px] border border-gq-border bg-gq-card p-3">
      <span className="text-[10px] text-gq-text-muted">{label}</span>
      <span className="font-sans text-xl font-semibold text-white">{value}</span>
      <span className="text-[9px] text-gq-blue">{hint}</span>
    </div>
  );
}

export function OverviewMock({ className = "" }: { className?: string }) {
  const [tab, setTab] = useState<"cse" | "global">("cse");

  return (
    <div
      className={
        "flex h-[520px] w-full overflow-hidden rounded-2xl border border-white/5 bg-gq-bg select-none sm:h-[560px] md:h-[520px] " +
        className
      }
    >
      {/* Sidebar */}
      <div className="hidden w-[168px] shrink-0 flex-col border-r border-gq-border bg-gq-sidebar px-2.5 py-3 md:flex">
        <div className="mb-4 flex items-center gap-1.5 px-1.5">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/6aa5e7a18d0b6f4f3037b2ad52df5f4f698e5959?width=76"
            alt="GATEquest"
            className="h-4 w-4 shrink-0"
          />
          <span className="font-sans text-[11px] font-semibold tracking-[0.5px]">
            <span className="text-[#E5E1E4]">GATE</span>
            <span className="text-gq-blue">quest</span>
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={
                "flex items-center gap-2 rounded-[4px] px-2 py-[7px] text-[11px] transition-colors " +
                (active
                  ? "bg-[#4F4F4F] text-[#0E0E0E] font-medium"
                  : "text-gq-text-secondary")
              }
            >
              <Icon size={13} strokeWidth={2.25} />
              {label}
            </div>
          ))}
        </nav>

        <nav className="mt-auto flex flex-col gap-1 border-t border-gq-border pt-2">
          {FOOTER_NAV_ITEMS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-[4px] px-2 py-[7px] text-[11px] text-gq-text-secondary"
            >
              <Icon size={13} strokeWidth={2.25} />
              {label}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gq-border px-4 py-2.5">
          <span className="font-sans text-[13px] font-semibold text-white">Overview</span>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-[4px] border border-gq-border bg-[#201F1F] px-2.5 py-1 text-[10px] text-gq-text-muted sm:flex">
              <Search size={11} />
              Search...
            </div>
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-gq-border text-gq-text-muted">
              <Bell size={11} />
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gq-green" />
            </div>
            <img
              src={USERS.self.avatar}
              alt={USERS.self.name}
              className="h-6 w-6 shrink-0 rounded-full bg-black object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-sans text-lg font-semibold text-white">Overview</span>
            <div className="flex items-center gap-1 rounded-[4px] border border-gq-border bg-[#201F1F] px-2 py-1 text-[10px] text-gq-text-secondary">
              Today
              <ChevronDown size={10} />
            </div>
          </div>

          <div className="mb-3 grid grid-cols-4 gap-2">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-2.5">
            {/* Left column: Weekly Quest + Recent Topics Solved */}
            <div className="flex flex-col gap-2.5">
              <div className="rounded-[10px] border border-gq-border bg-gq-card p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-white">Weekly Quest</span>
                  <MoreHorizontal size={12} className="text-gq-text-muted" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-white/[0.06]">
                      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="#5DA2FA"
                          strokeWidth="4"
                          strokeDasharray={2 * Math.PI * 28}
                          strokeDashoffset={2 * Math.PI * 28 * 0.78}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-[10px] font-semibold text-white">Soon</span>
                    </div>
                    <div className="flex flex-col gap-2 text-[10px]">
                      <div>
                        <div className="text-gq-text-muted">Next weekly arena</div>
                        <div className="font-medium text-white">Sun, 6:30 PM · 60 min</div>
                      </div>
                      <div className="w-fit rounded-[6px] bg-[#888] px-3 py-1 text-[10px] font-semibold text-[#0E0E0E]">
                        View Quest
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-1 text-right text-[9.5px]">
                    <span className="font-medium text-white">25 questions</span>
                    <span className="text-gq-text-muted">MCQs, MSQs &amp; NATs</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col rounded-[10px] border border-gq-border bg-gq-card p-3.5">
                <span className="mb-2.5 text-[12px] font-semibold text-white">Recent Topics Solved</span>
                <div className="flex flex-col gap-2">
                  {RECENT_TOPICS.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between rounded-[6px] bg-white/[0.03] px-2.5 py-2"
                    >
                      <span className="text-[10.5px] font-medium text-white">{t.name}</span>
                      <span className="text-[9px] text-gq-text-muted">{t.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Community Trends */}
            <div className="flex flex-col overflow-hidden rounded-[10px] border border-gq-border bg-gq-card">
              <div className="flex items-center gap-3 border-b border-gq-border px-3 pt-2.5 pb-2 text-[10px]">
                {(["cse", "global"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={
                      "pb-1.5 transition-colors " +
                      (tab === t
                        ? "border-b-2 border-gq-blue text-white"
                        : "text-gq-text-muted")
                    }
                  >
                    {t === "cse" ? "CSE Feed" : "Global"}
                  </button>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-2.5 overflow-hidden px-3 py-2.5">
                {TRENDS[tab].map((t) => (
                  <motion.div
                    key={t.title}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.1em] text-gq-text-muted">
                      {t.tag}
                      {t.badge && (
                        <span className="rounded-[3px] bg-gq-blue/20 px-1 py-px text-[7px] text-gq-blue">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] font-medium text-white">{t.title}</div>
                    <div className="text-[9px] text-gq-text-muted">{t.meta}</div>
                  </motion.div>
                ))}
              </div>
              <div className="border-t border-gq-border px-3 py-2 text-center text-[10px] font-medium text-gq-text-secondary">
                Show more
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
