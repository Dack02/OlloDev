# Project Time Tracking — Implementation Plan

> Feature: Allow team members to clock on/off projects so the dev team can see how long they're spending on each project.

---

## Current State

The Projects feature is already well-built with tasks, bugs, tickets, files, notes, chat, and discussions. There is **no existing time tracking code** — this is greenfield. The plan below plugs directly into the existing architecture (Supabase + Hono API + Next.js + Zustand).

---

## Database Schema

### New Migration: `20260405000009_time_entries.sql`

**`time_entries` table:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` (PK) | `gen_random_uuid()` |
| `org_id` | `uuid` (FK → orgs) | For RLS — same pattern as all other tables |
| `project_id` | `uuid` (FK → projects) | Which project is being tracked |
| `user_id` | `uuid` (FK → auth.users) | Who is tracking |
| `task_id` | `uuid` (FK → project_tasks, nullable) | Optional link to a specific task |
| `description` | `text` (nullable) | What the person was working on |
| `started_at` | `timestamptz` | When the timer started |
| `ended_at` | `timestamptz` (nullable) | Null while timer is running |
| `duration_seconds` | `integer` (nullable) | Computed on stop, or manual entry |
| `is_manual` | `boolean` | `false` = timer, `true` = manual entry |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Trigger-updated |

**Why this schema:**
- Storing both `started_at`/`ended_at` AND `duration_seconds` gives us an audit trail while making queries fast (no need to compute duration every time).
- `ended_at IS NULL` is how we detect running timers — simple, no extra boolean needed.
- `task_id` is optional so you can track against a project generally or a specific task.
- `is_manual` distinguishes timer entries from manually-added time (e.g. "I worked 2h on this yesterday").
- `org_id` follows the existing RLS pattern used everywhere else.

**Indexes:**
- `(org_id, project_id)` — project time queries
- `(org_id, user_id)` — "my time" queries
- `(user_id, ended_at)` — find running timer (WHERE ended_at IS NULL)
- `(project_id, started_at)` — time range reports

**RLS policies:** Same pattern as other project tables — org members can read all entries in their org, users can insert/update their own entries, admins can update/delete any.

**Constraint:** A user can only have ONE running timer at a time (enforced via a partial unique index on `user_id WHERE ended_at IS NULL`).

---

## API Endpoints

All scoped under `/api/v1/orgs/:orgId/projects/:projectId/time-entries`

### Core CRUD

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/time-entries` | Create a time entry (manual or start timer) |
| `GET` | `/time-entries` | List entries with filters (date range, user, task) |
| `GET` | `/time-entries/:id` | Get single entry |
| `PATCH` | `/time-entries/:id` | Update entry (edit description, adjust times) |
| `DELETE` | `/time-entries/:id` | Delete an entry |

### Timer Actions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/time-entries/start` | Start a new timer (auto-stops any running timer first) |
| `POST` | `/time-entries/:id/stop` | Stop a running timer, compute duration |

### Reporting (org-level, not project-scoped)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/orgs/:orgId/time-summary` | Aggregated time by project, user, date range |

### Zod Validators (in `packages/shared`)

```
createTimeEntrySchema — description?, task_id?, started_at, ended_at?, duration_seconds?
updateTimeEntrySchema — partial of above
startTimerSchema — project_id, task_id?, description?
timeEntryFilterSchema — date_from?, date_to?, user_id?, task_id?
```

---

## Frontend

### 1. Global Timer Widget (header bar)

A persistent, small component in the dashboard header that shows the currently running timer for the logged-in user. This is the most important UX piece — it means you never lose sight of your active timer regardless of which page you're on.

**Behaviour:**
- Shows "No timer running" or `[Project Name] — HH:MM:SS` with a stop button
- Clicking the project name navigates to that project
- Stop button stops the timer and briefly shows the logged duration
- Uses Supabase Realtime or polling (every 30s) to stay in sync across tabs

### 2. Project Timer Controls (project overview page)

On each project's overview page, add a "Clock In" button that starts tracking against that project. If a timer is already running on another project, prompt: "You're currently tracking [Other Project]. Switch?"

### 3. Time Tab (new tab on project detail page)

A new `/projects/:projectId/time` tab alongside the existing bugs/tasks/tickets/files/chat/notes/discussions tabs.

