import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { setUsername as apiSetUsername } from "@/lib/auth";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export default function OnboardingUsername() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();
  const [username, setUsernameInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Can't claim a username before picking a branch — send them back to
  // step 1 if they land here directly (e.g. a stale bookmark).
  useEffect(() => {
    if (user && !user.branch) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  // Already done? Don't let them re-run onboarding by mistake.
  useEffect(() => {
    if (user?.username) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const trimmed = username.trim();
  const isValid = USERNAME_PATTERN.test(trimmed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || busy) return;

    setBusy(true);
    setError(null);
    try {
      await apiSetUsername(trimmed);
      await refresh();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Couldn't save your username. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(116.55% 97.34% at 50% 0%, #2A2A2C 0%, #131315 60%), #131315",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-center relative border-b border-[#201F22] h-[89px] flex-shrink-0 px-6">
        <div className="flex items-center gap-5">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/2d820a83d1d61eb1b70ca251f31eb0a04662f9ff?width=60"
            alt="GATEquest Logo"
            className="w-[30px] h-[30px]"
          />
          <div className="font-['JetBrains_Mono'] font-semibold text-[18px] leading-[1.5] tracking-[0.875px]">
            <span className="text-[#E5E1E4]">GATE</span>
            <span className="text-[#ADC6FF]">quest</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center gap-4 mb-10 text-center">
            <h1 className="text-[#E5E1E4] font-sans font-normal text-4xl md:text-5xl leading-[1.25] tracking-[-1.2px]">
              Claim Your Handle.
            </h1>
            <p className="text-[#C2C6D6] font-sans font-normal text-base leading-6">
              Pick a unique username — this is how you'll show up on
              leaderboards, Pulse, and your profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C909F] font-mono text-base select-none">
                @
              </span>
              <input
                type="text"
                autoFocus
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setError(null);
                }}
                maxLength={20}
                className="w-full rounded-xl border border-[#424754] bg-[#201F22] text-white h-12 pl-9 pr-4 font-mono outline-none focus:border-[#ADC6FF] transition-colors"
              />
            </div>

            <p className="text-xs text-[#8C909F] px-1">
              3–20 characters. Letters, numbers, and underscores only.
            </p>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || busy}
              className="relative flex items-center justify-center gap-3 rounded-[4px] px-8 py-4 mt-2 overflow-hidden transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ADC6FF] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)",
                boxShadow: "0 0 15px 0 rgba(173, 198, 255, 0.20)",
              }}
            >
              <span className="relative font-sans font-bold text-[13px] leading-[19.5px] tracking-[2.6px] uppercase text-white">
                {busy ? "CLAIMING…" : "CLAIM USERNAME"}
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.1458 7.5H0V5.83333H10.1458L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="white"/>
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
