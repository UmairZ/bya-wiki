# Phase 7 — IA Restructure + Workflows + Automation

> A major update on top of the shipped wiki. This doc is the build brief for
> Phase 7. It assumes Phases 0–6 (per `youth-wiki-spec.md`) are in
> production.

---

## 1. Status quo (June 2026)

| Area | Shipped |
|---|---|
| Stack | Next.js 16 (App Router, TS, Tailwind v4, Turbopack) · shadcn/ui (Base UI primitives) · Supabase (Postgres + Auth + Storage) · TanStack Query · Tiptap v3 · Vercel hosting |
| Auth | Email + password, invite-only (owner creates accounts with temp passwords), forced first-login change. Two roles: `owner` (one) + `editor`. `@supabase/ssr` cookie sessions; `proxy.ts` handles refresh + auth gates. |
| Content | `categories` (6 seeded + owner-managed) hold a mix of `pages` (Tiptap docs) and `resources` (files in Supabase Storage). Two-level depth cap enforced. Soft-delete + owner-only Trash. Tags + page_tags schema in place (no UI yet). |
| Editor | Tiptap v3 + StarterKit + custom structured blocks (tabs, collapsibles, callouts, columns, steps). Debounced autosave; slash menu; draft / published. |
| Reading | `/p/[id]` renders Tiptap JSON server-side via `@tiptap/html`. Scroll-tracking "On this page" nav (desktop rail + mobile floating pill). Deep-linkable heading anchors. |
| Calendar | Hybrid: read via cached ICS feed (`/admin/integrations`); write via Google OAuth (per-org connection, refresh tokens stored server-only). Wiki-side event form encodes `Register: <url>` + `Tags: …` into the description, parses them on the read side into a CTA button + chips. |
| Search | Postgres FTS with generated `tsvector` columns on pages + resources (regex-split filenames). `search_wiki(q)` RPC + `searchAction` (client-filtered for events). `/search` page + ⌘K palette mounted globally. |
| PWA | `manifest.webmanifest` (installable), 192/512/Apple icons, read-only service worker (network-first HTML + cache-first static). Owner-only `/admin/export` dumps everything as JSON. |
| Ops | Vercel Hobby + Supabase free tier. One owner account: `youth@bilalmasjid.com`. Single Supabase project shared by dev + prod. |

**What's missing day-to-day:** recurring planning is repetitive, things get forgotten, and the nav has grown awkward as features were added.

---

## 2. Why this update

Two problems we're solving in one push:

1. **The nav doesn't scale.** "Events" lives next to "Home" and "Search" as a top-level nav item, but conceptually it's just one of seven content areas. The category grid on Home plus a dedicated Events tab creates two ways to reach the same place. As we add more content surfaces (workflows, future stuff), the nav balloons.

2. **Planning a recurring event involves the same 20 things every time.** Decide date → decide speaker → make flyer → recruit volunteers → set up the room → buy snacks → send reminders. Today none of those are tracked anywhere. People forget. There's no shared list of "where are we" for a given event.

The fix is two-layered:

- **IA restructure** — kill the Events nav tab, move all content "spaces" to the sidebar, make the homepage a calendar-first dashboard, give every event its own wiki-side detail page where tasks and files live in context.
- **Workflows** — reusable templates of tasks grouped by stage. Apply a template to an event → get a fresh checklist. Tasks have assignees + due dates. Email reminders fire on schedule or on completion.

---

## 3. Top-level structure — modules

The app graduates from "a wiki" to "a workspace with multiple modules." Each module is a self-contained surface with its own internal navigation; modules sit alongside each other in the sidebar.

| Module | Purpose | Status |
|---|---|---|
| **Events** | Calendar + per-event Kanban planning + tasks + (later) automation. | Shipped in Phase 7. |
| **Resources** | The wiki — spaces, pages, files. The current `/c/[slug]` surface. | Already built; renamed only at the module level. |
| **Bike Rack** | Parking lot for event ideas that aren't on the calendar yet. Promoting an idea creates a Google Calendar event (and optionally auto-applies the Event prep playbook). | Placeholder ("Coming soon") shipped in 7a. |
| **Members** | Future: youth group roster, attendance, parent contacts. | Placeholder ("Coming soon") shipped in 7a. |
| **Finances** | Future: budget, donations, vendor payments. | Placeholder ("Coming soon") shipped in 7a. |

Terminology within Resources stays unchanged at the data layer — the existing `categories` table + `/c/[slug]` URL keep working. **The module is named "Resources"; inside it, the seeded folders are user-renamable from `/admin/categories`.**

