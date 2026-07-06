# GATEquest auth server (Go)

Google OAuth 2.0 (Authorization Code + PKCE) and WebAuthn passkey
authentication for the GATEquest frontend, replacing the old Node/Express
dev server for auth purposes.

## What's implemented

- **Google sign-in** — full Authorization Code + PKCE flow, hand-rolled
  against Google's OAuth endpoints with the standard library (no SDK
  dependency). `GET /api/auth/google/login` → Google consent → `GET
  /api/auth/google/callback` → session cookie set → redirect back to the app.
- **Passkeys** — via [go-webauthn/webauthn](https://github.com/go-webauthn/webauthn).
  Registration creates a new user + credential; login is **usernameless**
  (discoverable credentials) — the user just taps their platform
  authenticator, no username typed.
- **Sessions** — opaque random tokens in an httpOnly, SameSite=Lax cookie,
  stored server-side (not JWTs), so logout instantly revokes them.
- Accounts are matched by email, so a user who registers a passkey and
  later signs in with Google using the same address gets the same account.

## What's intentionally left for you

- **Storage is in-memory** (`internal/store/store.go`). Every user,
  credential, and session disappears when the process restarts. This was
  the one deliberate shortcut — swap it for a real database (the project
  already has Postgres via Neon/Drizzle if you want to reuse that, or
  SQLite for something simpler) behind the same method set. Nothing else
  in the app needs to change if you keep the same interface.
- No rate limiting on the auth endpoints — add some before this is public.

## Values you need to fill in

Copy `.env.example` to `.env` and fill these in:

| Variable | Where to get it |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create Credentials → OAuth client ID → **Web application**. Add `http://localhost:8081/api/auth/google/callback` under Authorized redirect URIs (and your real domain's equivalent for production). |
| `SESSION_SECRET` | Any random string, e.g. `openssl rand -base64 32`. |
| `RP_ID` / `RP_ORIGINS` | Must match the domain/origin the frontend is actually served from. `localhost` / `http://localhost:8080` for local dev; your real domain in production — passkeys are bound to this and won't work if it's wrong. |

Everything else in `.env.example` already has a working local-dev default.

## Running it

**Backend:**
```bash
cd server-go
go mod tidy      # downloads dependencies (needs normal internet access)
cp .env.example .env   # then fill in the table above
go run .
```
It listens on `:8081` by default.

**Frontend:** unchanged, just `npm run dev` (or `pnpm dev`) as before. Vite
now proxies `/api/*` to the Go server (see `vite.config.ts`) instead of
running the old embedded Express server — so run both processes side by
side during development.

Visit `http://localhost:8080/login` to try either sign-in method.

## Endpoints

```
GET  /api/auth/google/login              redirect to Google
GET  /api/auth/google/callback           Google redirects here
POST /api/auth/passkey/register/begin    {email, name} -> WebAuthn creation options
POST /api/auth/passkey/register/finish   browser attestation -> creates account, logs in
POST /api/auth/passkey/login/begin       -> WebAuthn request options (usernameless)
POST /api/auth/passkey/login/finish      browser assertion -> logs in
GET  /api/auth/me                        current user, or 401
POST /api/auth/logout                    clears the session
```

`internal/auth/session.go`'s `RequireAuth` middleware is ready to protect
any other API routes you add later — see the `/api/protected/ping` example
in `main.go`.