**Contains:**
- **Timer start/stop** — prominent at the top, with optional task selector and description field
- **Time entries list** — reverse-chronological, grouped by day, showing user avatar, description, duration, and linked task
- **Manual entry form** — "Add time" button opens a form with date, start/end time, duration, task, and description
- **Project time summary** — total hours this week, this month, all-time, broken down by team member

### 4. My Timesheet Page (new top-level page)

A new `/timesheet` page in the dashboard sidebar for the individual user's view.

**Contains:**
- **Weekly grid** — days as columns, projects as rows, durations in cells
- **Daily/Weekly/Monthly toggle**
- **Inline editing** — click a cell to adjust time
- **Totals row** — daily totals and weekly total

### 5. Admin Time Report (in existing admin section)

Add a time tracking section to the existing `/admin` analytics page.

- Total hours by project (bar chart)
- Hours per team member (bar chart)
- Trend over time (line chart)
- Filterable by date range and project

---

## Implementation Phases

### Phase 1 — Foundation (core functionality)
1. Write the database migration (`time_entries` table, indexes, RLS, partial unique constraint)
2. Regenerate Supabase types (`supabase gen types typescript`)
3. Add Zod validators in `packages/shared`
4. Build Hono API routes: CRUD + start/stop
5. Build the Time tab UI on the project detail page (list, manual entry, start/stop)
6. Build the global timer widget in the dashboard header

### Phase 2 — Reporting & Timesheet
7. Build the "My Timesheet" page with weekly grid view
8. Add project time summary to the project overview page
9. Build the admin time report with charts (recharts or similar)
10. Add org-level `/time-summary` API endpoint

### Phase 3 — Polish
11. Add task-level time tracking (select a task when starting timer)
12. Supabase Realtime subscription so timer syncs across tabs/devices
13. i18n translations for all new strings
14. Empty states, loading skeletons, error handling

---

## Key Design Decisions

**One running timer at a time.** Toggl and Clockify both enforce this — it's simpler for users and avoids confusion about overlapping entries. Enforced at the database level with a partial unique index.

**Auto-stop on new start.** If you clock into Project B while Project A is running, Project A's timer stops automatically. No lost time, no forgotten timers.

**Manual entry alongside timer.** Not everyone remembers to start a timer. The manual "Add time" form lets people backfill — this is essential for adoption. The `is_manual` flag keeps the data honest for reporting.

**No billing/invoicing (yet).** This is for internal dev team visibility, not client billing. Keeps scope tight. Can be added later with hourly rates on a user-project join table.

**Duration stored redundantly.** We store `started_at`, `ended_at`, AND `duration_seconds`. The timestamps are the source of truth; the duration column is a precomputed convenience that makes aggregation queries fast without `EXTRACT(EPOCH FROM ended_at - started_at)` everywhere.

---

## Files to Create / Modify

### New files
- `supabase/migrations/20260405000009_time_entries.sql`
- `apps/api/src/routes/projects/time-entries.ts`
- `apps/web/app/[locale]/(dashboard)/projects/[projectId]/time/page.tsx`
- `apps/web/app/[locale]/(dashboard)/timesheet/page.tsx`
- `apps/web/components/projects/tabs/time-tab.tsx`
- `apps/web/components/projects/timer-widget.tsx` (global header)
- `apps/web/components/projects/time-entry-list.tsx`
- `apps/web/components/projects/manual-time-entry-dialog.tsx`
- `apps/web/components/projects/time-summary.tsx`
- `apps/web/components/timesheet/weekly-grid.tsx`

### Modified files
- `packages/shared/validators/index.ts` — add time entry schemas
- `packages/shared/constants/index.ts` — add any new constants
- `apps/api/src/index.ts` — register time-entries route
- `apps/web/app/[locale]/(dashboard)/projects/[projectId]/layout.tsx` — add Time tab
- `apps/web/components/layout/sidebar.tsx` — add Timesheet nav item
- `apps/web/components/layout/header.tsx` — add global timer widget
- `apps/web/stores/project-store.ts` — add time entry state (or create separate `time-store.ts`)
- `packages/db/types/database.ts` — regenerated from Supabase

---

## References

- **Toggl / Clockify** — industry standard UX for start/stop timers with project association
- **Harvest** — good model for weekly timesheet grid
- **react-timer-hook** — npm package for timer/stopwatch hooks in React
- **Existing Ollo patterns** — follow the same migration → API → frontend flow used for bugs, tasks, tickets, notes
