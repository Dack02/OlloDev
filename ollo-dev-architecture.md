# Ollo Dev — Platform Architecture & Technical Specification

## Overview

Ollo Dev is an API-first communication and helpdesk platform built for internal team collaboration and external customer support. It combines real-time chat with threaded discussions, a wiki/knowledge base, and a full-featured helpdesk ticketing system — all under a clean, Apple-inspired design with first-class i18n and dark/light theming.

---

## 1. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + React 19 | SSR/SSG, excellent DX, largest ecosystem |
| **UI Components** | shadcn/ui + Radix UI + Tailwind CSS v4 | Copy-paste components, headless accessibility, full design control |
| **API Backend** | Hono (TypeScript) | Ultra-fast, lightweight, OpenAPI-native, runs on Railway |
| **API Docs** | Hono OpenAPI + Swagger UI (`@hono/zod-openapi` + `@hono/swagger-ui`) | Auto-generated OpenAPI 3.1 spec from Zod schemas |
| **Database** | Supabase (PostgreSQL 15+) | Managed Postgres, built-in Auth, RLS, Realtime |
| **Auth** | Supabase Auth | JWT-based, social logins, MFA, RBAC via custom claims |
| **Realtime** | Supabase Realtime (Broadcast + Presence + Postgres Changes) | Chat, typing indicators, online status, live ticket updates |
| **i18n** | next-intl | Best-in-class Next.js i18n — server components, type-safe, ~2KB |
| **Theming** | next-themes + Tailwind CSS dark mode (`class` strategy) + CSS custom properties | SSR-safe, zero flash, design token driven |
| **Monorepo** | Turborepo + pnpm workspaces | Shared types, parallel builds, incremental caching |
| **Deployment** | Railway (separate services per app) | Easy scaling, Dockerfile support, monorepo-aware |
| **Validation** | Zod | Shared schemas between frontend and backend, OpenAPI generation |
| **Email** | React Email + Resend (or Postmark) | Transactional emails for tickets, notifications |
| **File Storage** | Supabase Storage | Attachments for tickets, chat, knowledge base |
| **Search** | Supabase pg_trgm + full-text search (upgrade to Meilisearch later) | Start simple, scale when needed |
| **Rate Limiting** | Hono middleware + Upstash Redis | API protection, abuse prevention |
| **Testing** | Vitest + Playwright + Testing Library | Unit, integration, and E2E coverage |

---

## 2. Monorepo Structure

