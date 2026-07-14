import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getBranch,
  isWiredBranch,
  BRANCH_LABEL,
  fetchQuestion,
  type Question as ApiQuestion,
} from "@/lib/gate-api";
import { recordAttempt } from "@/lib/profile-api";

// ─── Live version (CS / DA, real data from Neon) ──────────────────────────

function optionLetters(q: ApiQuestion): { id: "A" | "B" | "C" | "D"; label: string }[] {
  const opts: { id: "A" | "B" | "C" | "D"; label: string }[] = [];
  if (q.OptionA) opts.push({ id: "A", label: q.OptionA });
  if (q.OptionB) opts.push({ id: "B", label: q.OptionB });
  if (q.OptionC) opts.push({ id: "C", label: q.OptionC });
  if (q.OptionD) opts.push({ id: "D", label: q.OptionD });
  return opts;
}

function LiveQuestionPage({ branch }: { branch: "cse" | "da" }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<ApiQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [natInput, setNatInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!id) return;
    setQuestion(null);
    setSelected(new Set());
    setNatInput("");
    setSubmitted(false);
    setElapsed(0);
    fetchQuestion(id).then(setQuestion).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const toggleOption = (optId: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (question?.Type === "msq") {
        next.has(optId) ? next.delete(optId) : next.add(optId);
      } else {
        next.clear();
        next.add(optId);
      }
      return next;
    });
  };

  const computeIsCorrect = (): boolean => {
    if (!question) return false;
    if (question.Type === "nat") {
      const given = parseFloat(natInput);
      const target = parseFloat(question.CorrectAnswer ?? "");
      if (Number.isNaN(given) || Number.isNaN(target)) return false;
      const tol = parseFloat(question.AnswerTolerance ?? "0") || 0;
      return Math.abs(given - target) <= tol;
    }
    const correctSet = new Set((question.CorrectOption ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    if (correctSet.size !== selected.size) return false;
    for (const s of selected) if (!correctSet.has(s)) return false;
    return true;
  };
  const isCorrect = submitted ? computeIsCorrect() : null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#131313] text-[#c2c6d6] gap-4 flex-col">
        <p>Couldn't load this question: {error}</p>
        <Link to="/problems" className="text-[#adc6ff]">Back to problems</Link>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#131313] text-[#8c909f]">
        Loading question…
      </div>
    );
  }

  const canSubmit = question.Type === "nat" ? natInput.trim() !== "" : selected.size > 0;

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
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "Overview", to: "/" },
            { label: "Roadmaps", to: "/roadmaps" },
            { label: "Quests", to: "/quests" },
            { label: "Problems", to: "/problems" },
            { label: "Pulse", to: "/pulse" },
          ].map((link) => (
            <Link key={link.label} to={link.to} className="text-[15px] font-inter pb-1 transition-colors hover:text-white font-medium text-[#c2c6d6]">
              {link.label}
            </Link>
          ))}
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
      </nav>

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
                <span className="font-mono text-[12.75px] text-[#8c909f] uppercase">{BRANCH_LABEL[branch]}</span>
                <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                  <path d="M2.68333 3.5L0 0.816667L0.816667 0L4.31667 3.5L0.816667 7L0 6.18333L2.68333 3.5Z" fill="#8C909F"/>
                </svg>
                <Link
                  to={`/problems?topic=${encodeURIComponent(question.Topic)}`}
                  className="font-mono text-[12.75px] text-[#4d8eff] uppercase hover:underline"
                >
                  {question.Topic}
                </Link>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {[question.ExamYear ? `GATE ${question.ExamYear}` : null, question.Type.toUpperCase() + " TYPE"]
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag as string}
                      className="px-2 py-0.5 text-[10.625px] font-bold text-[#8c909f] font-inter"
                      style={{ borderRadius: "2.125px", border: "1.063px solid rgba(66,71,84,0.3)", background: "#353534" }}
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
              <div className="px-6 md:px-9 pt-6 pb-4">
                {question.Marks != null && (
                  <div className="flex items-center gap-2 justify-end mb-4">
                    <span className="text-[#adc6ff] font-bold text-[15px] tracking-widest uppercase font-inter">
                      {question.Marks} MARK{question.Marks === 1 ? "" : "S"}
                    </span>
                  </div>
                )}
                <p className="text-[#e5e2e1] text-[17px] leading-[1.625] font-inter font-normal whitespace-pre-wrap">
                  {question.QuestionText}
                </p>
              </div>

              {/* Answer area */}
              <div className="px-6 md:px-9 pb-6">
                {question.Type === "nat" ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={submitted}
                    value={natInput}
                    onChange={(e) => setNatInput(e.target.value)}
                    placeholder="Enter your numeric answer"
                    className="w-full sm:w-64 rounded-[8.5px] p-4 text-[#e5e2e1] text-[17px] font-inter outline-none"
                    style={{ border: "1.063px solid rgba(66,71,84,0.3)", background: "#0e0e0e" }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {optionLetters(question).map((opt) => {
                      const isSelected = selected.has(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(opt.id)}
                          className="flex items-center gap-4 rounded-[8.5px] p-5 text-left transition-all duration-150 cursor-pointer focus:outline-none"
                          style={{
                            border: isSelected ? "1.063px solid #adc6ff" : "1.063px solid rgba(66,71,84,0.2)",
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
                )}
              </div>

              {submitted && (
                <div className="mx-6 md:mx-9 mb-6 rounded-[8.5px] p-4" style={{ background: isCorrect ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", border: `1.063px solid ${isCorrect ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                  <span className="font-inter font-bold text-[15px]" style={{ color: isCorrect ? "#34d399" : "#f87171" }}>
                    {isCorrect ? "Correct!" : "Not quite."}
                  </span>
                  {!isCorrect && (
                    <span className="text-[#c2c6d6] font-inter text-[14px] block mt-1">
                      {question.Type === "nat"
                        ? `Correct answer: ${question.CorrectAnswer}`
                        : `Correct option${(question.CorrectOption ?? "").includes(",") ? "s" : ""}: ${question.CorrectOption}`}
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div
                className="mx-6 md:mx-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6"
                style={{ borderTop: "1.063px solid rgba(66,71,84,0.1)" }}
              >
                <div />
                <button
                  onClick={() => {
                    if (!canSubmit) return;
                    setSubmitted(true);
                    if (question) {
                      recordAttempt(question.ID, computeIsCorrect()).catch(() => {
                        // Non-fatal: the user already sees their result;
                        // this only feeds the profile page's activity map.
                      });
                    }
                  }}
                  disabled={!canSubmit && !submitted}
                  className="relative flex items-center justify-center px-8 py-[15px] rounded-[2.844px] overflow-hidden transition-opacity hover:opacity-90 active:opacity-80"
                  style={{
                    background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
                    boxShadow: "0 0 10.665px 0 rgba(173,198,255,0.2)",
                    minWidth: "191px",
                    opacity: canSubmit || submitted ? 1 : 0.5,
                  }}
                >
                  <span className="absolute inset-0 rounded-[2.844px]" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <span className="relative text-white text-[12px] font-inter tracking-[1.849px] uppercase font-bold">
                    {submitted ? "Answer Submitted" : "Submit answer"}
                  </span>
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "TIME ELAPSED", value: formatTime(elapsed), color: "#e5e2e1" },
                { label: "DIFFICULTY", value: question.Difficulty ?? "—", color: "#adc6ff" },
                { label: "TYPE", value: question.Type.toUpperCase(), color: "#adc6ff" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center py-4 px-3 rounded-[8.5px]" style={{ border: "1.063px solid rgba(66,71,84,0.1)", background: "#201f1f" }}>
                  <span className="text-[#8c909f] text-[10.625px] font-bold font-inter uppercase tracking-wide mb-1 text-center">{stat.label}</span>
                  <span className="font-mono text-[17px]" style={{ color: stat.color }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Theory Snippet */}
            <div className="rounded-[8.5px] p-6 flex flex-col gap-4" style={{ border: "1.063px solid rgba(66,71,84,0.2)", background: "#2a2a2a" }}>
              <div className="flex items-center gap-2">
                <span className="text-[#e5e2e1] text-[17px] font-bold font-inter">Theory Snippet</span>
              </div>
              {question.TheoryText ? (
                <div className="rounded-[4.25px] p-4 flex flex-col gap-1" style={{ borderLeft: "4.25px solid #adc6ff", background: "#0e0e0e" }}>
                  {question.TheoryTitle && (
                    <span className="text-[#adc6ff] text-[10.625px] font-bold font-inter tracking-wider uppercase">
                      {question.TheoryTitle}
                    </span>
                  )}
                  <p className="text-[#c2c6d6] text-[15px] leading-[1.625] font-inter whitespace-pre-wrap">
                    {question.TheoryText}
                  </p>
                </div>
              ) : (
                <p className="text-[#8c909f] text-[14px] font-inter">No theory notes for this question yet.</p>
              )}
            </div>

            {/* Discussion (not yet backed by real data) */}
            <div className="rounded-[8.5px] flex flex-col overflow-hidden" style={{ border: "1.063px solid rgba(66,71,84,0.2)", background: "#2a2a2a" }}>
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1.063px solid rgba(66,71,84,0.1)" }}>
                <span className="text-[#e5e2e1] text-[17px] font-bold font-inter">Discussion</span>
              </div>
              <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1" style={{ maxHeight: "340px" }}>
                <span className="text-[#8c909f] text-[14px] font-inter">
                  Be the first to ask a doubt about this question.
                </span>
              </div>
              <div className="flex flex-col gap-0" style={{ borderTop: "1.063px solid rgba(66,71,84,0.1)", background: "rgba(53,53,52,0.5)" }}>
                <div className="p-4">
                  <div className="flex items-center gap-2 rounded-[4.25px] overflow-hidden" style={{ border: "1.063px solid rgba(66,71,84,0.2)", background: "#0e0e0e" }}>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ask a doubt..."
                      className="flex-1 bg-transparent px-3 py-2.5 text-[14.875px] font-inter text-[#c2c6d6] placeholder:text-[#6b7280] outline-none"
                    />
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

export default function QuestionPage() {
  const branch = getBranch();
  if (isWiredBranch(branch)) {
    return <LiveQuestionPage branch={branch} />;
  }

  // Every other branch doesn't have a question bank wired up yet.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#131313] text-center px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(173,198,255,0.10)] text-[#adc6ff]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7V12L15.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 className="text-[#e5e1e4] text-xl font-medium">Coming Soon</h1>
      {branch && (
        <span className="font-mono text-xs uppercase tracking-wider text-[#8c909f]">{branch}</span>
      )}
      <p className="max-w-sm text-sm leading-6 text-[#8c909f]">
        We're still building out this branch's question bank. Check back soon — CSE and Data Science &amp; AI are ready to explore in the meantime.
      </p>
      <Link to="/" className="text-[#adc6ff] text-sm">Back to overview</Link>
    </div>
  );
}
