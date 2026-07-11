import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  getBranch,
  isWiredBranch,
  BRANCH_LABEL,
  BRANCH_SUBJECT,
  fetchQuests,
  fetchQuestDetail,
  joinQuest,
  nextSunday630pm,
  type QuestSummary,
  type QuestDetail,
  type WiredBranch,
} from "@/lib/gate-api";

// ── Shared helpers ──────────────────────────────────────────────────────────

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

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const label =
    d > 0
      ? `${d}D ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return { seconds, label };
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} MIN`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} HR` : `${h}H ${m}M`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Hero arena card (shared shell for both mock and wired branches) ────────

interface HeroCardProps {
  weekNumber: number;
  title?: string;
  countdownTarget: Date | null;
  countdownLabel: string;
  durationSeconds: number;
  questionCount: number;
  cta: { label: string; onClick?: () => void; to?: string; disabled?: boolean; loading?: boolean };
  secondary?: { label: string; to: string };
  note?: string;
}

function HeroCard({
  weekNumber,
  title = "WEEKLY MOCK",
  countdownTarget,
  countdownLabel,
  durationSeconds,
  questionCount,
  cta,
  secondary,
  note,
}: HeroCardProps) {
  const { label } = useCountdown(countdownTarget);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/296768a1bcb53379f5220ff0d730fc26e22ec008?width=2400"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gq-bg via-gq-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-gq-bg/80 via-transparent to-transparent" />

      {/* Countdown - top right */}
      <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex flex-col items-end z-10">
        <span className="font-jetbrains font-bold text-gq-blue text-2xl sm:text-3xl lg:text-[32px] leading-tight tabular-nums">
          {label}
        </span>
        <span className="font-firacode font-semibold text-gq-muted text-[11px] tracking-[1.2px] uppercase mt-1">
          {countdownLabel}
        </span>
      </div>

      {/* Content - bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14 flex flex-col items-start z-10">
        <span className="font-firacode font-semibold text-gq-blue text-[11px] sm:text-[12px] tracking-[3.6px] uppercase mb-3">
          WEEKLY ARENA CONTEST
        </span>

        <h1 className="font-inter font-bold text-gq-heading leading-none tracking-[-2px] text-4xl sm:text-5xl lg:text-[64px] mb-4 sm:mb-6">
          {title}
          <br />#{weekNumber}
        </h1>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex flex-col">
            <span className="font-mono text-gq-heading text-[15px] sm:text-[17px]">
              {formatDuration(durationSeconds)}
            </span>
            <span className="font-firacode text-gq-muted text-[10.5px] tracking-[1.2px] uppercase">
              Duration
            </span>
          </div>
          <div className="w-px h-8 bg-gq-border-subtle/40" />
          <div className="flex flex-col">
            <span className="font-mono text-gq-heading text-[15px] sm:text-[17px]">
              {questionCount || "—"}
            </span>
            <span className="font-firacode text-gq-muted text-[10.5px] tracking-[1.2px] uppercase">
              Questions
            </span>
          </div>
        </div>

        {note && (
          <p className="font-firacode text-gq-text text-[13px] leading-5 mb-4 max-w-[420px]">
            {note}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {cta.to ? (
            <Link
              to={cta.disabled ? "#" : cta.to}
              className={`bg-gq-blue text-gq-blue-dark font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[14px] sm:py-[17px] rounded-[2px] transition-opacity ${cta.disabled ? "pointer-events-none opacity-50" : "hover:opacity-90"}`}
            >
              {cta.label}
            </Link>
          ) : (
            <button
              onClick={cta.onClick}
              disabled={cta.disabled || cta.loading}
              className="bg-gq-blue text-gq-blue-dark font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[14px] sm:py-[17px] rounded-[2px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
            >
              {cta.loading ? "…" : cta.label}
            </button>
          )}
          {secondary && (
            <Link
              to={secondary.to}
              className="border border-[#424754] text-gq-heading font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[13px] sm:py-[16px] rounded-[2px] hover:bg-gq-border/30 transition-colors"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Past quests section ─────────────────────────────────────────────────────

function PastQuestCard({ quest }: { quest: QuestSummary }) {
  return (
    <Link
      to={`/quests/${quest.id}`}
      className="rounded-lg border border-gq-border bg-gq-card p-5 flex flex-col gap-3 hover:border-gq-blue-accent/50 hover:bg-gq-card-hover transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-firacode font-semibold text-gq-muted text-[10.5px] tracking-[1.6px] uppercase">
          Weekly Mock #{quest.weekNumber}
        </span>
        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wide bg-gq-tag text-gq-muted">
          Closed
        </span>
      </div>
      <h3 className="font-inter font-bold text-gq-heading text-[18px] leading-snug">
        {quest.title}
      </h3>
      <span className="font-mono text-gq-text-secondary text-[12.5px]">
        {formatDate(quest.startsAt)}
      </span>
      <span className="font-firacode text-gq-blue-accent text-[12px] font-semibold uppercase tracking-wide mt-1">
        Practice this set →
      </span>
    </Link>
  );
}

function PastQuestsSection({
  quests,
  loading,
  emptyHint,
}: {
  quests: QuestSummary[];
  loading: boolean;
  emptyHint: string;
}) {
  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-10 sm:pt-14 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-firacode font-semibold text-gq-purple text-[11px] sm:text-[12px] tracking-[3.6px] uppercase block mb-2">
            ARCHIVE
          </span>
          <h2 className="font-inter font-bold text-gq-heading text-2xl sm:text-3xl tracking-[-1px]">
            Past Quests
          </h2>
          <p className="font-firacode text-gq-muted text-[13px] mt-2 max-w-[520px]">
            Every closed weekly mock stays here — pull up its question set
            and drill it on your own time, no clock attached.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-gq-muted font-firacode text-[13px]">Loading archive…</div>
      ) : quests.length === 0 ? (
        <div className="rounded-lg border border-gq-border bg-gq-card p-10 text-center text-gq-muted font-firacode text-[13px]">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quests.map((q) => (
            <PastQuestCard key={q.id} quest={q} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Slider shell ─────────────────────────────────────────────────────────
//
// Two horizontally-snapped slides: the weekly arena hero, then the past
// quests archive. Swipe/scroll or use the edge arrow / dots to move
// between them — same mechanic as the old arena/sector slider, just with
// the second slide repurposed as the practice archive.

function QuestsSlider({
  heroSlide,
  pastSlide,
}: {
  heroSlide: React.ReactNode;
  pastSlide: React.ReactNode;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const totalSlides = 2;

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: index * sliderRef.current.clientWidth, behavior: "smooth" });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setActiveSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px-16px)] min-h-[560px] overflow-hidden">
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        <div className="w-full h-full flex-shrink-0 snap-start">{heroSlide}</div>
        <div className="w-full h-full flex-shrink-0 snap-start overflow-y-auto">{pastSlide}</div>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`transition-all duration-300 rounded-full ${
              activeSlide === i ? "w-6 h-2 bg-gq-blue" : "w-2 h-2 bg-gq-muted/50 hover:bg-gq-muted"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Left arrow */}
      {activeSlide > 0 && (
        <button
          onClick={() => goToSlide(activeSlide - 1)}
          aria-label="Previous"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gq-bg/60 border border-gq-border flex items-center justify-center text-gq-text hover:bg-gq-border transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Right arrow — points to the Past Quests slide */}
      {activeSlide < totalSlides - 1 && (
        <button
          onClick={() => goToSlide(activeSlide + 1)}
          aria-label="View past quests"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gq-bg/60 border border-gq-border flex items-center justify-center text-gq-text hover:bg-gq-border transition-colors animate-pulse"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Wired (real backend) page ───────────────────────────────────────────────

function WiredQuestsPage({ branch }: { branch: WiredBranch }) {
  const [quests, setQuests] = useState<QuestSummary[] | null>(null);
  const [heroDetail, setHeroDetail] = useState<QuestDetail | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuests(BRANCH_SUBJECT[branch])
      .then((list) => {
        if (!cancelled) setQuests(list);
      })
      .catch((e) => !cancelled && setLoadError(e.message ?? "Failed to load quests"));
    return () => {
      cancelled = true;
    };
  }, [branch]);

  const live = quests?.find((q) => q.status === "live") ?? null;
  const upcoming =
    quests
      ?.filter((q) => q.status === "scheduled")
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const hero = live ?? upcoming ?? null;
  const closedQuests =
    quests
      ?.filter((q) => q.status === "closed")
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()) ?? [];

  useEffect(() => {
    if (!hero) {
      setHeroDetail(null);
      return;
    }
    let cancelled = false;
    fetchQuestDetail(hero.id)
      .then((d) => !cancelled && setHeroDetail(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hero?.id]);

  const handleRegister = async () => {
    if (!hero) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinQuest(hero.id);
      setHeroDetail((d) => (d ? { ...d, isParticipant: true } : d));
    } catch (e: any) {
      setJoinError(e.message ?? "Could not register");
    } finally {
      setJoining(false);
    }
  };

  let cta: HeroCardProps["cta"];
  let note: string | undefined;
  let countdownTarget: Date | null;
  let countdownLabel: string;

  if (!hero) {
    countdownTarget = nextSunday630pm();
    countdownLabel = "NEXT ARENA OPENS";
    cta = { label: "Check back soon", disabled: true };
    note = "No quest is scheduled yet for your branch — the next weekly mock lands soon.";
  } else if (hero.status === "live") {
    countdownTarget = new Date(new Date(hero.startsAt).getTime() + hero.durationSeconds * 1000);
    countdownLabel = "TIME REMAINING";
    cta = { label: "Enter Arena", to: `/quests/${hero.id}` };
  } else {
    countdownTarget = new Date(hero.startsAt);
    countdownLabel = "STARTS IN";
    if (heroDetail?.isParticipant) {
      cta = { label: "Registered ✓", disabled: true };
      note = "You're in. The arena unlocks automatically the moment the timer hits zero.";
    } else {
      cta = { label: "Register Now", onClick: handleRegister, loading: joining };
      if (joinError) note = joinError;
    }
  }

  return (
    <Layout>
      <QuestsSlider
        heroSlide={
          <>
            <HeroCard
              weekNumber={hero?.weekNumber ?? 1}
              countdownTarget={countdownTarget}
              countdownLabel={countdownLabel}
              durationSeconds={hero?.durationSeconds ?? 3600}
              questionCount={heroDetail?.questions.length ?? 0}
              cta={cta}
              secondary={hero ? { label: "Rating History", to: "/profile" } : undefined}
              note={note}
            />
            {loadError && (
              <div className="absolute top-6 left-6 right-24 sm:left-10 sm:right-32 z-20 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-xs font-firacode">
                {loadError}
              </div>
            )}
          </>
        }
        pastSlide={
          <PastQuestsSection
            quests={closedQuests}
            loading={quests === null}
            emptyHint={`No closed quests for ${BRANCH_LABEL[branch]} yet — once a weekly mock ends, it'll show up here for practice.`}
          />
        }
      />
    </Layout>
  );
}

// ── Mock (non-wired branch) fallback ────────────────────────────────────────

function MockQuestsPage() {
  const countdownTarget = nextSunday630pm();

  return (
    <Layout>
      <QuestsSlider
        heroSlide={
          <HeroCard
            weekNumber={1}
            countdownTarget={countdownTarget}
            countdownLabel="STARTS IN"
            durationSeconds={3600}
            questionCount={25}
            cta={{ label: "Register Now" }}
            note="MISSION CRITICAL: High-fidelity algorithmic simulation. Registration closes when the timer hits zero."
          />
        }
        pastSlide={
          <PastQuestsSection
            quests={[]}
            loading={false}
            emptyHint="No past quests yet — check back after the first Weekly Mock closes."
          />
        }
      />
    </Layout>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

export default function QuestsPage() {
  const branch = getBranch();
  if (isWiredBranch(branch)) {
    return <WiredQuestsPage branch={branch} />;
  }
  return <MockQuestsPage />;
}