```
ollo-dev/
├── apps/
│   ├── web/                    # Next.js frontend (team dashboard + customer portal)
│   │   ├── app/
│   │   │   ├── [locale]/       # i18n route segments
│   │   │   │   ├── (auth)/     # Login, signup, forgot password
│   │   │   │   ├── (dashboard)/# Internal team views
│   │   │   │   │   ├── chat/         # Real-time channels & DMs
│   │   │   │   │   ├── threads/      # Async discussions
│   │   │   │   │   ├── wiki/         # Knowledge base / docs
│   │   │   │   │   ├── tickets/      # Helpdesk (agent view)
│   │   │   │   │   ├── settings/     # Org, team, personal settings
│   │   │   │   │   └── admin/        # Admin panel
│   │   │   │   └── (portal)/   # External customer portal
│   │   │   │       ├── tickets/      # Submit & track tickets
│   │   │   │       └── kb/           # Public knowledge base
│   │   │   └── api/            # Next.js API routes (BFF/proxy if needed)
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components (customized)
│   │   │   ├── chat/           # Chat-specific components
│   │   │   ├── tickets/        # Ticket-specific components
│   │   │   ├── wiki/           # Wiki-specific components
│   │   │   └── layout/         # Shell, sidebar, nav, command palette
│   │   ├── lib/                # Frontend utilities
│   │   ├── hooks/              # Custom React hooks
│   │   ├── stores/             # Zustand stores (client state)
│   │   ├── messages/           # i18n translation files
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   ├── fr.json
│   │   │   ├── de.json
│   │   │   └── ...
│   │   └── styles/
│   │       ├── globals.css     # Tailwind base + design tokens
│   │       └── themes/         # Light/dark token definitions
│   │
│   └── api/                    # Hono API server
│       ├── src/
│       │   ├── index.ts        # Hono app entry point
│       │   ├── routes/
│       │   │   ├── auth/       # Auth endpoints (Supabase wrapper)
│       │   │   ├── chat/       # Channels, messages, DMs
│       │   │   ├── threads/    # Async discussion endpoints
│       │   │   ├── wiki/       # Knowledge base CRUD
│       │   │   ├── tickets/    # Helpdesk ticket endpoints
│       │   │   ├── users/      # User management
│       │   │   ├── orgs/       # Organization/tenant management
│       │   │   ├── search/     # Unified search
│       │   │   └── webhooks/   # Incoming/outgoing webhooks
│       │   ├── middleware/
│       │   │   ├── auth.ts     # JWT verification via Supabase
│       │   │   ├── rateLimit.ts
│       │   │   ├── i18n.ts     # Accept-Language header parsing
│       │   │   ├── tenant.ts   # Multi-tenant context injection
│       │   │   └── logger.ts
│       │   ├── services/       # Business logic layer
│       │   ├── validators/     # Zod schemas (shared with frontend)
│       │   └── lib/
│       │       ├── supabase.ts # Supabase client (service role + per-request)
│       │       ├── email.ts    # Email sending
│       │       └── errors.ts   # Standardized API error responses
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared TypeScript types & Zod schemas
│   │   ├── types/              # Domain types (User, Ticket, Message, etc.)
│   │   ├── validators/         # Zod schemas (used by both apps)
│   │   ├── constants/          # Shared enums, config constants
│   │   └── i18n/               # Shared i18n keys/types
│   ├── db/                     # Database package
│   │   ├── migrations/         # SQL migrations (Supabase CLI)
│   │   ├── seed/               # Seed data
│   │   ├── types/              # Generated Supabase types
│   │   └── policies/           # RLS policy definitions
│   └── ui/                     # Optional: shared design tokens if needed
│
├── supabase/                   # Supabase project config
│   ├── config.toml
│   ├── migrations/
│   └── functions/              # Supabase Edge Functions (if needed)
│
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

---

## 3. Database Schema (PostgreSQL via Supabase)

### 3.1 Core Tables

```sql
-- ============================================================
-- ORGANIZATIONS (Multi-tenant root)
-- ============================================================
CREATE TABLE orgs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  settings      JSONB DEFAULT '{}',  -- SLA defaults, branding, etc.
  plan          TEXT DEFAULT 'free',  -- free, pro, enterprise
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USERS & MEMBERSHIP
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  locale        TEXT DEFAULT 'en',   -- User's preferred language
  theme         TEXT DEFAULT 'system', -- light, dark, system
  timezone      TEXT DEFAULT 'UTC',
  status        TEXT DEFAULT 'offline', -- online, away, dnd, offline
  status_text   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member', -- owner, admin, agent, member
  permissions   JSONB DEFAULT '{}',
  joined_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ============================================================
-- CHAT: Channels, DMs, Messages
-- ============================================================
CREATE TABLE channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'public', -- public, private, dm
  created_by    UUID REFERENCES profiles(id),
  is_archived   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE TABLE channel_members (
  channel_id    UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'member', -- admin, member
  last_read_at  TIMESTAMPTZ DEFAULT now(),
  notifications TEXT DEFAULT 'all', -- all, mentions, none
  joined_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  parent_id     UUID REFERENCES messages(id), -- Thread replies
  content       TEXT NOT NULL,
  content_html  TEXT,              -- Rendered markdown
  attachments   JSONB DEFAULT '[]', -- [{url, name, type, size}]
  reactions     JSONB DEFAULT '{}', -- {"👍": ["user_id1", "user_id2"]}
  is_edited     BOOLEAN DEFAULT false,
  is_deleted    BOOLEAN DEFAULT false, -- Soft delete
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_parent ON messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- ============================================================
-- THREADS (Async Discussions)
-- ============================================================
CREATE TABLE discussions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  body_html     TEXT,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  category      TEXT,               -- general, ideas, bugs, announcements
  is_pinned     BOOLEAN DEFAULT false,
  is_locked     BOOLEAN DEFAULT false,
  tags          TEXT[] DEFAULT '{}',
  upvotes       INTEGER DEFAULT 0,
  reply_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE discussion_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  parent_id     UUID REFERENCES discussion_replies(id), -- Nested replies
  body          TEXT NOT NULL,
  body_html     TEXT,
  is_accepted   BOOLEAN DEFAULT false,
  upvotes       INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WIKI / KNOWLEDGE BASE
-- ============================================================
CREATE TABLE wiki_spaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,
  is_public     BOOLEAN DEFAULT false, -- Public = visible to customers
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE TABLE wiki_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      UUID NOT NULL REFERENCES wiki_spaces(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES wiki_pages(id),  -- Nested pages
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  content       TEXT NOT NULL,      -- Markdown
  content_html  TEXT,               -- Rendered
  author_id     UUID NOT NULL REFERENCES profiles(id),
  last_edited_by UUID REFERENCES profiles(id),
  is_published  BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, slug)
);

