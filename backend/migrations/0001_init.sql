-- GATEquest auth schema for Postgres / Neon.
-- Run this once against your Neon database before starting the server:
--   psql "$DATABASE_URL" -f migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY,
    email        TEXT UNIQUE,
    name         TEXT NOT NULL DEFAULT '',
    avatar_url   TEXT NOT NULL DEFAULT '',
    google_sub   TEXT UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WebAuthn credentials, one row per registered passkey. Stored as JSONB
-- so the exact shape of go-webauthn's Credential struct (which can gain
-- fields across library versions) round-trips without a migration.
CREATE TABLE IF NOT EXISTS credentials (
    credential_id BYTEA PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data          JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Short-lived WebAuthn ceremony state (the SessionData between a
-- /begin and /finish call). Expired rows are cleaned up lazily on read
-- and can also be swept periodically with a cron job if desired:
--   DELETE FROM webauthn_ceremonies WHERE expires_at < now();
CREATE TABLE IF NOT EXISTS webauthn_ceremonies (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
