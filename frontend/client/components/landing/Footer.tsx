import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Instagram, Linkedin, Mail } from "lucide-react";

/* Pixel-matched to the Figma export: #1B4278 background, the black/navy
   vectorized mark top-left, "GATE" (black) + "quest" (#ADC6FF) wordmark
   stacked above three sans-serif link columns, plain copyright line
   underneath (no rule, no back-to-top). */

const PRODUCT_LINKS = [
  { label: "Roadmaps", hash: "roadmaps" },
  { label: "Quests", hash: "quests" },
  { label: "Pulse", hash: "pulse" },
];

const SUPPORT_LINKS = [
  { label: "Contact", href: "mailto:support@gatequest.app" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms & Conditions", to: "/terms" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com/gatequest", icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com/company/gatequest", icon: Linkedin },
  { label: "Email", href: "mailto:support@gatequest.app", icon: Mail },
];

export function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  // Same cross-page section-link fix as Navbar: href always has the leading
  // "/" so it lands correctly even without JS, and on click we route through
  // the hash URL (single source of truth Landing.tsx scrolls from) instead
  // of a full reload when we're on another page.
  function handleLinkClick(e: React.MouseEvent, hash: string) {
    e.preventDefault();
    if (location.pathname === "/") {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${hash}`);
    }
  }

  return (
    <footer className="w-full bg-gradient-to-b from-[#1B4278] to-[#24579E] px-6 py-10 md:px-[106px] md:py-14">
      <div className="mx-auto flex w-fit max-w-full flex-col">
        {/* Top: logo left, wordmark + columns stacked right */}
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-[360px]">
          <img
            src="/brand/gatequest-mark-black.png"
            alt="GATEquest"
            className="h-[140px] w-[140px] shrink-0 sm:h-[180px] sm:w-[180px] md:h-[231px] md:w-[231px]"
          />

          <div className="flex flex-col gap-10 md:gap-[51px]">
            <span className="font-mono text-[40px] font-semibold leading-none tracking-[1.2px] md:text-[48px]">
              <span className="text-black">GATE</span>
              <span className="text-gq-blue-accent">quest</span>
            </span>

            <div className="flex flex-wrap gap-x-10 gap-y-8 md:gap-x-0">
              <div className="flex flex-col gap-3 md:mr-[141px]">
                <span className="text-sm font-semibold text-white">
                  Product
                </span>
                {PRODUCT_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={`/#${l.hash}`}
                    onClick={(e) => handleLinkClick(e, l.hash)}
                    className="text-sm text-gray-300 transition hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              <div className="flex flex-col gap-3 md:mr-[115px]">
                <span className="text-sm font-semibold text-white">
                  Support
                </span>
                {SUPPORT_LINKS.map((l) =>
                  l.to ? (
                    <Link
                      key={l.label}
                      to={l.to}
                      className="text-sm text-gray-300 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-sm text-gray-300 transition hover:text-white"
                    >
                      {l.label}
                    </a>
                  ),
                )}
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-white">
                  Social
                </span>
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-300 transition hover:text-white"
                  >
                    <s.icon size={15} className="shrink-0" />
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright — plain, no rule, left-aligned exactly under the logo */}
        <div className="mt-6 text-left md:mt-5">
          <span className="font-mono text-xs text-gray-400">
            Copyright © {new Date().getFullYear()} GATEquest
          </span>
        </div>
      </div>
    </footer>
  );
}