CREATE TABLE wiki_page_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  edited_by     UUID NOT NULL REFERENCES profiles(id),
  change_note   TEXT,
  version       INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wiki_pages_search ON wiki_pages USING gin(
  to_tsvector('english', title || ' ' || content)
);

-- ============================================================
-- HELPDESK: Tickets, SLAs, Canned Responses
-- ============================================================
CREATE TABLE ticket_queues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT,
  color         TEXT,
  sla_policy_id UUID,             -- FK added after sla_policies table
  auto_assign   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE TABLE tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  queue_id      UUID REFERENCES ticket_queues(id),
  ticket_number SERIAL,            -- Human-readable #
  subject       TEXT NOT NULL,
  description   TEXT NOT NULL,
  description_html TEXT,
  status        TEXT NOT NULL DEFAULT 'open',  -- open, pending, in_progress, resolved, closed
  priority      TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  type          TEXT DEFAULT 'question',        -- question, bug, feature, task
  source        TEXT DEFAULT 'portal',          -- portal, email, api, chat
  requester_id  UUID NOT NULL REFERENCES profiles(id),
  assignee_id   UUID REFERENCES profiles(id),
  tags          TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  -- SLA tracking
  sla_policy_id UUID,
  first_response_due TIMESTAMPTZ,
  resolution_due     TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,
  sla_breached       BOOLEAN DEFAULT false,
  -- Satisfaction
  satisfaction_rating INTEGER,     -- 1-5
  satisfaction_comment TEXT,
  -- Metadata
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  closed_at     TIMESTAMPTZ
);

CREATE INDEX idx_tickets_org_status ON tickets(org_id, status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tickets_search ON tickets USING gin(
  to_tsvector('english', subject || ' ' || description)
);

CREATE TABLE ticket_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  body          TEXT NOT NULL,
  body_html     TEXT,
  is_internal   BOOLEAN DEFAULT false, -- Internal notes vs public replies
  attachments   JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,      -- status_changed, assigned, tagged, etc.
  old_value     TEXT,
  new_value     TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- SLA Policies
CREATE TABLE sla_policies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  -- Response times in minutes, per priority
  first_response JSONB NOT NULL DEFAULT '{
    "low": 1440,
    "medium": 480,
    "high": 120,
    "urgent": 30
  }',
  resolution JSONB NOT NULL DEFAULT '{
    "low": 10080,
    "medium": 2880,
    "high": 480,
    "urgent": 120
  }',
  business_hours JSONB,           -- Business hours config
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ticket_queues ADD CONSTRAINT fk_queue_sla
  FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id);
ALTER TABLE tickets ADD CONSTRAINT fk_ticket_sla
  FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id);

-- Canned Responses
CREATE TABLE canned_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,     -- Supports {{ticket.requester_name}} placeholders
  category      TEXT,
  shortcut      TEXT,              -- Quick insert shortcut key
  created_by    UUID REFERENCES profiles(id),
  is_shared     BOOLEAN DEFAULT true,
  usage_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,      -- message, mention, ticket_assigned, etc.
  title         TEXT NOT NULL,
  body          TEXT,
  link          TEXT,               -- Deep link within app
  is_read       BOOLEAN DEFAULT false,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)
  WHERE is_read = false;

