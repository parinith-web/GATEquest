import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  fetchProfileActivity,
  type HeatmapDay,
  type HistoryItem,
  type SolveProgress,
} from "@/lib/profile-api";
import { getLevelProgress } from "@/lib/leveling";
import {
  BRANCH_SUBJECT,
  getBranch,
  isWiredBranch,
  fetchQuests,
  fetchQuestRatingHistory,
  nextSunday630pm,
  type QuestSummary,
  type QuestHistoryEntry,
} from "@/lib/gate-api";
import {
  fetchPulseFeed,
  fetchPulseTrending,
  timeAgo as pulseTimeAgo,
  type PulsePost,
  type ChannelCount,
} from "@/lib/pulse-api";

// Consecutive-day streak counted backward from the most recent day in
// the heatmap (today) — the first day with zero attempts breaks it.
// This is distinct from "max streak" (the longest such run anywhere in
// the past year), which is what the profile page's Activity Map shows.
function currentStreakFromHeatmap(heatmap: HeatmapDay[]): number {
  let streak = 0;
  for (let i = heatmap.length - 1; i >= 0; i--) {
    if (heatmap[i].count > 0) streak += 1;
    else break;
  }
  return streak;
}

function formatQuestDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeTaken(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// The weekly arena only ever lands on Sunday, so we treat the tail end
// of the week (Fri/Sat/Sun) as "look ahead to what's coming" and the
// rest of the week as "look back at how the last one went".
function isUpcomingWindow(date: Date): boolean {
  const day = date.getDay(); // 0 = Sun ... 6 = Sat
  return day === 0 || day === 5 || day === 6;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface RecentTopic {
  subject: string;
  topic: string;
  solvedCount: number;
  lastAttemptedAt: string;
}

// Groups the last-7-days history feed (one row per question) by topic,
// so the Overview page can show "what have I been solving lately"
// instead of a per-question list — sorted by whichever topic was
// touched most recently.
function recentTopicsFromHistory(history: HistoryItem[]): RecentTopic[] {
  const byTopic = new Map<string, RecentTopic>();
  for (const item of history) {
    if (!item.isCorrect) continue;
    const key = `${item.subject}::${item.topic}`;
    const existing = byTopic.get(key);
    if (existing) {
      existing.solvedCount += 1;
      if (item.attemptedAt > existing.lastAttemptedAt) {
        existing.lastAttemptedAt = item.attemptedAt;
      }
    } else {
      byTopic.set(key, {
        subject: item.subject,
        topic: item.topic,
        solvedCount: 1,
        lastAttemptedAt: item.attemptedAt,
      });
    }
  }
  return Array.from(byTopic.values()).sort((a, b) =>
    b.lastAttemptedAt.localeCompare(a.lastAttemptedAt),
  );
}




// Same ring shell as DonutChart, but shows an arbitrary label/value pair
// in the center instead of a percentage — used for "rank achieved" and
// "starts in" states where there's no completion fraction to plot.
function RingStat({
  value,
  label,
  filled,
}: {
  value: string;
  label: string;
  filled: boolean;
}) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-[180px] h-[180px] shrink-0">
      <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#2A2A2A" strokeWidth="16" />
        <circle
          cx="90" cy="90" r={radius} fill="none"
          stroke="#5DA2FA" strokeWidth="16"
          strokeDasharray={`${filled ? circumference : circumference * 0.12} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-white text-[22px] font-bold leading-tight">{value}</span>
        <span className="text-gq-text-secondary text-[12px]">{label}</span>
      </div>
    </div>
  );
}

// Trending posts + tags now come straight from Pulse (see
// fetchPulseFeed/fetchPulseTrending below) instead of this hardcoded
// list — kept only as the shape reference for the empty/loading states.


const DotsMenu = () => (
  <svg width="5" height="17" viewBox="0 0 5 17" fill="none">
    <path d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14C0 13.45 0.195833 12.9792 0.5875 12.5875C0.979167 12.1958 1.45 12 2 12C2.55 12 3.02083 12.1958 3.4125 12.5875C3.80417 12.9792 4 13.45 4 14C4 14.55 3.80417 15.0208 3.4125 15.4125C3.02083 15.8042 2.55 16 2 16ZM2 10C1.45 10 0.979167 9.80417 0.5875 9.4125C0.195833 9.02083 0 8.55 0 8C0 7.45 0.195833 6.97917 0.5875 6.5875C0.979167 6.19583 1.45 6 2 6C2.55 6 3.02083 6.19583 3.4125 6.5875C3.80417 6.97917 4 7.45 4 8C4 8.55 3.80417 9.02083 3.4125 9.4125C3.02083 9.80417 2.55 10 2 10ZM2 4C1.45 4 0.979167 3.80417 0.5875 3.4125C0.195833 3.02083 0 2.55 0 2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0C2.55 0 3.02083 0.195833 3.4125 0.5875C3.80417 0.979167 4 1.45 4 2C4 2.55 3.80417 3.02083 3.4125 3.4125C3.02083 3.80417 2.55 4 2 4Z" fill="#8C909F"/>
  </svg>
);

const ThreeDotsMenu = () => (
  <svg width="13" height="4" viewBox="0 0 13 4" fill="none">
    <path d="M1.5 3C1.0875 3 0.734375 2.85313 0.440625 2.55938C0.146875 2.26562 0 1.9125 0 1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0C1.9125 0 2.26562 0.146875 2.55938 0.440625C2.85313 0.734375 3 1.0875 3 1.5C3 1.9125 2.85313 2.26562 2.55938 2.55938C2.26562 2.85313 1.9125 3 1.5 3ZM6 3C5.5875 3 5.23438 2.85313 4.94063 2.55938C4.64688 2.26562 4.5 1.9125 4.5 1.5C4.5 1.0875 4.64688 0.734375 4.94063 0.440625C5.23438 0.146875 5.5875 0 6 0C6.4125 0 6.76562 0.146875 7.05937 0.440625C7.35312 0.734375 7.5 1.0875 7.5 1.5C7.5 1.9125 7.35312 2.26562 7.05937 2.55938C6.76562 2.85313 6.4125 3 6 3ZM10.5 3C10.0875 3 9.73438 2.85313 9.44063 2.55938C9.14688 2.26562 9 1.9125 9 1.5C9 1.0875 9.14688 0.734375 9.44063 0.440625C9.73438 0.146875 10.0875 0 10.5 0C10.9125 0 11.2656 0.146875 11.5594 0.440625C11.8531 0.734375 12 1.0875 12 1.5C12 1.9125 11.8531 2.26562 11.5594 2.55938C11.2656 2.85313 10.9125 3 10.5 3Z" fill="#8C909F"/>
  </svg>
);

const TrendUpIcon = () => (
  <svg width="15" height="9" viewBox="0 0 15 9" fill="none">
    <path d="M0.933333 8L0 7.06667L4.93333 2.1L7.6 4.76667L11.0667 1.33333H9.33333V0H13.3333V4H12V2.26667L7.6 6.66667L4.93333 4L0.933333 8Z" fill="#5DA2FA"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M11.6667 11.6667L9.33333 9.33333H3.5C3.17917 9.33333 2.90451 9.2191 2.67604 8.99063C2.44757 8.76215 2.33333 8.4875 2.33333 8.16667V7.58333H8.75C9.07083 7.58333 9.34549 7.4691 9.57396 7.24062C9.80243 7.01215 9.91667 6.7375 9.91667 6.41667V2.33333H10.5C10.8208 2.33333 11.0955 2.44757 11.324 2.67604C11.5524 2.90451 11.6667 3.17917 11.6667 3.5V11.6667ZM1.16667 5.93542L1.85208 5.25H7.58333V1.16667H1.16667V5.93542ZM0 8.75V1.16667C0 0.845833 0.114236 0.571181 0.342708 0.342708C0.571181 0.114236 0.845833 0 1.16667 0H7.58333C7.90417 0 8.17882 0.114236 8.40729 0.342708C8.63576 0.571181 8.75 0.845833 8.75 1.16667V5.25C8.75 5.57083 8.63576 5.84549 8.40729 6.07396C8.17882 6.30243 7.90417 6.41667 7.58333 6.41667H2.33333L0 8.75Z" fill="#8C909F"/>
  </svg>
);

export default function Index() {
  const [trendsTab, setTrendsTab] = useState<"feed" | "trending">("feed");

  const [activity, setActivity] = useState<{
    heatmap: HeatmapDay[];
    history: HistoryItem[];
    xp: number;
    progress: SolveProgress;
  }>({
    heatmap: [],
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

  // XP (and therefore level) is scoped to whichever branch the user
  // picked in onboarding, same as the profile page.
  const branch = getBranch();
  const branchSubject = isWiredBranch(branch) ? BRANCH_SUBJECT[branch] : undefined;

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    fetchProfileActivity(branchSubject)
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch(() => {
        /* Overview degrades to zeroed stats on failure — the profile
           page is the canonical place to surface a load error. */
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchSubject]);

  const currentStreak = currentStreakFromHeatmap(activity.heatmap);
  const solvedThisWeek = activity.history.filter((h) => h.isCorrect).length;
  const levelProgress = getLevelProgress(activity.xp);
  const recentTopics = recentTopicsFromHistory(activity.history);

  // --- Quests (weekly arena) --------------------------------------------
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [questHistory, setQuestHistory] = useState<QuestHistoryEntry[]>([]);
  const [questLoading, setQuestLoading] = useState(true);

  useEffect(() => {
    if (!isWiredBranch(branch)) {
      setQuests([]);
      setQuestHistory([]);
      setQuestLoading(false);
      return;
    }
    let cancelled = false;
    setQuestLoading(true);
    Promise.allSettled([fetchQuests(branchSubject), fetchQuestRatingHistory()])
      .then(([questsResult, historyResult]) => {
        if (cancelled) return;
        setQuests(questsResult.status === "fulfilled" ? questsResult.value : []);
        setQuestHistory(historyResult.status === "fulfilled" ? historyResult.value : []);
      })
      .finally(() => {
        if (!cancelled) setQuestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branch, branchSubject]);

  // --- Community Trends (live from Pulse) --------------------------------
  // Feed = the hottest posts platform-wide right now (Pulse's own hot
  // ranking — recent, high-engagement), top 5. Trending = the top 5
  // tags by post volume, straight from Pulse. Both pull real Pulse
  // data — there's no separate "Twitter" integration, Pulse *is* the
  // community feed this card surfaces.
  const [trendingPosts, setTrendingPosts] = useState<PulsePost[]>([]);
  const [trendingTags, setTrendingTags] = useState<ChannelCount[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTrendsLoading(true);
    Promise.allSettled([
      fetchPulseFeed({ sort: "hot", limit: 5 }),
      fetchPulseTrending(5),
    ])
      .then(([postsResult, tagsResult]) => {
        if (cancelled) return;
        setTrendingPosts(postsResult.status === "fulfilled" ? postsResult.value.posts : []);
        setTrendingTags(tagsResult.status === "fulfilled" ? tagsResult.value : []);
      })
      .finally(() => {
        if (!cancelled) setTrendsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rank shown on the stats row: the standings from the user's most
  // recent settled quest (there's no separate global leaderboard yet).
  // Someone who has never completed a quest has no rank at all.
  const latestResult = questHistory[0] ?? null;

  // Weekly Quest card: Fri/Sat/Sun (the run-up to Sunday's arena) shows
  // what's coming next; the rest of the week looks back at the last
  // completed quest. Anyone with no quest history yet always sees the
  // upcoming view, since there's nothing to look back on.
  const showUpcomingQuest = questHistory.length === 0 || isUpcomingWindow(new Date());
  const liveQuest = quests.find((q) => q.status === "live") ?? null;
  const nextScheduledQuest =
    quests
      .filter((q) => q.status === "scheduled")
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const upcomingQuest = liveQuest ?? nextScheduledQuest ?? null;

  return (
    <Layout>
      <div className="px-[34px] pb-[34px] flex flex-col gap-6">
          {/* Page title + filter */}
          <div className="flex items-center justify-between">
            <h1 className="text-white text-[26px] font-bold leading-[34px]">Overview</h1>
            <button className="flex items-center gap-2 px-3 py-[6px] border border-gq-border bg-[#201F1F] rounded-[4px] text-gq-text-muted text-[15px] hover:border-gq-blue/30 transition-colors">
              Today
              <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
                <path d="M4 4.93333L0 0.933333L0.933333 0L4 3.06667L7.06667 0L8 0.933333L4 4.93333Z" fill="#8C909F"/>
              </svg>
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Streak */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px]">
              <span className="text-gq-text-secondary text-[15px]">Current Streak</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[32px] font-bold leading-[38px]">
                  {activityLoading ? "–" : `${currentStreak} Day${currentStreak === 1 ? "" : "s"}`}
                </span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">
                    {currentStreak > 0 ? "On fire!" : "Solve today to start one"}
                  </span>
                </div>
              </div>
            </div>

            {/* Total XP */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px]">
              <span className="text-gq-text-secondary text-[15px]">Total XP</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[32px] font-bold leading-[38px]">
                  {activityLoading ? "–" : activity.xp.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">
                    {solvedThisWeek} solved this week
                  </span>
                </div>
              </div>
            </div>

            {/* Current Level */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px]">
              <span className="text-gq-text-secondary text-[15px]">Current Level</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[32px] font-bold leading-[38px]">
                  {activityLoading ? "–" : levelProgress.level}
                </span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">
                    {activityLoading ? "" : `${Math.round(levelProgress.percentToNextLevel)}% to next`}
                  </span>
                </div>
              </div>
            </div>

            {/* Rank */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px]">
              <span className="text-gq-text-secondary text-[15px]">Rank</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[32px] font-bold leading-[38px]">
                  {questLoading ? "–" : latestResult ? `#${latestResult.result.rank}` : "Unranked"}
                </span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">
                    {questLoading
                      ? ""
                      : latestResult
                        ? `Weekly Quest #${latestResult.quest.weekNumber}`
                        : "Join a quest to get ranked"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Middle Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left side - wider (2/3) */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              {/* Weekly Quest Progress */}
              <div className="bg-gq-card border border-gq-border rounded-[17px] p-[25px] flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-[21px] font-semibold">
                    {showUpcomingQuest
                      ? upcomingQuest
                        ? `Weekly Quest #${upcomingQuest.weekNumber}`
                        : "Weekly Quest"
                      : `Weekly Quest #${latestResult!.quest.weekNumber}`}
                  </h2>
                  <DotsMenu />
                </div>

                {questLoading ? (
                  <p className="text-gq-text-muted text-[15px] py-4">Loading…</p>
                ) : showUpcomingQuest ? (
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <RingStat
                      value={upcomingQuest?.status === "live" ? "Live" : "Soon"}
                      label={upcomingQuest ? "Starts" : "Next arena"}
                      filled={upcomingQuest?.status === "live"}
                    />
                    <div className="flex flex-col gap-4 flex-1 w-full">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#201F1F] rounded-[2px] p-2 shrink-0">
                          <svg width="17" height="18" viewBox="0 0 33 35" fill="none">
                            <path d="M10.1667 25.1667C9.70833 25.1667 9.31597 25.0035 8.98958 24.6771C8.66319 24.3507 8.5 23.9583 8.5 23.5V11.8333C8.5 11.375 8.66319 10.9826 8.98958 10.6562C9.31597 10.3299 9.70833 10.1667 10.1667 10.1667H13.6667C13.8472 9.66667 14.1493 9.26389 14.5729 8.95833C14.9965 8.65278 15.4722 8.5 16 8.5C16.5278 8.5 17.0035 8.65278 17.4271 8.95833C17.8507 9.26389 18.1528 9.66667 18.3333 10.1667H21.8333C22.2917 10.1667 22.684 10.3299 23.0104 10.6562C23.3368 10.9826 23.5 11.375 23.5 11.8333V23.5C23.5 23.9583 23.3368 24.3507 23.0104 24.6771C22.684 25.0035 22.2917 25.1667 21.8333 25.1667H10.1667ZM10.1667 23.5H21.8333V11.8333H10.1667V23.5ZM11.8333 21.8333H17.6667V20.1667H11.8333V21.8333ZM11.8333 18.5H20.1667V16.8333H11.8333V18.5ZM11.8333 15.1667H20.1667V13.5H11.8333V15.1667ZM16 11.2083C16.1806 11.2083 16.3299 11.1493 16.4479 11.0312C16.566 10.9132 16.625 10.7639 16.625 10.5833C16.625 10.4028 16.566 10.2535 16.4479 10.1354C16.3299 10.0174 16.1806 9.95833 16 9.95833C15.8194 9.95833 15.6701 10.0174 15.5521 10.1354C15.434 10.2535 15.375 10.4028 15.375 10.5833C15.375 10.7639 15.434 10.9132 15.5521 11.0312C15.6701 11.1493 15.8194 11.2083 16 11.2083Z" fill="#888888"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-gq-text-muted text-[12px]">
                            {upcomingQuest?.status === "live" ? "Live Now" : "Coming Up"}
                          </p>
                          <p className="text-white text-[17px] font-medium">
                            {upcomingQuest ? upcomingQuest.title : "Next weekly arena"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-gq-text-secondary text-[15px]">
                            {upcomingQuest?.status === "live" ? "Started" : "Starts At"}
                          </span>
                          <span className="text-white text-[17px] font-semibold">
                            {formatQuestDate(
                              upcomingQuest ? upcomingQuest.startsAt : nextSunday630pm().toISOString(),
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-gq-text-secondary text-[15px]">Duration</span>
                          <span className="text-white text-[17px] font-semibold">
                            {Math.round((upcomingQuest?.durationSeconds ?? 3600) / 60)} min
                          </span>
                        </div>
                      </div>

                      <Link
                        to={upcomingQuest ? `/quests/${upcomingQuest.id}` : "/quests"}
                        className="w-full py-[10px] bg-[#888] rounded-[8px] text-[#0E0E0E] text-[17px] font-semibold text-center hover:bg-white/80 transition-colors"
                      >
                        {upcomingQuest?.status === "live" ? "Enter Arena" : "View Quest"}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <RingStat
                      value={`#${latestResult!.result.rank}`}
                      label="Your Rank"
                      filled
                    />
                    <div className="flex flex-col gap-4 flex-1 w-full">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#201F1F] rounded-[2px] p-2 shrink-0">
                          <svg width="17" height="18" viewBox="0 0 33 35" fill="none">
                            <path d="M10.1667 25.1667C9.70833 25.1667 9.31597 25.0035 8.98958 24.6771C8.66319 24.3507 8.5 23.9583 8.5 23.5V11.8333C8.5 11.375 8.66319 10.9826 8.98958 10.6562C9.31597 10.3299 9.70833 10.1667 10.1667 10.1667H13.6667C13.8472 9.66667 14.1493 9.26389 14.5729 8.95833C14.9965 8.65278 15.4722 8.5 16 8.5C16.5278 8.5 17.0035 8.65278 17.4271 8.95833C17.8507 9.26389 18.1528 9.66667 18.3333 10.1667H21.8333C22.2917 10.1667 22.684 10.3299 23.0104 10.6562C23.3368 10.9826 23.5 11.375 23.5 11.8333V23.5C23.5 23.9583 23.3368 24.3507 23.0104 24.6771C22.684 25.0035 22.2917 25.1667 21.8333 25.1667H10.1667ZM10.1667 23.5H21.8333V11.8333H10.1667V23.5ZM11.8333 21.8333H17.6667V20.1667H11.8333V21.8333ZM11.8333 18.5H20.1667V16.8333H11.8333V18.5ZM11.8333 15.1667H20.1667V13.5H11.8333V15.1667ZM16 11.2083C16.1806 11.2083 16.3299 11.1493 16.4479 11.0312C16.566 10.9132 16.625 10.7639 16.625 10.5833C16.625 10.4028 16.566 10.2535 16.4479 10.1354C16.3299 10.0174 16.1806 9.95833 16 9.95833C15.8194 9.95833 15.6701 10.0174 15.5521 10.1354C15.434 10.2535 15.375 10.4028 15.375 10.5833C15.375 10.7639 15.434 10.9132 15.5521 11.0312C15.6701 11.1493 15.8194 11.2083 16 11.2083Z" fill="#888888"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-gq-text-muted text-[12px]">Last Completed</p>
                          <p className="text-white text-[17px] font-medium">{latestResult!.quest.title}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gq-blue" />
                            <span className="text-gq-blue text-[15px]">Solved</span>
                          </div>
                          <span className="text-white text-[17px] font-semibold">
                            {latestResult!.result.solvedCount} Questions
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gq-text-muted" />
                            <span className="text-gq-text-secondary text-[15px]">Time Taken</span>
                          </div>
                          <span className="text-white text-[17px] font-semibold">
                            {formatTimeTaken(latestResult!.result.timeTakenSeconds)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-gq-text-secondary text-[15px]">Rating</span>
                          <span
                            className={[
                              "text-[17px] font-semibold",
                              latestResult!.result.ratingAfter >= latestResult!.result.ratingBefore
                                ? "text-gq-blue"
                                : "text-red-400",
                            ].join(" ")}
                          >
                            {latestResult!.result.ratingBefore} → {latestResult!.result.ratingAfter}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-gq-text-secondary text-[15px]">Completed</span>
                          <span className="text-white text-[17px] font-semibold">
                            {formatQuestDate(latestResult!.quest.startsAt)}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/quests/${latestResult!.quest.id}`}
                        className="w-full py-[10px] bg-[#888] rounded-[8px] text-[#0E0E0E] text-[17px] font-semibold text-center hover:bg-white/80 transition-colors"
                      >
                        View Full Results
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Topics Solved */}
              <div className="bg-gq-card border border-gq-border rounded-[17px] p-[25px] flex flex-col gap-4">
                <h2 className="text-white text-[19px] font-semibold">Recent Topics Solved</h2>

                {activityLoading ? (
                  <p className="text-gq-text-muted text-[15px] py-4">Loading…</p>
                ) : recentTopics.length === 0 ? (
                  <p className="text-gq-text-muted text-[15px] py-4">
                    No questions solved in the past week yet — pick a topic in Problems to get started.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {recentTopics.map((rt, i) => (
                      <Link
                        key={`${rt.subject}-${rt.topic}`}
                        to={`/problems?topic=${encodeURIComponent(rt.topic)}`}
                        className={[
                          "flex items-center justify-between gap-4 py-3",
                          i < recentTopics.length - 1 ? "border-b border-gq-border" : "",
                          "hover:opacity-80 transition-opacity",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <h3 className="text-white text-[17px] font-semibold truncate">{rt.topic}</h3>
                          <p className="text-gq-text-muted text-[13px] truncate">{rt.subject}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-gq-blue text-[15px] font-semibold">
                            {rt.solvedCount} solved
                          </span>
                          <span className="text-gq-text-muted text-[12px]">
                            {timeAgo(rt.lastAttemptedAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Community Trends */}
            <div className="xl:col-span-1">
              <div className="bg-gq-card border border-gq-border rounded-[17px] overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className="p-[25px] pb-0 shrink-0">
                  <h2 className="text-white text-[19px] font-semibold mb-4">Community Trends</h2>
                  {/* Toggle */}
                  <div className="flex border-b border-gq-border">
                    <button
                      onClick={() => setTrendsTab("feed")}
                      className={[
                        "flex-1 pb-2 text-[15px] font-semibold text-center transition-colors",
                        trendsTab === "feed"
                          ? "text-gq-text-dim border-b-2 border-gq-text-dim -mb-px"
                          : "text-gq-text-muted",
                      ].join(" ")}
                    >
                      Feed
                    </button>
                    <button
                      onClick={() => setTrendsTab("trending")}
                      className={[
                        "flex-1 pb-2 text-[15px] font-semibold text-center transition-colors",
                        trendsTab === "trending"
                          ? "text-gq-text-dim border-b-2 border-gq-text-dim -mb-px"
                          : "text-gq-text-muted",
                      ].join(" ")}
                    >
                      Trending
                    </button>
                  </div>
                </div>

                {trendsTab === "feed" ? (
                  /* Feed — top 5 hot posts from Pulse, the platform's
                     community feed (there's no separate external feed:
                     Pulse posts are the "tweets" this card surfaces). */
                  <div className="flex-1 overflow-y-auto p-[25px] flex flex-col gap-5">
                    {trendsLoading ? (
                      <div className="py-10 text-center text-sm text-gq-text-muted">
                        Loading trends…
                      </div>
                    ) : trendingPosts.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gq-text-muted">
                        Nothing on Pulse yet — be the first to post.
                      </div>
                    ) : (
                      trendingPosts.map((post, i) => (
                        <Link
                          key={post.id}
                          to={
                            post.tags[0]
                              ? `/pulse?tag=${encodeURIComponent(post.tags[0])}`
                              : "/pulse"
                          }
                          className="flex flex-col gap-1 group"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-gq-text-muted text-[12px] tracking-[1.2px] uppercase">
                              {post.tags[0] ? `#${post.tags[0]}` : "PULSE"} · {post.author}
                            </span>
                            <ThreeDotsMenu />
                          </div>
                          <p className="text-white text-[17px] font-medium leading-[26px] group-hover:text-gq-blue transition-colors">
                            {post.content.length > 90 ? `${post.content.slice(0, 90)}…` : post.content}
                          </p>
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center gap-1">
                              <ChatIcon />
                              <span className="text-gq-text-muted text-[12px]">
                                {post.commentCount} Comment{post.commentCount === 1 ? "" : "s"}
                              </span>
                            </div>
                            {i === 0 && (
                              <span className="bg-gq-blue/25 text-gq-text-dim text-[12px] px-2 rounded-[2px]">
                                Hot
                              </span>
                            )}
                            <span className="text-gq-text-muted text-[11px] ml-auto">
                              {pulseTimeAgo(post.createdAt)}
                            </span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                ) : (
                  /* Trending — top 5 tags by post volume in the last
                     48h, straight from Pulse
                     (backend/internal/api/pulse.go TrendingTags),
                     same data source the Pulse page's own "Trending
                     Tags" panel uses. */
                  <div className="flex-1 overflow-y-auto p-[25px] flex flex-col gap-4">
                    {trendsLoading ? (
                      <div className="py-10 text-center text-sm text-gq-text-muted">
                        Loading trends…
                      </div>
                    ) : trendingTags.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gq-text-muted">
                        No trending tags yet.
                      </div>
                    ) : (
                      trendingTags.slice(0, 5).map((h, i) => (
                        <Link
                          key={h.tag}
                          to={`/pulse?tag=${encodeURIComponent(h.tag)}`}
                          className="flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-gq-text-muted text-[15px] font-mono w-5 shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-white text-[17px] font-medium truncate group-hover:text-gq-blue transition-colors">
                              #{h.tag}
                            </span>
                          </div>
                          <span className="text-gq-text-muted text-[13px] shrink-0">
                            {h.count} post{h.count === 1 ? "" : "s"}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                )}

                {/* Show more footer */}
                <div className="border-t border-gq-border p-4 shrink-0">
                  <Link
                    to="/pulse"
                    className="block w-full text-center text-gq-text-dim text-[15px] font-medium hover:text-white transition-colors"
                  >
                    Show more
                  </Link>
                </div>
              </div>
            </div>
          </div>
      </div>
    </Layout>
  );
}
