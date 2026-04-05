# Ollo Dev — Technical Specification

## System Architecture

Ollo Dev is a three-tier application: a Next.js frontend communicates with a Hono REST API, which accesses Supabase (PostgreSQL) using a service-role client. The frontend also connects directly to Supabase for authentication and real-time subscriptions. All data is scoped by organization (multi-tenant).

```
┌─────────┐     ┌──────────────────┐     ┌──────────────────────────────┐
│ Browser  │────▶│  Next.js (SSR)   │────▶│  Hono API (:8000)            │
│          │     │  (:3000)         │     │  /api/v1/*                   │
└────┬─────┘     └──────────────────┘     └──────────┬───────────────────┘
     │                                               │
     │           ┌──────────────────┐                │
     └──────────▶│  Supabase        │◀───────────────┘
      Auth +     │  PostgreSQL 15+  │   Service-role client
      Realtime   │  Auth / RLS      │
      (WS)       │  Realtime        │
                 └──────────────────┘
```

---

## Database Schema

All tables use Row-Level Security (RLS) with org-scoped policies. Most tables include `org_id` as a tenant key, auto-managed `updated_at` triggers, and UUID primary keys.

Full DDL is in `supabase/migrations/`. Key tables by domain:

### Core

| Table | Purpose | Key Columns |
|---|---|---|
| `orgs` | Organizations (tenants) | slug, plan, settings (JSONB) |
| `profiles` | User profiles (linked to `auth.users`) | email, display_name, locale, theme, status |
| `org_members` | Org membership + roles | org_id, user_id, role (owner/admin/agent/member) |

### Chat

| Table | Purpose | Key Columns |
|---|---|---|
| `channels` | Public, private, and DM channels | org_id, type, slug, is_archived |
| `channel_members` | Channel membership | last_read_at, notifications (all/mentions/none) |
| `messages` | Chat messages with threading | channel_id, author_id, parent_id, reactions (JSONB), is_edited, is_deleted |

### Discussions

| Table | Purpose | Key Columns |
|---|---|---|
| `discussions` | Async thread starters | org_id, category, tags[], upvotes, reply_count, is_pinned, is_locked |
| `discussion_replies` | Nested replies | discussion_id, parent_id, is_accepted |

### Wiki

| Table | Purpose | Key Columns |
|---|---|---|
| `wiki_spaces` | Knowledge base spaces | org_id, slug, is_public |
| `wiki_pages` | Pages with tree structure | space_id, parent_id, content (markdown), is_published, sort_order |
| `wiki_page_versions` | Full version history | page_id, version, content, edited_by, change_note |

### Helpdesk

| Table | Purpose | Key Columns |
|---|---|---|
| `tickets` | Support tickets | org_id, status, priority, type, queue_id, assignee_id, due_at, sla_breach_at |
| `ticket_comments` | Comments + internal notes | ticket_id, is_internal, first_response_at |
| `ticket_activity` | Change log | ticket_id, field, old_value, new_value |
| `ticket_queues` | Support queue config | org_id, name, sla_policy_id |
| `sla_policies` | Response/resolution time rules | response_time, resolution_time |
| `canned_responses` | Template responses | org_id, title, content |

### Projects

| Table | Purpose | Key Columns |
|---|---|---|
| `projects` | Project workspaces | org_id, status, owner_id |
| `project_tasks` | Tasks | project_id, priority, status, assignee_id |
| `project_bugs` | Bug tracker | project_id, severity, reproducibility |
| `project_files` | File storage | project_id, storage_path |
| `project_notes` | Team notes | project_id, author_id |
| `project_messages` | Project-scoped chat | project_id, author_id |
| `time_entries` | Time tracking | project_id, user_id, started_at, ended_at, duration_seconds |

### Integrations & System

| Table | Purpose | Key Columns |
|---|---|---|
| `webhooks` | Outgoing webhook config | org_id, url, events[], is_active |
| `api_keys` | API key management | org_id, key_hash (never exposed), name |
| `github_installations` | GitHub app installs per org | org_id, installation_id |
| `github_repos` | Linked repos per project | project_id, repo_full_name |
| `notifications` | User notifications | user_id, type, is_read |

---

## API Routes

Base path: `/api/v1`. 51 paths, 79 operations. Interactive docs at `/api/v1/docs` (Swagger UI).

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Register with email/password |
| POST | `/auth/login` | Login (returns JWT) |
| POST | `/auth/logout` | Revoke session |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

