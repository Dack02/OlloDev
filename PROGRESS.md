# Ollo Dev — Development Progress

## Phase 1: Foundation (Complete)

### Built
- [x] Monorepo scaffolding (Turborepo + pnpm workspaces)
- [x] `packages/shared` — TypeScript types, Zod validators, constants
- [x] `packages/db` — SQL migration (19 tables, indexes, RLS policies, triggers)
- [x] `apps/api` — Hono API with OpenAPI/Swagger, auth/orgs/users routes
- [x] `apps/web` — Next.js 16 with i18n (next-intl), theming (next-themes), auth pages, dashboard shell
- [x] shadcn/ui — 11 core components (base-nova style with @base-ui/react)
- [x] Supabase local — Docker containers running as `supabase_*_OlloDev` on 544xx ports
- [x] Railway config — `railway.toml` for both web and api services
- [x] Design tokens — Apple-inspired light/dark CSS custom properties
- [x] Database types — Auto-generated from live Supabase instance

### Tested
- [x] `pnpm build` — All 4 workspace tasks pass
- [x] Supabase start — Migration applied, 12 containers healthy
- [x] TypeScript types generated from database
- [x] API dev server starts on :8000, health check returns ok
- [x] OpenAPI spec serves all 17 endpoints (Auth, Orgs, Users)
- [x] Auth signup creates user in Supabase and returns JWT
- [x] Next.js dev server starts on :3000
- [x] i18n routing works (/ -> 307 redirect to /en)
- [x] /en/login returns 200
- [x] /en/chat returns 200 (dashboard shell)

### Ports (local dev)
| Service | Port |
|---|---|
| Next.js (web) | 3000 |
| Hono API | 8000 |
| Supabase API | 54431 |
| Supabase DB | 54432 |
| Supabase Studio | 54433 |
| Mailpit | 54434 |
| Analytics | 54437 |

---

## Phase 2: Chat & Realtime (In Progress)

### Planned
- [ ] Channel CRUD and membership API routes
- [ ] Real-time messaging with Supabase Realtime
- [ ] Threaded replies
- [ ] Typing indicators and presence
- [ ] Message reactions, edits, deletes
- [ ] File attachments (Supabase Storage) — deferred to Phase 5
- [x] DMs (list, create/find existing DM channel)
- [x] Notification system (list, mark read, mark all read)

### Built
- [x] Channel CRUD API routes (list, create, get, update, archive, join, leave)
- [x] Message API routes (list, create, edit, delete, reactions, threads)
- [x] Notification API routes (list, mark read, mark all read)
- [x] Zustand chat store (channels, messages, typing, presence state)
- [x] Supabase Realtime hook (postgres_changes, broadcast typing, presence)
- [x] Chat UI: channel list, channel header, message feed, message composer
- [x] Chat page with 3-column layout (channel list + main chat + thread stub)
- [x] i18n: 14 new chat-related translation keys

### Tested
- [x] `pnpm build` — All 4 workspace tasks pass
- [x] API: POST message -> 201, content returned
- [x] API: Add reaction -> toggles emoji in JSONB
- [x] API: Edit message -> is_edited=true
- [x] API: Thread reply -> parent_id set, thread endpoint returns replies
- [x] API: List messages -> cursor-based pagination
- [x] API: DM create/find channel works
- [ ] Frontend: Chat page renders with channel list (needs Supabase auth wired up)
- [ ] Frontend: Realtime messaging works (needs live testing with two sessions)

---

## Phase 3: Helpdesk (Complete)

### Built
- [x] Ticket CRUD API (list with role-based access, create with SLA auto-calc, get, update with activity logging, assign, satisfaction)
- [x] Ticket comments API (list with internal note filtering, create with first-response SLA tracking)
- [x] Ticket activity log API (status changes, assignments)
- [x] Ticket config API (queues, SLA policies, canned responses CRUD)
- [x] Zustand ticket store (tickets, filters, active ticket)
- [x] Agent ticket dashboard (two-panel: list + detail, filter bar, create dialog)
- [x] Ticket detail panel (comments/activity tabs, SLA warnings, internal notes)
- [x] Customer portal layout + ticket list + ticket detail with satisfaction rating
- [x] Create ticket dialog with priority/type/queue selection
- [x] i18n: tickets + portal translation keys
- [x] Fixed DB schema mismatch (response_times, sla_breach_at, due_at, 'normal' priority)

