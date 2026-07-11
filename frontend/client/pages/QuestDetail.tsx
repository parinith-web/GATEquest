import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  fetchQuestDetail,
  fetchQuestLeaderboard,
  fetchQuestResults,
  joinQuest,
  submitQuestAnswer,
  type QuestDetail as QuestDetailT,
  type QuestSafeQuestion,
  type LeaderboardEntry,
  type QuestResultEntry,
} from "@/lib/gate-api";

// ── Helpers ──────────────────────────────────────────────────────────────

function useCountdown(target: Date | null) {
  const [seconds, setSeconds] = useState(() =>
    target ? Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000)) : 0,
  );
  useEffect(() => {
    if (!target) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target?.getTime()]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    seconds,
    label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
  };
}

function formatTimeTaken(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

const OPTION_KEYS: Array<{ key: keyof QuestSafeQuestion; id: string }> = [
  { key: "optionA", id: "A" },
  { key: "optionB", id: "B" },
  { key: "optionC", id: "C" },
  { key: "optionD", id: "D" },
];

// ── Registration / waiting state ────────────────────────────────────────

function RegistrationPanel({
  quest,
  onRegistered,
}: {
  quest: QuestDetailT;
  onRegistered: () => void;
}) {
  const { label } = useCountdown(new Date(quest.startsAt));
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await joinQuest(quest.id);
      onRegistered();
    } catch (e: any) {
      setError(e.message ?? "Could not register");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto text-center py-20 px-6">
      <span className="font-firacode font-semibold text-gq-blue text-[11px] tracking-[3.6px] uppercase mb-3 block">
        Weekly Mock #{quest.weekNumber}
      </span>
      <h1 className="font-inter font-bold text-gq-heading text-4xl tracking-[-1.5px] mb-6">
        {quest.title}
      </h1>
      <div className="font-jetbrains font-bold text-gq-blue text-4xl tabular-nums mb-1">
        {label}
      </div>
      <div className="font-firacode text-gq-muted text-[11px] tracking-[1.2px] uppercase mb-8">
        until the arena opens
      </div>
      <div className="flex items-center justify-center gap-6 mb-8 font-mono text-gq-text-secondary text-sm">
        <span>{Math.round(quest.durationSeconds / 60)} min</span>
        <span>·</span>
        <span>{quest.questions.length} questions</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm font-firacode mb-4">
          {error}
        </div>
      )}

      {quest.isParticipant ? (
        <div className="rounded-[2px] px-8 py-4 inline-block bg-gq-card border border-gq-border text-gq-heading font-inter font-bold text-[14px] tracking-[1.6px] uppercase">
          Registered ✓ — the arena unlocks automatically
        </div>
      ) : (
        <button
          onClick={handleJoin}
          disabled={joining}
          className="bg-gq-blue text-gq-blue-dark font-inter font-bold text-[14px] tracking-[1.6px] uppercase px-8 py-4 rounded-[2px] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {joining ? "Registering…" : "Register Now"}
        </button>
      )}
    </div>
  );
}

// ── Live arena ───────────────────────────────────────────────────────────

