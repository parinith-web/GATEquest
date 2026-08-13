import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/components/landing/motion/variants";
import { useAuth } from "@/lib/auth-context";

/* Closing CTA — sits between the Pulse feed and the footer. Big statement
   line on a soft radial glow (same gq-blue-tinted spotlight treatment as
   GateHero's backdrop), single white pill button beneath it. */

export function ReadyToStart() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;

  return (
    <section className="relative w-full overflow-hidden bg-gq-bg px-6 py-32 md:py-44 lg:py-52">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 h-[720px] -translate-y-1/2"
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
          {signedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-3 rounded-xl bg-white py-2 pl-2 pr-8 text-[15px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
            >
              <img
                src={user!.avatarUrl}
                alt={user!.name}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                draggable={false}
              />
              Enter
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
            >
              Sign in
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
