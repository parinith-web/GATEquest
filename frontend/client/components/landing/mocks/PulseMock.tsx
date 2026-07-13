import React, { useLayoutEffect, useRef, useState } from "react";
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
  Settings,
  HelpCircle,
  ArrowBigUp,
  MessageCircle,
  Eye,
  ImagePlus,
  FileText,
  Sparkles,
} from "lucide-react";
import { USERS } from "@/components/landing/mocks/avatars";

/* ------------------------------------------------------------------ */
/*  Pulse — the community layer of the dashboard: users post exam      */
/*  experiences, ask doubts, trade advice and drop resources. Same     */
/*  shell/tokens as OverviewMock (sidebar, header) with "Pulse" as     */
/*  the active nav item, and a feed + live-room content area built to  */
/*  read like a real, lived-in social surface rather than a static     */
/*  screenshot.                                                        */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, active: false },
  { label: "Roadmaps", icon: Map, active: false },
  { label: "Problems", icon: Code2, active: false },
  { label: "Quests", icon: Trophy, active: false },
  { label: "Pulse", icon: Activity, active: true },
  { label: "Profile", icon: User, active: false },
];

const FOOTER_NAV_ITEMS = [
  { label: "Settings", icon: Settings },
  { label: "Support", icon: HelpCircle },
];

const TAG_STYLE = "bg-gq-blue/15 text-gq-blue";

const FEED = [
  {
    avatar: USERS.sruthi.avatar,
    name: USERS.sruthi.name,
    time: "12m ago",
    tag: "Experience",
    text: "AIR 89 in GATE 2026. If I had to redo one thing — start PYQs from day 1, not month 3.",
    up: 142,
    comments: 28,
    views: "1.8k",
  },
  {
    avatar: USERS.rohan.avatar,
    name: USERS.rohan.name,
    time: "34m ago",
    tag: "Doubt",
    text: "NFA→DFA conversion — why doesn't {q2,q3} need a dead state here? Feels incomplete to me.",
    up: 19,
    comments: 11,
    views: "302",
  },
  {
    avatar: USERS.parinith.avatar,
    name: USERS.parinith.name,
    time: "1h ago",
    tag: "Resource",
    text: "One-page cheat sheet for Process Scheduling (FCFS, SJF, RR, Priority) with solved examples. PDF below.",
    up: 88,
    comments: 15,
    views: "960",
    attachment: "process-scheduling-cheatsheet.pdf",
  },
  {
    avatar: USERS.piyush.avatar,
    name: USERS.piyush.name,
    time: "2h ago",
    tag: "Advice",
    text: "Stop switching standard books every week. Pick one, finish it, then move to PYQs. Consistency > collection.",
    up: 205,
    comments: 40,
    views: "3.1k",
  },
];

const LIVE_MESSAGES = [
  { avatar: USERS.sruthi.avatar, name: USERS.sruthi.name, time: "10:41", text: "Anyone else stuck on Q14 from today's mock? Karnaugh map part." },
  { avatar: USERS.rohan.avatar, name: USERS.rohan.name, time: "10:42", text: "Group the 1s diagonally? No — check the don't-care cells first." },
  { avatar: USERS.sruthi.avatar, name: USERS.sruthi.name, time: "10:42", text: "Oh the don't-cares were the catch. Got it now, thanks." },
  { avatar: USERS.parinith.avatar, name: USERS.parinith.name, time: "10:43", text: "Posting the full solution in Resources in a bit." },
  { avatar: USERS.piyush.avatar, name: USERS.piyush.name, time: "10:45", text: "Different question — anyone remember the trick for CPU utilization with context-switch overhead?" },
  { avatar: USERS.rohan.avatar, name: USERS.rohan.name, time: "10:46", text: "Subtract total switch time from cycle length before you divide. That's the whole trick." },
  { avatar: USERS.parinith.avatar, name: USERS.parinith.name, time: "10:47", text: "Solution's up now — check Resources, page 2 has the working." },
  { avatar: USERS.piyush.avatar, name: USERS.piyush.name, time: "10:48", text: "Appreciate it. This room is genuinely faster than office hours." },
];

const TAGS = [
  { name: "#GATE2027", count: "2.1k posts" },
  { name: "#DBMS", count: "980 posts" },
  { name: "#TimeTable", count: "740 posts" },
  { name: "#PYQs", count: "612 posts" },
  { name: "#OperatingSystems", count: "588 posts" },
  { name: "#DigitalLogic", count: "471 posts" },
  { name: "#Revision", count: "402 posts" },
  { name: "#MockAnalysis", count: "355 posts" },
];

