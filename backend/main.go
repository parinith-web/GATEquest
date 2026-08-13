package main

import (
	"bufio"
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"gatequest-auth/internal/api"
	"gatequest-auth/internal/auth"
	"gatequest-auth/internal/config"
	"gatequest-auth/internal/debrief"
	"gatequest-auth/internal/media"
	"gatequest-auth/internal/quest"
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

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is not set — see .env.example for the Neon connection string to use")
	}

	connectCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	st, err := store.New(connectCtx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer st.Close()
	log.Print("connected to database")

	questRedis, err := quest.NewRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("failed to parse REDIS_URL: %v", err)
	}
	pingCtx, cancelPing := context.WithTimeout(context.Background(), 5*time.Second)
	if err := questRedis.Ping(pingCtx); err != nil {
		// Non-fatal: the rest of the app (auth, question bank, profile)
		// doesn't depend on Redis. Only quest endpoints will fail until
		// this is reachable — logged loudly so that's not a surprise.
		log.Printf("WARNING: could not reach Redis at startup (%v) — live quest leaderboards will not work until this is fixed", err)
	} else {
		log.Print("connected to redis")
	}
	cancelPing()
	defer questRedis.Close()

	mgr := auth.NewManager(st, cfg)
	questSvc := quest.NewService(st, questRedis)
	mediaClient := media.New(cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret)
	if !mediaClient.Configured() {
		log.Print("WARNING: CLOUDINARY_URL not set — Pulse media upload will return 503 until it is")
	}
	// Pulse Debrief: the per-branch post-contest chat room (session 4).
	// debriefSvc owns the window/branch/rate-limit rules; hub is the
	// in-memory SSE fan-out (session 4a) that PostDebriefMessage
	// broadcasts into and the stream handler (session 4c) subscribes
	// from. Routes mounted below under the RequireAuth group
	// (session 4d).
	debriefSvc := debrief.NewService(st)
	debriefHub := debrief.NewHub()
	apiHandlers := api.New(st, questSvc, mediaClient, debriefSvc, debriefHub)

	waHandlers, err := auth.NewWebAuthnHandlers(mgr)
	if err != nil {
		log.Fatalf("failed to initialize webauthn: %v", err)
	}

	// Automatic contest clock: opens scheduled quests and closes/settles
	// live ones once their time is up, without any admin action needed
	// (see internal/quest.Scheduler). Runs for the lifetime of the
	// process; canceling schedulerCancel (e.g. on a future graceful
	// shutdown path) would stop it.
	schedulerCtx, schedulerCancel := context.WithCancel(context.Background())
	defer schedulerCancel()
	go quest.NewScheduler(questSvc).Start(schedulerCtx)

	// Pulse Debrief cleanup (session 5): periodically purges messages
	// from rooms whose 12h window has fully lapsed. Independent ticker
	// from the quest scheduler above (see debrief.Cleaner's doc comment
	// for why), but shares the same cancellation context/lifetime.
	go debrief.NewCleaner(st).Start(schedulerCtx)

	// Auth cleanup (plan.md Phase 5): periodically purges expired
	// sessions and abandoned WebAuthn ceremonies. Same independent-ticker
	// reasoning as debrief.Cleaner — its own small loop rather than a
	// case bolted onto either of the two above — sharing the same
	// cancellation context/lifetime.
	go auth.NewCleaner(st).Start(schedulerCtx)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	// Gzip/deflate-compress responses (level 5 — good ratio/CPU tradeoff
	// for JSON payloads without burning much time on a free-tier CPU).
	// Chi's Compress middleware negotiates based on Accept-Encoding and
	// is a no-op for already-compressed or tiny responses, so it's safe
	// to apply globally rather than per-route.
	r.Use(middleware.Compress(5))
	r.Use(corsMiddleware(cfg.FrontendURL))

	// Health check for external uptime pingers (UptimeRobot, cron-job.org,
	// a scheduled GitHub Action, etc). Deliberately unauthenticated and
	// outside any route group. Pings the DB too (not just the process)
	// so that on Render/Neon free tier, a scheduled hit every 5-10 min
	// keeps both the backend process and the database compute warm and
	// shrinks the cold-start window real users would otherwise hit.
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		if err := st.Ping(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("db unreachable"))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

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

		// Profile: avatar updates, onboarding (branch + username), and
		// the activity map / recent-history feed.
		r.Post("/api/profile/avatar", apiHandlers.UpdateAvatar)
		r.Post("/api/profile/branch", apiHandlers.SetBranch)
		r.Post("/api/profile/username", apiHandlers.SetUsername)
		r.Get("/api/profile/activity", apiHandlers.GetActivity)

		// Records a question submission for activity tracking (see
		// api.RecordAttempt doc comment — grading itself stays client-side).
		r.Post("/api/questions/{id}/attempt", apiHandlers.RecordAttempt)

		// Quests: weekly branch-scoped contests. Join/submit/leaderboard/
		// results are open to any authenticated participant (Service
		// itself enforces the branch match); creating a quest is further
		// gated to admins only.
		r.Get("/api/quests", apiHandlers.ListQuests)
		r.Get("/api/quests/rating-history", apiHandlers.RatingHistory)
		r.Get("/api/quests/{id}", apiHandlers.GetQuest)
		r.Post("/api/quests/{id}/join", apiHandlers.JoinQuest)
		r.Post("/api/quests/{id}/submit", apiHandlers.Submit)
		r.Get("/api/quests/{id}/leaderboard", apiHandlers.Leaderboard)
		r.Get("/api/quests/{id}/results", apiHandlers.QuestResults)

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAdmin)
			r.Post("/api/quests", apiHandlers.CreateQuest)
		})

		// Pulse: creating/deleting a post requires being logged in.
		// Reading the feed does not — see the public routes below.
		r.Post("/api/pulse/posts", apiHandlers.CreatePost)
		r.Delete("/api/pulse/posts/{id}", apiHandlers.DeletePost)

		// Pulse interactions (session 4): reacting, commenting, and
		// bookmarking all require being logged in. Reading a comment
		// thread and bumping the share counter don't — see the public
		// routes below.
		r.Post("/api/pulse/posts/{id}/vote", apiHandlers.VotePost)
		r.Post("/api/pulse/posts/{id}/comments", apiHandlers.CreateComment)
		r.Delete("/api/pulse/comments/{id}", apiHandlers.DeleteComment)
		r.Post("/api/pulse/posts/{id}/bookmark", apiHandlers.BookmarkPost)
		r.Delete("/api/pulse/posts/{id}/bookmark", apiHandlers.UnbookmarkPost)
		r.Get("/api/pulse/bookmarks", apiHandlers.ListBookmarks)
		r.Get("/api/pulse/my-posts", apiHandlers.ListMyPosts)

		// Pulse media upload (session 5): the compose box uploads a
		// file here first and gets back a URL to attach to the post,
		// rather than sending the raw bytes as part of CreatePost.
		r.Post("/api/pulse/upload", apiHandlers.UploadMedia)

		// Pulse Debrief (session 4): the temporary, branch-scoped chat
		// room that opens once a weekly quest closes. All under
		// RequireAuth like the rest of Pulse's write/personal routes —
		// there's no public variant of these, since "which room" is
		// derived from the caller's own branch (never a client-supplied
		// ID) and isn't something an anonymous request has. /active and
		// /active/messages are session 4b (plain CRUD-shaped); /stream
		// is session 4c (the SSE connection).
		r.Get("/api/pulse/debrief/active", apiHandlers.GetActiveDebriefRoom)
		r.Get("/api/pulse/debrief/active/messages", apiHandlers.ListDebriefMessages)
		r.Post("/api/pulse/debrief/active/messages", apiHandlers.PostDebriefMessage)
		r.Get("/api/pulse/debrief/active/stream", apiHandlers.StreamDebriefMessages)
	})

	// Question bank: public read-only endpoints, no auth required for
	// browsing. Wrap in the RequireAuth group above instead if you want
	// to gate the question bank behind login.
	r.Get("/api/subjects", apiHandlers.Subjects)
	r.Get("/api/topics", apiHandlers.Topics)
	r.Get("/api/questions", apiHandlers.ListQuestions)
	r.Get("/api/questions/{id}", apiHandlers.GetQuestion)

	// Pulse: public read endpoints (browsing the feed doesn't require
	// login, same as the question bank above).
	r.Get("/api/pulse/posts", apiHandlers.ListPosts)
	r.Get("/api/pulse/posts/{id}", apiHandlers.GetPost)
	r.Get("/api/pulse/channels", apiHandlers.ListChannels)
	r.Get("/api/pulse/trending", apiHandlers.TrendingTags)
	r.Get("/api/pulse/posts/{id}/comments", apiHandlers.ListComments)
	r.Post("/api/pulse/posts/{id}/share", apiHandlers.SharePost)

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
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
