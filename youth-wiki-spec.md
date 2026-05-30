# Technical Specification — Internal Youth Group Wiki

> A fast, mobile-first internal knowledge base and CMS for a masjid youth group's core team. This document is the build brief for Claude Code.

---

## 1. Overview

### Identity
**Bilal Youth Affairs** — the youth group of **Bilal Masjid**. The app is the group's internal wiki. Logo asset: `bilalmasjid_icon_no_background.png` (transparent PNG; see §8.1 for theme).

### What we're building
An internal-only wiki + lightweight CMS used by the youth group's core team to write and organize knowledge, track events, and share files. It should feel like ClickUp's wiki (clean pages, smooth block editing) but be noticeably **faster**, **mobile-first**, and — critically — **organized flat rather than deeply nested** so information is never buried (see §7.2).

### Who uses it
A small, trusted **core team** (estimate ~5–25 people). Everyone with an account is a known, trusted member. There is no public access and no anonymous browsing.

### Primary goals
- **Fast.** Navigation feels instant. No spinner-heavy loads. Hard requirement.
- **Mobile-first.** Designed for phones first, then enhanced for desktop.
- **Maximum ease & clarity.** Anything should be reachable in roughly two clicks or one search, and you can always see everything in a category at a glance. Nothing buried.
- **Pleasant to edit.** A block-based editor (slash commands, headings, lists, checklists, images, files) the team enjoys using.
- **Simple to run.** Minimal ops, near-zero cost, easy backups.

### Non-goals (out of scope for v1)
- Public-facing pages or SEO.
- Real-time multiplayer co-editing. Autosave + last-write-wins is sufficient.
- Complex per-page permissions. The whole team reads everything; editing is role-gated (§6).
- A member roster / registration. The group currently runs on drop-in attendance, so there are no "members" to maintain yet. **Parked as a future phase** (§11) for when the group moves off the drop-in model.
- Native iOS/Android apps. We ship a PWA instead.

---

## 2. Core principles (apply to every decision)

1. **Speed over features.** If a feature noticeably slows navigation or editing, simplify or defer it.
2. **Flat over deep.** Cap structure at two levels. Organize *within* pages (tabs, collapsible sections, scroll-tracking nav — §7.1.1, §7.3) instead of nesting subpages. The custom in-page block vocabulary is what makes this viable.
3. **Mobile-first.** Build and test the phone layout first; desktop is the enhancement.
4. **Optimistic UI.** Edits and actions reflect immediately; sync in the background.
5. **Boring, well-trodden tech.** Favor mature, well-documented tools.
6. **Few moving parts.** One app, one database, one storage bucket.

---

## 3. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router)** + React + TypeScript | Server Components for fast loads; mature; excellent prefetching. |
| Styling | **Tailwind CSS** | Fast to build responsive, mobile-first layouts. |
| UI primitives | **shadcn/ui** (Radix under the hood) | Accessible, themeable components. |
| Editor | **Tiptap** (ProseMirror) | Notion/ClickUp-style block editor with slash commands. |
| Database | **Supabase Postgres** | Relational, full-text search built in, generous free tier. |
| Auth | **Supabase Auth** (email + password) | Built-in, invite-only, no third-party login needed. |
| File storage | **Supabase Storage** | For the resource library and page images. |
| Data fetching/cache | **TanStack Query** + Next.js server caching | Instant cache hits, background revalidation, optimistic mutations. |
| Hosting | **Vercel** (app) + **Supabase** (data/auth/storage) | Managed, near-free at this scale, deploys on git push. |
| PWA | `next-pwa` or manual service worker | Installable; caches read content for offline viewing. |

### Cost expectation
At ~5–25 users this runs on **Vercel Hobby + Supabase free tier ($0/mo)**. If usage grows, Supabase Pro (~$25/mo) is the next step. Nothing requires payment to start.

---

## 4. Architecture

