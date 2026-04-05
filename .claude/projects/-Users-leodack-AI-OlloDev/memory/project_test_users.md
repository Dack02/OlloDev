---
name: Local test users
description: Two test users exist in the local Supabase instance — test@ollodev.com and demo@ollodev.com
type: project
---

Two test users were created in the local Supabase database (not via seed file, likely manually via Supabase Studio or signup):
- `test@ollodev.com` (display_name: "Test User", role: owner)
- `demo@ollodev.com` (display_name: "Demo User", role: owner)

Password for test@ollodev.com was reset to `password123` on 2026-04-05.

**Why:** These users pre-existed before the seed.sql was added. Always check the live database before claiming there are no users.

**How to apply:** When asked about login credentials, check `auth.users` via `supabase db query` rather than only searching the codebase.
