import React from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/components/landing/motion/variants";

/* Pulled from Nest's OrganizeWithStyle.tsx — a single glowing card
   packed with a staggered tag mosaic, instead of another heading +
   pillar-row (already used twice above this). Different rhythm,
   different shape, same DNA. */
const SUBJECTS = [
  "Aerospace", "Agricultural", "Architecture", "Biomedical", "Biotechnology",
  "Civil", "Chemical", "Computer Science", "Chemistry", "Data Science & AI",
  "Electronics & Comm.", "Electrical", "Environmental", "Ecology & Evolution",
  "Geomatics", "Geology & Geophysics", "Instrumentation", "Mathematics",
  "Mechanical", "Mining", "Metallurgical", "Naval Architecture", "Petroleum",
  "Physics", "Production & Industrial", "Statistics", "Textile",
  "Engineering Sciences", "Humanities & Social Sciences", "Life Sciences",
];

export function StatBanner() {
  return (
    <section id="subjects" className="relative py-28 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="font-dmsans mb-3 text-center text-4xl tracking-tight md:text-6xl"
        >
          Every Subject, Covered
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
          className="mb-12 text-center text-sm text-gq-text-secondary sm:text-base md:mb-16"
        >
          All 30 GATE subjects — one system, no gaps.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.05, ease: EASE_OUT }}
          className="relative overflow-hidden rounded-[24px] bg-gq-card p-6 sm:p-8 md:rounded-[32px] md:p-10"
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10 md:rounded-[32px]"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
            }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gq-blue/10 blur-[100px]" />

          <div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {SUBJECTS.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.4, y: 12 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.03, ease: EASE_OUT }}
                whileHover={{ scale: 1.03 }}
                className="flex h-20 cursor-default items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm font-medium text-white transition hover:border-gq-blue/40 hover:text-gq-blue sm:text-base"
              >
                {name}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
