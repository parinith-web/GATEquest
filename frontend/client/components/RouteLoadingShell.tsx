import { Skeleton } from "@/components/ui/skeleton";

// Subphase 1b: a bare "Loading…" screen on protected routes looks
// indistinguishable from the app being broken, especially during a
// Render/Neon cold start where this can sit on screen for tens of
// seconds. This renders a lightweight app-shell skeleton instead — a
// header bar plus a few content blocks in the same layout shape as the
// real pages — so a slow auth check reads as "still loading" rather than
// "did something break". It intentionally does not fetch anything or
// depend on which page it's standing in for; it's a generic shape, not
// a per-page skeleton.
//
// Its own file (rather than living inline in App.tsx, where it started)
// so AuthCallback.tsx can reuse the exact same shape without importing
// from the app's entry module.
export const RouteLoadingShell = () => (
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
