package main

import (
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"

	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/config"
	"gatequest-auth/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// loadDotEnv reads a simple KEY=VALUE .env file (if present) into the
// process environment, without overriding anything already set. This is
// deliberately minimal (no quoting/escaping rules beyond trimming) so we
// don't need an extra dependency just for local dev convenience. Real
// deployments should just set real environment variables instead.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // no .env file, that's fine — rely on real env vars
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
}

func main() {
	loadDotEnv(".env")

	cfg, missing := config.Load()
	if len(missing) > 0 {
		log.Printf("WARNING: missing required env vars, auth will not work correctly until these are set: %s", strings.Join(missing, ", "))
	}
	log.Printf("config: %s", cfg)

	st := store.New()
	mgr := auth.NewManager(st, cfg)

	waHandlers, err := auth.NewWebAuthnHandlers(mgr)
	if err != nil {
		log.Fatalf("failed to initialize webauthn: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware(cfg.FrontendURL))

	r.Route("/api/auth", func(r chi.Router) {
		// Google OAuth
		r.Get("/google/login", mgr.GoogleLogin)
		r.Get("/google/callback", mgr.GoogleCallback)

		// Passkeys
		r.Post("/passkey/register/begin", waHandlers.RegisterBegin)
		r.Post("/passkey/register/finish", waHandlers.RegisterFinish)
		r.Post("/passkey/login/begin", waHandlers.LoginBegin)
		r.Post("/passkey/login/finish", waHandlers.LoginFinish)

		// Session
		r.Get("/me", mgr.Me)
		r.Post("/logout", mgr.Logout)
	})

	// Example of a protected API route other parts of the app can follow:
	r.Group(func(r chi.Router) {
		r.Use(mgr.RequireAuth)
		r.Get("/api/protected/ping", func(w http.ResponseWriter, r *http.Request) {
			u := auth.UserFromContext(r.Context())
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message":"pong","email":"` + u.Email + `"}`))
		})
	})

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}

// corsMiddleware allows the frontend origin to send credentialed
// (cookie-bearing) requests. WebAuthn and the session cookie both
// require this to be locked to a specific origin — "*" will not work
// together with credentials.
func corsMiddleware(frontendOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", frontendOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
