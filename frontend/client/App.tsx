import "./global.css";

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { RouteLoadingShell } from "@/components/RouteLoadingShell";
// Login and Landing stay eager imports: they're what an unauthenticated
// first-time visitor needs immediately (Phase 1 made sure Landing paints
// without waiting on the backend at all — no point undoing that by
// making its own code lazy). AuthCallback is eager for the same reason
// from the other direction: it's the very next thing rendered after a
// Google OAuth redirect lands back on the app, so there's no lazy-chunk
// fetch to hide behind a Suspense fallback for it either. Everything
// else below is only needed once someone is signed in or navigates
// deeper, so it's split into its own chunk and fetched on demand instead
// of bloating the initial bundle every visitor has to download before
// seeing anything.
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";

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

// "/" is always the marketing Landing page now, whether or not anyone's
// signed in. Signed-out visitors see the normal Log in / Sign up CTAs;
// signed-in visitors see the same page with their avatar + an "Enter"
// button instead (see Navbar/GateHero), which is what actually takes
// them to the dashboard at "/dashboard". This keeps "/" bookmarkable and
// shareable for everyone instead of silently turning into a private
// dashboard depending on who opens it.
//
// The one thing that still needs resolving here is onboarding: someone
// mid-onboarding (no branch/username yet) shouldn't land back on the
// marketing page after signing in, so that redirect stays.
//
// Subphase 1a note (still applies): render Landing immediately whenever
// we don't yet have a confirmed signed-in user (loading or not) rather
// than blocking on the /api/auth/me round trip, so anonymous visitors
// never sit on a blank "Loading…" screen.
const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Landing />;
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
  return <Landing />;
};

// The actual dashboard, split out from "/" so it has its own bookmarkable
// URL that only ever resolves for a signed-in, fully-onboarded user.
const DashboardRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoadingShell />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
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
    <Route path="/login/callback" element={<AuthCallback />} />
    <Route path="/" element={<HomeRoute />} />
    <Route path="/dashboard" element={<DashboardRoute />} />
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