### Organizations

| Method | Path | Description |
|---|---|---|
| GET | `/orgs` | List user's orgs |
| POST | `/orgs` | Create org |
| GET | `/orgs/:orgId` | Get org details |
| PATCH | `/orgs/:orgId` | Update org |
| GET | `/orgs/:orgId/members` | List org members |
| POST | `/orgs/:orgId/members` | Invite user |
| PATCH | `/orgs/:orgId/members/:userId` | Update member role |
| DELETE | `/orgs/:orgId/members/:userId` | Remove member |

### Chat — Channels

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/channels` | List channels |
| POST | `/orgs/:orgId/channels` | Create channel |
| GET | `/orgs/:orgId/channels/:channelId` | Get channel |
| PATCH | `/orgs/:orgId/channels/:channelId` | Update channel |
| POST | `/orgs/:orgId/channels/:channelId/join` | Join channel |
| POST | `/orgs/:orgId/channels/:channelId/leave` | Leave channel |
| POST | `/orgs/:orgId/dms` | Create or find DM channel |

### Chat — Messages

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/channels/:channelId/messages` | List messages (cursor pagination) |
| POST | `/orgs/:orgId/channels/:channelId/messages` | Send message |
| PATCH | `/orgs/:orgId/channels/:channelId/messages/:messageId` | Edit message |
| DELETE | `/orgs/:orgId/channels/:channelId/messages/:messageId` | Delete message (soft) |
| POST | `/orgs/:orgId/channels/:channelId/messages/:messageId/reactions` | Toggle reaction |
| GET | `/orgs/:orgId/messages` | List all org messages |

### Tickets

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/tickets` | List tickets (role-based filtering) |
| POST | `/orgs/:orgId/tickets` | Create ticket (auto-calc SLA) |
| GET | `/orgs/:orgId/tickets/:ticketId` | Get ticket detail |
| PATCH | `/orgs/:orgId/tickets/:ticketId` | Update ticket |
| POST | `/orgs/:orgId/tickets/:ticketId/comments` | Add comment |
| GET | `/orgs/:orgId/tickets/:ticketId/comments` | List comments |
| PATCH | `/orgs/:orgId/tickets/:ticketId/comments/:commentId` | Edit comment |
| DELETE | `/orgs/:orgId/tickets/:ticketId/comments/:commentId` | Delete comment |
| GET | `/orgs/:orgId/tickets/:ticketId/activity` | Activity log |
| POST | `/orgs/:orgId/tickets/:ticketId/satisfaction` | Rate ticket (1-5) |
| POST | `/orgs/:orgId/ticket-queues` | Create queue (admin) |
| POST | `/orgs/:orgId/sla-policies` | Create SLA policy (admin) |
| POST | `/orgs/:orgId/canned-responses` | Create canned response (admin) |

### Discussions

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/discussions` | List (category/tag filter, cursor pagination) |
| POST | `/orgs/:orgId/discussions` | Create discussion |
| GET | `/orgs/:orgId/discussions/:discussionId` | Get discussion |
| PATCH | `/orgs/:orgId/discussions/:discussionId` | Update (pin, lock) |
| DELETE | `/orgs/:orgId/discussions/:discussionId` | Delete |
| POST | `/orgs/:orgId/discussions/:discussionId/upvote` | Toggle upvote |
| POST | `/orgs/:orgId/discussions/:discussionId/replies` | Add reply |
| GET | `/orgs/:orgId/discussions/:discussionId/replies` | List replies (nested) |
| PATCH | `/orgs/:orgId/discussions/:discussionId/replies/:replyId` | Edit reply |
| POST | `/orgs/:orgId/discussions/:discussionId/replies/:replyId/accept` | Mark as answer |