> The previously-seeded "Events" space inside Resources becomes redundant once Events is its own module. We won't drop it automatically (the owner may already have content in it); the owner can rename or delete it from `/admin/categories` as they see fit. Future seed scripts won't include it.

---

## 4. Information architecture

### 4.1 Navigation

**Desktop sidebar (always visible on `lg+`):**

```
┌──────────────────────────────────┐
│ 🟢 Bilal Youth Affairs           │  ← logo + name; click → /events
│ 🔍 Search                ⌘K      │  ← opens the existing palette
│ ──────────────────────────────── │
│ MODULES                          │
│   📅 Events                      │  ← /events
│   📂 Resources           ▾       │  ← /resources (expands to show spaces)
│       📘 SOPs                    │     /c/sops
│       📜 Policies                │
│       🔧 Tools                   │  ← (owner-renamed; was "Resources")
│       👥 Contacts                │
│       🌱 Onboarding              │
│       🖼  Logos                   │
│   💡 Bike Rack      coming soon  │  ← disabled, hover tooltip explains
│   👥 Members        coming soon  │  ← disabled, hover tooltip explains
│   💰 Finances       coming soon  │
│ ──────────────────────────────── │
│ ⓘ Tasks                         │  ← global "my tasks" (added in 7c)
│                                  │
│ ──────────────────────────────── │
│ 👤 Youth Admin           ▾       │  ← profile menu (unchanged contents)
└──────────────────────────────────┘
```

- **Modules** are the four top-level surfaces. Clicking a module name navigates to its landing route. Clicking the chevron next to **Resources** expands an indented spaces list (same `categories` data, just sub-listed). The expanded/collapsed state is local UI state (no DB), defaulting to collapsed on first load.
- **Coming soon** modules render greyed out + with a small badge; clicking them does nothing or shows a "Coming in a future update" tooltip.
- **Tasks** (added in 7c) is a one-off destination, not part of any module.

**Mobile bottom tab bar:**

```
┌───────────────────────────────────────────┐
│  📅 Events   📂 Resources   🔍   ☰ More    │
└───────────────────────────────────────────┘
```

The two enabled modules sit in the bar as primary tabs; Search and More round it out. The **More** sheet contains: disabled Members + Finances, Tasks, the profile menu. Adding a third+ module later either bumps Search/More into the More sheet or expands to a 5-tab bar.

### 4.2 Home (root) → redirect

