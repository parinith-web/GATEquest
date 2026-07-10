import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";

function useCountdown(targetSeconds: number) {
  const [seconds, setSeconds] = useState(targetSeconds);
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function QuestCardArena() {
  const countdown = useCountdown(5 * 3600 + 13 * 60 + 7);

  return (
    <div className="relative w-full h-full flex-shrink-0 overflow-hidden">
      {/* Background image */}
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/296768a1bcb53379f5220ff0d730fc26e22ec008?width=2400"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gq-bg via-gq-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-gq-bg/80 via-transparent to-transparent" />

      {/* Countdown - top right */}
      <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex flex-col items-end z-10">
        <span className="font-jetbrains font-bold text-gq-blue text-2xl sm:text-3xl lg:text-[32px] leading-tight tabular-nums">
          {countdown}
        </span>
        <span className="font-firacode font-semibold text-gq-muted text-[11px] tracking-[1.2px] uppercase mt-1">
          TIME REMAINING
        </span>
      </div>

      {/* Content - bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14 flex flex-col items-start z-10">
        <span className="font-firacode font-semibold text-gq-blue text-[11px] sm:text-[12px] tracking-[3.6px] uppercase mb-3">
          ACTIVE ARENA CONTEST
        </span>

        <h1 className="font-inter font-bold text-gq-heading leading-none tracking-[-2px] text-4xl sm:text-5xl lg:text-[64px] mb-4 sm:mb-6">
          WEEKLY MOCK
          <br />
          #506
        </h1>

        <p className="font-firacode text-gq-text text-[13px] sm:text-[14px] leading-5 mb-6 sm:mb-8 max-w-[320px]">
          MISSION CRITICAL:{" "}
          <br className="hidden sm:block" />
          High-fidelity algorithmic simulation.{" "}
          <br className="hidden sm:block" />
          12K participants detected.
          <br className="hidden sm:block" />
          Deployment window closing in 4 days.
        </p>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button className="bg-gq-blue text-gq-blue-dark font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[14px] sm:py-[17px] rounded-[2px] hover:opacity-90 transition-opacity">
            REGISTER NOW
          </button>
          <button className="border border-[#424754] text-gq-heading font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[13px] sm:py-[16px] rounded-[2px] hover:bg-gq-border/30 transition-colors">
            VIEW SPECS
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestCardSector() {
  return (
    <div className="relative w-full h-full flex-shrink-0 overflow-hidden">
      {/* Background image */}
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/a0aec7389b59c267fe9e6cb147a75e605ac97963?width=2400"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gq-bg via-gq-bg/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-gq-bg/70 via-transparent to-transparent" />

      {/* Sector completion - top right */}
      <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex flex-col items-end z-10">
        <span className="font-firacode font-bold text-gq-purple text-2xl sm:text-3xl lg:text-[48px] leading-tight">
          68%
        </span>
        <span className="font-firacode font-semibold text-gq-muted text-[11px] tracking-[1.2px] uppercase mt-1">
          SECTOR COMPLETION
        </span>
      </div>

      {/* Content - bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16 flex flex-col items-start z-10">
        <span className="font-firacode font-semibold text-gq-purple text-[11px] sm:text-[12px] tracking-[3.6px] uppercase mb-3">
          SECTOR QUEST ALPHA
        </span>

        <h1 className="font-inter font-bold text-gq-heading leading-none tracking-[-2px] text-4xl sm:text-5xl lg:text-[64px] mb-4 sm:mb-5">
          DATA
          <br />
          STRUCTURES
          <br />
          MASTER
        </h1>

        <p className="font-firacode text-gq-text text-[13px] sm:text-[14px] leading-5 mb-6 sm:mb-8 max-w-[448px]">
          PROGRESS: 24/35 MISSIONS. Efficiency rating 68%.
          <br className="hidden sm:block" />
          Optimization of heap-based memory allocation required
          <br className="hidden sm:block" />
          for rank advancement.
        </p>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button className="bg-gq-purple text-gq-purple-dark font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[14px] sm:py-[17px] rounded-[2px] hover:opacity-90 transition-opacity">
            DEPLOY MISSION
          </button>
          <button className="border border-[#424754] text-gq-heading font-inter font-bold text-[14px] sm:text-[16px] tracking-[1.6px] uppercase px-6 sm:px-8 py-[13px] sm:py-[16px] rounded-[2px] hover:bg-gq-border/30 transition-colors">
            INTEL HUB
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestsPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const totalSlides = 2;

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        left: index * sliderRef.current.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const width = sliderRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      setActiveSlide(newIndex);
    }
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      slider.addEventListener("scroll", handleScroll, { passive: true });
      return () => slider.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <Layout>
      <div className="relative w-full h-[calc(100vh-65px-16px)] overflow-hidden">
        {/* Slider container */}
        <div
          ref={sliderRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

          {/* Slide 1 - Arena Contest */}
          <div className="w-full h-full flex-shrink-0 snap-start">
            <QuestCardArena />
          </div>

          {/* Slide 2 - Sector Quest */}
          <div className="w-full h-full flex-shrink-0 snap-start">
            <QuestCardSector />
          </div>
        </div>

        {/* Navigation dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`transition-all duration-300 rounded-full ${
                activeSlide === i
                  ? "w-6 h-2 bg-gq-blue"
                  : "w-2 h-2 bg-gq-muted/50 hover:bg-gq-muted"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Arrow navigation */}
        {activeSlide > 0 && (
          <button
            onClick={() => goToSlide(activeSlide - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gq-bg/60 border border-gq-border flex items-center justify-center text-gq-text hover:bg-gq-border transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {activeSlide < totalSlides - 1 && (
          <button
            onClick={() => goToSlide(activeSlide + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gq-bg/60 border border-gq-border flex items-center justify-center text-gq-text hover:bg-gq-border transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </Layout>
  );
}
