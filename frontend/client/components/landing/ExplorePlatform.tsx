import React from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/components/landing/motion/variants";
import { AVATARS } from "@/components/landing/mocks/avatars";

/* Rebuilt on Nest's GoodStuff.tsx template — a sticky left-hand heading
   next to a single scrolling column of cards inside one fade-masked
   outer frame, instead of the 3-up equal grid this section used to be.
   This is the one remaining Nest section template not already used
   elsewhere on this page (Privacy → WhyGateQuest, StayOrganized →
   HowItWorks, OrganizeWithStyle → StatBanner, Hero → GateHero). */

function RoadmapChainMock() {
  return (
    <div className="mt-6 flex w-full max-w-[420px] items-center justify-center gap-3">
      {["Digital Logic", "Algorithms", "Databases"].map((name, i) => (
        <React.Fragment key={name}>
          <div className="flex flex-col items-center gap-2">
            <div
              className={
                "flex h-11 w-11 items-center justify-center rounded-xl border text-[10px] font-bold " +
                (i === 1
                  ? "border-gq-blue/50 bg-gq-blue/15 text-gq-blue"
                  : "border-white/10 bg-white/[0.04] text-white/60")
              }
            >
              {i === 0 ? "✓" : i === 1 ? "▶" : "○"}
            </div>
            <span className="text-[10px] text-gq-text-muted">{name}</span>
          </div>
          {i < 2 && <div className="mb-5 h-px w-8 bg-white/10" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function RankRowsMock() {
  const rows = [
    { rank: 1, name: "arjun29", rating: 2140, avatar: AVATARS.charmander },
    { rank: 2, name: "you", rating: 1985, self: true, avatar: AVATARS.pikachu },
    { rank: 3, name: "priya_r", rating: 1932, avatar: AVATARS.squirtle },
  ];
  return (
    <div className="mt-6 flex w-full max-w-[320px] flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={r.rank}
          className={
            "flex items-center justify-between rounded-lg px-3 py-2 text-xs " +
            (r.self ? "bg-gq-blue/10 text-gq-blue" : "bg-white/[0.03] text-gq-text-secondary")
          }
        >
          <span className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-gq-text-muted">#{r.rank}</span>
            <img
              src={r.avatar}
              alt=""
              className="h-5 w-5 shrink-0 rounded-full bg-black object-cover"
            />
            {r.name}
          </span>
          <span className="font-mono">{r.rating}</span>
        </div>
      ))}
    </div>
  );
}

function PulsePostMock() {
  return (
    <div className="mt-6 w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gq-blue/30" />
        <span className="text-xs font-semibold text-white">sneha_r</span>
        <span className="font-mono text-[10px] text-gq-text-muted">2m ago</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gq-text-secondary">
        anyone have a clean way to remember Mealy vs Moore state outputs?
      </p>
      <span className="mt-2 inline-block rounded-full bg-gq-blue/15 px-2 py-0.5 text-[10px] text-gq-blue">
        #DigitalLogic
      </span>
    </div>
  );
}

const EXPLORE = [
  {
    title: "Roadmaps",
    desc: "A structured, topic-by-topic map for your branch — CSE, ECE, Mechanical, Civil, or any of GATE's 30+ specializations — with topic counts and progress locked to what you've actually cleared.",
    visual: <RoadmapChainMock />,
  },
  {
    title: "Weekly Quests",
    desc: "A timed, ranked mock every Sunday at 6:30 PM. Solve, get scored, and watch your rating move against your branch and the whole platform.",
    visual: <RankRowsMock />,
  },
  {
    title: "Pulse",
    desc: "A live social feed for the cohort — post a doubt, share a trick, follow trending tags by subject.",
    visual: <PulsePostMock />,
  },
];

export function ExplorePlatform() {
  return (
    <section id="explore" className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="w-full text-center lg:w-1/2 lg:text-left">
          <div className="lg:sticky lg:top-32">
            <h2 className="font-display text-4xl leading-tight tracking-[-0.5px] md:text-6xl">
              Explore the
              <br /> Platform
            </h2>
          </div>
        </div>

        <div className="w-full lg:w-1/2">
          <div className="relative rounded-[32px] bg-white/[0.01] p-2 sm:rounded-[40px] sm:p-3">
            <div
              className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/10 sm:rounded-[40px]"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, transparent, black, transparent)",
                maskImage: "linear-gradient(to bottom, transparent, black, transparent)",
              }}
            />

            <div className="flex flex-col gap-3 md:gap-4">
              {EXPLORE.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE_OUT, delay: i * 0.1 }}
                  id={`explore-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="relative rounded-[28px] bg-gq-card sm:rounded-[32px]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/10 sm:rounded-[32px]"
                    style={{
                      WebkitMaskImage: "linear-gradient(to bottom, transparent, black, transparent)",
                      maskImage: "linear-gradient(to bottom, transparent, black, transparent)",
                    }}
                  />
                  <div className="relative flex flex-col items-center overflow-hidden p-8 text-center lg:items-start lg:p-12 lg:text-left">
                    <h3 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-gq-text-secondary sm:mt-4 sm:text-lg">
                      {item.desc}
                    </p>
                    <div className="flex w-full items-center justify-center lg:justify-start">
                      {item.visual}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