### Wiki

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/wiki/spaces` | List spaces |
| POST | `/orgs/:orgId/wiki/spaces` | Create space (admin) |
| GET | `/orgs/:orgId/wiki/spaces/:spaceId` | Get space |
| GET | `/orgs/:orgId/wiki/spaces/:spaceId/pages` | List pages (tree) |
| POST | `/orgs/:orgId/wiki/spaces/:spaceId/pages` | Create page |
| GET | `/orgs/:orgId/wiki/pages/:pageId` | Get page content |
| PATCH | `/orgs/:orgId/wiki/pages/:pageId` | Update page (creates version) |
| DELETE | `/orgs/:orgId/wiki/pages/:pageId` | Delete page |
| GET | `/orgs/:orgId/wiki/pages/:pageId/versions` | Version history |

### Projects

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/projects` | List projects |
| POST | `/orgs/:orgId/projects` | Create project |
| GET | `/orgs/:orgId/projects/:projectId` | Get project |
| GET | `/orgs/:orgId/projects/:projectId/tasks` | List tasks |
| POST | `/orgs/:orgId/projects/:projectId/tasks` | Create task |
| GET | `/orgs/:orgId/projects/:projectId/bugs` | List bugs |
| POST | `/orgs/:orgId/projects/:projectId/bugs` | Create bug report |
| GET | `/orgs/:orgId/projects/:projectId/files` | List files |
| GET | `/orgs/:orgId/projects/:projectId/messages` | List project messages |
| POST | `/orgs/:orgId/projects/:projectId/messages` | Send project message |
| GET | `/orgs/:orgId/projects/:projectId/notes` | List notes |
| POST | `/orgs/:orgId/projects/:projectId/notes` | Create note |
| GET | `/orgs/:orgId/projects/:projectId/time-entries` | List time entries |
| POST | `/orgs/:orgId/projects/:projectId/time-entries` | Create time entry |
| POST | `/orgs/:orgId/projects/:projectId/time-entries/:id/stop` | Stop running timer |
| GET | `/orgs/:orgId/time-summary` | Aggregated time by project/user/date |

### GitHub Integration

| Method | Path | Description |
|---|---|---|
| POST | `/orgs/:orgId/github` | Install GitHub App (OAuth) |
| GET | `/github/callback` | OAuth callback handler |
| POST | `/github/webhooks` | GitHub webhook receiver |
| GET | `/orgs/:orgId/github/repos` | List linked repos |
| GET | `/orgs/:orgId/projects/:projectId/github/repos` | List project repos |
| GET | `/orgs/:orgId/projects/:projectId/github/git` | Git operations |
| GET | `/orgs/:orgId/projects/:projectId/github/links` | Linked items |
| GET | `/orgs/:orgId/projects/:projectId/github/activity` | GitHub activity feed |

