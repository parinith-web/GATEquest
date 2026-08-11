import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentUser, logout as apiLogout, AuthUser } from "./auth";
import { setAccountBranch } from "./gate-api";

// Phase 4, subphase 4a: this is the fetch that matters most for React
// Query adoption, since /api/auth/me used to re-fire from scratch on
// every single page (it lived in a plain useEffect below). Now it's a
// query like any other: cached across navigations for `staleTime`, so
// clicking between pages doesn't re-pay the round trip (or the cold-start
// tax on top of it) just to re-confirm "yep, still logged in as the same
// person" every time.
const ME_QUERY_KEY = ["me"] as const;

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
  const queryClient = useQueryClient();
  // Read once at mount — this only needs to describe "last time", so it
  // doesn't need to be reactive beyond that.
  const [hadSessionHint] = useState(readSessionHint);

  // fetchCurrentUser() already catches its own errors and resolves to
  // `null` for "no valid session" (see auth.ts), so this query never
  // enters an error state — a signed-out visitor is a normal, successful
  // answer, not a failure to retry into extra round trips.
  const { data: user = null, isLoading: loading } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 60 * 1000,
    retry: false,
  });

  // Keep gate-api's synchronous branch cache (see lib/gate-api.ts) and the
  // session hint in sync with whatever the query currently says, however
  // it got there — initial load, refresh(), or a background revalidation
  // on tab refocus.
  useEffect(() => {
    if (loading) return;
    setAccountBranch(user?.branch);
    writeSessionHint(!!user);
  }, [user, loading]);

  // Callers (Login, Onboarding*, Profile) await this after actions that
  // change the account, then rely on the fresh `user` being visible —
  // invalidateQueries() refetches the active "me" query and its returned
  // promise resolves once that refetch settles, so the await keeps the
  // same guarantee the old manual refresh() gave.
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.setQueryData(ME_QUERY_KEY, null);
    setAccountBranch(null);
    writeSessionHint(false);
  }, [queryClient]);

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
