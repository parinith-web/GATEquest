/* ------------------------------------------------------------------ */
/*  Shared motion tokens — one place to tune every section's scroll-   */
/*  reveal feel. Ported from the easing/stagger rhythm used across the */
/*  Nest landing page (BasicsCovered.tsx, Hero.tsx, GoodStuff.tsx).    */
/* ------------------------------------------------------------------ */

import { Variants } from "framer-motion";

/** Nest's signature "settle" curve — quick start, soft landing. */
export const EASE_OUT: [number, number, number, number] = [
  0.21, 0.47, 0.32, 0.98,
];

/** Fade up from below — the default reveal for section headers and cards. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

/** Smaller-travel fade up, for inline copy inside an already-revealed card. */
export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

/** Plain fade, no movement — for badges/pills that shouldn't slide. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

/** Wraps a group of children so they stagger in one after another. */
export const staggerContainer = (
  staggerMs = 0.12,
  delayMs = 0,
): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: staggerMs,
      delayChildren: delayMs,
    },
  },
});

/** Spring pop-in for badges/tags that should feel snappy, not eased. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

/**
 * "Blur unveil" — starts soft/out-of-focus and slides up into a crisp,
 * sharp frame once it's properly in view. Reserved for hero-weight
 * moments (PulseHighlight's card clusters) where a plain fade feels
 * too flat for how much visual detail is packed into the cards.
 */
export const blurReveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(16px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: EASE_OUT },
  },
};