### Tested
- [x] `pnpm build` — All 4 workspace tasks pass
- [x] API: SLA policy created with response/resolution times
- [x] API: Queue created with SLA linked
- [x] API: Ticket created with auto-calculated SLA deadlines (due_at)
- [x] API: Comment creates + sets first_response_at
- [x] API: Status update -> activity logged
- [x] API: Satisfaction rating (1-5) submitted
- [x] API: Activity log returns entries
- [x] API: Canned response CRUD works

---

---

## Phase 4: Discussions, Wiki & Search (Complete)

### Built
- [x] Discussion CRUD API (list w/ cursor pagination + category/tag filter, create, get, update, delete, upvote toggle)
- [x] Discussion replies API (list with nesting, create w/ reply_count increment, edit, delete, accept answer)
- [x] Wiki spaces API (list, create admin-only, get)
- [x] Wiki pages API (list as tree, create, get, update w/ auto-versioning, delete, version history)
- [x] Unified search endpoint (full-text across messages/tickets/wiki/discussions)
- [x] Zustand stores (discussions-store, wiki-store)
- [x] Discussions UI: list with category filter, detail with threaded replies, create dialog, upvote, accept answer
- [x] Wiki UI: space list, page tree, page viewer, page editor with version tracking
- [x] Threads page: two-panel layout (list + detail)
- [x] Wiki page: three-column layout (spaces + tree + content)
- [x] i18n: discussions + wiki translation keys

### Tested
- [x] `pnpm build` — All 4 workspace tasks pass
- [x] API: Discussion create -> 201, title/category/tags returned
- [x] API: Upvote toggle -> upvotes=1
- [x] API: Reply create -> reply_count incremented to 1
- [x] API: Accept answer -> is_accepted=true
- [x] API: Wiki space create -> 201
- [x] API: Wiki page create -> 201
- [x] API: Wiki page edit -> creates version entry (1 version)
- [x] API: Search -> wiki=1 result for "getting started"

---

## Phase 5: Polish & Scale (Complete)

### Built
- [x] Webhook management API (list, create, update, delete — admin/owner only)
- [x] API key management API (list without key_hash, create returns raw key once, revoke)
- [x] DB migration: webhooks table with RLS policy
- [x] Auth context provider (AuthProvider + useAuth hook — user, org, accessToken, signOut)
- [x] Typed API client helper (auto-auth header, base URL, typed methods)
- [x] Providers.tsx wrapped with AuthProvider
- [x] Command palette wired to search API (debounced 300ms, results grouped by type)
- [x] Full settings page (4 tabs: Profile, Organization, API Keys, Webhooks)
- [x] Analytics dashboard (metric cards: tickets, messages, discussions, wiki, SLA compliance)
- [x] Sidebar updated with Admin nav item
- [x] i18n: settings + admin translation key groups

### Tested
- [x] `pnpm build` — All 4 workspace tasks pass (13 routes)
- [x] API: Create API key -> returns key with prefix, key_hash never in GET
- [x] API: Delete API key -> 200
- [x] API: Create webhook -> 201, URL + events returned
- [x] API: Update webhook -> active toggled
- [x] API: Delete webhook -> 200
- [x] OpenAPI spec: 51 paths, 79 operations total

### Remaining (deferred)
- [ ] Wire TODO_ORG_ID to real auth context across 17 components
- [ ] File attachments (Supabase Storage)
- [ ] Email integration (receive tickets via email)
- [ ] Additional i18n translations (es, fr, de, pt, ja, zh, ko)
- [ ] Mobile responsive refinements
- [ ] Accessibility audit (WCAG AA)
- [ ] Performance optimization (lazy loading, code splitting)