```
Phone / Desktop browser (PWA)
        │
        ▼
Next.js App (Vercel)
  ├── Server Components  → read data directly from Supabase (fast first paint)
  ├── Route Handlers     → mutations (create/update/delete), file uploads
  └── Client Components  → editor, search, optimistic interactions
        │
        ▼
Supabase
  ├── Postgres   (content, events, users metadata)
  ├── Auth       (email + password, invite-only)
  └── Storage    (files + images, access-controlled)
```

- **Reads** go through Server Components for fast first render, then hydrate to TanStack Query for cached client navigation.
- **Writes** go through Route Handlers (or Server Actions) that enforce role checks server-side.
- **Row Level Security (RLS)** is enabled on every table as a second line of defense; never rely on client checks alone.

---

## 5. Data model

> Postgres tables. `id` is `uuid` (default `gen_random_uuid()`). All tables have `created_at`/`updated_at` (timestamptz). Soft-delete via `deleted_at` where noted.

### `profiles` (extends Supabase `auth.users`)
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK, = auth.users.id) | |
| display_name | text | |
| avatar_url | text | nullable |
| role | text enum (`owner`, `editor`) | exactly one `owner` |

### `categories` (the fixed top-level sections — see §7.2)
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| icon | text | emoji or icon name |
| sort_order | int | |

> Categories are few and relatively fixed (managed by the owner). They are **not** free-proliferating "spaces."

### `pages` (the wiki articles/guides)
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| category_id | uuid (FK → categories) | every page belongs to exactly one category |
| parent_id | uuid (FK → pages, nullable) | **at most one level deep** — a page with a `parent_id` cannot itself be a parent (enforced) |
| title | text | |
| slug | text (unique within category) | |
| icon | text | nullable |
| cover_url | text | nullable |
| content | jsonb | Tiptap document JSON |
| excerpt | text | auto-derived, for search/overview cards |
| status | text enum (`draft`, `published`) | |
| pinned | boolean | default false (surfaces on home) |
| sort_order | int | ordering among siblings |
| created_by / updated_by | uuid (FK → profiles) | |
| deleted_at | timestamptz (nullable) | soft delete → trash |

### `tags` and `page_tags`
- `tags`: `id`, `name`, `color`.
- `page_tags`: join table (`page_id`, `tag_id`). Enables cross-cutting organization without folders.

### `events`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| title | text | |
| description | text | nullable |
| location | text | nullable |
| starts_at | timestamptz | |
| ends_at | timestamptz | nullable |
| all_day | boolean | default false |
| created_by | uuid | |

### `resource_folders`
`id`, `name`, `parent_id` (nullable — folders may nest for files only).

### `resources` (file library items)
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| folder_id | uuid (FK, nullable) | |
| title | text | |
| description | text | nullable |
| storage_path | text | path in Supabase Storage |
| file_type | text | MIME type |
| file_size | bigint | bytes |
| uploaded_by | uuid | |

---

## 6. Authentication & authorization

- **Email + password** via Supabase Auth. **Invite-only** — public signup disabled. **Onboarding method (chosen for simplicity, no SMTP needed):** the owner creates each account with a temporary password, shares it with the person out-of-band (in person / WhatsApp), and the app forces a password change on first login. This avoids configuring an email sender entirely. (A proper email-invite flow can be added later if Supabase SMTP is configured.)
- **Two roles:**
  - **Owner** (exactly one): everything an editor can do, plus manage accounts/roles, manage categories, and access trash/restore.
  - **Editor** (everyone else): read everything; create/edit/delete pages, events, and resources.
- Enforce role checks **server-side** on every mutation; mirror them in **RLS policies** on every table.
- Sessions persist across visits (long-lived refresh tokens) so people aren't constantly re-logging-in on mobile.
- **Password reset (no email required for v1):** the owner can reset any member's password from the team admin screen (issues a new temp password + re-flags forced change). Self-service "forgot password" via email link is deferred until Supabase SMTP is configured. Users can always change their own password while logged in.

---

## 7. Feature specifications

