# Ollo Dev

API-first communication and helpdesk platform for internal team collaboration and external customer support.

## Overview

Ollo Dev combines real-time chat, threaded discussions, a wiki/knowledge base, a full-featured helpdesk ticketing system, and project management — all under a clean, Apple-inspired design with i18n and dark/light theming. It's built as an API-first monorepo with a typed REST API, multi-tenant architecture, and real-time capabilities.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 |
| UI | shadcn/ui + @base-ui/react + Tailwind CSS v4 |
| State | Zustand |
| i18n | next-intl |
| Theming | next-themes + CSS custom properties |
| API | Hono + @hono/zod-openapi (OpenAPI 3.0, Swagger UI) |
| Database | Supabase (PostgreSQL 15+) with RLS + Realtime |
| Auth | Supabase Auth (JWT) |
| Validation | Zod (shared frontend + backend) |
| Email | React Email + Resend |
| Monorepo | Turborepo 2 + pnpm 10 workspaces |
| Deploy | Railway (Docker) + GitHub Actions |

## Monorepo Structure

```
ollo-dev/
├── apps/
│   ├── web/              # Next.js frontend (dashboard + customer portal)
│   └── api/              # Hono REST API with OpenAPI/Swagger
├── packages/
│   ├── shared/           # Shared types, Zod validators, constants, i18n keys
│   └── db/               # DB migrations, generated Supabase types, seed data
├── supabase/             # Local Supabase config + migrations
├── turbo.json            # Build orchestration
└── pnpm-workspace.yaml   # Workspace definition
```

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- **Docker Desktop** (for local Supabase containers)
- **Supabase CLI** (`brew install supabase/tap/supabase` or `npx supabase`)

## Getting Started

```bash
# 1. Clone the repo
git clone <repo-url>
cd ollo-dev

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Fill in your Supabase keys (see .env.example for all variables)

# 4. Start local Supabase (PostgreSQL, Auth, Realtime, Studio)
pnpm db:start

# 5. Generate TypeScript types from the local database
pnpm db:types

# 6. Start all dev servers
pnpm dev
```

After startup:
- **Web app** — http://localhost:3000
- **API server** — http://localhost:8000
- **Swagger UI** — http://localhost:8000/api/v1/docs

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode (Turborepo) |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | TypeScript type checking across all workspaces |
| `pnpm clean` | Remove build artifacts |
| `pnpm db:start` | Start local Supabase containers |
| `pnpm db:stop` | Stop local Supabase containers |
| `pnpm db:reset` | Reset local database (re-runs all migrations) |
| `pnpm db:migrate <name>` | Create a new migration file |
| `pnpm db:push` | Push migrations to remote Supabase |
| `pnpm db:types` | Regenerate TypeScript types from local DB |

## Local Dev Ports

| Service | Port | URL |
|---|---|---|
| Next.js (web) | 3000 | http://localhost:3000 |
| Hono API | 8000 | http://localhost:8000 |
| Swagger UI | 8000 | http://localhost:8000/api/v1/docs |
| Supabase API | 54431 | http://localhost:54431 |
| Supabase DB | 54432 | `postgresql://postgres:postgres@localhost:54432/postgres` |
| Supabase Studio | 54433 | http://localhost:54433 |
| Mailpit (email) | 54434 | http://localhost:54434 |
| Analytics | 54437 | http://localhost:54437 |

## Deployment

- **Web + API** deploy as separate Railway services, each with a multi-stage Dockerfile (Node 20 Alpine)
- **Database migrations** are deployed automatically via GitHub Actions on push to `main` (see `.github/workflows/supabase-deploy.yml`)
- Environment variables are injected at runtime by Railway

## Documentation

- **[SPEC.md](SPEC.md)** — Technical specification (architecture, DB schema, API routes, auth model)
- **[ollo-dev-architecture.md](ollo-dev-architecture.md)** — Deep architecture reference (full DDL, design tokens, patterns)
- **[PROGRESS.md](PROGRESS.md)** — Development phase checklist and status
- **Swagger UI** — Interactive API docs at `/api/v1/docs` (run dev server first)

## Contributing

1. Create a feature branch from `main`
2. Follow existing code patterns and conventions (see [SPEC.md](SPEC.md#key-patterns--conventions))
3. Run `pnpm build && pnpm typecheck` before opening a PR
4. Keep PRs focused — one feature or fix per PR
