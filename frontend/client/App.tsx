import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import OnboardingMore from "./pages/OnboardingMore";
import Quests from "./pages/Quests";
import QuestDetail from "./pages/QuestDetail";
import Problems from "./pages/Problems";
import Pulse from "./pages/Pulse";
import Question from "./pages/Question";
import Profile from "./pages/Profile";
import Placeholder from "./pages/Placeholder";
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

  const branch = localStorage.getItem("gatequest_branch");
  if (!branch) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/onboarding/more" element={<OnboardingMore />} />
    <Route path="/quests" element={<ProtectedRoute><Quests /></ProtectedRoute>} />
    <Route path="/quests/:id" element={<ProtectedRoute><QuestDetail /></ProtectedRoute>} />
    <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
    <Route path="/pulse" element={<ProtectedRoute><Pulse /></ProtectedRoute>} />
    <Route path="/question/:id" element={<ProtectedRoute><Question /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/roadmaps" element={<ProtectedRoute><Roadmaps /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
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
