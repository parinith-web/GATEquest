import { useState } from "react";
import Layout from "@/components/Layout";


// Donut chart for weekly quest progress
function DonutChart({ percentage }: { percentage: number }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference;

  return (
    <div className="relative w-[180px] h-[180px] shrink-0">
      <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#2A2A2A" strokeWidth="16" />
        <circle
          cx="90" cy="90" r={radius} fill="none"
          stroke="#5DA2FA" strokeWidth="16"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white text-[22px] font-bold leading-tight">{percentage}%</span>
        <span className="text-gq-text-secondary text-[12px]">Completed</span>
      </div>
    </div>
  );
}

// Sparkline SVG component
function Sparkline({ path, color = "#5DA2FA" }: { path: string; color?: string }) {
  return (
    <svg width="100%" height="42" viewBox="0 0 200 42" fill="none" preserveAspectRatio="none" className="overflow-visible">
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface TrendItem {
  category: string;
  title: string;
  doubts: string;
  tag?: string;
}

const trends: TrendItem[] = [
  { category: "TRENDING IN ALGORITHMS", title: "Graph Theory Masterclass", doubts: "42 Doubts", tag: "Hot" },
  { category: "OPERATING SYSTEMS", title: "Paging vs Segmentation…", doubts: "128 Doubts" },
  { category: "DATABASE MANAGEMENT", title: "Normal Forms Cheat Sheet", doubts: "56 Doubts", tag: "Active" },
  { category: "DIGITAL LOGIC", title: "K-Map Simplification Tricks", doubts: "89 Doubts" },
];

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

const ArrowRight = ({ color = "#888" }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M8.11667 6H0V4.66667H8.11667L4.38333 0.933333L5.33333 0L10.6667 5.33333L5.33333 10.6667L4.38333 9.73333L8.11667 6Z" fill={color}/>
  </svg>
);

export default function Index() {
  const [activeTab, setActiveTab] = useState<"cse" | "global">("cse");

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
                <span className="text-white text-[32px] font-bold leading-[38px]">7 Days</span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">On fire!</span>
                </div>
              </div>
            </div>

            {/* Total XP */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px]">
              <span className="text-gq-text-secondary text-[15px]">Total XP</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[32px] font-bold leading-[38px]">4,500</span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">+320 this week</span>
                </div>
              </div>
            </div>

            {/* Current Level */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px] overflow-hidden relative">
              {/* Decorative rotated ring */}
              <div className="absolute bottom-[-38px] right-[-44px] w-[102px] h-[102px] rotate-45 rounded-[13px] border-[8px] border-[#888] opacity-60 pointer-events-none" />
              <span className="text-gq-text-secondary text-[15px]">Current Level</span>
              <div className="flex items-end justify-between">
                <span className="text-white text-[45px] font-bold leading-[54px]">24</span>
                <span className="text-gq-blue text-[15px] pb-1">Goal: 50</span>
              </div>
            </div>

            {/* Global Rank */}
            <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col justify-between min-h-[138px]">
              <span className="text-gq-text-secondary text-[15px]">Global Rank</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[32px] font-bold leading-[38px]">#1,240</span>
                <div className="flex items-center gap-2">
                  <TrendUpIcon />
                  <span className="text-gq-blue text-[15px]">Up 12 positions</span>
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
                  <h2 className="text-white text-[21px] font-semibold">Weekly Quest #27</h2>
                  <DotsMenu />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                  {/* Donut chart */}
                  <DonutChart percentage={60} />

                  {/* Details */}
                  <div className="flex flex-col gap-4 flex-1 w-full">
                    {/* Current topic */}
                    <div className="flex items-center gap-3">
                      <div className="bg-[#201F1F] rounded-[2px] p-2 shrink-0">
                        <svg width="17" height="18" viewBox="0 0 33 35" fill="none">
                          <path d="M10.1667 25.1667C9.70833 25.1667 9.31597 25.0035 8.98958 24.6771C8.66319 24.3507 8.5 23.9583 8.5 23.5V11.8333C8.5 11.375 8.66319 10.9826 8.98958 10.6562C9.31597 10.3299 9.70833 10.1667 10.1667 10.1667H13.6667C13.8472 9.66667 14.1493 9.26389 14.5729 8.95833C14.9965 8.65278 15.4722 8.5 16 8.5C16.5278 8.5 17.0035 8.65278 17.4271 8.95833C17.8507 9.26389 18.1528 9.66667 18.3333 10.1667H21.8333C22.2917 10.1667 22.684 10.3299 23.0104 10.6562C23.3368 10.9826 23.5 11.375 23.5 11.8333V23.5C23.5 23.9583 23.3368 24.3507 23.0104 24.6771C22.684 25.0035 22.2917 25.1667 21.8333 25.1667H10.1667ZM10.1667 23.5H21.8333V11.8333H10.1667V23.5ZM11.8333 21.8333H17.6667V20.1667H11.8333V21.8333ZM11.8333 18.5H20.1667V16.8333H11.8333V18.5ZM11.8333 15.1667H20.1667V13.5H11.8333V15.1667ZM16 11.2083C16.1806 11.2083 16.3299 11.1493 16.4479 11.0312C16.566 10.9132 16.625 10.7639 16.625 10.5833C16.625 10.4028 16.566 10.2535 16.4479 10.1354C16.3299 10.0174 16.1806 9.95833 16 9.95833C15.8194 9.95833 15.6701 10.0174 15.5521 10.1354C15.434 10.2535 15.375 10.4028 15.375 10.5833C15.375 10.7639 15.434 10.9132 15.5521 11.0312C15.6701 11.1493 15.8194 11.2083 16 11.2083Z" fill="#888888"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-gq-text-muted text-[12px]">Current Topic</p>
                        <p className="text-white text-[17px] font-medium">OS Scheduling Algorithms</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gq-blue" />
                          <span className="text-gq-blue text-[15px]">Solved</span>
                        </div>
                        <span className="text-white text-[17px] font-semibold">6 Questions</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gq-text-muted" />
                          <span className="text-gq-text-secondary text-[15px]">Remaining</span>
                        </div>
                        <span className="text-white text-[17px] font-semibold">4 Questions</span>
                      </div>
                    </div>

                    {/* CTA button */}
                    <button className="w-full py-[10px] bg-[#888] rounded-[8px] text-[#0E0E0E] text-[17px] font-semibold hover:bg-white/80 transition-colors">
                      Continue Quest
                    </button>
                  </div>
                </div>
              </div>

              {/* Focus Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* OS Card */}
                <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="bg-[#201F1F] rounded-[4px] p-2">
                      <svg width="21" height="16" viewBox="0 0 39 34" fill="none">
                        <path d="M10.5 24.5C9.95 24.5 9.47917 24.3042 9.0875 23.9125C8.69583 23.5208 8.5 23.05 8.5 22.5V10.5C8.5 9.95 8.69583 9.47917 9.0875 9.0875C9.47917 8.69583 9.95 8.5 10.5 8.5H26.5C27.05 8.5 27.5208 8.69583 27.9125 9.0875C28.3042 9.47917 28.5 9.95 28.5 10.5V22.5C28.5 23.05 28.3042 23.5208 27.9125 23.9125C27.5208 24.3042 27.05 24.5 26.5 24.5H10.5ZM10.5 22.5H26.5V12.5H10.5V22.5ZM14 21.5L12.6 20.1L15.175 17.5L12.575 14.9L14 13.5L18 17.5L14 21.5ZM18.5 21.5V19.5H24.5V21.5H18.5Z" fill="#888888"/>
                      </svg>
                    </div>
                    <span className="text-gq-text-dim text-[15px] bg-[#201F1F] px-2 py-1 rounded-[2px]">80% Mastery</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="text-white text-[19px] font-semibold">Operating Systems</h3>
                    <p className="text-gq-text-muted text-[15px]">Next: Virtual Memory Management</p>
                  </div>
                  <div className="h-[42px] overflow-hidden">
                    <Sparkline path="M0 20C14 12 28 14 42 25C56 36 70 32 84 14C98 -4 112 -2 126 20C140 42 154 36 168 4C182 -28 196 -26 210 9" />
                  </div>
                  <button className="flex items-center gap-2 text-gq-text-dim text-[15px] font-medium hover:text-white transition-colors pt-1">
                    Continue Lesson <ArrowRight />
                  </button>
                </div>

                {/* Data Structures Card */}
                <div className="bg-gq-card border border-gq-border rounded-[17px] p-[21px] flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="bg-[#201F1F] rounded-[4px] p-2">
                      <svg width="21" height="18" viewBox="0 0 39 37" fill="none">
                        <path d="M21.5 26.5V23.5H17.5V13.5H15.5V16.5H8.5V8.5H15.5V11.5H21.5V8.5H28.5V16.5H21.5V13.5H19.5V21.5H21.5V18.5H28.5V26.5H21.5ZM23.5 14.5H26.5V10.5H23.5V14.5ZM23.5 24.5H26.5V20.5H23.5V24.5ZM10.5 14.5H13.5V10.5H10.5V14.5Z" fill="#C2C6D6"/>
                      </svg>
                    </div>
                    <span className="text-gq-text-secondary text-[15px] bg-[#201F1F] px-2 py-1 rounded-[2px]">45% Mastery</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="text-white text-[19px] font-semibold">Data Structures</h3>
                    <p className="text-gq-text-muted text-[15px]">Next: Advanced Tree Traversals</p>
                  </div>
                  <div className="h-[42px] overflow-hidden">
                    <Sparkline path="M0 28C18 22 36 22 54 28C72 34 90 28 108 16C126 4 140 6 154 22C168 38 182 34 200 10" />
                  </div>
                  <button className="flex items-center gap-2 text-gq-text-secondary text-[15px] font-medium hover:text-white transition-colors pt-1">
                    Start Lesson <ArrowRight color="#C2C6D6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right column - Community Trends */}
            <div className="xl:col-span-1">
              <div className="bg-gq-card border border-gq-border rounded-[17px] overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className="p-[25px] pb-0 shrink-0">
                  <h2 className="text-white text-[19px] font-semibold mb-4">Community Trends</h2>
                  {/* Tabs */}
                  <div className="flex border-b border-gq-border">
                    <button
                      onClick={() => setActiveTab("cse")}
                      className={[
                        "flex-1 pb-2 text-[15px] font-semibold text-center transition-colors",
                        activeTab === "cse"
                          ? "text-gq-text-dim border-b-2 border-gq-text-dim -mb-px"
                          : "text-gq-text-muted",
                      ].join(" ")}
                    >
                      CSE Feed
                    </button>
                    <button
                      onClick={() => setActiveTab("global")}
                      className={[
                        "flex-1 pb-2 text-[15px] font-medium text-center transition-colors",
                        activeTab === "global"
                          ? "text-gq-text-dim border-b-2 border-gq-text-dim -mb-px"
                          : "text-gq-text-muted",
                      ].join(" ")}
                    >
                      Global
                    </button>
                  </div>
                </div>

                {/* Trends list */}
                <div className="flex-1 overflow-y-auto p-[25px] flex flex-col gap-5">
                  {trends.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-start justify-between">
                        <span className="text-gq-text-muted text-[12px] tracking-[1.2px] uppercase">{item.category}</span>
                        <ThreeDotsMenu />
                      </div>
                      <p className="text-white text-[17px] font-medium leading-[26px]">{item.title}</p>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-1">
                          <ChatIcon />
                          <span className="text-gq-text-muted text-[12px]">{item.doubts}</span>
                        </div>
                        {item.tag && (
                          <span className="bg-gq-blue/25 text-gq-text-dim text-[12px] px-2 rounded-[2px]">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show more footer */}
                <div className="border-t border-gq-border p-4 shrink-0">
                  <button className="w-full text-center text-gq-text-dim text-[15px] font-medium hover:text-white transition-colors">
                    Show more
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Quests Banner */}
          <div className="flex items-center justify-between px-4 py-4 bg-gq-card border-l-4 border-gq-blue rounded-r-[8px] gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#201F1F] rounded-xl p-2 shrink-0">
                <svg width="21" height="22" viewBox="0 0 37 38" fill="none">
                  <path d="M10 28C9.45 28 8.97917 27.8042 8.5875 27.4125C8.19583 27.0208 8 26.55 8 26V12C8 11.45 8.19583 10.9792 8.5875 10.5875C8.97917 10.1958 9.45 10 10 10H11V8H13V10H21V8H23V10H24C24.55 10 25.0208 10.1958 25.4125 10.5875C25.8042 10.9792 26 11.45 26 12V18H24V16H10V26H17V28H10ZM24 30C22.7833 30 21.7208 29.6208 20.8125 28.8625C19.9042 28.1042 19.3333 27.15 19.1 26H20.65C20.8667 26.7333 21.2792 27.3333 21.8875 27.8C22.4958 28.2667 23.2 28.5 24 28.5C24.9667 28.5 25.7917 28.1583 26.475 27.475C27.1583 26.7917 27.5 25.9667 27.5 25C27.5 24.0333 27.1583 23.2083 26.475 22.525C25.7917 21.8417 24.9667 21.5 24 21.5C23.5167 21.5 23.0667 21.5875 22.65 21.7625C22.2333 21.9375 21.8667 22.1833 21.55 22.5H23V24H19V20H20.5V21.425C20.95 20.9917 21.475 20.6458 22.075 20.3875C22.675 20.1292 23.3167 20 24 20C25.3833 20 26.5625 20.4875 27.5375 21.4625C28.5125 22.4375 29 23.6167 29 25C29 26.3833 28.5125 27.5625 27.5375 28.5375C26.5625 29.5125 25.3833 30 24 30ZM10 14H24V12H10V14Z" fill="#5DA2FA"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-[14px] font-semibold">Daily Quests</p>
                <p className="text-gq-text-muted text-[12px]">You have 3 goals remaining for today.</p>
              </div>
            </div>
            <button className="text-gq-blue text-[12px] font-bold tracking-[0.6px] uppercase hover:text-white transition-colors shrink-0">
              View All
            </button>
          </div>
      </div>
    </Layout>
  );
}
