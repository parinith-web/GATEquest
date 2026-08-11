import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { RouteLoadingShell } from "@/components/RouteLoadingShell";

// Where GoogleCallback (backend/internal/auth/google.go) sends the
// browser after a successful sign-in, instead of straight to "/".
//
// HomeRoute treats "loading, no confirmed user yet" as "show the public
// Landing page" — the right call for a plain visit to "/", where most of
// the time that's an anonymous visitor who shouldn't wait on the backend
// at all (see App.tsx Subphase 1a). But landing here specifically means a
// full-page redirect just came back from a *successful* Google sign-in:
// there is no "anonymous visitor" case to optimize for, so racing
// /api/auth/me against a render is pure downside — it's the split-second
// Landing-then-dashboard flash reported after Google login.
//
// Passkey sign-in (Login.tsx) already avoids this same flash by awaiting
// refresh() before it navigates, since it drives the whole flow from JS.
// A full-page OAuth redirect can't do that (there's no JS state to await
// across it), so this route does the equivalent: wait here, with a
// dashboard-shaped skeleton instead of Landing, until the auth check
// resolves, then hand off to "/" with the answer already cached — at
// which point HomeRoute reads loading:false + a real user and renders
// the dashboard immediately, no flash.
export default function AuthCallback() {
  const { loading } = useAuth();

  if (loading) {
    return <RouteLoadingShell />;
  }

  // By now the "me" query has resolved and is sitting in the shared
  // React Query cache — HomeRoute (and ProtectedRoute, if onboarding
  // isn't finished) will read it synchronously, no refetch, no flash.
  return <Navigate to="/" replace />;
}
