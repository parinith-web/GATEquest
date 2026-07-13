import React from "react";
import { Link } from "react-router-dom";
import { Navbar, Footer } from "@/components/landing";

/* ------------------------------------------------------------------ */
/*  Shared shell for /privacy and /terms — a simple two-column legal   */
/*  document layout (sticky "Legal" + table-of-contents on the left,   */
/*  the actual policy sections on the right), sitting between the      */
/*  normal Navbar and Footer so it reads as part of the same site.     */
/* ------------------------------------------------------------------ */

export interface LegalSection {
  id: string;
  heading: string;
  content: React.ReactNode;
}

export function LegalLayout({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="font-inter min-h-screen w-full bg-gq-bg text-white antialiased">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-32 pt-32 md:pt-40">
        <div className="flex flex-col gap-12 md:flex-row md:gap-16">
          {/* Left rail — label + table of contents */}
          <aside className="shrink-0 md:w-64">
            <div className="md:sticky md:top-32">
              <div className="font-mono text-[11px] tracking-[0.25em] text-gq-blue uppercase">
                Legal
              </div>
              <nav className="mt-6 flex flex-col gap-1 border-l border-white/[0.08] pl-4">
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="py-1.5 text-sm text-gq-text-secondary transition hover:text-white"
                  >
                    {i + 1}. {s.heading}
                  </a>
                ))}
              </nav>
              <Link
                to="/"
                className="mt-8 inline-block text-sm text-gq-text-muted transition hover:text-white"
              >
                ← Back to home
              </Link>
            </div>
          </aside>

          {/* Right column — the document itself */}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-bold tracking-[-0.5px] md:text-5xl">
              {title}
            </h1>
            <p className="font-mono mt-3 text-[12px] tracking-[0.1em] text-gq-text-muted uppercase">
              Last Updated: {lastUpdated}
            </p>

            <div className="mt-12 flex flex-col gap-12">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-32">
                  <h2 className="font-display text-xl font-semibold tracking-[-0.3px] md:text-2xl">
                    {i + 1}. {s.heading}
                  </h2>
                  <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-gq-text-secondary">
                    {s.content}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