-- ============================================================
-- API KEYS (for external integrations)
-- ============================================================
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL,      -- SHA-256 hash of the key
  key_prefix    TEXT NOT NULL,      -- First 8 chars for identification
  permissions   JSONB DEFAULT '{}', -- Scoped permissions
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Row-Level Security Strategy

Every table gets RLS enabled. The core pattern:

```sql
-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
-- ... (all tables)

-- Example: Users can only see orgs they belong to
CREATE POLICY "Users see own orgs" ON orgs
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Example: Messages visible to channel members
CREATE POLICY "Channel members see messages" ON messages
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

-- Example: Tickets visible based on role
CREATE POLICY "Agents see org tickets" ON tickets
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agent')
    )
  );

CREATE POLICY "Customers see own tickets" ON tickets
  FOR SELECT USING (requester_id = auth.uid());
```

---

## 4. API Architecture (Hono + OpenAPI)

### 4.1 API Design Principles

- **REST + OpenAPI 3.1** — every endpoint documented and validated via Zod schemas
- **Versioned** — `/api/v1/...` prefix for all routes
- **Consistent response format** — `{ data, meta, error }` envelope
- **Pagination** — cursor-based for lists (more efficient than offset)
- **Rate limiting** — per API key / per user, configurable per org plan
- **Idempotency** — `Idempotency-Key` header support for POST/PUT

### 4.2 Endpoint Overview

```
Authentication
  POST   /api/v1/auth/signup
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/forgot-password
  POST   /api/v1/auth/reset-password

Organizations
  GET    /api/v1/orgs
  POST   /api/v1/orgs
  GET    /api/v1/orgs/:orgId
  PATCH  /api/v1/orgs/:orgId
  GET    /api/v1/orgs/:orgId/members
  POST   /api/v1/orgs/:orgId/members/invite
  PATCH  /api/v1/orgs/:orgId/members/:userId
  DELETE /api/v1/orgs/:orgId/members/:userId

Chat — Channels
  GET    /api/v1/orgs/:orgId/channels
  POST   /api/v1/orgs/:orgId/channels
  GET    /api/v1/orgs/:orgId/channels/:channelId
  PATCH  /api/v1/orgs/:orgId/channels/:channelId
  DELETE /api/v1/orgs/:orgId/channels/:channelId
  POST   /api/v1/orgs/:orgId/channels/:channelId/join
  POST   /api/v1/orgs/:orgId/channels/:channelId/leave

Chat — Messages
  GET    /api/v1/orgs/:orgId/channels/:channelId/messages
  POST   /api/v1/orgs/:orgId/channels/:channelId/messages
  PATCH  /api/v1/orgs/:orgId/messages/:messageId
  DELETE /api/v1/orgs/:orgId/messages/:messageId
  POST   /api/v1/orgs/:orgId/messages/:messageId/reactions
  GET    /api/v1/orgs/:orgId/messages/:messageId/thread

Discussions
  GET    /api/v1/orgs/:orgId/discussions
  POST   /api/v1/orgs/:orgId/discussions
  GET    /api/v1/orgs/:orgId/discussions/:discussionId
  PATCH  /api/v1/orgs/:orgId/discussions/:discussionId
  DELETE /api/v1/orgs/:orgId/discussions/:discussionId
  GET    /api/v1/orgs/:orgId/discussions/:discussionId/replies
  POST   /api/v1/orgs/:orgId/discussions/:discussionId/replies

Wiki
  GET    /api/v1/orgs/:orgId/wiki/spaces
  POST   /api/v1/orgs/:orgId/wiki/spaces
  GET    /api/v1/orgs/:orgId/wiki/spaces/:spaceId/pages
  POST   /api/v1/orgs/:orgId/wiki/spaces/:spaceId/pages
  GET    /api/v1/orgs/:orgId/wiki/pages/:pageId
  PATCH  /api/v1/orgs/:orgId/wiki/pages/:pageId
  DELETE /api/v1/orgs/:orgId/wiki/pages/:pageId
  GET    /api/v1/orgs/:orgId/wiki/pages/:pageId/versions

Tickets (Helpdesk)
  GET    /api/v1/orgs/:orgId/tickets
  POST   /api/v1/orgs/:orgId/tickets
  GET    /api/v1/orgs/:orgId/tickets/:ticketId
  PATCH  /api/v1/orgs/:orgId/tickets/:ticketId
  GET    /api/v1/orgs/:orgId/tickets/:ticketId/comments
  POST   /api/v1/orgs/:orgId/tickets/:ticketId/comments
  GET    /api/v1/orgs/:orgId/tickets/:ticketId/activity
  POST   /api/v1/orgs/:orgId/tickets/:ticketId/assign
  POST   /api/v1/orgs/:orgId/tickets/:ticketId/satisfaction

Ticket Configuration
  GET    /api/v1/orgs/:orgId/queues
  POST   /api/v1/orgs/:orgId/queues
  GET    /api/v1/orgs/:orgId/sla-policies
  POST   /api/v1/orgs/:orgId/sla-policies
  GET    /api/v1/orgs/:orgId/canned-responses
  POST   /api/v1/orgs/:orgId/canned-responses
  PATCH  /api/v1/orgs/:orgId/canned-responses/:responseId

Users
  GET    /api/v1/users/me
  PATCH  /api/v1/users/me
  GET    /api/v1/orgs/:orgId/users/:userId
  PATCH  /api/v1/users/me/preferences

Search
  GET    /api/v1/orgs/:orgId/search?q=...&scope=messages,tickets,wiki

Notifications
  GET    /api/v1/notifications
  PATCH  /api/v1/notifications/:notificationId/read
  POST   /api/v1/notifications/read-all

Webhooks
  GET    /api/v1/orgs/:orgId/webhooks
  POST   /api/v1/orgs/:orgId/webhooks
  PATCH  /api/v1/orgs/:orgId/webhooks/:webhookId
  DELETE /api/v1/orgs/:orgId/webhooks/:webhookId

API Keys
  GET    /api/v1/orgs/:orgId/api-keys
  POST   /api/v1/orgs/:orgId/api-keys
  DELETE /api/v1/orgs/:orgId/api-keys/:keyId

Documentation
  GET    /api/v1/docs          # Swagger UI
  GET    /api/v1/openapi.json  # OpenAPI spec
```

