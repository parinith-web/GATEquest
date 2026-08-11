import "./global.css";

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
// Login and Landing stay eager imports: they're what an unauthenticated
// first-time visitor needs immediately (Phase 1 made sure Landing paints
// without waiting on the backend at all — no point undoing that by
// making its own code lazy). Everything else below is only needed once
// someone is signed in or navigates deeper, so it's split into its own
// chunk and fetched on demand instead of bloating the initial bundle
// every visitor has to download before seeing anything.
import Login from "./pages/Login";
import Landing from "./pages/Landing";

const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Index = lazy(() => import("./pages/Index"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const OnboardingMore = lazy(() => import("./pages/OnboardingMore"));
const OnboardingUsername = lazy(() => import("./pages/OnboardingUsername"));
const Quests = lazy(() => import("./pages/Quests"));
const QuestDetail = lazy(() => import("./pages/QuestDetail"));
const Problems = lazy(() => import("./pages/Problems"));
const Pulse = lazy(() => import("./pages/Pulse"));
const Question = lazy(() => import("./pages/Question"));
const Profile = lazy(() => import("./pages/Profile"));
const Support = lazy(() => import("./pages/Support"));
const Roadmaps = lazy(() => import("./pages/Roadmaps"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Subphase 1b: a bare "Loading…" screen on protected routes looks
// indistinguishable from the app being broken, especially during a
// Render/Neon cold start where this can sit on screen for tens of
// seconds. This renders a lightweight app-shell skeleton instead — a
// header bar plus a few content blocks in the same layout shape as the
// real pages — so a slow auth check reads as "still loading" rather than
// "did something break". It intentionally does not fetch anything or
// depend on which page it's standing in for; it's a generic shape, not
// a per-page skeleton.
const RouteLoadingShell = () => (
  <div className="min-h-screen bg-gq-bg-main">
    <div className="h-16 border-b border-gq-border flex items-center px-6 gap-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <div className="flex-1" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoadingShell />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Onboarding state lives on the account itself (branch + username),
  // not the browser — so it's enforced the same way no matter which
  // device or browser the user signs in from.
  if (!user.branch) {
    return <Navigate to="/onboarding" replace />;
  }
  if (!user.username) {
    return <Navigate to="/onboarding/username" replace />;
  }
  return <>{children}</>;
};

// "/" is shared by the public landing page and the signed-in dashboard:
// signed-out visitors see the marketing Landing page, signed-in users see
// the Index dashboard — same URL either way, so links/bookmarks to "/"
// always resolve to the right thing for whoever opens them.
//
// Subphase 1a: this used to block on `loading` (i.e. on the /api/auth/me
// round trip) before rendering anything at all, so every visitor —
// including anonymous ones who don't need that call answered to see the
// marketing page — sat on a blank "Loading…" screen for however long a
// possibly cold-started backend/DB took to respond. Now we render
// Landing immediately whenever we don't yet have a confirmed signed-in
// user (loading or not), and only switch to the dashboard/onboarding
// redirect once the auth check actually resolves with a user.
//
// Subphase 1c: the one case that trade-off makes worse is a *returning,
// already-signed-in* visitor — they'd see a flash of the marketing
// Landing page before it swaps to their dashboard once /api/auth/me
// resolves, which reads as more broken than a plain loading state would.
// `hadSessionHint` (a non-authoritative localStorage flag — never trusted
// for access control, see auth-context.tsx) lets us pick the dashboard-
// shaped RouteLoadingShell instead of Landing for just that case, while
// true anonymous visitors (the common case) still get Landing instantly
// with zero backend wait.
const HomeRoute = () => {
  const { user, loading, hadSessionHint } = useAuth();

  if (loading) {
    return hadSessionHint ? <RouteLoadingShell /> : <Landing />;
  }
  if (!user) {
    return <Landing />;
  }
  if (!user.branch) {
    return <Navigate to="/onboarding" replace />;
  }
  if (!user.username) {
    return <Navigate to="/onboarding/username" replace />;
  }
  return <Index />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<HomeRoute />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/onboarding/more" element={<OnboardingMore />} />
    <Route path="/onboarding/username" element={<OnboardingUsername />} />
    <Route path="/quests" element={<ProtectedRoute><Quests /></ProtectedRoute>} />
    <Route path="/quests/:id" element={<ProtectedRoute><QuestDetail /></ProtectedRoute>} />
    <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
    <Route path="/pulse" element={<ProtectedRoute><Pulse /></ProtectedRoute>} />
    <Route path="/question/:id" element={<ProtectedRoute><Question /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/roadmaps" element={<ProtectedRoute><Roadmaps /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/* Fallback while a lazy page chunk is being fetched — reuses
              the same skeleton shape from Phase 1 rather than a bare
              spinner, since a cold Render instance can make even a small
              JS chunk fetch feel slow the first time. */}
          <Suspense fallback={<RouteLoadingShell />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
