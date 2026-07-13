import React from "react";
import { LegalLayout, type LegalSection } from "@/components/legal/LegalLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance-of-terms",
    heading: "Acceptance of Terms",
    content: (
      <>
        <p>
          Welcome to GATEquest ("we," "our," "us"). These Terms and
          Conditions govern your access to and use of our roadmap, Weekly
          Quests, and Pulse platform for GATE preparation.
        </p>
        <p>
          By creating an account or accessing any part of the service, you
          agree to be bound by these Terms. If you do not agree to all of
          the terms, do not access or use our services.
        </p>
      </>
    ),
  },
  {
    id: "account-registration",
    heading: "Account Registration",
    content: (
      <>
        <p>
          To access the full GATEquest platform — roadmaps, Weekly Quests,
          and Pulse — you must register for an account. You can register
          using your email and password, or sign in via Google OAuth.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate and complete information during registration.</li>
          <li>You are solely responsible for maintaining the confidentiality of your account credentials and password.</li>
          <li>You must immediately notify us of any unauthorized use of your account or security breaches.</li>
          <li>You must be at least 13 years old (or the minimum age of digital consent in your jurisdiction) to create an account.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content-platform-use",
    heading: "Content & Platform Use",
    content: (
      <>
        <p>
          Our application code, user interfaces, branding, roadmap
          structures, and quest content are owned by GATEquest and
          protected by copyright.
        </p>
        <p>
          <span className="text-white">Your Pulse Content:</span> Any posts,
          comments, or resources you share on Pulse remain yours. By
          posting, you grant GATEquest a non-exclusive license to display
          that content within the platform so other students can see and
          interact with it.
        </p>
      </>
    ),
  },
  {
    id: "prohibited-use",
    heading: "Prohibited Use",
    content: (
      <>
        <p>When using GATEquest, you agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Manipulate, exploit, or artificially inflate Weekly Quest ratings or leaderboard standing.</li>
          <li>Use automated bots or scripts to access, scrape, or extract roadmap or quest data.</li>
          <li>Resell, sublicense, or distribute the platform as a white-labeled product.</li>
          <li>Upload malicious scripts or attempt data injection into our systems.</li>
          <li>Harass, spam, or post abusive content on Pulse.</li>
          <li>Share your account credentials with others, or use another user's account.</li>
        </ul>
      </>
    ),
  },
  {
    id: "service-availability",
    heading: "Service Availability",
    content: (
      <p>
        GATEquest is currently free to use. We may introduce new features,
        including paid tiers, in the future — if we do, this section will
        be updated in advance and existing users will be notified. We do
        not currently process any payments.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    heading: "Limitation of Liability",
    content: (
      <>
        <p>
          The service is provided on an "AS IS" and "AS AVAILABLE" basis.
          GATEquest makes no warranties, expressed or implied, regarding
          the continuous availability of the application or the accuracy
          of quest ratings, rankings, or roadmap content.
        </p>
        <p>
          In no event shall GATEquest, its owners, or developers be liable
          for direct, indirect, incidental, or consequential damages
          resulting from the use or inability to use the platform.
        </p>
      </>
    ),
  },
  {
    id: "account-termination",
    heading: "Account Termination",
    content: (
      <>
        <p>
          You may delete your account at any time by contacting us. Upon
          deletion, your account data will be removed from our active
          systems.
        </p>
        <p>
          We reserve the right to suspend or terminate your account and
          block access to our services immediately, without prior notice,
          if you breach these Terms or engage in unauthorized scraping or
          abuse of our system.
        </p>
      </>
    ),
  },
  {
    id: "contact-us",
    heading: "Contact Us",
    content: (
      <p>
        For questions regarding these Terms and Conditions, please email us
        at{" "}
        <a href="mailto:support@gatequest.app" className="text-gq-blue hover:underline">
          support@gatequest.app
        </a>
        .
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalLayout title="Terms and Conditions" lastUpdated="July 13, 2026" sections={SECTIONS} />
  );
}
