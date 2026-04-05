# Fix Authentication — Implementation Plan

**Date:** 2026-04-05
**Status:** In Progress
**Reviewed:** Yes — corrected Phase 2/3/7 based on code review

---

## Overview

The authentication system has the core pieces (Supabase auth, AuthProvider context, API auth middleware) but is missing critical glue: no profile creation on signup, no route protection, no user menu, no token refresh, and no org onboarding. This plan addresses all issues in dependency order.

---

## Phase 1+2: Database — Profile + Org Membership Triggers

**Why:** Without a `profiles` row, every API query that joins on profiles fails. Without org membership, the dashboard is empty. Using a DB trigger handles both atomically regardless of whether signup happens via the browser client or the API.

**File:** `supabase/migrations/20260405000007_auth_triggers.sql`

**What to do:**
1. Seed a default org (name: "Ollo Dev", slug: "default") via `INSERT ... ON CONFLICT DO NOTHING`
2. Create a trigger function `handle_new_user()` that fires `AFTER INSERT ON auth.users`:
   - Insert into `profiles` (id, email, display_name)
   - Insert into `org_members` (org_id = default org, user_id, role = 'member')
3. Use `SECURITY DEFINER` with `SET search_path = ''` so the function bypasses RLS
4. Backfill existing users who lack profile/org_member rows

**Why trigger over API approach:** The signup page (`apps/web/app/[locale]/(auth)/signup/page.tsx`) calls `supabase.auth.signUp()` directly from the browser, bypassing the API entirely. A trigger is transactional with user creation and works regardless of signup path.

**Test:** Sign up a new user → `SELECT * FROM profiles` and `SELECT * FROM org_members` both have rows.

---

## Phase 3: Frontend — Auth Guard in Existing Proxy

**Why:** Unauthenticated users can access all dashboard routes. They see blank pages instead of being redirected to login.

**File to modify:** `apps/web/proxy.ts` (EXISTING file — already contains `next-intl` locale routing)

**Critical:** The existing proxy handles `next-intl` middleware. Auth logic must be composed with it, not replace it. Run intl middleware first, then layer auth checks.

**What to do:**
1. Import `createServerClient` from `@supabase/ssr`
2. Before calling `intlMiddleware`, create a Supabase client with request/response cookie handling
3. Call `supabase.auth.getUser()` to check auth state
4. Define auth routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`) as public
5. If no user and requesting a dashboard route → redirect to `/{locale}/login`
6. If user exists and requesting an auth route → redirect to `/{locale}/chat`
7. Otherwise, pass through to `intlMiddleware(request)`
8. Update the `config.matcher` to cover all routes (merge existing locale matcher with auth needs)

**Test:** Clear cookies → `/en/chat` redirects to `/en/login`. Log in → `/en/login` redirects to `/en/chat`.

---

## Phase 4: Frontend — User Menu with Sign-Out

**Why:** There's no way to sign out, see your profile, or confirm you're logged in.

**File to modify:** `apps/web/components/layout/header.tsx`

**What to do:**
1. Replace the static avatar `<div>` (lines 39-43) with a clickable dropdown
2. Menu items: display name/email label, "Settings" link, "Sign out" button
3. Use `useAuth()` for `user` and `signOut`, `useRouter()` for redirect after sign-out
4. Click-outside to dismiss the menu

**Test:** Click avatar → menu opens. Click "Sign out" → redirected to login.

---

## Phase 5: Token Refresh (No Code Change Needed)

**Why originally flagged:** JWT expires after 1 hour.

**Resolution:** The Supabase browser client (`@supabase/ssr` `createBrowserClient`) automatically handles token refresh. The existing `onAuthStateChange` handler in `auth-context.tsx` (lines 89-101) already updates `accessToken` when a `TOKEN_REFRESHED` event fires. The Phase 3 proxy's cookie passthrough (`getAll`/`setAll`) ensures server-side navigations also get refreshed tokens.

**No code changes required.** Verified by reading the existing implementation.

---

## Phase 6: Frontend — Forgot Password Flow

**Why:** API endpoints exist (`/auth/forgot-password`, `/auth/reset-password`) but no frontend pages.

**Files to create:**
- `apps/web/app/[locale]/(auth)/forgot-password/page.tsx`
- `apps/web/app/[locale]/(auth)/reset-password/page.tsx`

**File to modify:**
- `apps/web/app/[locale]/(auth)/login/page.tsx` — add "Forgot password?" link
- `apps/web/messages/en.json` — add translation keys

**What to do:**
1. Forgot password page: email form → calls API → shows success message
2. Reset password page: extracts token from Supabase recovery URL hash → new password form → calls API → redirects to login
3. Add `forgotPassword`, `resetPassword`, `sendResetLink`, `resetSuccess`, `newPassword`, `passwordUpdated` i18n keys

**Test:** Login page → "Forgot password?" → enter email → success message. Email link → new password → login works.

---

## ~~Phase 7: Signup Flow Fix~~ (ELIMINATED)

**Why eliminated:** With Phase 1+2 using the DB trigger approach, profile + org membership are created atomically when `auth.users` is inserted, regardless of whether signup happens via the browser Supabase client or the API. No need to change the signup page.

---

## Execution Order

```
Phase 1+2 (DB triggers)       — no dependencies, do first
Phase 3 (Proxy auth guard)    — independent of Phase 1+2
Phase 4 (User menu)           — independent
Phase 5 (Token refresh)       — no code changes needed
Phase 6 (Forgot password)     — independent
```

Phases 1+2, 3, 4, 6 can be done in parallel.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `supabase/migrations/20260405000007_auth_triggers.sql` | Create |
| `apps/web/proxy.ts` | Modify (add auth guard, compose with existing intl) |
| `apps/web/components/layout/header.tsx` | Modify (add user menu dropdown) |
| `apps/web/app/[locale]/(auth)/forgot-password/page.tsx` | Create |
| `apps/web/app/[locale]/(auth)/reset-password/page.tsx` | Create |
| `apps/web/app/[locale]/(auth)/login/page.tsx` | Modify (add forgot password link) |
| `apps/web/messages/en.json` | Modify (add translation keys) |
