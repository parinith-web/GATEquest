import React from "react";
import { Trophy } from "lucide-react";
import {
  SectionEyebrow,
  GhostButton,
} from "@/components/landing/LandingUI";
import { Reveal } from "@/components/landing/motion/Reveal";

// Note: the "Roadmaps" half that used to live here now has its own
// highlighted, fully-visual section — see RoadmapShowcase.tsx — so this
// is Weekly Quests only. Kept as its own file since it's still a
// distinct feature callout.
export function RoadmapsQuestsSplit() {
  return (
    <section className="border-t border-white/[0.06] px-6 py-28">
      <div className="mx-auto max-w-[600px]">
        <Reveal as="div">
          <div>
            <SectionEyebrow>Weekly Quests</SectionEyebrow>
            <h3 className="font-display text-3xl font-bold leading-snug tracking-[-0.5px]">
              A ranked, timed arena — live every Sunday at 6:30 PM
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-gq-text-secondary">
              Join the weekly mock, solve against the clock, and watch
              your rating move. Every result — solved count, time taken,
              rating before and after — stays on your profile.
            </p>
            <div className="mt-8">
              <GhostButton>
                <Trophy size={14} /> View Leaderboard
              </GhostButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
