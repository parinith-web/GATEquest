import React from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/components/landing/motion/variants";

/* Redesigned in Nest's "Your Data Stays Yours" (Privacy.tsx) spirit —
   one big two-line statement, blur/slide in word by word, then three
   quiet pillar cards with a 2-3 word label each. No paragraphs, no
   icons, nothing to read past the headline. */
const PILLARS = ["Visual Roadmaps", "Ranked Quests", "Live Pulse Feed"];

export function WhyGateQuest() {
  return (
    <section id="why" className="relative py-28 text-white">
      <h2 className="flex flex-wrap justify-center gap-x-4 text-center text-4xl md:text-6xl">
        <motion.span
          initial={{ opacity: 0, x: 60, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
          viewport={{ once: true }}
          className="font-dmsans"
        >
          Prep, Not
        </motion.span>
        <motion.span
          initial={{ opacity: 0, x: 60, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="font-dmsans text-gq-blue"
        >
          Guesswork
        </motion.span>
      </h2>

      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 px-6 md:grid-cols-3 md:gap-6">
        {PILLARS.map((text, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: i * 0.15, ease: EASE_OUT }}
            viewport={{ once: true }}
            className="flex h-48 w-full items-center justify-center rounded-3xl bg-gq-card text-center shadow-[inset_0_0_40px_rgba(255,255,255,0.04)]"
          >
            <span className="font-dmsans max-w-[160px] text-xl leading-snug text-white">
              {text}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
