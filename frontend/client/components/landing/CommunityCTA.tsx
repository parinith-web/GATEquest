import React from "react";
import { motion } from "framer-motion";
import { PrimaryButton } from "@/components/landing/LandingUI";
import { AsciiArt } from "@/components/landing/decor/AsciiArt";

/* Rebuilt on Nest's CTA.tsx template — a single oversized statement,
   a glow-backed pill button, and two flanking ASCII-art ornaments,
   instead of the previous eyebrow + heading + three-button row. */

export function CommunityCTA() {
  return (
    <section id="community" className="relative overflow-hidden px-6 py-8 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-24 flex max-w-3xl flex-col items-center">
            <h2 className="font-display text-2xl leading-[1.05] tracking-tight text-white md:text-6xl">
              Join the Pulse
              <br />
              community!
            </h2>

            <div className="relative mt-8">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gq-blue/20 blur-[60px]" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gq-blue/20 blur-2xl" />
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative z-10"
              >
                <PrimaryButton className="shadow-[0_0_30px_rgba(93,162,250,0.25)]">
                  Start Your Quest
                </PrimaryButton>
              </motion.div>
            </div>

            <motion.div
              initial={{ scale: 0.2, opacity: 0, rotate: -18 }}
              whileInView={{ scale: 1, opacity: 1, rotate: -8 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="absolute right-4 top-12 hidden sm:right-12 sm:block md:right-20"
            >
              <AsciiArt size="md" color="text-gq-blue/30" />
            </motion.div>
            <motion.div
              initial={{ scale: 0.2, opacity: 0, rotate: 18 }}
              whileInView={{ scale: 1, opacity: 1, rotate: 8 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="absolute left-4 top-12 hidden sm:left-12 sm:block md:left-48"
            >
              <AsciiArt size="sm" color="text-white/20" inverted />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
