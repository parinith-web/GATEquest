import React from "react";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Shared primitives used by several landing sections. Kept together  */
/*  here (instead of duplicated per-section) so tokens like button      */
/*  radius/tracking only need to change in one place.                  */
/* ------------------------------------------------------------------ */

export function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "font-mono inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-[11px] tracking-[0.18em] text-gq-text-muted uppercase " +
        className
      }
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  to = "/onboarding",
}: {
  children: React.ReactNode;
  className?: string;
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={
        "font-mono inline-flex items-center gap-2 rounded-full bg-gq-blue px-6 py-3 text-[12px] font-semibold tracking-[0.14em] text-[#0E0E0E] uppercase transition hover:bg-[#7BB4FF] " +
        className
      }
    >
      {children}
    </Link>
  );
}

export function GhostButton({
  children,
  className = "",
  href = "#",
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className={
        "font-mono inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[12px] font-semibold tracking-[0.14em] text-white uppercase transition hover:border-gq-blue hover:text-gq-blue " +
        className
      }
    >
      {children}
    </a>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono mb-4 text-[11px] tracking-[0.25em] text-gq-blue uppercase">
      {children}
    </div>
  );
}

/** Mocked roadmap-progress card used in HowItWorks.tsx instead of a real
 *  product screenshot — styled to match the real Roadmaps page's subject
 *  cards (see GATEquest-main/frontend/client/pages/Roadmaps.tsx). */
export function RoadmapPreview() {
  const rows = [
    { name: "Eng. Mathematics", pct: 100, status: "Completed", dot: "bg-gq-heat-3" },
    { name: "Digital Logic", pct: 100, status: "Completed", dot: "bg-gq-heat-3" },
    { name: "Data Structures & Algo", pct: 65, status: "In Progress", dot: "bg-gq-blue" },
    { name: "Computer Networks", pct: 40, status: "In Progress", dot: "bg-gq-blue" },
    { name: "Operating Systems", pct: 12, status: "Just Started", dot: "bg-gq-text-muted" },
    { name: "Theory of Computation", pct: 0, status: "Not Started", dot: "bg-gq-text-muted" },
  ];
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-gq-card p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-gq-text-muted">
          CSE Roadmap
        </span>
        <span className="font-mono text-[11px] text-gq-text-muted">6 / 9 subjects</span>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-white">
                <span className={"h-2 w-2 rounded-full " + r.dot} />
                {r.name}
              </span>
              <span className="font-mono text-[11px] text-gq-text-muted">{r.status}</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06]">
              <div
                className="h-1.5 rounded-full bg-gq-blue"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
