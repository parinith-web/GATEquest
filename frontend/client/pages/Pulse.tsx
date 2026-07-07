import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  GitBranch,
  Hash,
  Users,
  Bookmark,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Cpu,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";

const posts = [
  {
    id: 1,
    channel: "ALGORITHM",
    author: "@sys_admin_k",
    authorAvatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/d50564aac26b134f93e52898e5058da47bff3ce8?width=36",
    isVerifiedEducator: false,
    timeAgo: "2h ago",
    tags: ["#OS", "#SCHEDULING"],
    title:
      "Deep dive: Why doesn't Round Robin always minimize average turnaround time?",
    body: "I've been analyzing the context-switch overhead in pre-emptive scheduling. While RR guarantees fairness, if the time quantum is heavily skewed relative to burst times, the aggregate turnaround time spikes compared to SJF. Has anyone modeled the exact threshold where RR degrades past FCFS efficiency? Looking for mathematical proofs.",
    replies: 42,
    votes: 342,
    isUpvoted: false,
    isSaved: false,
  },
  {
    id: 2,
    channel: "TUTORING",
    author: "@algo_queen",
    authorAvatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/16c87897c298c01f74fd0f9b66259212d5cc3288?width=36",
    isVerifiedEducator: true,
    timeAgo: "5h ago",
    tags: ["#DSA", "#GRAPHS"],
    title: "Visualizing Dijkstra's with Negative Weights: Why it fails.",
    body: "A common pitfall is assuming Dijkstra's handles negative weights if there are no negative cycles. It doesn't. Once a node is extracted from the priority queue, its distance is finalized. A subsequent negative edge can violate this greedy choice property. Let's trace it on this simple graph...",
    replies: 128,
    votes: 891,
    isUpvoted: false,
    isSaved: true,
  },
  {
    id: 3,
    channel: "DATABASES",
    author: "@db_wizard",
    authorAvatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/d50564aac26b134f93e52898e5058da47bff3ce8?width=36",
    isVerifiedEducator: false,
    timeAgo: "8h ago",
    tags: ["#SQL", "#INDEXING"],
    title: "When does a B+ Tree index hurt more than it helps?",
    body: "Counter-intuitive as it seems, adding indexes on low-cardinality columns in write-heavy tables can cause the optimizer to make suboptimal choices. Let me break down exactly when to avoid indexing and how to use EXPLAIN ANALYZE to diagnose this.",
    replies: 67,
    votes: 214,
    isUpvoted: false,
    isSaved: false,
  },
];

const studyRooms = [
  { title: "OS: Deadlock Prevention", members: 12 },
  { title: "DBMS: SQL Optimization", members: 8 },
  { title: "Networks: TCP/IP Deep Dive", members: 5 },
];

const trends = [
  { rank: 1, subject: "COMPUTER NETWORKS", topic: "Subnetting Edge Cases", views: "2.4k" },
  { rank: 2, subject: "DATABASES", topic: "B+ Tree Insertion Complexity", views: "1.8k" },
  { rank: 3, subject: "DIGITAL LOGIC", topic: "K-Map Minimization Tricks", views: "950" },
];

const channels = [
  { label: "#algorithms", count: 342, active: true },
  { label: "#os", count: 289 },
  { label: "#dsa", count: 234 },
  { label: "#databases", count: 128 },
  { label: "#networks", count: 89 },
  { label: "#digital-logic", count: 67 },
  { label: "#compilers", count: 45 },
];

type SortMode = "hot" | "new" | "top";
type ActiveTab = "global" | "branch";