function ArenaQuestionPanel({
  question,
  submitted,
  onSubmit,
}: {
  question: QuestSafeQuestion;
  submitted: boolean;
  onSubmit: (answer: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [natInput, setNatInput] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "accepted" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set());
    setNatInput("");
    setStatus(submitted ? "accepted" : "idle");
    setError(null);
  }, [question.id, submitted]);

  const toggle = (id: string) => {
    if (question.type !== "mcq" && question.type !== "msq") return;
    setSelected((prev) => {
      const next = new Set(question.type === "mcq" ? [] : prev);
      if (question.type === "mcq") {
        next.add(id);
      } else if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const canSubmit =
    status !== "submitting" &&
    (question.type === "nat" ? natInput.trim().length > 0 : selected.size > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const answer = question.type === "nat" ? natInput.trim() : Array.from(selected).sort().join(",");
    setStatus("submitting");
    setError(null);
    try {
      await onSubmit(answer);
      setStatus("accepted");
    } catch (e: any) {
      setError(e.message ?? "Submission failed");
      setStatus("error");
    }
  };

  const options = OPTION_KEYS.filter((o) => question[o.key]);

  return (
    <div
      className="rounded-[8.5px] overflow-hidden flex flex-col"
      style={{ border: "1.063px solid rgba(66,71,84,0.2)", background: "rgba(26,26,26,0.8)" }}
    >
      <div className="px-6 md:px-9 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[12px] text-gq-muted uppercase">
            {question.subject} · {question.topic}
          </span>
          {question.marks != null && (
            <span className="text-gq-blue-accent font-bold text-[13px] tracking-widest uppercase font-inter">
              {question.marks} MARK{question.marks === 1 ? "" : "S"}
            </span>
          )}
        </div>
        <p className="text-gq-text-primary text-[17px] leading-[1.625] font-inter whitespace-pre-wrap">
          {question.questionText}
        </p>
      </div>

      <div className="px-6 md:px-9 pb-6">
        {question.type === "nat" ? (
          <input
            type="text"
            inputMode="decimal"
            disabled={submitted}
            value={natInput}
            onChange={(e) => setNatInput(e.target.value)}
            placeholder="Enter your numeric answer"
            className="w-full sm:w-64 rounded-[8.5px] p-4 text-gq-text-primary text-[17px] font-inter outline-none bg-gq-input border border-gq-border-subtle/30"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map((opt) => {
              const isSelected = selected.has(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggle(opt.id)}
                  disabled={submitted}
                  className="flex items-center gap-4 rounded-[8.5px] p-5 text-left transition-all duration-150"
                  style={{
                    border: isSelected ? "1.063px solid #adc6ff" : "1.063px solid rgba(66,71,84,0.2)",
                    background: isSelected ? "#202126" : "#2a2a2a",
                  }}
                >
                  <div
                    className="w-[42.5px] h-[42.5px] flex items-center justify-center rounded-[4.25px] flex-shrink-0"
                    style={{ border: "1.063px solid #424754", background: "#0e0e0e" }}
                  >
                    <span className="text-gq-muted font-bold text-[17px] font-inter">{opt.id}</span>
                  </div>
                  <span className="text-gq-text-secondary font-medium text-[16px] font-inter">
                    {question[opt.key] as string}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {status === "accepted" && (
        <div className="mx-6 md:mx-9 mb-6 rounded-[8.5px] p-4 bg-emerald-500/10 border border-emerald-500/30">
          <span className="font-inter font-bold text-[14px] text-emerald-400">
            Accepted — locked in. Results reveal once the arena closes.
          </span>
        </div>
      )}
      {status === "error" && error && (
        <div className="mx-6 md:mx-9 mb-6 rounded-[8.5px] p-4 bg-red-500/10 border border-red-500/30">
          <span className="font-inter font-bold text-[14px] text-red-400">{error}</span>
        </div>
      )}

      <div
        className="mx-6 md:mx-9 flex items-center justify-end gap-4 py-6"
        style={{ borderTop: "1.063px solid rgba(66,71,84,0.1)" }}
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitted}
          className="relative flex items-center justify-center px-8 py-[15px] rounded-[2.844px] overflow-hidden transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)", minWidth: "191px" }}
        >
          <span className="relative text-white text-[12px] font-inter tracking-[1.849px] uppercase font-bold">
            {submitted ? "Submitted" : status === "submitting" ? "Submitting…" : "Submit Answer"}
          </span>
        </button>
      </div>
    </div>
  );
}

function LiveArena({ quest }: { quest: QuestDetailT }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const endsAt = new Date(new Date(quest.startsAt).getTime() + quest.durationSeconds * 1000);
  const { label } = useCountdown(endsAt);

  const refreshLeaderboard = useCallback(() => {
    fetchQuestLeaderboard(quest.id).then(setLeaderboard).catch(() => {});
  }, [quest.id]);

  useEffect(() => {
    refreshLeaderboard();
    const interval = setInterval(refreshLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [refreshLeaderboard]);

  const activeQuestion = quest.questions[activeIdx];

  const handleSubmit = async (answer: string) => {
    await submitQuestAnswer(quest.id, activeQuestion.id, answer);
    setSubmittedIds((prev) => new Set(prev).add(activeQuestion.id));
    refreshLeaderboard();
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-firacode font-semibold text-gq-blue text-[11px] tracking-[2px] uppercase block mb-1">
            Weekly Mock #{quest.weekNumber} · Live
          </span>
          <h1 className="font-inter font-bold text-gq-heading text-2xl md:text-3xl tracking-[-1px]">
            {quest.title}
          </h1>
        </div>
        <div className="text-right">
          <div className="font-jetbrains font-bold text-gq-blue text-2xl tabular-nums">{label}</div>
          <div className="font-firacode text-gq-muted text-[10.5px] tracking-[1.2px] uppercase">
            Time Remaining
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {quest.questions.map((q, i) => {
              const isDone = submittedIds.has(q.id);
              const isActive = i === activeIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveIdx(i)}
                  className="w-9 h-9 rounded-[6px] flex items-center justify-center font-mono text-[13px] font-bold transition-colors"
                  style={{
                    border: isActive ? "1.5px solid #ADC6FF" : "1px solid rgba(66,71,84,0.3)",
                    background: isDone ? "rgba(163,255,51,0.12)" : isActive ? "#202126" : "#2A2A2A",
                    color: isDone ? "#A3FF33" : isActive ? "#ADC6FF" : "#8C909F",
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {activeQuestion && (
            <ArenaQuestionPanel
              key={activeQuestion.id}
              question={activeQuestion}
              submitted={submittedIds.has(activeQuestion.id)}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-[8.5px] p-5 sticky top-6" style={{ border: "1.063px solid rgba(66,71,84,0.2)", background: "#2a2a2a" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gq-text-primary font-bold text-[15px] font-inter">Live Leaderboard</span>
              <span className="text-gq-muted text-[10.5px] font-firacode uppercase">
                {submittedIds.size}/{quest.questions.length} solved
              </span>
            </div>
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto">
              {leaderboard.length === 0 ? (
                <span className="text-gq-muted text-[13px] font-firacode">No scores yet — be the first.</span>
              ) : (
                leaderboard.map((e) => (
                  <div key={e.userId} className="flex items-center justify-between px-3 py-2 rounded-[6px] bg-gq-row/40">
                    <span className="font-mono text-[13px] text-gq-text-secondary truncate">
                      #{e.rank} {e.name}
                    </span>
                    <span className="font-mono text-[13px] text-gq-blue-accent">{e.score}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinLiveQuestPanel({ quest, onJoined }: { quest: QuestDetailT; onJoined: () => void }) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await joinQuest(quest.id);
      onJoined();
    } catch (e: any) {
      setError(e.message ?? "Could not join");
    } finally {
      setJoining(false);
    }
  };
  return (
    <div className="max-w-xl mx-auto text-center py-20 px-6">
      <span className="font-firacode font-semibold text-gq-green text-[11px] tracking-[3.6px] uppercase mb-3 block">
        Live now
      </span>
      <h1 className="font-inter font-bold text-gq-heading text-3xl tracking-[-1px] mb-6">{quest.title}</h1>
      <p className="text-gq-muted font-firacode text-[13px] mb-8">
        This arena is already running. Jump in now — you'll still get every question that's left in the clock.
      </p>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm font-firacode mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={joining}
        className="bg-gq-blue text-gq-blue-dark font-inter font-bold text-[14px] tracking-[1.6px] uppercase px-8 py-4 rounded-[2px] hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {joining ? "Joining…" : "Join & Enter Arena"}
      </button>
    </div>
  );
}

// ── Closed / results ─────────────────────────────────────────────────────

function ResultsPanel({ quest }: { quest: QuestDetailT }) {
  const [results, setResults] = useState<QuestResultEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestResults(quest.id)
      .then(setResults)
      .catch((e) => setError(e.message ?? "Failed to load results"));
  }, [quest.id]);

  return (
    <div className="px-4 md:px-8 py-8 max-w-[1300px] mx-auto flex flex-col gap-10">
      <div>
        <span className="font-firacode font-semibold text-gq-muted text-[11px] tracking-[2px] uppercase block mb-1">
          Weekly Mock #{quest.weekNumber} · Closed
        </span>
        <h1 className="font-inter font-bold text-gq-heading text-3xl tracking-[-1px]">{quest.title}</h1>
      </div>

      <div className="rounded-lg border border-gq-border bg-gq-card overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 text-[11px] font-firacode uppercase tracking-wide text-gq-muted border-b border-gq-border">
          <span>Rank</span>
          <span className="col-span-2">Participant</span>
          <span>Solved</span>
          <span>Rating</span>
        </div>
        {error && <div className="p-6 text-red-400 font-firacode text-sm">{error}</div>}
        {!error && !results && <div className="p-6 text-gq-muted font-firacode text-sm">Loading results…</div>}
        {results?.length === 0 && (
          <div className="p-6 text-gq-muted font-firacode text-sm">No participants finished this quest.</div>
        )}
        {results?.map((r) => {
          const delta = r.ratingAfter - r.ratingBefore;
          return (
            <div key={r.userId} className="grid grid-cols-5 px-5 py-3 items-center border-b border-gq-border/50 last:border-0">
              <span className="font-mono text-gq-heading text-sm">#{r.rank}</span>
              <span className="col-span-2 font-inter text-gq-text-secondary text-sm truncate">{r.name}</span>
              <span className="font-mono text-gq-text-secondary text-sm">
                {r.solvedCount} · {formatTimeTaken(r.timeTakenSeconds)}
              </span>
              <span className="font-mono text-sm">
                {r.ratingAfter}{" "}
                <span className={delta >= 0 ? "text-gq-green" : "text-gq-red"}>
                  ({delta >= 0 ? "+" : ""}
                  {delta})
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="font-inter font-bold text-gq-heading text-xl mb-4">Practice this question set</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quest.questions.map((q, i) => (
            <Link
              key={q.id}
              to={`/question/${q.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gq-border bg-gq-card px-4 py-3 hover:border-gq-blue-accent/50 transition-colors"
            >
              <span className="font-inter text-gq-text-secondary text-sm truncate">
                <span className="text-gq-muted font-mono mr-2">{i + 1}.</span>
                {q.topic}
              </span>
              <span className="font-mono text-[10.5px] uppercase text-gq-muted flex-shrink-0">{q.type}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quest, setQuest] = useState<QuestDetailT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchQuestDetail(id)
      .then(setQuest)
      .catch((e) => setError(e.message ?? "Failed to load quest"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // While scheduled or live, poll so status flips (scheduled -> live -> closed)
  // without the user needing to refresh manually — the scheduler on the
  // backend is what actually drives the transition.
  useEffect(() => {
    if (!quest || quest.status === "closed") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(load, 20000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [quest?.status, load]);

  return (
    <Layout>
      {error && (
        <div className="max-w-xl mx-auto mt-10 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm font-firacode">
          {error}
        </div>
      )}
      {!error && !quest && (
        <div className="text-center py-24 text-gq-muted font-firacode text-sm">Loading quest…</div>
      )}
      {quest && quest.status === "scheduled" && (
        <RegistrationPanel quest={quest} onRegistered={load} />
      )}
      {quest && quest.status === "live" && quest.isParticipant && <LiveArena quest={quest} />}
      {quest && quest.status === "live" && !quest.isParticipant && (
        <JoinLiveQuestPanel quest={quest} onJoined={load} />
      )}
      {quest && quest.status === "closed" && <ResultsPanel quest={quest} />}
    </Layout>
  );
}
