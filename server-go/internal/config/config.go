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

	return cfg, missing
}

func (c *Config) String() string {
	return fmt.Sprintf(
		"port=%s frontend=%s rpid=%s origins=%v google_client_id_set=%v",
		c.Port, c.FrontendURL, c.RPID, c.RPOrigins, c.GoogleClientID != "",
	)
}
