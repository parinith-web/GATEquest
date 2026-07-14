# GATEquest
`Go` `React` `TypeScript` `Postgres`

A full-stack GATE exam preparation platform that helps students prepare for the GATE exam through structured roadmaps, quests with live leaderboards, a large question bank, and Pulse — a real-time community feed with a live post-contest debrief chat.




<img width="1918" height="1096" alt="image" src="https://github.com/user-attachments/assets/a24b6165-49c9-4fed-964e-d1d15df366c3" />




## Features

### Learning
- **Roadmaps** — Subject-wise learning paths broken into topics and quests
- **Question Bank** — MCQ, MSQ, and NAT questions filterable by subject, topic, and difficulty
- **Theory Snippets** — Quick concept notes attached to individual questions
- **Activity Heatmap** — GitHub-style contribution graph tracking daily solves and streaks
- **Progress Tracking** — Per-branch solve counts, XP, and rank

### Quests & Contests
- **Timed Contests** — Server-scheduled quests that open, run, and auto-close on a clock
- **Live Leaderboards** — Redis-backed real-time rankings while a quest is live
- **Rating History** — Track how your rank has moved across past quests
- **Auto-Settlement** — Results and ratings compute automatically when a contest closes

### Pulse (Community)
- **Feed Posts** — Share experiences, resources, and doubts with the community
- **Hashtag Channels** — Tag posts with `#hashtags` to file them under a topic
- **Reactions & Comments** — Upvote/downvote, reply threads, and save posts for later
- **Media Attachments** — Attach images or videos to a post via Cloudinary
- **Trending Tags** — See what topics are most active right now
- **Live Mock Debrief** — A single always-on chat room that opens after each contest closes, streamed over SSE

### Account & Profile
- **Passkey Login** — Usernameless WebAuthn sign-in (Face ID / Touch ID / security key)
- **Google Sign-In** — Standard OAuth 2.0 + PKCE as an alternative to passkeys
- **Branch Selection** — Choose your GATE branch (CSE, Data Science & AI, and more) during onboarding
- **Avatar & Username** — Customize your public profile

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI library |
| TypeScript | Type safety |
| Vite | Dev server & build tool |
| React Router | Client-side routing |
| Tailwind CSS | Styling |
| Framer Motion | Scroll & page animations |
| Radix UI | Accessible component primitives |
| TanStack Query | Server-state data fetching |
| Recharts | Charts (rating history, progress) |
| Three.js / React Three Fiber | 3D roadmap visuals |

### Backend
| Technology | Purpose |
|---|---|
| Go + Chi | HTTP server & routing |
| Postgres (Neon) | Primary database, via `pgx/v5` |
| Redis | Live quest leaderboards |
| go-webauthn | Passkey (WebAuthn) authentication |
| Cloudinary | Pulse image/video uploads |
| Server-Sent Events | Live debrief chat streaming |

## Getting Started

### Prerequisites
- Node.js 18+
- Go 1.23+
- A [Neon](https://neon.tech) Postgres database
- A Redis instance (optional — only needed for live quest leaderboards; [Upstash](https://upstash.com) free tier works well)
- A [Cloudinary](https://cloudinary.com) account (optional — only needed for Pulse media uploads)
- A Google Cloud OAuth client (optional — only needed for Google sign-in)

### Installation

```bash
# Clone the repository
git clone https://github.com/parinith-web/GATEquest.git
cd GATEquest

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
go mod download
```

### Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env`:

```bash
PORT=8081
DATABASE_URL=                          # Neon connection string
FRONTEND_URL=http://localhost:8080
SESSION_SECRET=                        # openssl rand -base64 32

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8081/api/auth/google/callback

# WebAuthn / Passkeys
RP_ID=localhost
RP_DISPLAY_NAME=GATEquest
RP_ORIGINS=http://localhost:8080

# Cookies
COOKIE_DOMAIN=
COOKIE_SECURE=false

# Redis (optional — live quest leaderboards)
REDIS_URL=redis://localhost:6379

# Cloudinary (optional — Pulse media uploads)
CLOUDINARY_URL=
```

**Frontend** — the dev server proxies `/api` to your local backend by default; no `.env` needed for local development.

### Run Development Servers

```bash
# Terminal 1 — backend (from backend/)
go run .

# Terminal 2 — frontend (from frontend/)
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) to view the app.

## Project Structure

```
GATEquest/
├── backend/                  # Go API server
│   ├── internal/
│   │   ├── api/              # HTTP handlers (questions, quests, pulse, profile)
│   │   ├── auth/              # Google OAuth + WebAuthn passkey handlers
│   │   ├── config/            # Environment config loading
│   │   ├── debrief/            # Live debrief chat room + hub
│   │   ├── media/              # Cloudinary upload client
│   │   ├── quest/               # Quest scheduler + Redis leaderboards
│   │   └── store/                # Postgres data access layer
│   ├── migrations/               # SQL schema migrations
│   ├── scripts/                    # One-off data import scripts
│   └── main.go                      # Server entrypoint & route wiring
├── frontend/                  # React app
│   ├── client/
│   │   ├── components/          # UI components
│   │   │   ├── landing/          # Marketing/landing page sections
│   │   │   ├── pulse/            # Debrief panel, post cards
│   │   │   └── ui/               # Reusable primitives (shadcn/radix)
│   │   ├── pages/                # Route-level pages
│   │   ├── lib/                  # API clients, auth context, utilities
│   │   └── hooks/                # Shared React hooks
│   └── public/                    # Static assets, brand marks
└── README.md
```

## Architecture

### Auth Flow
```
User → Google OAuth or Passkey (WebAuthn) → Session cookie → Protected API routes
```

### Quest Lifecycle
```
Scheduled → (scheduler polls every 15s) → Live
                                             ↓
                                    Submissions + live Redis leaderboard
                                             ↓
                                    Closes automatically → Settlement + rating update
```

### Pulse Real-time
```
Post created → Postgres                Debrief message → in-memory hub → SSE stream
                  ↓                                                          ↓
        Feed, comments, reactions                              All connected clients
        (fetched via polling/refetch)                          (instant delivery)
```

## Available Scripts

**Frontend** (from `frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview a production build locally |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format.fix` | Format code with Prettier |

**Backend** (from `backend/`)

| Command | Description |
|---|---|
| `go run .` | Start the API server |
| `go build && ./gatequest-auth` | Build and run the production binary |
| `go test ./...` | Run tests |
