package config

import (
	"fmt"
	"os"
	"strings"
)

// Config holds every value the server needs that differs between
// local dev, staging, and production. All of it comes from environment
// variables so nothing sensitive is hardcoded in source.
type Config struct {
	Port string

	// DatabaseURL is the Postgres connection string (e.g. from Neon's
	// dashboard: postgres://user:pass@host/db?sslmode=require).
	DatabaseURL string

	// FrontendURL is where the React app is served from. Used for
	// CORS and for redirecting back after Google OAuth completes.
	FrontendURL string

	// SessionSecret signs/encrypts nothing by itself here (we use opaque
	// random session IDs rather than JWTs) but is kept for future use
	// (e.g. if you switch to signed/stateless tokens) and as a sanity
	// check that secrets have been configured at all.
	SessionSecret string

	// CookieDomain / CookieSecure control how the session cookie is issued.
	// Leave CookieDomain empty for localhost development.
	CookieDomain string
	CookieSecure bool

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// WebAuthn / Passkeys
	RPID          string   // e.g. "localhost" in dev, "gatequest.com" in prod
	RPDisplayName string   // e.g. "GATEquest"
	RPOrigins     []string // e.g. ["http://localhost:8080"]

	// RedisURL is the connection string for the Redis instance backing
	// live quest leaderboards (e.g. Upstash's "Redis Connect" URL, or
	// redis://localhost:6379 for local dev). Not required for the rest
	// of the app to function — only quest endpoints need it.
	RedisURL string

	// Cloudinary (session 5): backs real image/video upload for Pulse
	// posts, replacing the old base64-data-URI-in-Postgres approach.
	// Parsed from CLOUDINARY_URL (the single connection-string env var
	// Cloudinary's own dashboard gives you — "Account Details" > "API
	// Environment variable"), so setup is a single copy-paste. Optional:
	// if unset, /api/pulse/upload returns a clear 503 instead of the
	// server failing to start, since the rest of Pulse works fine
	// without it (posts can still be text-only).
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

func mustEnv(warnings *[]string, key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		if fallback == "" {
			*warnings = append(*warnings, key)
		}
		return fallback
	}
	return v
}

// Load reads configuration from environment variables (loaded from a
// .env file by the caller, or set directly in the shell/host).
// It returns the config plus a list of required keys that were missing,
// so the caller can decide whether to fail fast.
func Load() (*Config, []string) {
	var missing []string

	cfg := &Config{
		Port:          mustEnv(&missing, "PORT", "8081"),
		DatabaseURL:   mustEnv(&missing, "DATABASE_URL", ""),
		FrontendURL:   mustEnv(&missing, "FRONTEND_URL", "http://localhost:8080"),
		SessionSecret: mustEnv(&missing, "SESSION_SECRET", ""),
		CookieDomain:  os.Getenv("COOKIE_DOMAIN"),
		CookieSecure:  os.Getenv("COOKIE_SECURE") == "true",

		GoogleClientID:     mustEnv(&missing, "GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: mustEnv(&missing, "GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  mustEnv(&missing, "GOOGLE_REDIRECT_URL", "http://localhost:8081/api/auth/google/callback"),

		RPID:          mustEnv(&missing, "RP_ID", "localhost"),
		RPDisplayName: mustEnv(&missing, "RP_DISPLAY_NAME", "GATEquest"),
	}

	origins := os.Getenv("RP_ORIGINS")
	if origins == "" {
		cfg.RPOrigins = []string{"http://localhost:8080"}
	} else {
		cfg.RPOrigins = strings.Split(origins, ",")
	}

	// Optional: quest endpoints degrade to "unavailable" rather than the
	// whole server failing to start if this is unset, since it's only
	// needed once weekly contests are in use.
	cfg.RedisURL = mustEnv(&missing, "REDIS_URL", "redis://localhost:6379")

	// Optional, like Redis above: unset just means /api/pulse/upload
	// answers with a friendly "not configured" error instead of the
	// process refusing to start.
	cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret = parseCloudinaryURL(os.Getenv("CLOUDINARY_URL"))

	return cfg, missing
}

// parseCloudinaryURL reads Cloudinary's own connection-string format,
// cloudinary://<api_key>:<api_secret>@<cloud_name>, so setup is a single
// copy-paste from the Cloudinary dashboard rather than three separate
// env vars to keep in sync. Returns empty strings (not an error) if
// unset or malformed — the upload endpoint checks for that and answers
// with a clear message rather than the server crashing over an
// optional integration.
func parseCloudinaryURL(raw string) (cloudName, apiKey, apiSecret string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", ""
	}
	const prefix = "cloudinary://"
	if !strings.HasPrefix(raw, prefix) {
		return "", "", ""
	}
	rest := strings.TrimPrefix(raw, prefix)
	at := strings.LastIndex(rest, "@")
	if at < 0 {
		return "", "", ""
	}
	creds, cloud := rest[:at], rest[at+1:]
	colon := strings.Index(creds, ":")
	if colon < 0 {
		return "", "", ""
	}
	key, secret := creds[:colon], creds[colon+1:]
	if key == "" || secret == "" || cloud == "" {
		return "", "", ""
	}
	return cloud, key, secret
}

func (c *Config) String() string {
	return fmt.Sprintf(
		"port=%s frontend=%s rpid=%s origins=%v google_client_id_set=%v cloudinary_configured=%v",
		c.Port, c.FrontendURL, c.RPID, c.RPOrigins, c.GoogleClientID != "", c.CloudinaryCloudName != "",
	)
}
