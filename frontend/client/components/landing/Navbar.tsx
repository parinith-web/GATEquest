import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { EASE_OUT, fadeUpSm, staggerContainer } from "@/components/landing/motion/variants";
import { useAuth } from "@/lib/auth-context";

/* Same mark asset GateWordmark uses — pulled in directly here since the
   navbar now shows the icon only, no "GATEquest" text beside it. */
const LOGO_MARK =
  "https://api.builder.io/api/v1/image/assets/TEMP/6aa5e7a18d0b6f4f3037b2ad52df5f4f698e5959?width=76";

const NAV_LINKS = [
  { label: "Explore", hash: "explore" },
  { label: "Subjects", hash: "subjects" },
  { label: "Roadmaps", hash: "roadmaps" },
  { label: "Quests", hash: "quests" },
  { label: "Pulse", hash: "pulse" },
];

/**
 * Scroll-aware nav shell — mirrors Nest's Navbar.tsx: transparent/borderless
 * at the top of the page, then solid + bordered + blurred once the page has
 * scrolled past the hero. Nest scopes its scroll listener to a custom
 * container div; this page scrolls the document itself, so we listen on
 * `window` instead — threshold/transition duration/easing carried over 1:1.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Signed-in visitors still land on this marketing page (see HomeRoute
  // in App.tsx) — they just get their avatar + an "Enter" button here
  // instead of Log in / Sign up, so "/" stays the same shareable URL for
  // everyone while only taking signed-in people into the dashboard when
  // they actually choose to.
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section links (Explore, Roadmaps, Quests, Pulse, ...) only exist on the
  // landing page ("/"). From /privacy, /terms, etc. a plain "#hash" anchor
  // does nothing since there's no matching element on the current page —
  // that's what was leaving people stuck. This routes home first (passing
  // the target section via router state) and scrolls once Landing mounts;
  // if we're already on "/", it just scrolls in place.
  function handleNavClick(e: React.MouseEvent, hash: string) {
    e.preventDefault();
    if (location.pathname === "/") {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${hash}`);
    }
    setMenuOpen(false);
  }

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-white/[0.06] bg-gq-bg/90 backdrop-blur-md transition-shadow duration-300 ${
        scrolled || menuOpen ? "shadow-[0_8px_30px_rgba(0,0,0,0.3)]" : ""
      }`}
    >
      <div className="px-6">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between py-3">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center">
              <img src={LOGO_MARK} alt="GATEquest" className="h-8 w-8 shrink-0" draggable={false} />
            </Link>

            <motion.nav
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.06, 0.3)}
              className="hidden items-center gap-8 md:flex"
            >
              {NAV_LINKS.map((l) => (
                <motion.a
                  key={l.label}
                  href={`/#${l.hash}`}
                  onClick={(e) => handleNavClick(e, l.hash)}
                  variants={fadeUpSm}
                  className="text-[13px] font-medium text-gq-text-secondary transition hover:text-white"
                >
                  {l.label}
                </motion.a>
              ))}
            </motion.nav>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5, ease: EASE_OUT }}
            className="hidden items-center gap-3 md:flex"
          >
            {signedIn ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-3 rounded-lg py-1 pl-1 pr-1 transition hover:bg-white/5"
              >
                <img
                  src={user!.avatarUrl}
                  alt={user!.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  draggable={false}
                />
                <span className="rounded-lg bg-white px-4 py-2 text-[14px] font-semibold text-[#0E0E0E] transition group-hover:bg-gray-200">
                  Enter
                </span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[14px] font-medium text-gq-text-secondary transition hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg bg-white px-4 py-2 text-[14px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </motion.div>

          <button
            className="relative h-[22px] w-[22px] text-white md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={menuOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.06)}
              className="flex flex-col gap-4 px-6 py-4"
            >
              {NAV_LINKS.map((l) => (
                <motion.a
                  key={l.label}
                  href={`/#${l.hash}`}
                  variants={fadeUpSm}
                  onClick={(e) => handleNavClick(e, l.hash)}
                  className="text-sm text-gq-text-secondary"
                >
                  {l.label}
                </motion.a>
              ))}
              {signedIn ? (
                <motion.div variants={fadeUpSm}>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 inline-flex w-fit items-center gap-3 rounded-lg bg-white py-1 pl-1 pr-4 text-[14px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
                  >
                    <img
                      src={user!.avatarUrl}
                      alt={user!.name}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                      draggable={false}
                    />
                    Enter
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.a
                    href="/login"
                    variants={fadeUpSm}
                    className="text-sm text-gq-text-secondary"
                  >
                    Log in
                  </motion.a>
                  <motion.div variants={fadeUpSm}>
                    <Link
                      to="/login"
                      className="mt-2 inline-block w-fit rounded-lg bg-white px-4 py-2 text-[14px] font-semibold text-[#0E0E0E] transition hover:bg-gray-200"
                    >
                      Sign up
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