function FeedCard({ post }: { post: (typeof FEED)[number] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[10px] border border-gq-border bg-gq-card p-3"
    >
      <div className="flex items-center gap-2">
        <img
          src={post.avatar}
          alt={post.name}
          className="h-6 w-6 shrink-0 rounded-full bg-black object-cover"
        />
        <span className="text-[11px] font-medium text-white">{post.name}</span>
        <span className="text-[9.5px] text-gq-text-muted">· {post.time}</span>
        <span
          className={
            "ml-auto rounded-[4px] px-1.5 py-[3px] text-[8.5px] font-medium uppercase tracking-[0.04em] " +
            TAG_STYLE
          }
        >
          #{post.tag}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-[1.5] text-gq-text-secondary">{post.text}</p>

      {post.attachment && (
        <div className="mt-2 flex items-center gap-1.5 rounded-[6px] border border-gq-border bg-white/[0.03] px-2 py-1.5 text-[9.5px] text-gq-text-muted">
          <FileText size={11} className="shrink-0 text-gq-blue" />
          <span className="truncate">{post.attachment}</span>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-4 text-[9.5px] text-gq-text-muted">
        <span className="flex items-center gap-1">
          <ArrowBigUp size={12} strokeWidth={2} />
          {post.up}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={11} strokeWidth={2} />
          {post.comments}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={11} strokeWidth={2} />
          {post.views}
        </span>
      </div>
    </motion.div>
  );
}

export function PulseMock({ className = "" }: { className?: string }) {
  const [panel, setPanel] = useState<"live" | "tags">("live");
  const feedColRef = useRef<HTMLDivElement>(null);
  const [sidePanelHeight, setSidePanelHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = feedColRef.current;
    if (!node) return;

    const measure = () => setSidePanelHeight(node.offsetHeight);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={
        "flex h-[616px] w-full overflow-hidden bg-gq-bg select-none sm:h-[656px] md:h-[616px] " +
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
        {/* Header — single line: page title, For You pill, search, bell, avatar */}
        <div className="flex shrink-0 items-center justify-between border-b border-gq-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[15px] font-semibold text-white">Pulse</span>
            <div className="flex items-center gap-1.5 rounded-[4px] border border-gq-border bg-[#201F1F] px-2 py-1 text-[10px] text-gq-text-secondary">
              <Sparkles size={10} className="text-gq-blue" />
              For You
            </div>
          </div>
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
          <div className="grid h-full grid-cols-[1.5fr_1fr] items-start gap-2.5">
            {/* Left column: composer + feed */}
            <div ref={feedColRef} className="flex min-h-0 flex-col gap-2.5">
              <div className="flex shrink-0 items-center gap-2 rounded-[10px] border border-gq-border bg-gq-card p-2.5">
                <img
                  src={USERS.self.avatar}
                  alt={USERS.self.name}
                  className="h-6 w-6 shrink-0 rounded-full bg-black object-cover"
                />
                <span className="flex-1 truncate text-[10.5px] text-gq-text-muted">
                  Share an update, doubt, or resource...
                </span>
                <ImagePlus size={13} className="shrink-0 text-gq-text-muted" />
                <span className="shrink-0 rounded-[6px] bg-gq-blue px-2.5 py-1 text-[9.5px] font-semibold text-[#0E0E0E]">
                  Post
                </span>
              </div>

              <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {FEED.map((post) => (
                  <FeedCard key={post.name + post.time} post={post} />
                ))}
              </div>
            </div>

            {/* Right column: Live room + trending tags */}
            <div
              style={sidePanelHeight ? { height: sidePanelHeight } : undefined}
              className="flex flex-col overflow-hidden rounded-[10px] border border-gq-border bg-gq-card"
            >
              <div className="flex items-center gap-3 border-b border-gq-border px-3 pt-2.5 pb-2 text-[10px]">
                <button
                  onClick={() => setPanel("live")}
                  className={
                    "flex items-center gap-1.5 pb-1.5 transition-colors " +
                    (panel === "live"
                      ? "border-b-2 border-gq-blue text-white"
                      : "text-gq-text-muted")
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gq-green" />
                  Mock Debrief
                </button>
                <button
                  onClick={() => setPanel("tags")}
                  className={
                    "pb-1.5 transition-colors " +
                    (panel === "tags"
                      ? "border-b-2 border-gq-blue text-white"
                      : "text-gq-text-muted")
                  }
                >
                  Trending Tags
                </button>
              </div>

              {panel === "live" ? (
                <div className="no-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-2.5">
                  {LIVE_MESSAGES.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      className="flex items-start gap-2"
                    >
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="mt-px h-5 w-5 shrink-0 rounded-full bg-black object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[10px] font-medium text-white">{m.name}</span>
                          <span className="text-[8.5px] text-gq-text-muted">{m.time}</span>
                        </div>
                        <p className="text-[10.5px] leading-[1.4] text-gq-text-secondary">{m.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="no-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-2.5">
                  {TAGS.map((t, i) => (
                    <motion.div
                      key={t.name}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[11px] font-medium text-gq-blue-accent">{t.name}</span>
                      <span className="text-[9px] text-gq-text-muted">{t.count}</span>
                    </motion.div>
                  ))}
                </div>
              )}

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
