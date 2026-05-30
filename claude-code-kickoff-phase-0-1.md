# Bilal Youth Affairs Wiki — Claude Code Kickoff (Phases 0–1)

You are building the internal wiki for **Bilal Youth Affairs**, the youth group of **Bilal Masjid**. The full product spec lives in `youth-wiki-spec.md` (add it to the repo root and follow it). **This kickoff covers Phases 0 and 1 only** — scaffolding, then authentication and the app shell. Do **not** build any Phase 2+ features yet (no editor, wiki pages, events, files, or search beyond placeholder routes).

Work incrementally: complete Phase 0 and confirm it before starting Phase 1. Commit in logical chunks with clear messages. When you need the human to do something only they can (create a Supabase project, paste keys, click Vercel buttons), stop and ask clearly.

---

## Authoritative stack
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui**.
- **Supabase**: Postgres + Auth (email/password) + Storage (Storage not needed until later).
- **@supabase/ssr** for cookie-based auth across Server Components, Route Handlers, and middleware.
- **@tanstack/react-query** for client cache (set up the provider now; heavy use comes later).
- Icons: lucide-react (shadcn default) is fine.
- Hosting: **Vercel** (app) + **Supabase** (data/auth). Target the free tiers.

---

## Branding tokens (use from the very first screen)
- App name shown in UI: **Bilal Youth Affairs**.
- Logo file: `bilalmasjid_icon_no_background.png` — place in `/public`. Use it in the login screen and the app header, and as the favicon + PWA icon.
- **Brand color (primary accent): `#006738`** (deep emerald, sampled from the logo). Use for links, active nav/tab states, primary buttons, focus rings.
  - Primary hover/active (darker): `#00532D`.
  - Light tint for subtle fills/active backgrounds: `#E6F1EC`.
  - **Dark mode:** `#006738` is too dark on dark surfaces — use a lightened accent `#2E9B66` for text/links/active states in dark mode.
- Define these once as CSS variables / Tailwind theme tokens (light + dark) and reference the tokens everywhere — never hardcode the hex inline.
- Surfaces stay neutral (white / off-white in light, near-black in dark). Green is an accent, not a background wash.

---

## Phase 0 — Scaffolding

