import React from "react";
import { Check, MessageCircle, Plus, Search, UserPlus, X } from "lucide-react";
import { USERS } from "@/components/landing/mocks/avatars";
import { getTagAccent } from "@/components/landing/mocks/pulseAccents";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock UI pieces for PulseHighlight, styled after Nest's             */
/*  BeautifullyCrafted mocks (CollectionGridCardMock, PostCardMock,    */
/*  SavedToastMock, CollectionDropdownMock, CollectionListItemMock,    */
/*  StatBadgeMock, NestButtonMock) but rebuilt around what Pulse        */
/*  actually is — a text-first feed for doubts, resources and exam     */
/*  experiences. No calls, no presence chrome, ever.                   */
/* ------------------------------------------------------------------ */

export function TagChipMock({
  tag,
  count,
  className,
}: {
  tag: string;
  count: number;
  className?: string;
}) {
  const { Icon, color } = getTagAccent(tag);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 bg-[#161618] border border-white/10 rounded-[16px] p-4 w-32",
        className,
      )}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: color + "22" }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="truncate text-sm text-white/90">{tag}</div>
        <div className="text-[11px] text-white/40">{count.toLocaleString()} posts</div>
      </div>
    </div>
  );
}

export function StatBadgeMock({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-[#242424] rounded-lg py-2.5 px-6",
        className,
      )}
    >
      <span className="text-sm font-semibold text-white">{value}</span>
      <span className="text-[10px] text-[#aaaaaa]">{label}</span>
    </div>
  );
}

export function DoubtResolvedToastMock({
  resolver = USERS.rohan.name,
  doubtTitle = "Why {q2,q3} skips a dead state in the NFA→DFA conversion",
  className,
}: {
  resolver?: string;
  doubtTitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-[#101010] border border-[#242424] rounded-[14px] px-3.5 py-3 shadow-2xl w-72",
        className,
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gq-green/15 text-gq-green">
        <Check size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white/90">
          Resolved by {resolver}
        </div>
        <div className="truncate text-[11px] text-white/40">{doubtTitle}</div>
      </div>
      <span className="shrink-0 text-xs text-white/50">View</span>
    </div>
  );
}

export function StudyGroupListItemMock({
  name,
  count,
  active = false,
  className,
}: {
  name: string;
  count: number;
  active?: boolean;
  className?: string;
}) {
  const { Icon, color } = getTagAccent(name);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2 py-2 rounded-[10px]",
        active && "bg-white/[0.06]",
        className,
      )}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: color + "22" }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm text-white/90">{name}</div>
        <div className="text-[11px] text-white/40">{count} members</div>
      </div>
    </div>
  );
}

const DEFAULT_GROUPS = [
  { name: "DBMS Warriors", count: 18, active: true },
  { name: "Mock Debrief", count: 32 },
  { name: "PYQ Grinders", count: 24 },
];

export function StudyGroupDropdownMock({
  groups = DEFAULT_GROUPS,
  className,
}: {
  groups?: { name: string; count: number; active?: boolean }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[260px] bg-[#0d0d0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden select-none",
        className,
      )}
    >
      <div className="border-b border-white/5 px-3.5 pt-3 pb-2.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gq-blue text-[9px] font-bold text-[#0E0E0E]">
              P
            </span>
            Join a group
          </div>
          <X size={12} className="text-white/30" />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
          <Search size={12} className="text-white/30" />
          <span className="text-xs text-white/35">Search groups…</span>
        </div>
      </div>

      <div className="px-1.5 py-1.5">
        {groups.map((g) => (
          <StudyGroupListItemMock key={g.name} {...g} />
        ))}
      </div>

      <div className="border-t border-white/5 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          <Plus size={13} /> New Group
        </div>
      </div>
    </div>
  );
}

const LIVE_MESSAGES = [
  {
    avatar: USERS.sruthi.avatar,
    name: USERS.sruthi.name,
    time: "10:41",
    text: "Anyone else stuck on Q14 from today's mock? Karnaugh map part.",
  },
  {
    avatar: USERS.rohan.avatar,
    name: USERS.rohan.name,
    time: "10:42",
    text: "Group the 1s diagonally? No — check the don't-care cells first.",
  },
  {
    avatar: USERS.parinith.avatar,
    name: USERS.parinith.name,
    time: "10:43",
    text: "Posting the full solution in Resources in a bit.",
  },
  {
    avatar: USERS.piyush.avatar,
    name: USERS.piyush.name,
    time: "10:45",
    text: "This room is genuinely faster than office hours.",
  },
];

export function LiveFeedMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[260px] bg-[#0d0d0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden select-none",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/5 px-3.5 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gq-green/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gq-green" />
        </span>
        <span className="text-sm font-medium text-white/90">Live · Mock Debrief</span>
      </div>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        {LIVE_MESSAGES.map((m) => (
          <div key={m.name + m.time} className="flex items-start gap-2">
            <img
              src={m.avatar}
              alt={m.name}
              className="mt-px h-5 w-5 shrink-0 rounded-full bg-black object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-white/90">{m.name}</span>
                <span className="text-[10px] text-white/35">{m.time}</span>
              </div>
              <p className="text-[11px] leading-[1.4] text-white/60">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FollowButtonMock({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-8 select-none items-center gap-1.5 rounded-full px-3 text-xs font-bold tracking-wide transition-colors",
        active ? "bg-white/10 text-white" : "bg-transparent text-[#9d9d9d]",
        className,
      )}
    >
      <UserPlus size={13} />
      <span>Follow</span>
    </div>
  );
}

export function FeedPostCardMock({
  name = USERS.sruthi.name,
  avatar = USERS.sruthi.avatar,
  tag = "Experience",
  title = "AIR 89 in GATE 2026. If I had to redo one thing — start PYQs from day 1, not month 3.",
  upvotes = "142",
  comments = 28,
  showFollow = true,
  className,
}: {
  name?: string;
  avatar?: string;
  tag?: string;
  title?: string;
  upvotes?: string;
  comments?: number;
  showFollow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#101010] border border-[#242424] rounded-[14px] p-3.5 shadow-2xl w-full max-w-[420px]",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <img
          src={avatar}
          alt={name}
          className="h-5 w-5 shrink-0 rounded-full bg-black object-cover"
        />
        <span className="truncate text-xs font-medium text-white/85">{name}</span>
        <span className="text-xs text-white/35">•</span>
        <span className="truncate text-xs text-white/35">#{tag}</span>
      </div>

      <p className="min-w-0 flex-1 text-sm leading-snug text-white/90">{title}</p>

      <div className="mt-3 flex items-center gap-1 text-[#9d9d9d]">
        <div className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold">
          ▲ {upvotes}
        </div>
        <div className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold">
          <MessageCircle size={12} /> {comments}
        </div>
        {showFollow && <FollowButtonMock active className="ml-auto" />}
      </div>
    </div>
  );
}