### 4.3 Example Hono Route with OpenAPI

```typescript
// apps/api/src/routes/tickets/create.ts
import { createRoute, z } from '@hono/zod-openapi';
import { ticketSchema, createTicketSchema } from '@ollo-dev/shared/validators';

const route = createRoute({
  method: 'post',
  path: '/api/v1/orgs/{orgId}/tickets',
  tags: ['Tickets'],
  summary: 'Create a new ticket',
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createTicketSchema } },
    },
  },
  responses: {
    201: {
      description: 'Ticket created',
      content: { 'application/json': { schema: ticketSchema } },
    },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
  },
});

app.openapi(route, async (c) => {
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const user = c.get('user');

  const ticket = await ticketService.create({
    orgId,
    ...body,
    requesterId: user.id,
  });

  return c.json({ data: ticket }, 201);
});
```

---

## 5. Frontend Architecture

### 5.1 Design System — Apple-Inspired

The design language follows Apple's principles: generous whitespace, subtle depth through shadows (not borders), SF-style typography hierarchy, smooth micro-animations, and restrained use of color.

**Design tokens (CSS custom properties):**

```css
/* styles/themes/tokens.css */
:root {
  /* Surfaces */
  --surface-primary: #ffffff;
  --surface-secondary: #f5f5f7;
  --surface-tertiary: #e8e8ed;
  --surface-elevated: #ffffff;

  /* Text */
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --text-tertiary: #86868b;

  /* Accent */
  --accent: #0071e3;
  --accent-hover: #0077ed;
  --accent-active: #006edb;

  /* Borders */
  --border-subtle: rgba(0, 0, 0, 0.06);
  --border-default: rgba(0, 0, 0, 0.12);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.12);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Typography scale */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.25rem;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Transitions */
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
}

.dark {
  --surface-primary: #1c1c1e;
  --surface-secondary: #2c2c2e;
  --surface-tertiary: #3a3a3c;
  --surface-elevated: #2c2c2e;

  --text-primary: #f5f5f7;
  --text-secondary: #a1a1a6;
  --text-tertiary: #6e6e73;

  --accent: #2997ff;
  --accent-hover: #40a3ff;
  --accent-active: #1a8cff;

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.12);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.4);
}
```

