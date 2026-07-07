import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
//
// Backend is a standalone Go server (see /backend), not part of this
// deployable. Locally, Vite proxies /api/* to it so cookies work as
// same-origin. In production (Vercel), the frontend and Go backend live
// on different domains, so client/lib/auth.ts calls the backend's
// absolute URL instead — set VITE_API_BASE_URL in Vercel's project env
// vars to something like https://api.yourdomain.com (no trailing slash,
// no /api suffix).
const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:8081";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: GO_BACKEND,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
    },
  },
});
