import React from "react";
import { motion, Variants } from "framer-motion";
import { fadeUp } from "./variants";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Defaults to fadeUp. Pass fadeUpSm / fadeIn / popIn / a custom Variants. */
  variants?: Variants;
  /** Stagger delay in seconds, handy inside a staggerContainer parent. */
  delay?: number;
  /** Re-animate every time it scrolls into view instead of once. */
  repeat?: boolean;
  as?: "div" | "section" | "li";
}

/**
 * Drop-in scroll-reveal wrapper — mirrors the `initial / whileInView /
 * viewport={{ once: true }}` pattern used throughout the Nest landing
 * page (see BasicsCovered.tsx) without repeating it in every section.
 *
 *   <Reveal><h2>Heading</h2></Reveal>
 *   <Reveal variants={fadeUpSm} delay={0.2}><p>Body copy</p></Reveal>
 */
export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay = 0,
  repeat = false,
  as = "div",
}: RevealProps) {
  const MotionTag = motion[as];

  return (
    <MotionTag
      initial="hidden"
      whileInView="show"
      viewport={{ once: !repeat, amount: 0.2 }}
      variants={variants}
      transition={delay ? { delay } : undefined}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Wraps a list of children so they stagger in together — pair with
 * plain <Reveal> or motion children inside. Use for grids/rows of cards.
 *
 *   <RevealGroup className="grid grid-cols-3 gap-6">
 *     {items.map((i) => <Reveal key={i.id} variants={fadeUpSm}>...</Reveal>)}
 *   </RevealGroup>
 */
export function RevealGroup({
  children,
  className,
  staggerMs = 0.12,
}: {
  children: React.ReactNode;
  className?: string;
  staggerMs?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: staggerMs } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
