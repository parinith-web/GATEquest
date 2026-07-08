import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const QUESTION_TEXT =
  "Consider three processes P1, P2, and P3, which arrive at time t=0 with CPU burst times of 20, 4, and 4 ms respectively. If the scheduler uses Round Robin scheduling with a time quantum of 5ms, what is the average turnaround time?";

const OPTIONS = [
  { id: "A", label: "15.33 ms" },
  { id: "B", label: "18.66 ms" },
  { id: "C", label: "22.00 ms" },
  { id: "D", label: "12.00 ms" },
];

const DISCUSSION_MESSAGES = [
  {
    id: 1,
    user: "Aria Chen",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/42ef722eebd41d59b9df3e9410401cb989623cbf?width=82",
    time: "2m ago",
    message: "Wait, is the arrival time always assumed 0 if not mentioned? 🧐",
    isMe: false,
  },
  {
    id: 2,
    user: "Azia Muon",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/8f4068e73febf021225cab59776667ca48ac6c61?width=58",
    time: "1m ago",
    message: "Yes, for this specific problem arrival time is given as t=0.",
    isMe: true,
  },
];

export default function QuestionPage() {
  const [selectedOption, setSelectedOption] = useState<string | null>("B");
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(165); // 02:45 in seconds
  const [comment, setComment] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(70.71% 70.71% at 50% 50%, #222 2.95%, rgba(34,34,34,0) 2.95%), linear-gradient(0deg, #131313 0%, #131313 100%)" }}
    >
      {/* Top Navigation */}
      <nav
        className="flex items-center justify-between px-6 md:px-8 h-[68px] flex-shrink-0 sticky top-0 z-50 animate-fade-in"
        style={{ borderBottom: "1.063px solid rgba(66,71,84,0.3)", background: "#131313", boxShadow: "0 1.063px 2.125px 0 rgba(0,0,0,0.05)" }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/f0fdb30cca65c742ff99010d484498b2cc8e725f?width=81"
            alt="GATEquest Logo"
            className="w-10 h-10 flex-shrink-0"
          />
          <span className="font-mono text-xl font-semibold tracking-wider">
            <span style={{ color: "#e5e1e4" }}>GATE</span>
            <span style={{ color: "#adc6ff" }}>quest</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "Overview", to: "/" },
            { label: "Roadmaps", to: "/roadmaps" },
            { label: "Quests", to: "/quests" },
            { label: "Problems", to: "/problems" },
            { label: "Pulse", to: "/pulse" }
          ].map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={`text-[15px] font-inter pb-1 transition-colors hover:text-white font-medium text-[#c2c6d6]`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Bell + Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg width="17" height="22" viewBox="0 0 17 22" fill="none">
              <path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="#C2C6D6"/>
            </svg>
            <span
              className="absolute -top-1 -right-1 w-[8.5px] h-[8.5px] rounded-full"
              style={{ background: "#a3ff33", border: "2.125px solid #131313" }}
            />
          </div>
          <Link to="/profile">
            <div
              className="w-[34px] h-[34px] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-85 transition-opacity"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), #0e0e0e", border: "1px solid #000" }}
            >
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/42ef722eebd41d59b9df3e9410401cb989623cbf?width=82"
                alt="Avatar"
                className="w-[41px] h-[41px] object-cover"
              />
            </div>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className="flex-1 px-4 md:px-8 py-8 md:py-10"
        style={{ background: "radial-gradient(145.99% 137.26% at -4950% -4950%, rgba(163,255,51,0.03) 0%, rgba(163,255,51,0) 40%)" }}
      >
        <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Breadcrumb + Tags */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12.75px] text-[#8c909f]">OPERATING SYSTEMS</span>
                <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                  <path d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z" fill="#8C909F"/>
                </svg>
                <span className="font-mono text-[12.75px] text-[#4d8eff]">PROCESS SCHEDULING</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {["GATE 2022", "NAT TYPE"].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10.625px] font-bold text-[#8c909f] font-inter"
                    style={{
                      borderRadius: "2.125px",
                      border: "1.063px solid rgba(66,71,84,0.3)",
                      background: "#353534",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Problem Card */}
            <div
              className="rounded-[8.5px] overflow-hidden flex flex-col"
              style={{
                border: "1.063px solid rgba(66,71,84,0.2)",
                background: "rgba(26,26,26,0.8)",
                boxShadow: "0 26.563px 53.125px -12.75px rgba(0,0,0,0.25)",
                backdropFilter: "blur(6.375px)",
              }}
            >
              {/* XP + Question */}
              <div className="px-6 md:px-9 pt-5 pb-4">
                {/* XP Reward */}
                <div className="flex items-center gap-2 justify-end mb-4">
                  <svg width="11" height="22" viewBox="0 0 11 22" fill="none">
                    <path d="M0 0H10V7.85C10 8.23333 9.91667 8.575 9.75 8.875C9.58333 9.175 9.35 9.41667 9.05 9.6L5.5 11.7L6.2 14H10L6.9 16.2L8.1 20L5 17.65L1.9 20L3.1 16.2L0 14H3.8L4.5 11.7L0.95 9.6C0.65 9.41667 0.416667 9.175 0.25 8.875C0.0833333 8.575 0 8.23333 0 7.85V0ZM2 2V7.85L4 9.05V2H2ZM8 2H6V9.05L8 7.85V2Z" fill="#ADC6FF"/>
                  </svg>
                  <span className="text-[#adc6ff] font-bold text-[17px] tracking-widest uppercase font-inter">
                    +20 XP REWARD
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-[#e5e2e1] text-[17px] leading-[1.625] font-inter font-normal">
                  {QUESTION_TEXT}
                </p>
              </div>

              {/* Code Block */}
              <div className="px-6 md:px-9 pb-5">
                <div
                  className="rounded-[4.25px] overflow-hidden flex flex-col"
                  style={{ border: "1.063px solid rgba(66,71,84,0.3)", background: "#0e0e0e" }}
                >
                  {/* Code Header */}
                  <div
                    className="flex items-center gap-2 px-6 py-3"
                    style={{ borderBottom: "1.063px solid rgba(66,71,84,0.2)" }}
                  >
                    <div className="w-[12.75px] h-[12.75px] rounded-full bg-[#ff5f56]" />
                    <div className="w-[12.75px] h-[12.75px] rounded-full bg-[#ffbd2e]" />
                    <div className="w-[12.75px] h-[12.75px] rounded-full bg-[#27c93f]" />
                    <span className="font-mono text-[11.688px] text-[#8c909f] tracking-widest uppercase ml-2">
                      PROCESSTABLE.C
                    </span>
                  </div>

                  {/* Code Body */}
                  <div className="p-6 overflow-x-auto">
                    <pre className="font-mono text-[14.875px] leading-[1.625] m-0">
                      <span className="text-[#adc6ff]">struct</span>
                      <span className="text-[#c2c6d6]">{` Process {
    `}</span>
                      <span className="text-[#adc6ff]">int</span>
                      <span className="text-[#c2c6d6]">{` id;
    `}</span>
                      <span className="text-[#adc6ff]">int</span>
                      <span className="text-[#c2c6d6]">{` burst_time;
    `}</span>
                      <span className="text-[#adc6ff]">int</span>
                      <span className="text-[#c2c6d6]">{` arrival_time;
+};

`}</span>
                      <span className="text-[#8c909f]">{"// System Configuration\n"}</span>
                      <span className="text-[#adc6ff]">#define</span>
                      <span className="text-[#c2c6d6]">{" TIME_QUANTUM 5\n"}</span>
                      <span className="text-[#adc6ff]">#define</span>
                      <span className="text-[#c2c6d6]">{" NUM_PROCESSES 3"}</span>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Answer Options */}
              <div className="px-6 md:px-9 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {OPTIONS.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !submitted && setSelectedOption(opt.id)}
                        className="flex items-center gap-4 rounded-[8.5px] p-5 text-left transition-all duration-150 cursor-pointer focus:outline-none"
                        style={{
                          border: isSelected
                            ? "1.063px solid #adc6ff"
                            : "1.063px solid rgba(66,71,84,0.2)",
                          background: isSelected ? "#202126" : "#2a2a2a",
                        }}
                      >
                        <div
                          className="w-[42.5px] h-[42.5px] flex items-center justify-center rounded-[4.25px] flex-shrink-0"
                          style={{ border: "1.063px solid #424754", background: "#0e0e0e" }}
                        >
                          <span className="text-[#8c909f] font-bold text-[17px] font-inter">{opt.id}</span>
                        </div>
                        <span className="text-[#c2c6d6] font-medium text-[17px] font-inter">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div
                className="mx-6 md:mx-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6"
                style={{ borderTop: "1.063px solid rgba(66,71,84,0.1)" }}
              >
                <div className="flex items-center gap-5">
                  <button className="flex items-center gap-2 text-[#8c909f] hover:text-[#c2c6d6] transition-colors">
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                      <path d="M0 14.1667V0H7.5L7.83333 1.66667H12.5V10H6.66667L6.33333 8.33333H1.66667V14.1667H0ZM8.04167 8.33333H10.8333V3.33333H6.45833L6.125 1.66667H1.66667V6.66667H7.70833L8.04167 8.33333Z" fill="#8C909F"/>
                    </svg>
                    <span className="text-[15px] font-inter">Report Issue</span>
                  </button>
                  <button className="flex items-center gap-2 text-[#8c909f] hover:text-[#c2c6d6] transition-colors">
                    <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
                      <path d="M0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H10C10.4583 0 10.8507 0.163194 11.1771 0.489583C11.5035 0.815972 11.6667 1.20833 11.6667 1.66667V15L5.83333 12.5L0 15ZM1.66667 12.4583L5.83333 10.6667L10 12.4583V1.66667H1.66667V12.4583ZM1.66667 1.66667H10H5.83333H1.66667Z" fill="#8C909F"/>
                    </svg>
                    <span className="text-[15px] font-inter">Save Snippet</span>
                  </button>
                </div>
                <button
                  onClick={() => selectedOption && setSubmitted(true)}
                  className="relative flex items-center justify-center px-8 py-[15px] rounded-[2.844px] overflow-hidden transition-opacity hover:opacity-90 active:opacity-80"
                  style={{
                    background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
                    boxShadow: "0 0 10.665px 0 rgba(173,198,255,0.2)",
                    minWidth: "191px",
                  }}
                >
                  <span
                    className="absolute inset-0 rounded-[2.844px]"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  />
                  <span className="relative text-white text-[12px] font-inter tracking-[1.849px] uppercase font-bold">
                    {submitted ? "Answer Submitted" : "Submit answer"}
                  </span>
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "TIME ELAPSED", value: formatTime(elapsed), color: "#e5e2e1", mono: true },
                { label: "CURRENT ACCURACY", value: "84%", color: "#adc6ff", mono: true },
                { label: "SOLVED", value: "201K", color: "#adc6ff", mono: true },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center py-4 px-3 rounded-[8.5px]"
                  style={{
                    border: "1.063px solid rgba(66,71,84,0.1)",
                    background: "#201f1f",
                  }}
                >
                  <span className="text-[#8c909f] text-[10.625px] font-bold font-inter uppercase tracking-wide mb-1 text-center">
                    {stat.label}
                  </span>
                  <span
                    className="font-mono text-[17px]"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Theory Snippet */}
            <div
              className="rounded-[8.5px] p-6 flex flex-col gap-4"
              style={{
                border: "1.063px solid rgba(66,71,84,0.2)",
                background: "#2a2a2a",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <svg width="24" height="21" viewBox="0 0 24 21" fill="none">
                  <path d="M11 19.5C10.2 18.8667 9.33333 18.375 8.4 18.025C7.46667 17.675 6.5 17.5 5.5 17.5C4.8 17.5 4.1125 17.5917 3.4375 17.775C2.7625 17.9583 2.11667 18.2167 1.5 18.55C1.15 18.7333 0.8125 18.725 0.4875 18.525C0.1625 18.325 0 18.0333 0 17.65V5.6C0 5.41667 0.0458333 5.24167 0.1375 5.075C0.229167 4.90833 0.366667 4.78333 0.55 4.7C1.31667 4.3 2.11667 4 2.95 3.8C3.78333 3.6 4.63333 3.5 5.5 3.5C6.46667 3.5 7.4125 3.625 8.3375 3.875C9.2625 4.125 10.15 4.5 11 5V17.1C11.85 16.5667 12.7417 16.1667 13.675 15.9C14.6083 15.6333 15.55 15.5 16.5 15.5C17.1 15.5 17.6875 15.55 18.2625 15.65C18.8375 15.75 19.4167 15.9 20 16.1V4.1C20.25 4.18333 20.4958 4.27083 20.7375 4.3625C20.9792 4.45417 21.2167 4.56667 21.45 4.7C21.6333 4.78333 21.7708 4.90833 21.8625 5.075C21.9542 5.24167 22 5.41667 22 5.6V17.65C22 18.0333 21.8375 18.325 21.5125 18.525C21.1875 18.725 20.85 18.7333 20.5 18.55C19.8833 18.2167 19.2375 17.9583 18.5625 17.775C17.8875 17.5917 17.2 17.5 16.5 17.5C15.5 17.5 14.5333 17.675 13.6 18.025C12.6667 18.375 11.8 18.8667 11 19.5ZM13 14.5V5L18 0V10L13 14.5Z" fill="#ADC6FF"/>
                </svg>
                <span className="text-[#e5e2e1] text-[17px] font-bold font-inter">Theory Snippet</span>
              </div>

              {/* Theory Content */}
              <div
                className="rounded-[4.25px] p-4 flex flex-col gap-1"
                style={{ borderLeft: "4.25px solid #adc6ff", background: "#0e0e0e" }}
              >
                <span className="text-[#adc6ff] text-[10.625px] font-bold font-inter tracking-wider uppercase">
                  ROUND ROBIN (RR)
                </span>
                <p className="text-[#c2c6d6] text-[15px] leading-[1.625] font-inter">
                  Designed for time-sharing systems, RR uses a pre-emptive method where each process gets a fixed time unit (quantum). It ensures fairness but can suffer from high context-switch overhead.
                </p>
              </div>

              {/* Complexity */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8c909f] text-[11.688px] font-inter">Complexity Level</span>
                  <span className="text-[#e99841] text-[11.688px] font-medium font-inter">Moderate</span>
                </div>
                <div className="relative h-[4.25px] rounded-full w-full overflow-hidden" style={{ background: "#201f1f" }}>
                  <div className="absolute left-0 top-0 h-full rounded-full" style={{ background: "#5da2fa", width: "65%" }} />
                </div>
              </div>

              {/* Docs Button */}
              <button
                className="w-full py-3 rounded-[4.25px] text-[#adc6ff] text-[15px] font-bold font-inter text-center transition-colors hover:bg-[rgba(173,198,255,0.05)]"
                style={{ border: "1.063px solid rgba(173,198,255,0.2)" }}
              >
                Open Full Documentation
              </button>
            </div>

            {/* Discussion */}
            <div
              className="rounded-[8.5px] flex flex-col overflow-hidden"
              style={{
                border: "1.063px solid rgba(66,71,84,0.2)",
                background: "#2a2a2a",
              }}
            >
              {/* Discussion Header */}
              <div
                className="flex items-center justify-between px-6 py-5"
                style={{ borderBottom: "1.063px solid rgba(66,71,84,0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M20 20L16 16H6C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V13H15C15.55 13 16.0208 12.8042 16.4125 12.4125C16.8042 12.0208 17 11.55 17 11V4H18C18.55 4 19.0208 4.19583 19.4125 4.5875C19.8042 4.97917 20 5.45 20 6V20ZM2 10.175L3.175 9H13V2H2V10.175ZM0 15V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H13C13.55 0 14.0208 0.195833 14.4125 0.5875C14.8042 0.979167 15 1.45 15 2V9C15 9.55 14.8042 10.0208 14.4125 10.4125C14.0208 10.8042 13.55 11 13 11H4L0 15ZM2 9V2V9Z" fill="#5DA2FA"/>
                  </svg>
                  <span className="text-[#e5e2e1] text-[17px] font-bold font-inter">Discussion</span>
                </div>
                <div className="w-[8.5px] h-[8.5px] rounded-full bg-[#5da2fa]" />
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1" style={{ maxHeight: "340px" }}>
                {DISCUSSION_MESSAGES.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div
                      className="w-[34px] h-[34px] rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        background: "linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), #0e0e0e",
                        border: msg.isMe ? "1.063px solid rgba(173,198,255,0.3)" : "none",
                      }}
                    >
                      <img src={msg.avatar} alt={msg.user} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#e5e2e1] font-bold text-[15px] font-inter">{msg.user}</span>
                        <span className="text-[#8c909f] text-[10.625px] font-inter">{msg.time}</span>
                      </div>
                      <div
                        className="rounded-[0_4.25px_4.25px_4.25px] p-3"
                        style={{ background: "#201f1f" }}
                      >
                        <span className="text-[#c2c6d6] text-[14px] font-inter leading-[1.5]">{msg.message}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div
                className="flex flex-col gap-0"
                style={{ borderTop: "1.063px solid rgba(66,71,84,0.1)", background: "rgba(53,53,52,0.5)" }}
              >
                <div className="p-4">
                  <div
                    className="flex items-center gap-2 rounded-[4.25px] overflow-hidden"
                    style={{ border: "1.063px solid rgba(66,71,84,0.2)", background: "#0e0e0e" }}
                  >
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ask a doubt..."
                      className="flex-1 bg-transparent px-3 py-2.5 text-[14.875px] font-inter text-[#c2c6d6] placeholder:text-[#6b7280] outline-none"
                    />
                    <button className="px-3 py-2.5 flex-shrink-0">
                      <svg width="17" height="15" viewBox="0 0 17 15" fill="none">
                        <path d="M0 13.3333V0L15.8333 6.66667L0 13.3333ZM1.66667 10.8333L11.5417 6.66667L1.66667 2.5V5.41667L6.66667 6.66667L1.66667 7.91667V10.8333ZM1.66667 10.8333V6.66667V2.5V5.41667V7.91667V10.8333Z" fill="#8C909F"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