### 7.1 The editor / CMS (the centerpiece)
A block-based editor on Tiptap that feels like ClickUp/Notion:
- **Slash menu** (`/`) to insert blocks: heading 1–3, bullet/numbered list, checklist, quote, callout, divider, code block, table, **toggle/collapsible section**, **tabs**, **columns/grid**, **step block**, image, file embed.
- **Inline formatting:** bold, italic, underline, strikethrough, inline code, links.
- **Page metadata:** optional emoji icon and cover image.
- **Images:** drag-drop or paste → uploads to Supabase Storage → inserts, with an optimistic placeholder.
- **File embeds:** attach from the resource library or upload inline.
- **Autosave:** debounced (~750ms) with a subtle "Saving… / Saved" indicator. No save button. Last-write-wins.
- **Drafts vs published:** a simple status toggle; drafts don't change what others see until published.
- **Touch-friendly:** all block actions reachable by touch (a "+" handle on mobile, drag handles on desktop).

#### 7.1.1 Structured layout blocks — *the reason this is worth building custom*
The flat / two-level model only works if a single page can organize content **internally** at least as well as nesting did. Notion and ClickUp are weak here precisely because they're general-purpose; since we own the editor, we build the richer in-page primitives they lack. These blocks move organization from *between pages* to *within pages*:

