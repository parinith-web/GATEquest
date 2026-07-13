import React from "react";
import { LegalLayout, type LegalSection } from "@/components/legal/LegalLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    heading: "Introduction",
    content: (
      <>
        <p>
          Welcome to GATEquest. We're committed to protecting your privacy
          and ensuring you have a positive experience while you work through
          roadmaps, take part in Weekly Quests, and use the Pulse feed.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you visit our website, register an
          account, and use the platform. By using GATEquest, you consent to
          the data practices described in this policy.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    heading: "Information We Collect",
    content: (
      <>
        <p>We collect only the information necessary to run the platform:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-white">Account Information:</span> When you
            register or log in, we collect your email address, name, and a
            securely hashed version of your password. If you sign in via
            Google OAuth, we receive your email address, display name, and
            profile image from Google.
          </li>
          <li>
            <span className="text-white">Activity Data:</span> Your roadmap
            progress, Weekly Quest results (solved count, time taken, rating
            before and after), and anything you post, comment, or follow on
            Pulse are stored so your profile and leaderboard standing stay
            accurate across sessions.
          </li>
          <li>
            <span className="text-white">Session Data:</span> We use session
            cookies to maintain your authentication state and keep you signed
            in across page visits.
          </li>
        </ul>
        <p>
          <span className="text-white">What we do NOT collect:</span> We
          don't run advertising trackers, sell your data, or collect browsing
          activity outside GATEquest.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    heading: "How We Use Information",
    content: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="text-white">Account Management:</span> To create
          and maintain your account, authenticate your identity, and give
          you access to the editor and quest features.
        </li>
        <li>
          <span className="text-white">Ranking & Progress:</span> To compute
          quest ratings, leaderboard placement, and roadmap completion
          shown on your profile.
        </li>
        <li>
          <span className="text-white">Security:</span> To verify user
          sessions on protected endpoints and prevent unauthorized access.
        </li>
        <li>
          <span className="text-white">Communication:</span> To send
          account-related emails such as password resets and quest
          reminders. We do not send marketing emails.
        </li>
        <li>
          <span className="text-white">Support:</span> To respond to your
          inquiries and provide technical assistance when requested.
        </li>
      </ul>
    ),
  },
  {
    id: "data-storage-security",
    heading: "Data Storage & Security",
    content: (
      <>
        <p>
          Your account and activity data is stored on secure, encrypted
          infrastructure. We implement technical and administrative
          safeguards, including:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Encryption of data in transit using HTTPS/TLS.</li>
          <li>Parameterized database queries to prevent SQL injection.</li>
          <li>Session verification on all sensitive API endpoints.</li>
          <li>Passwords secured using industry-standard hashing algorithms.</li>
        </ul>
        <p>
          <span className="text-white">Data Retention:</span> We retain your
          account information for as long as your account is active. When
          you delete your account, we remove your personal data from our
          active systems. Some data may persist in backups for a limited
          period for disaster recovery purposes.
        </p>
        <p>
          No method of transmission over the Internet, or method of
          electronic storage, is 100% secure. While we strive to use
          commercially acceptable means to protect your information, we
          cannot guarantee its absolute security.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    heading: "Third-Party Services",
    content: (
      <>
        <p>
          We use the following third-party services that may process
          limited data on our behalf:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-white">Google OAuth:</span> If you choose
            to sign in with Google, Google provides us with your email
            address, display name, and profile image according to their
            privacy policy. You can review Google's privacy policy at
            policies.google.com/privacy.
          </li>
          <li>
            <span className="text-white">Hosting & Database:</span> Our
            application and database are hosted on encrypted, access-
            restricted cloud infrastructure.
          </li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with
          third parties for their marketing purposes.
        </p>
      </>
    ),
  },
  {
    id: "your-rights-choices",
    heading: "Your Rights & Choices",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-white">Access:</span> You can view your
            account information and activity by signing in to your profile.
          </li>
          <li>
            <span className="text-white">Deletion:</span> You can request
            deletion of your account and associated data by contacting us
            at the email below.
          </li>
          <li>
            <span className="text-white">Withdraw Consent:</span> You may
            stop using GATEquest at any time. You can sign out of your
            account to end your session.
          </li>
        </ul>
        <p>
          <span className="text-white">For EU/EEA residents (GDPR):</span>{" "}
          You have additional rights under the General Data Protection
          Regulation, including the right to rectification, data
          portability, and the right to lodge a complaint with a
          supervisory authority.
        </p>
        <p>
          <span className="text-white">For California residents (CCPA):</span>{" "}
          We do not sell personal information. You have the right to know
          what personal information we collect, request deletion, and opt
          out of any sale of personal information (which we do not engage
          in).
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    heading: "Children's Privacy",
    content: (
      <p>
        Our services are not intended for individuals under the age of 13
        (or the applicable age of digital consent in your jurisdiction). We
        do not knowingly collect personal information from children. If you
        believe a child has provided us with personal information, please
        contact us and we will promptly delete it.
      </p>
    ),
  },
  {
    id: "cookies-tracking",
    heading: "Cookies & Tracking",
    content: (
      <p>
        We use strictly necessary cookies to maintain your authentication
        session. These cookies are essential for the application to
        function and cannot be disabled. We do not use advertising cookies
        or third-party tracking scripts, and your activity on GATEquest is
        not shared with third-party advertising networks.
      </p>
    ),
  },
  {
    id: "changes-to-this-policy",
    heading: "Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. When we make
        material changes, we will update the "Last Updated" date at the top
        of this page. Continued use of GATEquest after changes are posted
        constitutes your acceptance of the updated policy.
      </p>
    ),
  },
  {
    id: "contact-us",
    heading: "Contact Us",
    content: (
      <p>
        If you have any questions, comments, or concerns regarding this
        Privacy Policy or our data practices, please reach out to us at{" "}
        <a href="mailto:support@gatequest.app" className="text-gq-blue hover:underline">
          support@gatequest.app
        </a>
        .
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 13, 2026" sections={SECTIONS} />
  );
}