### 5.2 i18n Setup (next-intl)

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin();

export default withNextIntl({
  // Next.js config
});

// i18n/config.ts
export const locales = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ko'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// messages/en.json (structured by feature)
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "search": "Search...",
    "loading": "Loading..."
  },
  "chat": {
    "newChannel": "New Channel",
    "typeMessage": "Type a message...",
    "thread": "Thread",
    "replies": "{count, plural, =0 {No replies} one {1 reply} other {# replies}}"
  },
  "tickets": {
    "title": "Tickets",
    "newTicket": "New Ticket",
    "status": {
      "open": "Open",
      "pending": "Pending",
      "in_progress": "In Progress",
      "resolved": "Resolved",
      "closed": "Closed"
    },
    "priority": {
      "low": "Low",
      "medium": "Medium",
      "high": "High",
      "urgent": "Urgent"
    },
    "sla": {
      "breached": "SLA Breached",
      "dueIn": "Due in {time}"
    }
  },
  "wiki": {
    "newPage": "New Page",
    "editPage": "Edit Page",
    "lastEdited": "Last edited {time} by {name}"
  }
}
```

### 5.3 Theming with next-themes

```typescript
// app/[locale]/providers.tsx
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
```

---

## 6. Realtime Architecture (Supabase Realtime)

### 6.1 Channel Types

| Feature | Supabase Mechanism | Use Case |
|---|---|---|
| New messages | Postgres Changes (INSERT on `messages`) | Chat feeds auto-update |
| Message edits/deletes | Postgres Changes (UPDATE on `messages`) | Live message editing |
| Typing indicators | Broadcast | "User is typing..." |
| Online presence | Presence | User online/away/offline status |
| Ticket updates | Postgres Changes (UPDATE on `tickets`) | Live ticket status changes |
| Notifications | Postgres Changes (INSERT on `notifications`) | Real-time notification badge |

### 6.2 Implementation Pattern

```typescript
// hooks/useRealtimeChat.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeChat(channelId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${channelId}`)
      // Listen for new messages
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        // Add message to local state
      })
      // Typing indicators
      .on('broadcast', { event: 'typing' }, (payload) => {
        // Show typing indicator
      })
      // Presence (online users)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Update online users
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser.id });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);
}
```

---

## 7. Deployment on Railway

### 7.1 Service Layout

```
Railway Project: ollo-dev
├── Service: web (Next.js frontend)
│   ├── Source: apps/web
│   ├── Watch paths: apps/web/**, packages/shared/**
│   ├── Build: pnpm turbo build --filter=web
│   └── Port: 3000
│
├── Service: api (Hono backend)
│   ├── Source: apps/api
│   ├── Watch paths: apps/api/**, packages/shared/**, packages/db/**
│   ├── Build: Docker (multi-stage)
│   └── Port: 8000
│
├── Service: redis (Upstash Redis via Railway addon)
│   └── For rate limiting, caching, job queues
│
└── Environment Variables (shared)
    ├── SUPABASE_URL
    ├── SUPABASE_ANON_KEY
    ├── SUPABASE_SERVICE_ROLE_KEY
    ├── DATABASE_URL (direct Postgres connection)
    ├── REDIS_URL
    ├── RESEND_API_KEY
    └── API_URL (internal service reference)
```

### 7.2 API Dockerfile (Multi-stage)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
RUN pnpm turbo build --filter=api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

---

## 8. Key Features Breakdown

### 8.1 Internal Team Communication

- **Real-time channels** — public, private, and DM channels with Slack-like UX
- **Threaded replies** — every message can spawn a thread, keeping channels clean
- **Rich text** — Markdown support with live preview, code blocks, mentions (@user, @channel)
- **File sharing** — drag-and-drop uploads via Supabase Storage
- **Reactions** — emoji reactions on messages
- **Async discussions** — longer-form threads for decisions, RFCs, ideas (think GitHub Discussions)
- **Wiki/Knowledge base** — nested page hierarchy, version history, full-text search
- **Global search** — unified search across messages, discussions, wiki, and tickets
- **Command palette** — `Cmd+K` for quick navigation (channels, tickets, wiki pages, users)
- **Notifications** — real-time in-app + configurable email digests

### 8.2 Customer Helpdesk

- **Customer portal** — clean, branded portal where customers submit and track tickets
- **Ticket queues** — organize tickets by product, department, or type
- **SLA policies** — configurable first-response and resolution time targets by priority
- **SLA breach alerts** — real-time warnings when tickets approach or breach SLA
- **Canned responses** — templated replies with variable interpolation (`{{ticket.requester_name}}`)
- **Internal notes** — private comments visible only to agents
- **Ticket activity log** — full audit trail of status changes, assignments, and edits
- **Auto-assignment** — round-robin or load-based ticket assignment
- **Satisfaction surveys** — post-resolution rating (1-5) with optional comment
- **Public knowledge base** — customer-facing docs to reduce ticket volume
- **Custom fields** — extensible ticket metadata per org
- **Tags** — flexible categorization for reporting

### 8.3 API-First Integration Points

- **API keys** — scoped, per-org keys for external integrations
- **Webhooks** — configurable outgoing webhooks on any event (ticket created, message sent, etc.)
- **OpenAPI spec** — auto-generated, always in sync with implementation
- **Swagger UI** — interactive API explorer at `/api/v1/docs`

---

## 9. Development Phases

### Phase 1 — Foundation (Weeks 1–4)
- Monorepo scaffolding (Turborepo + pnpm)
- Supabase project setup (schema, migrations, RLS)
- Hono API with auth middleware and OpenAPI/Swagger
- Next.js app shell with i18n (next-intl) and theming (next-themes)
- Design system: shadcn/ui customization with Apple-inspired tokens
- Auth flows: signup, login, org creation, invite flow
- Railway deployment pipeline (2 services)

### Phase 2 — Chat & Realtime (Weeks 5–8)
- Channel CRUD and membership
- Real-time messaging with Supabase Realtime
- Threaded replies
- Typing indicators and presence
- Message reactions, edits, deletes
- File attachments (Supabase Storage)
- DMs
- Notification system (in-app + email)

### Phase 3 — Helpdesk (Weeks 9–12)
- Ticket CRUD with queue management
- SLA policies and breach tracking
- Canned responses with template engine
- Customer portal (public-facing)
- Ticket activity log and audit trail
- Internal notes
- Satisfaction surveys
- Email integration (receive tickets via email)

### Phase 4 — Discussions & Wiki (Weeks 13–15)
- Async discussions with categories and tags
- Upvoting and accepted answers
- Wiki spaces and nested pages
- Page version history
- Public knowledge base (customer-facing)
- Full-text search across all content

### Phase 5 — Polish & Scale (Weeks 16+)
- Command palette (Cmd+K)
- Global search
- Webhooks system
- API key management
- Analytics dashboard (ticket volume, SLA compliance, response times)
- Performance optimization
- Mobile responsive refinements
- Additional i18n translations
- Accessibility audit (WCAG AA)

---

## 10. Key Technical Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| API style | REST + OpenAPI 3.1 | Best for external integrations, auto-docs via Swagger |
| Validation | Zod (shared) | Single source of truth for types, API docs, and frontend validation |
| Monorepo tool | Turborepo + pnpm | Incremental builds, shared packages, Railway-compatible |
| Deployment | Monorepo, separate Railway services | Independent scaling, shared codebase, watch-path deploys |
| Realtime | Supabase Realtime | Built-in, no extra infrastructure, Broadcast + Presence + DB changes |
| Multi-tenancy | Shared tables + RLS + org_id | Simpler schema, Supabase-native security, cost-effective |
| i18n | next-intl | Best Next.js App Router support, type-safe, tiny bundle |
| Theming | next-themes + CSS custom properties | SSR-safe, zero flash, design-token driven |
| Components | shadcn/ui + Radix | Full design control, accessibility built-in, no runtime overhead |
| Email | React Email + Resend | Beautiful transactional emails, React-based templates |