### Search, Notifications & Admin

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId/search` | Full-text search (messages, tickets, wiki, discussions) |
| GET | `/notifications` | List user notifications |
| PATCH | `/notifications/:notificationId` | Mark notification read |
| PATCH | `/notifications/mark-all-read` | Mark all read |
| GET | `/orgs/:orgId/webhooks` | List webhooks |
| POST | `/orgs/:orgId/webhooks` | Create webhook |
| PATCH | `/orgs/:orgId/webhooks/:webhookId` | Update webhook |
| DELETE | `/orgs/:orgId/webhooks/:webhookId` | Delete webhook |
| GET | `/orgs/:orgId/api-keys` | List API keys |
| POST | `/orgs/:orgId/api-keys` | Create API key (returns raw key once) |
| DELETE | `/orgs/:orgId/api-keys/:keyId` | Revoke API key |
| GET | `/health` | Health check |

---

## Authentication & Authorization

### Four Layers

1. **Supabase Auth** — Handles signup, login, JWT issuance, session management. Users authenticate via email/password. JWT tokens include the user's `sub` (user ID).

2. **API Auth Middleware** (`apps/api/src/middleware/auth.ts`) — Extracts `Bearer` token from the `Authorization` header, validates it via `supabase.auth.getUser()`, and sets `user` and `accessToken` on the Hono context. All `/orgs/*` routes require authentication.

3. **Row-Level Security (RLS)** — Every table has RLS enabled. Policies enforce that users can only access data within their organization. Example: `SELECT` on `messages` requires the user to be a member of the channel's org.

4. **RBAC Roles** — Stored in `org_members.role`:
   - **owner** — Full access, can delete org
   - **admin** — Manage members, settings, webhooks, API keys, queues, SLA policies
   - **agent** — Handle tickets, manage discussions, edit wiki
   - **member** — Read access, create messages/discussions, submit tickets

### Frontend Auth

- `AuthProvider` context (`apps/web/lib/auth-context.tsx`) provides `user`, `org`, `accessToken`, `signOut`
- `ApiClient` (`apps/web/lib/api-client.ts`) auto-attaches the Bearer token to all requests
- Route groups enforce access: `(auth)` is public, `(dashboard)` requires login, `(portal)` is for external customers

---

## Real-time Features

Powered by Supabase Realtime, subscribed per channel/resource:

| Mechanism | Use Case |
|---|---|
| **Postgres Changes** | New messages, message edits/deletes, ticket status updates, new notifications |
| **Broadcast** | Typing indicators (user is typing in a channel) |
| **Presence** | Online/away/offline status per user |

Implementation: `useRealtimeChat` hook subscribes to a Supabase channel per chat channel. Events update the corresponding Zustand store.

---

## Frontend Architecture

### Routing

Next.js App Router with `[locale]` dynamic segment for i18n:

```
app/[locale]/
├── (auth)/          # Public: login, signup, forgot-password, reset-password
├── (dashboard)/     # Auth required: internal team views
│   ├── chat/        # Real-time messaging (3-column layout)
│   ├── threads/     # Async discussions (2-panel)
│   ├── wiki/        # Knowledge base (3-column: spaces + tree + content)
│   ├── tickets/     # Agent ticket dashboard (2-panel + create dialog)
│   ├── projects/    # Project management (tasks, bugs, files, time tracking)
│   ├── settings/    # Profile, org, team settings
│   └── admin/       # Admin panel (API keys, webhooks, analytics)
└── (portal)/        # Customer-facing
    ├── tickets/     # Submit & track support tickets
    └── kb/          # Public knowledge base
```

### i18n

- **Library:** next-intl with structured JSON translation files (`apps/web/messages/en.json`)
- **Current:** English (en)
- **Planned:** Spanish, French, German, Portuguese, Japanese, Chinese, Korean

### State Management

Zustand stores in `apps/web/stores/`:

| Store | Manages |
|---|---|
| `chat-store` | Channels, messages, active channel, typing users, online users |
| `ticket-store` | Tickets, filters, active ticket |
| `discussions-store` | Discussions, replies, filters |
| `wiki-store` | Spaces, pages, active page |
| `project-store` | Projects, tasks, bugs, files, notes |

### Theming

- **next-themes** with `class` strategy — SSR-safe, zero flash
- CSS custom properties for design tokens (Apple-inspired)
- Light and dark modes

### UI Components

- **shadcn/ui** (base-nova style) + **@base-ui/react** primitives
- **Lucide** icons
- **cmdk** — Command palette for search and navigation
- **Sonner** — Toast notifications

---

## Key Patterns & Conventions

### Validation
Zod schemas in `packages/shared/validators/` are used by both the API (via `@hono/zod-openapi` for request/response validation and OpenAPI generation) and the frontend (form validation).

### Error Handling
The API returns standardized error responses via `apps/api/src/lib/errors.ts`. Frontend uses error boundaries and Sonner toast notifications.

### API Client
`apps/web/lib/api-client.ts` provides a typed wrapper with `get`/`post`/`patch`/`delete` methods. Automatically attaches the auth token and base URL.

### Multi-Tenancy
All resource endpoints are nested under `/api/v1/orgs/:orgId/...`. Every org-scoped table includes an `org_id` foreign key. RLS policies enforce tenant isolation at the database level.

### Pagination
List endpoints use cursor-based pagination with `cursor` and `limit` query parameters.

### OpenAPI
Every route is defined with `createRoute` from `@hono/zod-openapi`. The spec is auto-generated at `/api/v1/openapi.json`.

### Shared Packages
- `@ollo-dev/shared` — Types, validators, constants, i18n keys
- `@ollo-dev/db` — Generated Supabase types (`packages/db/types/database.ts`)

Both are imported via pnpm workspace protocol (`workspace:*`).

---

## Current Status & Roadmap

### Completed

- **Phase 1: Foundation** — Monorepo, API, web app, DB schema (19+ tables), Railway config
- **Phase 2: Chat & Realtime** — Channels, DMs, messages, threads, typing, presence
- **Phase 3: Helpdesk** — Tickets, SLA, queues, comments, activity, satisfaction ratings
- **Phase 4: Discussions & Wiki** — Async threads, knowledge base with versioning, unified search
- **Phase 5: Polish & Scale** — Webhooks, API keys, command palette, analytics, projects, GitHub integration

### Deferred

- Wire `TODO_ORG_ID` to real auth context across 17 components
- File attachments (Supabase Storage)
- Email integration (inbound tickets via email)
- Additional i18n locales (es, fr, de, pt, ja, zh, ko)
- Mobile responsive refinements
- Accessibility audit (WCAG AA)
- Performance optimization (lazy loading, code splitting)

See [PROGRESS.md](PROGRESS.md) for the full phase-by-phase checklist.
