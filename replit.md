# StreamHub - Live Streaming Community TV Station Manager

## Overview

Full-stack web application for managing a self-hosted 24/7 live streaming community TV station integrated with an external SRS (Simple Realtime Server) media server. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite + TailwindCSS + Framer Motion + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT with bcryptjs, role-based access (admin/operator/user)
- **Media**: HLS.js for video playback, SRS HTTP API integration

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (auth, channels, streams, billing, server monitoring)
│   ├── web/                # React + Vite frontend (StreamHub dashboard)
│   └── mockup-sandbox/     # Component preview server
├── lib/
│   ├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks + custom fetch with auth
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── docker/                 # Docker deployment files
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── .env.example
├── deployment/
│   └── README.md           # Deployment guide
├── scripts/
│   └── src/                # Utility scripts (seed.ts, etc.)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Features

- **Dashboard**: Platform overview with active streams, total viewers, channels, network stats
- **Channel Management**: CRUD channels, generate/regenerate RTMP stream keys, view RTMP/HLS URLs
- **Live Streams Monitoring**: Real-time stream status from SRS server (viewer count, bitrate, uptime)
- **Billing System**: Subscription plans, invoices, user subscriptions management
- **Server Monitor**: OS-level CPU, memory, and network metrics
- **Public Player**: Unauthenticated HLS video player page at `/player/:id`
- **Auth**: JWT-based with role-based access control (admin, operator, user)

## Default Credentials

- Admin: admin@streamhub.tv / admin123
- Operator: operator@streamhub.tv / operator123
- User: user@streamhub.tv / user123

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `JWT_SECRET` - JWT signing secret (required in production, dev-only fallback)
- `SRS_API_URL` - SRS HTTP API URL (default: http://localhost:1985)
- `SRS_PLAYBACK_URL` - SRS HLS/media playback URL (default: http://localhost:8080)

## API Routes (mounted at /api)

- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Register new user (always role "user")
- `GET /auth/me` - Get current user (requires auth)
- `GET /users` - List users (admin only)
- `GET/POST /channels` - List/create channels (auth required)
- `GET/PUT/DELETE /channels/:id` - Channel CRUD (auth required)
- `POST /channels/:id/regenerate-key` - Regenerate stream key (auth required)
- `GET /channels/public/:id` - Public channel info (no auth, excludes stream key)
- `GET /streams/active` - Active streams from SRS
- `GET /streams/stats` - Stream statistics from SRS
- `GET/POST /billing/plans` - Subscription plans CRUD
- `GET/POST /billing/invoices` - Invoice management
- `GET/POST /billing/subscriptions` - Subscription management
- `GET /server/stats` - OS-level server metrics

## Frontend Pages

- `/` - Login page (unauthenticated) / Dashboard (authenticated)
- `/channels` - Channel management
- `/streams` - Live stream monitoring
- `/billing/plans` - Subscription plans
- `/billing/invoices` - Invoice management
- `/billing/subscriptions` - Subscriptions
- `/server` - Server monitoring
- `/player/:id` - Public HLS player

## Database Schema

Tables: users, channels, subscription_plans, subscriptions, invoices, viewer_analytics

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Important Notes

- Orval `useDates: true` setting means generated Zod schemas expect Date objects — do NOT use Zod `parse()` for API responses in the backend
- Custom fetch in `lib/api-client-react/src/custom-fetch.ts` auto-injects Bearer token from localStorage
- SRS API endpoints: `/api/v1/streams/`, `/api/v1/clients/`, `/api/v1/summaries` — returns null gracefully if SRS unreachable
- Public channel endpoint excludes sensitive data (streamKey, rtmpUrl) for security
- Registration always assigns "user" role to prevent privilege escalation
- Google OAuth: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars; callback URL auto-derived from `REPLIT_DOMAINS` (dev) or `DOMAIN` (production via GOOGLE_CALLBACK_URL in docker-compose)
- password column is now nullable (Google-only accounts have no password)
- Testing account: test@streamhub.tv / test123

## Deployment (VPS)

- All Docker configs in `docker/` directory
- Run `docker/setup.sh` from the `docker/` directory — handles SSL, builds, seeds automatically
- See `deployment/README.md` for full step-by-step guide
- Google OAuth callback URL for production must be registered in Google Cloud Console: `https://DOMAIN/api/auth/google/callback`
