import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
//
// The backend is now the Go server in /server-go (Google OAuth + passkey
// auth). It runs standalone on GO_BACKEND_PORT (default 8081); Vite just
// proxies /api/* requests to it so the browser sees everything as same-origin
// (this matters for cookies — the session and WebAuthn ceremony cookies are
// SameSite=Lax and would not be sent cross-origin without this).
//
// The previous embedded Express dev-server plugin has been removed since
// the Go server replaces it. `server/` (Node/Express) and its /api/ping,
// /api/demo routes are no longer wired up — safe to delete once you've
// migrated any routes you still need into the Go server.
const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:8081";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "index.html"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
    proxy: {
      "/api": {
        target: GO_BACKEND,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));
