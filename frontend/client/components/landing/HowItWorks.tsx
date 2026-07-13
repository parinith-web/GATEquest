import React from "react";
import { motion } from "framer-motion";
import { RoadmapPreview } from "@/components/landing/LandingUI";
import { EASE_OUT } from "@/components/landing/motion/variants";

/* Rebuilt as a Nest-style bento grid (see StayOrganized.tsx): centered
   headline, then a small set of cards — short title, one-line
   description, one visual each. No stat rail, no dense paragraph. */
const CARDS = [
  {
    title: "See Every Topic On The Map",
    desc: "Your whole syllabus, laid out — not buried in a PDF.",
    span: true,
    visual: (
      <div className="mt-6 flex w-full justify-center">
        <RoadmapPreview />
      </div>
    ),
  },
  {
    title: "Weekly Arena, Ranked",
    desc: "One quest a week. Your rank moves with it.",
    visual: (
      <div className="mt-8 flex w-full items-center justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gq-blue/40">
          <span className="font-mono text-xs text-gq-blue">Sun · 6:30</span>
        </div>
      </div>
    ),
  },
  {
    title: "5,000+ Practice Qs",
    desc: "Every question tagged to a topic on your map.",
    visual: (
      <div className="mt-8 flex w-full items-center justify-center">
        <span className="font-dmsans text-5xl text-gq-blue">5,000+</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="quests" className="border-t border-white/[0.06] py-28 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="font-dmsans mb-12 text-center text-4xl tracking-tight md:mb-16 md:text-6xl"
        >
          Built To Move Your Rank
        </motion.h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: (i % 2) * 0.1 }}
              className={
                "relative flex flex-col items-start overflow-hidden rounded-[24px] bg-gq-card p-8 md:p-10 " +
                (card.span ? "md:row-span-2" : "")
              }
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10"
                style={{
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 60%)",
                  maskImage: "linear-gradient(to bottom, black 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10 w-full">
                <h3 className="text-xl font-medium text-white sm:text-2xl">{card.title}</h3>
                <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-gq-text-secondary sm:text-base">
                  {card.desc}
                </p>
                {card.visual}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
