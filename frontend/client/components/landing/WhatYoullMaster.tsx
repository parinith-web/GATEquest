import React from "react";
import { motion } from "framer-motion";
import { SectionEyebrow } from "@/components/landing/LandingUI";

/* Rebuilt on Nest's BasicsCovered.tsx template — an asymmetric 4-column
   bento with one big end-aligned corner card and a floating mock card
   tucked under it, instead of the previous equal 2x2 grid. Distinct from
   ExplorePlatform's sticky-column/GoodStuff layout and StatBanner's
   single glowing mosaic card just above it. */

const FADE_BORDER = (stop = "15%") => ({
  WebkitMaskImage: `linear-gradient(to bottom, black 0%, transparent ${stop})`,
  maskImage: `linear-gradient(to bottom, black 0%, transparent ${stop})`,
});

const SPECIALIZATIONS = [
  { name: "CSE", color: "border-gq-blue/40 bg-gq-blue/10 text-gq-blue" },
  { name: "ECE", color: "border-gq-purple/40 bg-gq-purple/10 text-gq-purple" },
  { name: "Mechanical", color: "border-gq-green/40 bg-gq-green/10 text-gq-green" },
  { name: "Civil", color: "border-gq-yellow/40 bg-gq-yellow/10 text-gq-yellow" },
  { name: "Electrical", color: "border-gq-red/40 bg-gq-red/10 text-gq-red" },
  { name: "Chemical", color: "border-gq-blue/40 bg-gq-blue/10 text-gq-blue" },
  { name: "Instrumentation", color: "border-gq-purple/40 bg-gq-purple/10 text-gq-purple" },
  { name: "+24 more", color: "border-white/10 bg-white/[0.04] text-gq-text-muted" },
];

function QuestionCardMock() {
  return (
    <div className="w-[300px] rounded-xl border border-white/10 bg-[#101010] p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gq-blue/15 px-2 py-0.5 text-[10px] font-medium text-gq-blue">
          Algorithms
        </span>
        <span className="text-[10px] text-gq-text-muted">MSQ</span>
      </div>
      <p className="mt-3 text-sm leading-snug text-white/90">
        What is the time complexity of Dijkstra's algorithm using a binary
        heap?
      </p>
      <div className="mt-3 flex gap-2 text-[10px] text-gq-text-muted">
        <span className="rounded-md bg-white/[0.04] px-2 py-1">O(V log V)</span>
        <span className="rounded-md bg-white/[0.04] px-2 py-1">O(E log V)</span>
      </div>
    </div>
  );
}

export function WhatYoullMaster() {
  return (
    <section className="border-t border-white/[0.06] bg-white/[0.015] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display mb-12 text-center text-4xl tracking-tight md:mb-16 md:text-6xl"
        >
          What You'll Master
        </motion.h2>

        <div className="grid min-h-[500px] grid-cols-1 gap-3 md:grid-cols-4">
          {/* Big corner card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative hidden cursor-default flex-col items-end justify-between gap-8 overflow-hidden rounded-[24px] bg-gq-card p-8 md:col-span-2 md:row-span-2 md:flex md:p-12"
          >
            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10" style={FADE_BORDER()} />

            {/* Ambient color to give the top of the card some life instead
                of flat empty space above the copy block. */}
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-gq-blue/10 blur-[80px]" />
            <div className="pointer-events-none absolute -right-10 top-10 h-56 w-56 rounded-full bg-gq-purple/10 blur-[70px]" />

            <div className="relative z-10 max-w-[320px] text-end">
              <SectionEyebrow>30+ Specializations</SectionEyebrow>
              <h3 className="text-xl font-medium text-white">
                Curated Question Sets, Per Specialization
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gq-text-secondary">
                Every one of GATE's 30+ specializations gets its own
                GATEquest-curated question set, organized topic-wise — from
                Algorithms under CSE to Thermodynamics under Mechanical to
                Circuit Theory under Electrical.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative z-10 flex flex-col items-end gap-2"
            >
              <div className="flex flex-wrap justify-end gap-2">
                {SPECIALIZATIONS.slice(0, 3).map((s) => (
                  <span
                    key={s.name}
                    className={
                      "rounded-full border px-3 py-1 text-[11px] font-medium " + s.color
                    }
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {SPECIALIZATIONS.slice(3).map((s) => (
                  <span
                    key={s.name}
                    className={
                      "rounded-full border px-3 py-1 text-[11px] font-medium " + s.color
                    }
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 80, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
              viewport={{ once: true }}
              className="absolute -bottom-[70px] left-6"
            >
              <QuestionCardMock />
            </motion.div>
          </motion.div>

          {/* Wide card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative flex flex-col overflow-hidden rounded-[24px] bg-gq-card p-8 md:col-span-2"
          >
            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10" style={FADE_BORDER()} />
            <div className="relative z-10">
              <h3 className="text-xl font-medium text-white">PYQs with Theory Snippets</h3>
              <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-gq-text-secondary">
                Every previous year question is included, paired with a
                theory snippet wherever it's needed — so you never have to
                leave the question to look something up.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                {["#PYQs", "#TheorySnippets", "#AllYears"].map((tag) => (
                  <span key={tag} className="rounded-full bg-white/[0.04] px-3 py-1 text-gq-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Small card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-gq-card p-8"
          >
            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10" style={FADE_BORDER()} />
            <div className="relative z-10">
              <h3 className="text-xl font-medium text-white">Every Question Type</h3>
              <p className="mt-3 text-sm leading-relaxed text-gq-text-secondary">
                Practice in the exact formats GATE actually tests.
              </p>
            </div>
            <div className="relative z-10 mt-6 flex flex-col gap-2">
              {["MCQs", "MSQs", "NATs"].map((t) => (
                <div key={t} className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/80">
                  {t}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Small card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-gq-card p-8"
          >
            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10" style={FADE_BORDER()} />
            <div className="relative z-10">
              <h3 className="text-xl font-medium text-white">Achievement Badges</h3>
              <p className="mt-3 text-sm leading-relaxed text-gq-text-secondary">
                Earn badges as you clear topics and hit milestones.
              </p>
            </div>
            <div className="relative z-10 mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-gq-heat-3" />
                <span className="text-white/80">Topic Mastery Badges</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-gq-blue" />
                <span className="text-white/80">Streak Achievements</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
