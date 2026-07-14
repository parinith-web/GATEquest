import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginWithGoogle, loginWithPasskey, registerPasskey } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  state_mismatch: "That sign-in link expired, please try again.",
  token_exchange_failed: "Could not complete Google sign-in. Please try again.",
  userinfo_failed: "Could not read your Google profile. Please try again.",
  email_not_verified: "Your Google email isn't verified yet.",
  user_upsert_failed: "Something went wrong creating your account.",
};

export default function Login() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("auth_error");
    if (code) setError(ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again.");
  }, [searchParams]);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handlePasskeySignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithPasskey();
      await refresh();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Passkey sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePasskeyRegister = async () => {
    if (!email) {
      setError("Enter your email to create a passkey.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await registerPasskey(email, name || email);
      await refresh();
      navigate("/onboarding", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Passkey registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-[9vh] px-6"
      style={{
        background:
          "radial-gradient(116.55% 97.34% at 50% 0%, #2A2A2C 0%, #131315 60%), #FFF",
      }}
    >
      <div className="w-full max-w-[460px]">
        <div className="flex flex-col items-center mb-[100px]">
          <img
            src="/brand/gatequest-mark-blue.png"
            alt="GATEquest"
            className="w-[320px] h-[320px]"
          />
          <div className="flex flex-col items-center gap-[12px] mt-[40px]">
            <h1 className="text-white text-4xl font-bold tracking-tight whitespace-nowrap">Welcome to GATEquest</h1>
            <p className="text-gq-text-muted text-base text-center">
              Sign in to track your quests, streaks, and progress.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={loginWithGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-black font-semibold h-11 hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-[29px]">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-gq-text-muted text-xs">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {mode === "signin" ? (
          <div className="flex flex-col items-center gap-[31px]">
            <button
              onClick={handlePasskeySignIn}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gq-border bg-gq-bg-card text-white font-semibold h-11 hover:bg-white/5 hover:border-white/20 transition-colors disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 1 1 6 0v3H9Zm3 3a2 2 0 0 1 1 3.73V18a1 1 0 1 1-2 0v-2.27A2 2 0 0 1 12 12Z" fill="currentColor" />
              </svg>
              {busy ? "Waiting for passkey…" : "Sign in with a passkey"}
            </button>
            <button
              onClick={() => setMode("register")}
              className="text-gq-text-secondary text-sm hover:text-white transition-colors"
            >
              New here? Create a passkey instead
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gq-border bg-gq-bg-card text-white h-12 px-4 outline-none focus:border-gq-blue"
            />
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gq-border bg-gq-bg-card text-white h-12 px-4 outline-none focus:border-gq-blue"
            />
            <button
              onClick={handlePasskeyRegister}
              disabled={busy}
              className="w-full rounded-xl bg-gq-blue text-black font-semibold h-12 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? "Creating passkey…" : "Create account with a passkey"}
            </button>
            <button
              onClick={() => setMode("signin")}
              className="text-gq-text-secondary text-sm hover:text-white transition-colors"
            >
              Already have a passkey? Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
