import React from "react";
import { useLocation } from "react-router-dom";
import {
  Navbar,
  GateHero,
  WhyGateQuest,
  HowItWorks,
  StatBanner,
  ExplorePlatform,
  WhatYoullMaster,
  RoadmapShowcase,
  PulseHighlight,
  ReadyToStart,
  Footer,
} from "@/components/landing";

/* ------------------------------------------------------------------ */
/*  GATEquest — landing page                                          */
/*                                                                      */
/*  Every section maps to one distinct Nest landing-page template      */
/*  (landing-page/src/components/landing/*.tsx in nest-main), each     */
/*  used exactly once so nothing on this page repeats a layout:        */
/*    Navbar            → Navbar.tsx                                   */
/*    GateHero           → Hero.tsx                                    */
/*    WhyGateQuest        → Privacy.tsx                                */
/*    HowItWorks          → StayOrganized.tsx                          */
/*    StatBanner          → OrganizeWithStyle.tsx                      */
/*    ExplorePlatform     → GoodStuff.tsx                              */
/*    WhatYoullMaster     → BasicsCovered.tsx                          */
/*    RoadmapShowcase     → BeautifullyCrafted.tsx                     */
/*    CommunityCTA        → CTA.tsx                                    */
/*    Footer              → Footer.tsx                                 */
/*  RoadmapsQuestsSplit stays a plain text+button block (not from a    */
/*  Nest template) since every template slot above is already spoken   */
/*  for.                                                                 */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const location = useLocation();

  React.useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // rAF so this runs after the section has actually painted, whether we
    // just mounted fresh (full navigation from another page) or the hash
    // changed while already on this page.
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.hash]);

  return (
    <div className="font-inter min-h-screen w-full bg-gq-bg text-white antialiased selection:bg-gq-blue selection:text-[#0E0E0E]">
      <Navbar />
      <GateHero />
      <WhyGateQuest />
      <ExplorePlatform />
      <StatBanner />
      <WhatYoullMaster />
      <RoadmapShowcase />
      <HowItWorks />
      <PulseHighlight />
      <ReadyToStart />
      <Footer />
    </div>
  );
}
