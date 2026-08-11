import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { fetchCurrentUser, logout as apiLogout, AuthUser } from "./auth";
import { setAccountBranch } from "./gate-api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  // Subphase 1c: a cheap, non-authoritative hint ("was this browser
  // signed in last time we checked?") used purely to choose a nicer
  // loading state while the real /api/auth/me check is still in flight —
  // see HomeRoute in App.tsx. It never grants access on its own; once
  // `loading` is false, `user` is the only thing that matters.
  hadSessionHint: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// localStorage, not a cookie: this is purely a client-side UX hint, never
// sent to or trusted by the server. Wrapped in try/catch since
// localStorage can throw in some private-browsing modes — worst case we
// just fall back to treating the visitor as anonymous for this one
// rendering decision, which is the safe default anyway.
const SESSION_HINT_KEY = "gq_had_session";

function readSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSessionHint(had: boolean) {
  try {
    if (had) {
      localStorage.setItem(SESSION_HINT_KEY, "1");
    } else {
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {
    // Purely a UX hint — nothing depends on this succeeding.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Read once at mount — this only needs to describe "last time", so it
  // doesn't need to be reactive beyond that.
  const [hadSessionHint] = useState(readSessionHint);

  const refresh = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(u);
    // Keep gate-api's synchronous branch cache in sync with the account
    // itself — see lib/gate-api.ts for why this indirection exists.
    setAccountBranch(u?.branch);
    writeSessionHint(!!u);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAccountBranch(null);
    writeSessionHint(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, hadSessionHint, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
