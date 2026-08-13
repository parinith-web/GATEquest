import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EASE_OUT } from "@/components/landing/motion/variants";
import { PulseMock } from "@/components/landing/mocks/PulseMock";
import { useAuth } from "@/lib/auth-context";

/* ------------------------------------------------------------------ */
/*  Hero — rebuilt to the reference layout: a left-aligned, oversized  */
/*  two-line statement with a small "what's new" link floating top-    */
/*  right, a pair of CTAs beneath the headline, then a large product   */
/*  screenshot in a browser-style chrome frame that bleeds off the     */
/*  bottom of the section. Replaces the old centered wordmark + grid-  */
/*  backdrop treatment entirely.                                       */
/* ------------------------------------------------------------------ */

export default function GateHero() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden bg-gq-bg px-6 pt-[120px] pb-0 md:pt-[136px]"
    >
      {/* soft ambient glow replacing the old wireframe-grid backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(93,162,250,0.14) 0%, rgba(93,162,250,0) 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px]">
        {/* headline row: copy on the left, "what shipped" link floating
           top-right, mirroring the reference's asymmetric layout */}
        <div className="flex flex-col gap-10">
          <div className="max-w-[640px]">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.1 }}
              className="font-dmsans text-[40px] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[48px] md:text-[52px] lg:text-[56px]"
            >
              The prep platform for
              <br />
              <span className="text-gq-blue">standout ranks.</span>
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.32 }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#explore"
                className="rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
              >
                Explore
              </a>
              {signedIn ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 rounded-lg border border-white/15 py-2 pl-2 pr-5 text-[14px] font-semibold text-white transition hover:border-white/30"
                >
                  <img
                    src={user!.avatarUrl}
                    alt={user!.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                    draggable={false}
                  />
                  Enter
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="rounded-lg border border-white/15 px-5 py-3 text-[14px] font-semibold text-white transition hover:border-white/30"
                >
                  Sign in
                </Link>
              )}
            </div>

            <motion.a
              href="#explore"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.5 }}
              className="group hidden shrink-0 items-center gap-2 text-[13px] text-gq-text-secondary transition hover:text-white md:flex"
            >
              <span className="font-semibold text-white">New</span>
              Live Pulse &amp; Ranked Quests
              <ArrowUpRight
                size={14}
                strokeWidth={2.25}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </motion.a>
          </motion.div>
        </div>

        {/* product frame — browser-style chrome around the dashboard mock,
           pulled up tight under the copy and left to bleed past the
           bottom edge of the section, reference-style */}
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.62 }}
          className="relative mt-14 md:mt-20"
        >
          <div className="overflow-hidden rounded-t-2xl border border-x border-t border-white/10 bg-gq-sidebar shadow-[0_30px_90px_-25px_rgba(0,0,0,0.65)]">
            {/* dashboard fills the browser-chrome frame edge-to-edge —
               no toolbar, no padded canvas wrapper around it */}
            <PulseMock />
          </div>

          {/* fade so the frame reads as continuing past the fold rather
             than cutting off hard */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-gq-bg" />
        </motion.div>
      </div>

      <div className="h-16 md:h-24" />
    </section>
  );
}
