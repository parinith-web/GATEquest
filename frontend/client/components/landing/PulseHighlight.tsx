import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { USERS } from "@/components/landing/mocks/avatars";
import {
  TagChipMock,
  StatBadgeMock,
  DoubtResolvedToastMock,
  LiveFeedMock,
  FeedPostCardMock,
} from "@/components/landing/mocks/PulseHighlightMocks";

/* ------------------------------------------------------------------ */
/*  PulseHighlight — built after Nest's "Beautifully crafted for your  */
/*  feed" moment: one big masked/vignetted cluster of mock UI framing  */
/*  a centered headline, that blurs into focus as it scrolls into view.*/
/*  Pulse itself is a text-first community feed — post exam            */
/*  experiences, ask/resolve doubts, trade resources, and a single     */
/*  always-on live thread (Mock Debrief) running underneath it all —   */
/*  so every mock here leans on those real Pulse concepts. No calls,   */
/*  no groups to join, no presence chrome, ever.                       */
/* ------------------------------------------------------------------ */

export function PulseHighlight() {
  const sectionRef = useRef<HTMLElement>(null);

  // Section is in normal document flow (not pinned), so the reveal is
  // tied to how far its top has travelled from the bottom of the
  // viewport up to roughly center-screen — i.e. it's fully in focus
  // once it's properly "scrolled down to fit the screen".
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 92%", "start 38%"],
  });
  const clusterOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const clusterBlur = useTransform(
    scrollYProgress,
    [0, 1],
    ["blur(18px)", "blur(0px)"],
  );

  return (
    <section
      ref={sectionRef}
      id="pulse"
      className="relative overflow-hidden border-t border-white/[0.06] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        {/* Masked cluster — crisp dead-center, fading out toward every
            edge, so the composition reads as one atmospheric frame
            rather than a flat grid of boxes. */}
        <div
          className="relative flex flex-col items-center justify-center gap-2 overflow-x-auto py-6 no-scrollbar md:overflow-visible md:-translate-x-3 md:gap-3 md:py-10 lg:-translate-x-5"
          style={{
            WebkitMaskImage:
              "radial-gradient(circle, black 35%, transparent 92%)",
            maskImage: "radial-gradient(circle, black 35%, transparent 92%)",
          }}
        >
          <motion.div
            style={{ opacity: clusterOpacity, filter: clusterBlur }}
            className="pointer-events-none relative flex w-full select-none flex-col items-center justify-center gap-2 md:gap-3"
          >
            {/* ROW 1: trending tags + stat badges */}
            <div className="flex w-full flex-row items-end justify-start gap-2 overflow-x-auto no-scrollbar md:w-auto md:justify-center md:gap-3 md:overflow-visible">
              <div className="-ml-10 flex shrink-0 flex-row gap-2 md:hidden">
                <TagChipMock tag="#PYQs" count={612} />
                <TagChipMock tag="#DBMS" count={980} />
              </div>

              <div className="hidden flex-row items-end gap-2 md:flex">
                <TagChipMock tag="#GATE2027" count={2100} />
                <TagChipMock tag="#DBMS" count={980} />
                <TagChipMock tag="#OperatingSystems" count={588} />
                <TagChipMock tag="#DigitalLogic" count={471} />
              </div>

              <div className="hidden shrink-0 flex-col gap-2 md:flex">
                <StatBadgeMock value="1.2k" label="Doubts Solved" />
                <StatBadgeMock value="340" label="Resources Shared" />
              </div>
            </div>

            {/* ROW 2 (desktop): left cluster | headline | right cluster */}
            <div className="hidden w-full flex-row items-center justify-center gap-6 md:flex lg:gap-8">
              <div className="flex shrink-0 flex-col items-end gap-2">
                <DoubtResolvedToastMock />
                <FeedPostCardMock
                  name={USERS.parinith.name}
                  avatar={USERS.parinith.avatar}
                  tag="Resource"
                  title="One-page cheat sheet for Process Scheduling — PDF below."
                  upvotes="88"
                  comments={15}
                  showFollow={false}
                  className="w-64 shadow-2xl"
                />
              </div>

              <div className="z-10 flex-shrink-0 text-center">
                <span className="block font-display text-4xl font-semibold leading-tight tracking-[-0.5px] text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] md:text-6xl lg:text-7xl">
                  Pulse That
                </span>
                <span className="block font-display text-4xl font-semibold leading-tight tracking-[-0.5px] text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] md:text-6xl lg:text-7xl">
                  Feels Alive
                </span>
              </div>

              <div className="flex shrink-0 flex-col gap-2 md:ml-4 lg:ml-8">
                <LiveFeedMock />
              </div>
            </div>

            {/* Headline (mobile) */}
            <div className="w-full py-8 text-center md:hidden">
              <span className="block font-display text-3xl font-semibold leading-tight text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                Pulse That
              </span>
              <span className="block font-display text-3xl font-semibold leading-tight text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                Feels Alive
              </span>
            </div>

            {/* ROW 3: the feed — more posts, same rhythm as the sruthi card */}
            <div className="flex w-full flex-row items-start justify-start gap-2 overflow-x-auto no-scrollbar md:w-auto md:justify-center md:gap-3 md:overflow-visible">
              <div className="-ml-10 flex shrink-0 flex-row gap-2 md:hidden">
                <FeedPostCardMock
                  name={USERS.sruthi.name}
                  avatar={USERS.sruthi.avatar}
                  tag="Experience"
                  title="AIR 89 in GATE 2026. Start PYQs from day 1, not month 3."
                  upvotes="142"
                  comments={28}
                  className="w-72 min-w-[300px]"
                />
                <FeedPostCardMock
                  name={USERS.rohan.name}
                  avatar={USERS.rohan.avatar}
                  tag="Doubt"
                  title="NFA→DFA conversion — why doesn't {q2,q3} need a dead state here?"
                  upvotes="19"
                  comments={11}
                  className="w-72 min-w-[300px]"
                />
              </div>

              <div className="hidden shrink-0 md:flex">
                <FeedPostCardMock
                  name={USERS.sruthi.name}
                  avatar={USERS.sruthi.avatar}
                  tag="Experience"
                  title="AIR 89 in GATE 2026. If I had to redo one thing — start PYQs from day 1, not month 3."
                  upvotes="142"
                  comments={28}
                  className="w-[320px]"
                />
              </div>
              <div className="hidden shrink-0 md:mt-6 md:flex">
                <FeedPostCardMock
                  name={USERS.rohan.name}
                  avatar={USERS.rohan.avatar}
                  tag="Doubt"
                  title="NFA→DFA conversion — why doesn't {q2,q3} need a dead state here? Feels incomplete to me."
                  upvotes="19"
                  comments={11}
                  className="w-[320px]"
                />
              </div>
              <div className="hidden shrink-0 md:flex">
                <FeedPostCardMock
                  name={USERS.piyush.name}
                  avatar={USERS.piyush.avatar}
                  tag="Advice"
                  title="Stop switching standard books every week. Pick one, finish it, then move to PYQs."
                  upvotes="205"
                  comments={40}
                  className="w-[320px]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