export default function PulsePage() {
  const [sortMode, setSortMode] = useState<SortMode>("hot");
  const [activeTab, setActiveTab] = useState<ActiveTab>("global");

  return (
    <Layout>
      <div className="p-6 max-w-[1280px] mx-auto pb-24">
        {/* Local Page Sub-Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pulse-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pulse-blue flex items-center justify-center flex-shrink-0">
              <Cpu size={15} className="text-white" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-[18px] text-pulse-text tracking-[3px] uppercase">
                PULSE
              </h1>
              <div className="text-[10px] font-mono text-pulse-dim uppercase tracking-[2px]">
                CS Community Network
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tabs for Global / Branch */}
            <nav className="flex items-center gap-2 bg-pulse-card border border-pulse-border rounded-xl p-1">
              <button
                onClick={() => setActiveTab("branch")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[11px] font-mono tracking-[0.55px] uppercase transition-all",
                  activeTab === "branch"
                    ? "bg-pulse-blue text-white shadow-md font-bold"
                    : "text-pulse-muted hover:text-pulse-text"
                )}
              >
                BRANCH
              </button>
              <button
                onClick={() => setActiveTab("global")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[11px] font-mono tracking-[0.55px] uppercase transition-all",
                  activeTab === "global"
                    ? "bg-pulse-blue text-white shadow-md font-bold"
                    : "text-pulse-muted hover:text-pulse-text"
                )}
              >
                GLOBAL
              </button>
            </nav>
          </div>
        </div>

        {/* 3 Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Channels & Tools */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Channels Card */}
            <div className="border border-pulse-border rounded-lg bg-pulse-card p-5">
              <button className="flex items-center justify-between w-full mb-3 text-left">
                <span className="text-[11px] font-mono uppercase tracking-[1px] text-pulse-dim">
                  CHANNELS
                </span>
                <ChevronDown size={11} className="text-pulse-dim" />
              </button>
              <div className="flex flex-col gap-1">
                {channels.map((ch) => (
                  <button
                    key={ch.label}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded text-[12px] font-mono transition-colors text-left",
                      ch.active
                        ? "text-pulse-blue bg-pulse-blue/5 border-l-2 border-pulse-blue pl-2"
                        : "text-pulse-muted hover:text-pulse-text hover:bg-gq-card"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-pulse-dim flex-shrink-0" />
                      {ch.label.slice(1)}
                    </div>
                    <span className="text-[10px] text-pulse-dim">{ch.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tools */}
            <div className="border border-pulse-border rounded-lg bg-pulse-card p-5 flex flex-col gap-2">
              <span className="text-[11px] font-mono uppercase tracking-[1px] text-pulse-dim mb-2 block">
                TOOLS
              </span>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-mono tracking-[0.8px] uppercase text-pulse-muted hover:text-pulse-text hover:bg-gq-card text-left transition-colors">
                <Users size={14} className="text-pulse-dim" />
                STUDY ROOMS
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-mono tracking-[0.8px] uppercase text-pulse-muted hover:text-pulse-text hover:bg-gq-card text-left transition-colors">
                <BarChart3 size={14} className="text-pulse-dim" />
                TRENDING
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-mono tracking-[0.8px] uppercase text-pulse-muted hover:text-pulse-text hover:bg-gq-card text-left transition-colors">
                <Bookmark size={14} className="text-pulse-dim" />
                BOOKMARKS
              </button>
            </div>
          </div>

          {/* Center panel: Feed column */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Filter/Sort Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-pulse-border pb-3">
              <div className="flex items-center gap-2">
                {/* HOT */}
                <button
                  onClick={() => setSortMode("hot")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    sortMode === "hot"
                      ? "border-pulse-border bg-pulse-card shadow-[0_0_10px_0_rgba(59,130,246,0.10)] text-pulse-text"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text"
                  )}
                >
                  <Flame size={12} />
                  HOT
                </button>

                {/* NEW */}
                <button
                  onClick={() => setSortMode("new")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    sortMode === "new"
                      ? "border-pulse-border bg-pulse-card text-pulse-text"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text"
                  )}
                >
                  <GitBranch size={12} />
                  NEW
                </button>

                {/* TOP */}
                <button
                  onClick={() => setSortMode("top")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    sortMode === "top"
                      ? "border-pulse-border bg-pulse-card text-pulse-text"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text"
                  )}
                >
                  <TrendingUp size={12} />
                  TOP
                </button>
              </div>

              {/* Total nodes */}
              <div className="px-2 py-1 rounded-sm border border-pulse-border bg-pulse-card">
                <span className="text-[12px] font-mono text-pulse-muted">
                  Total Nodes: 1,402
                </span>
              </div>
            </div>

            {/* Post cards */}
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>

            {/* Load More */}
            <button className="flex items-center justify-center gap-2 py-4 border border-dashed border-pulse-border rounded-lg text-pulse-muted hover:text-pulse-text hover:border-pulse-muted transition-colors">
              <RefreshCw size={12} />
              <span className="text-[12px] font-mono uppercase tracking-[0.6px]">
                LOAD MORE NODES
              </span>
            </button>
          </div>

          {/* Right panel: Study rooms & Trends */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Active Study Rooms */}
            <div className="border border-pulse-border rounded-lg bg-pulse-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-pulse-border">
                <Users size={16} className="text-pulse-blue" />
                <h3 className="text-[16px] font-sans font-semibold text-pulse-text">
                  Active Study Rooms
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {studyRooms.map((room, i) => (
                  <button
                    key={i}
                    className="flex items-center justify-between px-3 py-3 rounded border border-pulse-border bg-pulse-bg hover:border-pulse-blue/30 transition-colors text-left"
                  >
                    <div>
                      <div className="text-[13px] font-sans font-medium text-pulse-text">
                        {room.title}
                      </div>
                      <div className="text-[9px] font-mono text-pulse-muted uppercase tracking-[0.5px] mt-0.5">
                        {room.members} MEMBERS ACTIVE
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-pulse-blue flex-shrink-0" />
                  </button>
                ))}

                <button className="py-2 text-center text-[10px] font-mono uppercase tracking-[0.55px] text-pulse-muted hover:text-pulse-text transition-colors">
                  VIEW ALL ROOMS
                </button>
              </div>
            </div>

            {/* Terminal Trends */}
            <div className="border border-pulse-border rounded-lg bg-pulse-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-pulse-border">
                <TrendingUp size={18} className="text-pulse-blue flex-shrink-0" />
                <h3 className="text-[16px] font-sans font-semibold text-pulse-text">
                  Terminal Trends
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {trends.map((trend) => (
                  <div
                    key={trend.rank}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-pulse-muted uppercase tracking-[0.5px]">
                        {trend.rank}. {trend.subject}
                      </span>
                      <span className="text-[13px] font-sans font-medium text-pulse-text leading-tight">
                        {trend.topic}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-pulse-muted whitespace-nowrap pt-[12px]">
                      {trend.views} views
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-pulse-border rounded-lg bg-pulse-card p-4 flex flex-col items-center justify-center gap-1">
                <div className="mb-2">
                  <Users size={16} className="text-pulse-blue" />
                </div>
                <span className="text-[18px] font-mono font-bold text-pulse-text">
                  12.4k
                </span>
                <span className="text-[9px] font-mono text-pulse-muted uppercase tracking-[0.5px] text-center">
                  ACTIVE NODES
                </span>
              </div>

              <div className="border border-pulse-border rounded-lg bg-pulse-card p-4 flex flex-col items-center justify-center gap-1">
                <div className="mb-2">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M5 10V5H10V10H5ZM6.66667 8.33333H8.33333V6.66667H6.66667V8.33333ZM5 15V13.3333H3.33333C2.875 13.3333 2.48264 13.1701 2.15625 12.8438C1.82986 12.5174 1.66667 12.125 1.66667 11.6667V10H0V8.33333H1.66667V6.66667H0V5H1.66667V3.33333C1.66667 2.875 1.82986 2.48264 2.15625 2.15625C2.48264 1.82986 2.875 1.66667 3.33333 1.66667H5V0H6.66667V1.66667H8.33333V0H10V1.66667H11.6667C12.125 1.66667 12.5174 1.82986 12.8438 2.15625C13.1701 2.48264 13.3333 2.875 13.3333 3.33333V5H15V6.66667H13.3333V8.33333H15V10H13.3333V11.6667C13.3333 12.125 13.1701 12.5174 12.8438 12.8438C12.5174 13.1701 12.125 13.3333 11.6667 13.3333H10V15H8.33333V13.3333H6.66667V15H5ZM11.6667 11.6667V3.33333H3.33333V11.6667H11.6667Z"
                      fill="#3B82F6"
                    />
                  </svg>
                </div>
                <span className="text-[18px] font-mono font-bold text-pulse-text">
                  59.9%
                </span>
                <span className="text-[9px] font-mono text-pulse-muted uppercase tracking-[0.5px] text-center">
                  UPTIME
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
