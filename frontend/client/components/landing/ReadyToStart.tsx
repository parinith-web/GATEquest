import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/components/landing/motion/variants";

/* Closing CTA — sits between the Pulse feed and the footer. Big statement
   line on a soft radial glow (same gq-blue-tinted spotlight treatment as
   GateHero's backdrop), single white pill button beneath it. */

export function ReadyToStart() {
  return (
    <section className="relative w-full overflow-hidden bg-gq-bg px-6 py-24 md:py-32">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 h-[520px] -translate-y-1/2"
        style={{
          background:
            "radial-gradient(45% 70% at 50% 50%, rgba(93,162,250,0.16) 0%, rgba(93,162,250,0) 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="font-dmsans text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px] md:text-[52px]"
        >
          Ready to get started?
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.12 }}
          className="mt-9"
        >
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
          >
            Sign in
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