### Tasks
1. Scaffold a Next.js app (App Router, TypeScript, Tailwind, ESLint, `src/` dir, import alias `@/*`).
2. Initialize **shadcn/ui**.
3. Install: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`.
4. Guide the human to create a **Supabase project**, then collect and set env vars in `.env.local` (and instruct them to add the same in Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to the client)
5. Create Supabase client helpers:
   - browser client, server client (cookie-based via `@supabase/ssr`), and a **server-only admin client** using the service-role key (for owner-created accounts in Phase 1).
6. Set up the **brand theme tokens** (light + dark) and drop the logo into `/public`.
7. Add the React Query provider.
8. Build a minimal health page (e.g. `/`) that confirms the app runs and can reach Supabase (a simple authed-or-not status check).
9. Deploy to **Vercel**: connect the repo, set the env vars, confirm a successful production deploy.

### Phase 0 acceptance criteria
- App runs locally (`npm run dev`) with no errors.
- Supabase connectivity verified from both a Server Component and the browser client.
- Brand tokens and logo are in place and visible on the health page.
- Production deploy on Vercel succeeds with env vars configured.

---

## Phase 1 — Authentication & app shell

### 1. Database & security
- Create a `profiles` table extending `auth.users`:
  - `id` (uuid, PK, FK → `auth.users.id`), `display_name` (text), `avatar_url` (text, nullable), `role` (text/enum: `owner` | `editor`), `must_change_password` (boolean, default `true`), `active` (boolean, default `true`), timestamps.
- Add a trigger to create a `profiles` row automatically when an `auth.users` row is created (default role `editor`, `must_change_password = true`).
- **Enable RLS on `profiles`** and add policies:
  - Authenticated users may read all profiles.
  - A user may update **their own** profile (but not their own `role`).
  - Role changes and account creation happen server-side via the service-role admin client (which bypasses RLS) and are gated by an owner check in app code.
- **Disable public sign-ups** in Supabase Auth settings (invite/admin-created only). Confirm email confirmation is configured so it does not block owner-created accounts (no SMTP is set up — accounts must be usable immediately; auto-confirm them via the admin API on creation).

### 2. Owner bootstrap
- Provide a safe one-off way to create the **first owner** account and set `role = 'owner'`, `must_change_password = false` (a small script or documented SQL/admin call). Ask the human for the owner's email, display name, and initial password.

### 3. Auth flows (email + password, no email/SMTP dependency)
- **Login** page (email + password) with the logo and brand styling.
- **Forced first-login password change:** if the signed-in user's `must_change_password` is `true`, redirect them to a "set a new password" screen and block app access until they set one; clear the flag on success.
- **Change password while logged in** (in the profile menu).
- **Owner-managed password reset:** from the team admin screen the owner can reset a member's password (set a new temp password + set `must_change_password = true`). *Self-service "forgot password" via email is deferred until SMTP is configured — do not build it now.*
- **Sessions** persist across visits. Use `@supabase/ssr` **middleware** to refresh sessions and protect routes.
- **Protected routes:** any unauthenticated request to an app route redirects to `/login`.

### 4. App shell (mobile-first, themed)
- **Mobile (build first):** a bottom tab bar with five destinations — **Home · Browse · Events · Files · Search**. Thumb-reachable, ≥44px targets, respects safe-area insets. For now each destination renders a simple themed placeholder screen ("Coming soon — Phase 2/4/5") except Home (see below). Active tab uses the brand accent.
- **Desktop:** a slim left sidebar (logo + app name at top, the five destinations, profile menu at the bottom). Not a deep tree — just the top-level destinations for now. A top breadcrumb bar area (empty placeholder is fine).
- **Home:** a minimal dashboard skeleton — a welcome header with the logo/name and empty "Pinned", "Recently updated", and "Upcoming events" sections (placeholders, wired to real data in later phases).
- **Profile menu:** display name + initials avatar, role badge, "Change password", and "Sign out".
- **Dark mode:** system-driven, using the dark brand tokens.
- Use **skeleton loaders**, not full-screen spinners.

### 5. Team admin (owner-only)
- A `/team` (or similar) screen visible only to the owner:
  - List members (display name, email, role, active status).
  - **Create account:** form (email, display name, role, temp password) → server action using the admin client → creates an auto-confirmed `auth.users` + `profiles` row with `must_change_password = true`.
  - **Reset a member's password** (issues a new temp password, re-flags forced change).
  - **Change role** (owner/editor) and **deactivate/reactivate** a member.
- Editors who navigate to `/team` get a clean "not authorized" response; enforce the owner check server-side, not just by hiding the link.

### Phase 1 acceptance criteria
- The owner can log in.
- The owner can create an editor account from `/team`; that editor can log in and is **forced to set a new password** before reaching the app.
- A logged-in user can change their own password; the owner can reset a member's password.
- Unauthenticated users are redirected to `/login`; editors cannot access `/team` (enforced server-side).
- The themed app shell works on mobile (bottom nav) and desktop (sidebar), with the logo, brand green, dark mode, and a working profile menu + sign out.
- RLS is enabled on `profiles`; the service-role key is never present in client code/bundles.
- Everything is deployed and working on Vercel.

---

## Guardrails (apply throughout both phases)
- **Mobile-first:** build and verify the phone layout first; desktop is the enhancement.
- **No secrets client-side:** the service-role key and any privileged logic live only in server code (Route Handlers / Server Actions / server components).
- **RLS on by default** for every table you create; deny by default.
- **Accessibility:** labeled inputs, focus states (brand-colored focus rings), keyboard-navigable nav and menus, ≥44px touch targets, no text smaller than ~12–13px.
- **Performance mindset (from the spec §9):** prefetch navigation, prefer Server Components, lean client JS, skeletons over spinners. Don't add heavy libraries you don't need yet.
- **Theme tokens only** — reference the brand CSS variables/Tailwind tokens; never hardcode `#006738` inline.

## Working agreement
- Pause and ask the human for: the Supabase project + keys, the first owner's details, and confirmation before any destructive DB action.
- Commit in small, logical steps with clear messages.
- At the end of Phase 1, summarize what was built, how to run it, and what env/secrets are set — then stop. Do not begin Phase 2.