- **Tabbed sections (highest priority).** A tabs block holds several panels, showing one at a time (e.g. *Before · Day-of · After · Budget · Contacts* on one "Event Planning" page). This replaces most of what nesting was for: content stays organized **and** the page never feels long, because only one tab renders at once. This is the single most important custom block.
- **Collapsible sections, collapsed by default.** A long page opens as an *outline* — each major section is a closed accordion. The reader sees the whole shape of the topic at a glance and expands only what they need. A long page reads like a one-screen table of contents until drilled into.
- **Responsive columns / grid.** True multi-column layouts that **reflow to a single column on mobile** (unlike Notion's brittle columns). For comparisons, contact cards, side-by-side notes.
- **Semantic callouts & cards.** Info / warning / tip / note panels and bordered cards that visually chunk a page so the eye isn't hitting an undifferentiated wall of text.
- **Step blocks.** Numbered, visually distinct steppers for SOPs and procedures.

**Deep-linkable anchors:** every heading, tab, and collapsible section has a stable anchor URL, so a person can share or bookmark a link straight to one section (recovering the "link to a subpage" affordance). Because everything lives on one page, the whole topic is also in a single search / find-in-page context — strictly better than content scattered across subpages.

**Tabs (and all layout blocks) are blocks, not page types.** A new page starts blank; the author inserts a tabs block from the slash menu (`/tabs`) when content splits into parallel slices, then adds/names/reorders the tabs and fills each with ordinary blocks. The authoring hierarchy is **Page → (optional) Tabs → Sections (headings)**. Authoring rule: a different *topic* is a new page in a category; the *same topic from another angle* is a tab. **Tabs must not nest inside tabs** (one level only) — nesting would reintroduce the deep-hierarchy problem this whole design avoids.

### 7.2 Information architecture & navigation (the "anti-ClickUp" design)
The organizing philosophy is **flat, not deep** — because the content set is small, the goal is that nothing is ever more than ~2 clicks or one search away, and you can always see everything in a section at once.

- **Top-level categories (6, fixed at launch).** Confirmed starting set: *Playbooks/SOPs, Events, Policies, Resources, Contacts, Onboarding*. Owner-managed; they don't proliferate. (The owner can add/rename/reorder later, but the model assumes a small, stable set.)
- **Two levels maximum.** Category → Page, with at most one optional sub-level. **No sub-sub-pages** — enforced in the product (a page with a parent cannot become a parent). This rule is the structural fix for the "buried subpages" problem.
- **One topic = one page.** Strongly bias toward a single, well-structured page (with an in-page table of contents and collapsible sections) over splitting a topic into many subpages. This is the direct fix for "can't see all the info at once."
- **Tags for cross-cutting themes.** A page can carry tags (e.g. `ramadan`, `fundraising`) and appear in tag views without living in multiple places.
- **Home = dashboard.** A search bar front and center, plus **pinned** pages, **recently updated**, and **upcoming events**, so people land on what they need.
- **Category overview = "see everything" view.** Opening a category shows *all* its pages as a list/grid with excerpts — no hunting through a tree.

**Navigation UI**
- **Mobile:** bottom tab bar — *Home · Browse · Events · Files · Search*. "Browse" shows categories, then a flat page list per category. A page opens with a collapsible in-page table of contents at the top.
- **Desktop:** slim left sidebar listing **categories** (and, when inside one, that category's pages). Not a giant expanding tree. Breadcrumbs at the top of each page.

> **Alternative model (kept in reserve):** drop categories and make every page a tagged card navigated purely by search + filter + recently-updated. Even flatter and impossible to bury anything, but browsing is less structured. The categories model above is the recommended default; this is the fallback if the wiki stays very small.

### 7.3 Reading experience (viewing information clearly)
Because pages carry more (the flat model), in-page navigation must make a long page feel like a small, well-organized site:
- **Sticky "On this page" navigation that tracks scroll.** A persistent rail on desktop / collapsible dropdown on mobile, mirroring the heading outline and **highlighting the current section**. This — not a static top-of-page TOC — is what makes a single long page genuinely navigable. The heading outline effectively becomes the in-topic "folder tree."
- **Collapsible sections** (see §7.1.1) so a long page stays scannable; sections can default to collapsed.
- **Comfortable reading width** (constrained max-width) so text doesn't sprawl on desktop.
- **Deep links** to any heading/section/tab, so specific content is shareable.
- Clear typographic hierarchy; generous spacing on mobile.

### 7.4 Events & calendar
- List view (default, mobile-friendly) grouped into upcoming/past.
- Simple month view on desktop; agenda list on mobile.
- Create/edit modal: title, date/time (or all-day), location, description.
- Optional, deferrable: export an event or feed as `.ics`.

### 7.5 Resource / file library
- Folder tree + file grid/list (list-first on mobile).
- Upload (drag-drop on desktop, picker on mobile) to Supabase Storage.
- Per-file: title, description, type icon, size, uploaded-by, download/preview.
- Inline preview for images and PDFs; download for everything else.
- Files served via **signed URLs** (private bucket, no public access).

### 7.6 Search
- **Global search** reachable from every screen (and `⌘K` on desktop).
- Searches page titles + content, event titles, and resource titles.
- Implementation: **Postgres full-text search** over a generated `tsvector`; milliseconds at this scale. Results grouped by type.
- Make it feel instant: debounce input, show results as you type, cache recent queries client-side.

---

## 8. Mobile-first & UX requirements
- Design and build the **phone layout first**; desktop is progressive enhancement.
- **Bottom navigation** as primary nav on mobile (thumb-reachable). Avoid hamburger-only nav for primary destinations.
- Minimum **44×44px** touch targets; comfortable spacing.
- Respect safe-area insets (notches/home indicators).
- **Installable PWA:** manifest, icons, service worker caching the app shell + recently viewed pages for offline reading.
- System-driven dark mode.
- **Skeleton loaders**, never full-screen spinners.

### 8.1 Branding & theme
- **Name in-app:** "Bilal Youth Affairs." Show the logo in the header/login screen; use it as the PWA app icon and favicon. Logo file: `bilalmasjid_icon_no_background.png`.
- **Brand color (sampled from the logo): `#006738`** — deep emerald green. This is the primary accent: links, active tab/nav states, primary buttons, focus rings, the page-icon and avatar fills used in the mockup.
- **Suggested palette (light mode):**
  - Primary `#006738`; primary-hover/active (darker) `#00532D`.
  - Light tint for fills/highlights (active rail, callouts, badges) `#E6F1EC`; text on that tint uses the primary or darker green.
  - Surfaces stay neutral white/off-white; text neutral near-black. The green is an accent, not a background wash.
- **Dark mode:** the brand green is dark, so on dark surfaces use a **lightened** accent (around `#2E9B66`) for text/links/active states so it stays legible. Keep large logo usage as-is (it reads fine on dark).
- Implement these as CSS variables / Tailwind theme tokens so the accent is defined once and reused everywhere.

---

## 9. Performance requirements (the "not ClickUp-slow" rules — testable)
- **Instant navigation:** opening a page renders in <100ms perceived (prefetch on hover/visible link; cached client navigation). No network wait for already-visited pages.
- **First load:** interactive in <2s on a mid-range phone over 4G.
- **Optimistic mutations:** edits, reorders, checkbox toggles, and uploads reflect immediately; reconcile in the background; roll back visibly only on error.
- **Debounced autosave** so typing is never blocked by network.
- **Minimal client JS:** heavy logic in Server Components; ship only interactivity (editor, search, drag) to the client.
- **Image optimization** via `next/image`; lazy-load offscreen images.
- **Code-split the editor** so it doesn't bloat read-only page loads.

---

## 10. Security & data care
- HTTPS everywhere (automatic on Vercel).
- **RLS enabled on all tables;** deny by default; policies grant access only to authenticated team members, with role checks for owner-only actions.
- Storage bucket is **private;** serve files via short-lived signed URLs.
- No secrets in the client bundle; privileged operations run server-side with the service-role key (server-only env var).
- **Backups:** rely on Supabase daily backups; additionally provide an owner-only **"Export all content to JSON"** action.
- **Audit fields** (`created_by`, `updated_by`, timestamps) on editable records.

---

## 11. Suggested build phases (ship incrementally)

**Phase 0 — Scaffolding.** Next.js + TS + Tailwind + shadcn/ui. Supabase project, env vars, client/server helpers. Deploy hello-world to Vercel.

**Phase 1 — Auth & shell.** Email/password login, invite-only, password reset. App shell: mobile bottom nav + desktop sidebar, protected routes, profile menu, dark mode.

**Phase 2 — Wiki core (highest value).** Categories + pages (two-level cap enforced), the Tiptap editor with slash menu + autosave, **the custom structured-layout blocks (tabs, collapsible sections, columns/grid, callouts, steps — §7.1.1)**, category overview views, dashboard home (pinned/recent), **scroll-tracking "On this page" nav + deep-linkable anchors (§7.3)**, breadcrumbs, draft/publish, soft-delete + trash. Prefetching + optimistic edits wired in from the start.

**Phase 3 — Search.** Postgres full-text search across pages; global `⌘K` / mobile search screen. Tags + tag views.

**Phase 4 — Resources.** Folders, uploads to Storage, signed-URL downloads, image/PDF preview.

**Phase 5 — Events.** List + calendar views, create/edit, all-day support.

**Phase 6 — Polish & PWA.** Manifest + service worker (installable + offline read cache), skeletons everywhere, performance pass against §9, JSON export backup.

**Future (post-v1) — Membership / registration.** When the group moves off the drop-in model: a member roster, possibly self-registration and event RSVPs. Out of scope now; the schema leaves room to add it without rework.

> Each phase should be independently deployable. Don't start a phase until the previous one meets its acceptance criteria.

---

## 12. Decisions log

All open questions are resolved — nothing blocks the build.

### Resolved
- **Starting categories** — Playbooks/SOPs, Events, Policies, Resources, Contacts, Onboarding.
- **Onboarding/invites** — owner creates accounts with temp passwords + forced first-login reset (no email sender needed). See §6.
- **Branding** — Bilal Youth Affairs / Bilal Masjid; brand green `#006738`; logo `bilalmasjid_icon_no_background.png`. See §8.1.
- **Offline** — read-only offline caching only; offline editing is explicitly out of scope.
- **Member directory** — out of scope for v1 (group runs on drop-in attendance); parked as a future phase.

---

*End of specification.*