`/` redirects to `/events` (the Events module). No standalone landing screen. Rationale: events + tasks are the primary day-to-day surface; saves a route; opens straight to what people came for. (If we ever want a cross-module dashboard, we add it later — schema doesn't block it.)

### 4.3 The Events module (`/events`)

One view only — no Calendar tab, no segmented control. The page is two sections stacked: a Kanban at the top for current/future events being planned, and a Past Events list below for browsing what's already happened.

```
Events                                                      + New event ↗
────────────────────────────────────────────────────────────────────────
UPCOMING & IN PROGRESS

┌─ Scoping ─────┐ ┌─ Pre-event ────┐ ┌─ Day-of ───────┐ ┌─ Wrap-up ──────┐
│ Eid Picnic     │ │ Halaqa Series  │ │ Toastm. May 25 │ │ Toastm. May 4  │
│ Jul 12         │ │ Jun 15         │ │ ▒▒▒▒▒▒░░ 6/8   │ │ ▒░░░░░░░ 1/5   │
│ no playbook    │ │ ▒▒▒░░░░ 2/9    │ │                │ │ post-event     │
├────────────────┤ ├────────────────┤ │                │ │                │
│ Speaker Night  │ │ Game Night     │ │                │ │                │
│ Aug 4          │ │ Jul 2          │ │                │ │                │
│ no playbook    │ │ ▒░░░░░░ 1/6    │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘

────────────────────────────────────────────────────────────────────────
PAST EVENTS                                           ▾ expand · 47 total

[ collapsed by default — click to expand a reverse-chronological list of
  every event whose workflow is complete OR whose date has passed without
  a workflow. Each row: title, date, location, status badge:
  "✓ Completed" / "no playbook" / "wrapped up <date>". ]
```

#### 4.3.1 Kanban section (top)

- **Columns = the org's event stages** (default seed: Scoping / Pre-event / Day-of / Wrap-up — owner-renamable from `/admin/event-stages`).
- **Card placement is auto-derived** from the workflow's progress: the card sits in the first stage that has at least one task in `todo` or `in_progress`. No manual drag-to-advance — to advance an event, finish its current stage's tasks.
- Events **without a workflow whose date is still in the future** stack in Stage 1 (Scoping) with a small `no playbook` chip — the cue to apply one.
- Events whose **every task is `done` or `skipped`** drop out of the Kanban entirely and move to the Past Events section. Same for events whose date has passed and no workflow was ever applied. Date matters here only as a fallback — if you applied a workflow, completion (not date) decides.
- Cards within a column sort by `event.starts_at` ascending (soonest first).

##### How events advance

The Kanban has **no drag-to-advance**. The tasks ARE the source of truth — the column an event is in is just a projection of "which tasks are still open."

Concretely, on every render:

```
for each upcoming event with a workflow:
  for stage in event_stages (sort_order asc):
    if any task in (this workflow, this stage) has status in (todo, in_progress):
       → place the event card in this column
       → stop
  if no stage matched (every task is done/skipped):
       → drop the event off the Kanban, send to Past Events
```

So: finishing the last open Pre-event task on an event whose Day-of tasks are still `todo` will slide the card from Pre-event → Day-of on the next visit. Completing the last Wrap-up task drops it to Past Events.

A task drag *within* the per-event task Kanban (§4.4.1) does move a task between stages by changing its `event_stage_id`, but that's a task-level operation; the event's position recomputes from the resulting task layout.

#### 4.3.2 Past Events section (below)

- **Collapsed by default** to keep the Kanban as the visual focus. Tap the header to expand.
- Reverse-chronological list of events **not in the Kanban above**. An event lands here when either:
  - its workflow's tasks are all `done` or `skipped`, OR
  - its date has passed and no workflow was ever applied.
- Each row: title, date, location, status badge:
  - `✓ Completed` — workflow finished. Shows `wrapped up <date>` (the latest task completion date).
  - `no playbook` — date passed, no workflow ever applied.
- Click row → `/event/[id]`.
- Sort toggle in the header: by wrap-up date (default) or by event date.
- Search box at the top of the section filters live across titles.

> No overlap with the Kanban — every event lives in exactly one of the two sections. The Kanban is "what we're working on"; Past Events is "the archive."

### 4.4 Event detail (new route)

**`/event/[google-event-id]`** — the new "click an event" landing.

Sections, top to bottom:
1. Breadcrumb: Events › *Event title*
2. **Event metadata** — title, date / time / location, description, Register button + Tags chips (parsed from description as today). "Open in Google Calendar" link. **Read-only toggle** in the top-right; default off (everything editable). When on, checkboxes / assign dropdowns / drag handles all disable.
3. **Task Kanban** — see §4.4.1. The main content area.
4. **Attached files** — small grid of resources linked to this event (see §5.5).

#### 4.4.1 The task Kanban

Same four columns as the Events Kanban (same `event_stages`), but the cards inside are **tasks belonging to this event's workflow**, not other events.

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ IDEATION   3/4  │ PRE-EVENT  1/6  │ DAY-OF     0/5  │ WRAP-UP    0/2  │
│                 │ ▌current        │                 │                 │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ ☑ Decide date   │ ☑ Make flyer    │ ☐ Setup chairs  │ ☐ Send recap    │
│ ☑ Pick speaker  │ ☐ Recruit vols  │ ☐ Bring HDMI    │ ☐ Archive notes │
│ ☑ Set time      │ ☐ Order food    │ ☐ Mic check     │                 │
│ ☐ Final budget  │ ☐ Print signs   │ ☐ Welcome desk  │                 │
│                 │ ☐ Reminder #1   │ ☐ Take photos   │                 │
│                 │ ☐ Reminder #2   │                 │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

- **Current-stage marker**: same definition as the Events Kanban — first stage with any open task. Shown with brand-tint left border + `▌current` label.
- **Same view regardless of when the event is**. No date-based behavior. Owner toggles read-only manually if they want to lock a wrapped-up event.
- **Per-card actions** (when not read-only): toggle status (todo ↔ in_progress ↔ done), reassign, change due date, delete. Optimistic with toast on error.
- **Drag-to-move**: a task card can drag between stages (changes its `event_stage_id`). Useful when a task gets misclassified. Drag handles render only in edit mode.
- **Mobile (`< md`)**: the Kanban flips to a single-column accordion of stages (current one auto-expanded) — horizontal scrolling four wide columns isn't usable on a phone.

If no workflow is attached yet, the Kanban area shows an empty state with an **"Apply a playbook"** picker.

#### 4.4.2 Future: Day-of mode (not in 7)

On the day of an event, the detail page will offer a "Switch to Day-of mode" toggle that swaps the Kanban for a **run-of-show view** — chronological schedule of the day's segments, who's running each, real-time check-off, big touch targets for stage staff on a phone. Out of scope for Phase 7; noted here so we don't paint ourselves into a corner.

### 4.5 The Resources module (`/resources`)

Lightly changed:
- Landing route `/resources` shows the grid of spaces (what's currently on Home).
- Each space still lives at `/c/[slug]` (no URL change).
- The sidebar's `Resources ▾` expander shows the spaces inline so you can jump to one without bouncing through the landing.
- Inside a space and inside a page, the breadcrumb chain becomes Resources › [Space] › [Page].

### 4.6 The Members / Finances modules

Placeholder pages for 7a:
- Route exists (`/members`, `/finances`).
- Renders a centered card: brand icon + "Coming soon" + a one-liner about what's planned (e.g. "Roster, attendance, parent contacts.").
- Clicking the sidebar item is allowed; we just want users to see a coherent shape, not a dead link.

---

## 5. Workflows — data model + behavior

### 5.1 Terminology

- **Playbook template** — a reusable, owner-managed checklist organized into stages. Lives independently. Example: "Event prep playbook."
- **Workflow** — an instance of a playbook applied to a specific thing (today: a Google Calendar event). Has its own copy of stages + tasks so editing the template doesn't retroactively change live workflows.
- **Stage** — a named ordered grouping of tasks ("Scoping", "Pre-event", "Day of", "Wrap-up").
- **Task** — one checkable item.
- **Automation rule** — a trigger + action paired to a template (fires when applied to a workflow).

> Note: this overlaps with the existing seeded space "Playbooks & SOPs", which holds *documentation* (pages about how to do things). Different concept; same word. The doc-space gets renamed to **"SOPs"** to remove the collision.

### 5.2 Tables

Org-wide stages live in their own table; templates and workflows reference them rather than copying. Owner can rename + reorder + add stages from `/admin/event-stages`; all live workflows reflect the change instantly.

```
event_stages
  id, name, sort_order, created_at, updated_at
  -- seeded: Scoping (1), Pre-event (2), Day-of (3), Wrap-up (4)
  -- owner-renamable + reorderable from /admin/event-stages

playbook_templates
  id, name, description, created_by, created_at, updated_at, archived

playbook_template_tasks
  id, template_id (FK)
  event_stage_id (FK event_stages)     -- which stage this task belongs to
  title, description, sort_order        -- sort_order is within (template, stage)
  default_offset_days                   -- relative to workflow.starts_at; nullable
  default_assignee_role                 -- 'any' | 'owner'

workflows
  id, template_id (FK, nullable for ad-hoc), name
  target_kind        -- 'event' for now; future: 'page' / 'space' / 'standalone'
  target_ref         -- google event id (text) for events; uuid for wiki entities
  starts_at          -- anchor timestamp for relative due dates (event start, by default)
  created_by, created_at, updated_at, archived

tasks
  id, workflow_id (FK)
  event_stage_id (FK event_stages)     -- direct reference; no per-workflow stages table
  title, description, sort_order
  status             -- 'todo' | 'in_progress' | 'done' | 'skipped'
  assigned_to        -- FK profiles, nullable
  due_at             -- absolute timestamptz, nullable
  completed_at, completed_by
  created_at, updated_at

automation_rules
  id, template_id (FK)
  trigger_kind       -- 'before_workflow_start' | 'after_workflow_start'
                     -- | 'on_task_complete' | 'on_workflow_complete'
  trigger_offset_minutes -- relative to workflow.starts_at; null for on_* triggers
  trigger_task_id    -- for on_task_complete only
  action_kind        -- 'send_email'   (room for 'apply_playbook', etc. later)
  action_config      -- jsonb: { to: 'assignees' | 'owner' | <explicit list>, subject_template, body_template }
  enabled

automation_runs
  id, rule_id (FK), workflow_id (FK), task_id (FK, nullable)
  scheduled_for      -- when we plan to fire
  fired_at, status   -- 'queued' | 'sent' | 'skipped' | 'failed'
  error_message
  created_at
```

**Why no per-workflow stages table:** stages are org-wide. A workflow's "stage breakdown" is just `tasks.event_stage_id` grouped. Renaming "Pre-event" → "Planning" at the org level updates every existing workflow's column header automatically. Adding a stage is owner-allowed; deleting one is blocked while any task still references it.

**RLS pattern:**
- `event_stages`, `playbook_templates*`, `automation_rules` — read all authenticated; mutate owner-only.
- `workflows`, `tasks`, `automation_runs` — read all authenticated; insert/update any active member; hard-delete owner-only. Soft-delete via `workflows.archived` (cascades to tasks visually).

### 5.2.1 Chaining playbooks (deferred-but-supported)

A future automation `action_kind` of `apply_playbook` lets one workflow's completion trigger a second playbook being attached to the same event — giving you "sub-stages within a stage" without bloating the stages table. Schema already supports it; UI ships in Phase 8 if we want it.

### 5.3 Apply-template flow

1. User clicks "Apply playbook" on `/event/[id]`.
2. Picks a template from a dropdown of non-archived templates.
3. Server action `applyPlaybookAction(templateId, googleEventId)`:
   - Inserts a `workflows` row with `target_kind='event'`, `target_ref=googleEventId`, `starts_at = event.starts_at`.
   - Copies template tasks into `tasks` carrying `event_stage_id` through unchanged. Each task's `due_at = starts_at + default_offset_days * 1 day` if the offset is set, else null.
   - For each `automation_rule` attached to the template: insert one `automation_runs` row with `scheduled_for` computed from the trigger.
4. Redirect to the same `/event/[id]` page; the new workflow now renders.

### 5.4 Surfaces

| Surface | What it shows |
|---|---|
| `/event/[google-event-id]` | Workflow Kanban (§4.3.1) for that event, or "Apply" picker if none attached. |
| Sidebar → **Tasks** (new in 7c) | Global "My tasks" view: tasks assigned to me, grouped by `due_at` (Today / This week / Later / Overdue). Cross-event. |
| `/admin/playbooks` (new) | Owner-only CRUD for playbook templates. List, edit, archive. Edit screen has the stages + tasks + automation-rules editor. |

### 5.5 Files attached to events

New join table:

```
event_files
  google_event_id   text not null
  resource_id       uuid not null FK → resources(id) on delete cascade
  attached_by       uuid FK → profiles(id) on delete set null
  attached_at       timestamptz not null default now()
  primary key (google_event_id, resource_id)
```

Picked over a soft tag in `description` because we'll need it indexed for the "Attached files" section on the event detail page, and it survives renames / edits of the file's description. "Attach file" picker on `/event/[id]` writes a row; "Detach" deletes it (the resource itself stays in its space).

### 5.6 Seeded "Event prep" playbook

Migration `0008` inserts one starter playbook template so the templates list isn't empty on first run. The owner can rename it, edit tasks, delete it entirely — nothing depends on it staying intact.

**Template:** *Event prep* — "Default checklist for planning any BYA event. Edit freely."

Tasks (organized by stage, with default offsets relative to event start):

| Stage | Task | Offset |
|---|---|---|
| Scoping | Decide event date | −30d |
| Scoping | Pick speaker / topic | −28d |
| Scoping | Confirm location | −25d |
| Scoping | Draft budget | −24d |
| Pre-event | Create flyer | −21d |
| Pre-event | Post flyer to Instagram + WhatsApp | −18d |
| Pre-event | Open registration | −14d |
| Pre-event | Recruit volunteers | −10d |
| Pre-event | Order food / supplies | −7d |
| Pre-event | Send reminder #1 | −3d |
| Pre-event | Send reminder #2 | −1d |
| Day-of | Arrive early, set up room | 0 |
| Day-of | Sound / mic check | 0 |
| Day-of | Welcome / sign-in table | 0 |
| Day-of | Take photos | 0 |
| Day-of | Run program | 0 |
| Wrap-up | Pack up | +1d |
| Wrap-up | Send thank-you email | +2d |
| Wrap-up | Post recap on Instagram | +3d |
| Wrap-up | Archive notes + photos to Drive | +5d |
| Wrap-up | Reconcile expenses | +7d |

All tasks default to `default_assignee_role = 'any'` (no specific person; whoever picks it up). No automation rules attached in the seed — adding email reminders is the owner's call in Phase 7d.

---

## 6. Automation engine

Three pieces: a **trigger schedule** (when do we fire), an **action runner** (what does it do), and an **execution log** (`automation_runs`).

### 6.1 Triggers

Four kinds, all expressed in terms of an anchor on the workflow:

| `trigger_kind` | Fires when | Used for |
|---|---|---|
| `before_workflow_start` | `now() >= workflow.starts_at - offset` | "Email everyone 3 days before the event" |
| `after_workflow_start` | `now() >= workflow.starts_at + offset` | "Email the speaker 1 hour after" (rare) |
| `on_task_complete` | a specific task transitions to `done` | "Email volunteers as soon as the flyer is approved" |
| `on_workflow_complete` | all tasks in a workflow are `done` / `skipped` | "Send recap to the team" |

`before_/after_workflow_start` triggers are pre-scheduled at apply time into `automation_runs`. The cron job picks up `automation_runs` rows where `scheduled_for <= now()` and `status = 'queued'`, runs them, sets status.

`on_task_complete` and `on_workflow_complete` fire synchronously from the relevant server action (no scheduling needed) and write a row to `automation_runs` for audit.

### 6.2 Actions (v1)

Only `send_email` initially.

`action_config` (jsonb) shape:
```json
{
  "to": "assignees" | "owner" | ["a@b.com", ...],
  "subject_template": "Reminder: {{event.title}} is in 3 days",
  "body_template": "Hi,\n\n{{event.title}} starts at {{event.starts_at_local}}.\n\nOpen tasks: {{tasks.open_count}}.\n\n— BYA Wiki"
}
```

Mustache-style templating with a small fixed variable set: `{{event.title}}`, `{{event.starts_at_local}}`, `{{event.location}}`, `{{event.url}}`, `{{tasks.open_count}}`, `{{tasks.done_count}}`, `{{assignee.display_name}}`. No arbitrary code.

### 6.3 Email provider

**Resend** (`resend.com`). Reasons:
- Modern, sane API; the SDK is one POST.
- Free tier: 3,000 emails / month, 100 / day — plenty.
- Native React Email templates (we won't use them in v1; plain markdown→HTML is enough).

Setup steps (owner does once):
1. Create a Resend account.
2. Verify a domain (`mail.bilalmasjid.com` or whatever) by adding DNS records.
3. Generate an API key.
4. Paste into `RESEND_API_KEY` env var (server-only) in `.env.local` + Vercel.

If domain verification is too much friction for v1, Resend's `onboarding@resend.dev` sender works for testing; only deliverability is iffy.

### 6.4 Cron

We need something that runs every ~5 minutes to drain due `automation_runs`. Options, ranked:

1. **Vercel Cron** (paid plan — $20/mo Pro) — simplest, native to our hosting.
2. **Supabase `pg_cron`** — free, runs inside the database. Calls a Postgres function that... still needs to make an HTTP call to send email. Possible via `pg_net`, but adds DB-resident logic.
3. **GitHub Actions on schedule** — free, calls our `/api/cron/run-automations` endpoint with a shared secret. Quirk: GH Actions schedule has 10+ min delay in practice.
4. **External free cron** (`cron-job.org`, `EasyCron`) — one HTTP webhook every 5 min. Works on Hobby.

**Default for v1: option 4** (cron-job.org) — keeps us on Vercel Hobby; one endpoint with a bearer-secret guard. Upgrade to Vercel Pro when we outgrow it.

### 6.5 The cron endpoint

`POST /api/cron/run-automations`
- Header `Authorization: Bearer <CRON_SECRET>` (env var)
- Loads `automation_runs where status='queued' and scheduled_for <= now() limit 50`
- For each: resolves recipients, renders template, calls Resend, updates the row
- Returns `{processed, sent, failed}` JSON

### 6.6 Failure / retry

If a Resend call fails, the run goes `status='failed'` with the error message. No auto-retry in v1 — owner sees failures in a new `/admin/automations` log view and can manually re-fire if needed. (Auto-retry with backoff is easy to add later.)

---

## 7. Build phases

Each ships independently — DB migration → code → user test → push.

### Phase 7a — IA restructure (small schema: event_stages seed)

- New sidebar: Modules section (Events / Resources / Members / Finances) with Resources expandable to show spaces.
- New routes:
  - `/events` → single page with Kanban on top + collapsible "All events" list below (no sub-views, no calendar).
  - `/event/[google-event-id]` → event detail (metadata + read-only toggle; Kanban + attached files render as empty placeholders pending 7b/7d).
  - `/resources` → grid of spaces (the old Home grid).
  - `/members`, `/finances` → "Coming soon" placeholders.
- `/` redirects to `/events`.
- Migration `0007_event_stages.sql`: creates the `event_stages` table seeded with the four defaults (Scoping / Pre-event / Day-of / Wrap-up) + owner-only RLS. No other Phase 7 tables yet.
- Owner admin: `/admin/event-stages` — rename / reorder / add / delete (blocked if tasks reference the stage).
- Sidebar mobile: bottom-bar with Events / Resources / Search / More.

**Acceptance:** sidebar shows all four modules with Resources expandable; `/events` shows the Kanban placeholder (4 empty columns) plus the Past Events list populated with events whose date has passed; clicking any event row lands on `/event/[id]`; coming-soon pages render; `/admin/event-stages` lets owner manage the four stages.

### Phase 7b — Playbook templates + workflow instances + manual checkmarks

- Migration `0008`: `playbook_templates`, `playbook_template_tasks`, `workflows`, `tasks` + RLS. (No per-template / per-workflow stages tables — tasks reference `event_stages` directly.)
- **Seeded "Event prep" playbook** (§5.6) — inserted by the same migration. Fully editable by the owner from `/admin/playbooks`.
- `/admin/playbooks` — list + create + edit template. Template editor groups tasks by `event_stage_id`; reorder within a stage via up/down arrows (drag deferred to a polish pass).
- `applyPlaybookAction` + picker on `/event/[id]`.
- Task Kanban on `/event/[id]` (§4.4.1).
- Events Kanban on `/events` (§4.3.1) — cards' column placement = workflow's current stage.
- Past Events list on `/events` updates as workflows complete.

**Acceptance:** owner applies the seeded "Event prep" playbook to a real upcoming event; checks tasks off and watches the event card slide from Scoping → Pre-event → Day-of → Wrap-up → Past Events.

### Phase 7c — Assignments + due dates + global Tasks view

- Add `assigned_to`, `due_at` to `tasks` (already in the migration in 7b — wire UI).
- Per-task: reassign dropdown (picker of active members), set/clear due date.
- Template-level: `default_offset_days` field per template task; auto-populates due date at apply time.
- New profile menu link: **Tasks** → `/tasks` showing my-assigned tasks grouped by Today / This week / Later / Overdue.
- Overdue badge on `/event/[id]` workflow card and `/c/events` widget.

**Acceptance:** owner assigns a task to an editor; editor sees it in /tasks; due-soon highlight works.

### Phase 7d — Automation rules + Resend + cron

- Migration `0009`: `automation_rules`, `automation_runs`.
- Owner steps through Resend domain verification (out-of-band). Paste `RESEND_API_KEY` into `.env.local` + Vercel.
- Template editor: add "Automations" tab. Form to define rules (trigger_kind, offset, recipient set, subject + body templates with the variable picker).
- `applyPlaybookAction` enqueues `automation_runs` for `before_/after_workflow_start` rules.
- `setTaskStatusAction` + `setWorkflowStatusAction` synchronously evaluate `on_task_complete` / `on_workflow_complete` rules.
- New route `POST /api/cron/run-automations` (bearer-secret) drains the queue.
- Owner sets up cron-job.org (or chosen provider) — README documents the steps. URL + secret pasted into provider, every 5 min.
- New `/admin/automations` view: log of runs with status + error + manual re-fire.

**Acceptance:** rule "send email 3 days before workflow start to assignees" fires reliably; failures show in admin log.

---

## 8. UX rules of thumb (apply throughout 7a–d)

- **Mobile-first** still. Sidebar collapses to a sheet on mobile; calendar shrinks gracefully; task lists are thumb-friendly.
- **Optimistic UI** for checkmarks. Toggle is local-state-first, reconciles with the server.
- **Soft-delete by default**. Templates archive instead of hard-deleting; workflows the same. Owner can hard-delete from Trash later.
- **Server-enforced gates**. Template CRUD = owner. Apply playbook / check tasks = any active member. Resend / cron secrets = service-role only.

---

## 9. Performance + ops notes

- Calendar agenda already uses the cached ICS feed; no extra cost.
- `automation_runs` table can grow; index `(status, scheduled_for)`; archive completed rows older than 90 days via a daily Postgres job.
- Email cost is negligible at our scale (10–25 users × handful of events / month).
- Resend usage stays well within free tier.

---

## 10. Decisions

### Locked in this draft
- **Name:** Categories → **Spaces** in UI. Table + URL stay.
- **Sidebar shows all spaces.** No pinning system in v1.
- **Event click target:** `/event/[google-event-id]` wiki-side detail (not Google Calendar direct, not a drawer).
- **Email provider:** Resend.
- **Cron:** external (cron-job.org) initially to stay on Vercel Hobby. Switch to Vercel Cron when we move to Pro.
- **Templating:** Mustache-style with a fixed variable set, not free JS.
- **Stages are part of the schema** (not just sort_order on tasks). Worth the extra table for clearer UX + nicer rendering.

### Resolved in this round
- **App is a workspace, not a wiki** — top-level Modules (Events / Resources / Bike Rack / Members / Finances), the last three as "Coming soon" placeholders shipped in 7a.
- **Sidebar nav, not top tabs.** Resources expands to show spaces inline.
- **`/` redirects to `/events`** — no separate home/dashboard.
- **Stages model = Option A: org-wide stages** in a single `event_stages` table, all playbooks share them, all workflows reference them directly. Owner manages from `/admin/event-stages`.
- **Stage placement is auto-derived from workflow progress.** No manual drag-to-advance on the Events Kanban.
- **Default seeded stages:** Scoping / Pre-event / Day-of / Wrap-up. Owner can rename.
- **"Completed" = workflow has zero open tasks** (regardless of event date). Wrap-up tasks keep an event on the Kanban until done.
- **No Calendar sub-view** on `/events`. Single-page Kanban + collapsible Past Events list below. Calendar view dropped from scope.
- **Past Events list shows ONLY events not on the Kanban** — no overlap. An event is in exactly one of the two sections at any time.
- **Ship a seeded "Event prep" playbook** with the migration in 7b. Fully editable; owner can wipe it and start fresh if they want. Spec in §5.6.
- **Sub-stage flexibility comes from automation chaining**, not from per-template stages — see §5.2.1.
- **Event view = Kanban** of tasks grouped by stage; same regardless of event date; manual read-only toggle.
- **File-to-event linkage** — real join table `event_files`.
- **Template editor uses up/down arrows** for now; drag-to-reorder deferred to a polish pass.

### Future, noted but not designed
- **Day-of mode** on the event detail page (§4.4.2): a chronological run-of-show view that takes over the screen on event day for live use. Phase 8+.
- **Workflow chaining** via automation `apply_playbook` action — "sub-stages" without bloating the stages table.
- **Bike Rack module** — an "ideas" parking lot separate from the Events calendar. Items have no date and no workflow. Promoting an idea = creating a Google Calendar event + (optionally) auto-applying the Event prep playbook. Frees the Events Kanban Stage 1 (Scoping) to mean "scheduled, locking in details" rather than "rough idea." Phase 8+.
- **Reimbursements** — first surface under the Finances module. Members submit claims (title, amount, receipt file, optional event link); owner approves / denies / marks paid. Per-event surface on `/event/[id]` lists claims tied to that event. Permissions: members see only their own, owner sees all. Status flow `draft → submitted → approved|denied → paid`. Schema sketch: `reimbursements(id, submitter_id, event_ref nullable, title, amount_cents, receipt_storage_path, description, status, approved_by/at, paid_by/at, payment_method)` + a `reimbursement-receipts` Storage bucket. Automation tie-in: when an event's "Reconcile expenses" task is checked, surface any unapproved reimbursements for that event so they don't get lost. Open questions: (a) editors see each other's claims? — leaning no; (b) per-event budget tracking — defer until we see whether reimbursements alone fill the need.
- **Event types** (next playbook iteration) — add an `event_type` field on `workflows` (and eventually on `events`); per-type `default_playbook_id` so applying the right checklist becomes automatic on event creation. Builds on the per-event-type playbook organization the owner is starting now.

### Still open
*None — all decisions are locked. Ready to start Phase 7a.*

---

## 11. Out of scope (deferred to later)

- **Day-of mode** (the chronological run-of-show view — §4.4.2).
- **Bike Rack + Members + Finances modules** — only placeholders ship in 7a.
- Multi-workflow attachment to one event (single workflow at a time; chained via automation in the future).
- Workflows on pages or standalone (target_kind other than 'event'). Schema supports it; UI doesn't expose it yet.
- Per-user notification preferences (email digest cadence, mute, etc.).
- SMS / push notifications.
- Real-time collaboration on task edits.
- Recurring workflows that auto-apply to recurring Google events.
- Reporting (which workflows finish on time, which tasks are chronically late, etc.).
- Public read view of workflows (everything stays internal-only).
- Drag-to-reorder in the playbook template editor (up/down arrows ship in 7b).
- A calendar / month-grid view of events. Removed from Phase 7; can come back as a sub-tab later if anyone misses it.

---

*End of Phase 7 spec.*
