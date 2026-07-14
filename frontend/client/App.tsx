import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import OnboardingMore from "./pages/OnboardingMore";
import OnboardingUsername from "./pages/OnboardingUsername";
import Quests from "./pages/Quests";
import QuestDetail from "./pages/QuestDetail";
import Problems from "./pages/Problems";
import Pulse from "./pages/Pulse";
import Question from "./pages/Question";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import Roadmaps from "./pages/Roadmaps";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gq-bg-main text-gq-text-muted">
        Loading…
      </div>
    );
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
const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gq-bg-main text-gq-text-muted">
        Loading…
      </div>
    );
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
