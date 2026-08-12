import { useState } from "react";
import Layout from "@/components/Layout";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How do roadmap quests and rankings work?",
    answer:
      "Each roadmap is broken into quests tied to a GATE subject. Solving problems inside a quest earns XP; your rank on that quest updates once it settles against everyone else who attempted it in the same window.",
  },
  {
    question: "Why is my streak or activity map not updating?",
    answer:
      "The activity map counts solved problems for your current branch only. If you recently switched branches in Profile, older attempts from a different branch won't count toward today's streak.",
  },
  {
    question: "How do I post or attach media in Pulse?",
    answer:
      "Use the composer at the top of Pulse to share an update — tap the film icon to attach an image or video before posting. Use the Add tags button next to Post to file it under a topic.",
  },
  {
    question: "Can I change my branch after onboarding?",
    answer:
      "Yes — open Profile and update your branch there. Note that only Computer Science and Data Science & AI have full question banks wired up right now; other branches are on the way.",
  },
  {
    question: "How do I report a bug or broken page?",
    answer:
      "Send a message through the contact card below with what you were doing, what you expected, and what happened instead. Screenshots help us fix it faster.",
  },
];

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gq-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] text-gq-text-primary font-medium">
          {item.question}
        </span>
        <span
          className={`shrink-0 text-gq-text-muted transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 0V14M0 7H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {open && (
        <p className="text-[14px] leading-relaxed text-gq-text-muted pb-4 pr-8">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function Support() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
  };

  return (
    <Layout breadcrumb="Support">
      <div className="px-6 pb-6 flex flex-col gap-6 max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-white text-2xl font-bold">How can we help?</h1>
          <p className="text-gq-text-muted text-[14px]">
            Browse common questions below, or send us a message and we'll get
            back to you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FAQ */}
          <div className="lg:col-span-7 rounded-lg border border-gq-border bg-gq-card p-6">
            <h2 className="text-white text-[15px] font-semibold font-mono uppercase tracking-wide mb-2">
              Frequently asked questions
            </h2>
            <div className="mt-2">
              {FAQS.map((item, i) => (
                <FaqRow
                  key={item.question}
                  item={item}
                  open={openIndex === i}
                  onToggle={() => setOpenIndex((v) => (v === i ? null : i))}
                />
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-lg border border-gq-border bg-gq-card p-6 flex flex-col gap-4">
              <h2 className="text-white text-[15px] font-semibold font-mono uppercase tracking-wide">
                Contact us
              </h2>

              {sent ? (
                <div className="rounded-[6px] border border-gq-blue/30 bg-gq-blue/10 px-4 py-3 text-sm text-gq-text-secondary">
                  Message sent. We'll reply to your email shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] text-gq-text-muted font-mono uppercase tracking-wide">
                      Your email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-gq-input border border-gq-border rounded-[4px] px-3 py-[9px] text-sm text-white placeholder-gq-text-muted outline-none focus:border-gq-blue/50 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] text-gq-text-muted font-mono uppercase tracking-wide">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue or question..."
                      rows={5}
                      className="w-full bg-gq-input border border-gq-border rounded-[4px] px-3 py-[9px] text-sm text-white placeholder-gq-text-muted outline-none focus:border-gq-blue/50 transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="mt-1 rounded-[6px] px-4 py-2 text-[13px] font-semibold bg-gq-blue text-[#0E0E0E] hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send message
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-lg border border-gq-border bg-gq-card p-6 flex flex-col gap-3">
              <h2 className="text-white text-[15px] font-semibold font-mono uppercase tracking-wide">
                Other ways to reach us
              </h2>
              <a
                href="mailto:support@gatequest.app"
                className="text-[14px] text-gq-blue hover:underline"
              >
                support@gatequest.app
              </a>
              <p className="text-[13px] text-gq-text-muted leading-relaxed">
                We usually respond within one business day.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
