# BYA Workspace Revision — Living Design Doc

> **Status:** 🟡 Living draft — brainstorming in progress. Nothing here is built.
> Last consolidated 2026-06-15. Running record of the big revision; we add as we
> talk. (Earlier versions explored a PM-stage kanban; we dropped stages entirely —
> see §4–§5. This is the clean current state.)

---

## 1. Vision

Turn the BYA wiki into a **proper org workspace** — not just a place to *view*
information, but a place to **work**: put things "on paper" so people don't have
to hold it all in their heads.

A **SaaS web app, mobile- and desktop-friendly**, made of many **pillars**. The
ones named so far are the start, not the whole list.

| Pillar | What it's for | Priority |
|---|---|---|
| **Plan** | Create programs, charter, tasks/subtasks, assignments, timeline. The frictionless-Jira part. | **NOW (to 99%)** |
| **Execute** | Attendance, registration, photo upload, IG/WhatsApp captions + scheduling, email scheduling, flyer/email templates, Twilio SMS. | **Next** |
| Reference (Wiki) | Org info, logo downloads, past-event materials. | Later |
| Finance | Budgets, reimbursements, donations, vendor payments. | Later |
| Bike Rack | Idea backlog not yet committed. | Later |
| SMS / Texting | Full texting interface (Twilio). | Later |
| Tasks view | Cross-program "my tasks." | Later |
| …more | Lots of features + integrations planned. | Later |

**Sequencing:** nail **Plan** first (this doc), then **Execute**, then the rest.

> **Revised:** "Execute" is **not a separate area or stage.** That functionality
> (publishing, registration, posting, attendance) lives **inside modules**
> (Communication, Quality, …). The app is organized by **modules**, not pillars;
> "Plan first" is just sequencing.

---

## 2. Core objects

- **Program** — the top-level unit (our "project"). One-off game night, 8-week
  halaqa series, 30-night Ramadan program — all just programs.
  - **One-off = a program with one session.** No separate "event" vs "recurring"
    concept; just programs with 1..N sessions.
- **Session** — an occurrence inside a program (1..N).
  - Fields: optional **Title** (defaults to program name), **date / time /
    location**, **audience**, **gender**, **registration link**, **description**.
  - date/time/location can be **tentative (TBD)** while planning.
  - **Audience + Gender** are structured (we filter by them).
  - Sessions can be **heterogeneous** (a visiting scholar's family lecture vs youth
    night vs YP coffee = one program, three different sessions).
- **Task** — a unit of work in the program's **unified task list** (§5.2). Two
  kinds: **simple** (a checkbox) and **action** (structured, with fields +
  utilities + an optional bot that runs it — §5.4). Has subtasks; optional link to
  a session; assignable to a person **or a bot**.

---

## 3. Information architecture

**No stages anywhere.** Two levels:

- **Top level — Active / Completed** (§4). A simple two-bucket list of programs;
  no kanban, no PM stages.
- **Inside a program** (§5):
  - **Main view** — charter + session(s) as a compact header, then the **unified,
    color-coded task list** (List / Timeline / Board) as the body. Overview and
    Tasks are **one screen**, not two tabs.
  - **Module tabs** (Communication, Finance, …) — utilities + action setup;
    activating an action drops its task(s) into the list. *(Whether these stay
    tabs or collapse further = Open Q8.)*

> Build it **like Jira — minus the upfront friction.** Creating a program is a
> quick pop-up (§4.1), not a heavy form.

> ⭐ **North-star principle:** a program's page is a **management dashboard of
> tools**, not a task tracker. Opening a program gives you everything to *run* it —
> compose & schedule comms, manage the budget, book the room, track attendance —
> as working tools. **Each module tab is a tool surface** (Communication = a comms
> console, Finance = a budget tool, …), not a filtered task list. **Overview is the
> cockpit** (at-a-glance status, nudges, quick actions) — and **tasks are one
> instrument among several**, not the whole point. Utility-first.

---

## 4. Top level — Active / Completed

The whole-org overview (small team; everyone needs to see how every program is
going). Just two buckets — both **derived**, no manual status-dragging:

- **Active** — anything in flight. Sorted by next session date.
- **Completed** — the archive.

A program becomes Completed when all its sessions are in the past (and/or it's
explicitly marked complete — exact rule is Open Q1).

### 4.1 Creating a program (a lightweight pop-up)

- **Required:** only the **Program Name**. Nothing else is mandatory.
- **Optional, skippable charter prompts:** **About** ("What is this program?") and
  **Stakeholders** — free text, with suggested defaults to make them easy.
- **Type** picker defaulting to **"Default"** (§7). Submit → the program exists in
  **Active**, seeded by its type, and you land in its Overview.

The **Default** type seeds: **1 tentative (dateless) session**, the
**Communication** module enabled, and ~4 universal starter tasks (pick a date,
confirm location, make flyer, send reminder).

---

## 5. Inside a program

### 5.1 Main view (Overview + Tasks, one screen)
Fewer tabs > more, so the program's home combines what were "Overview" and
"Tasks":

- **Compact header:** program name + status, the charter answers (collapsible so
  they don't crowd the list), and the **session(s)** — title/date/time/location/
  audience/gender each (date/time/location may be tentative until Publish).
- **Body — one unified task list**, **color-coded by module** (not split into
  sections — just colors); manual tasks get a neutral "General" color. Views:
  **List · Timeline · Board** (Board = by *status*: To do / Doing / Done). Filter
  by module / assignee / session.
- A module-created task **links back** to its config (click "Write the email" →
  the composer). Utility stays *out* of the list but one click away.

### 5.3 Module tabs (the organizing spine)
Modules are the PM "planning areas," surfaced as **toggleable tabs**:

**Communication · Finance · Resources · Scope (WBS) · Quality** (set TBD — Open Q4)

- Enable the modules a program needs; each offers **action-tasks**.
- A module tab holds its **utilities + config** (templates, contact lists, the
  email composer, budget table, etc.).
- **Activating an action populates the unified task list** (color-coded), often
  auto-spawning subtasks. Example: Communication → enable **Email** →
  auto-creates "Write the email" + "Build the list," and a config panel for
  content / recipients / trigger.

### 5.4 Action tasks vs simple tasks
- **Simple task** — a checkbox ("reserve chairs").
- **Action task** — structured: its own **fields**, **utilities** (templates, past
  contact lists = institutional memory), and an optional **bot** that executes it.
  Filling out an Email action *is* both the planning and the bot setup — same act
  (§6). This is what makes the app a *doer*, not just a tracker.
- **Status:** every task is **To do / Doing / Done** (light 3-state — "Doing"
  shows what's in progress, which is what makes the Board view meaningful).
- **Action config lives in the module tab** (not a per-task drawer): you set an
  action's content / recipients / timing in its module, and the resulting task in
  the unified list **links back** to it.

---

## 6. Automations (bot tasks) + Publish

Two kinds of automation — keep them separate:

1. **Bot tasks** (the main one) — an automation **is an action-task whose assignee
   is a bot.** Adds a **trigger** (when) + **action** (what):
   - *Trigger:* relative to a date (anchored to a session/program), absolute, or
     (later) event-driven.
   - *Action:* send email / SMS (Twilio) / WhatsApp / post to Instagram / (more).
   - Sits in the same task list as human tasks; reassignable bot ↔ person.
   - **Recurring falls out free:** a bot task linked to sessions with a relative
     trigger fires **once per session** (one definition → N sends).
   - Configured inside the relevant **module** (§5.3).
2. **Plumbing** (deferred) — reactive background syncs that aren't to-dos
   ("registration came in → add to attendance"). Noted, not designed yet.

### 6.1 Publishing (a Communication-module action — NOT a standalone button)

Publishing a session to the public calendar is just one of Communication's
actions, **per session**. Two Google calendars are involved:
- **Admin calendar** — a private (non-public) calendar BYA already uses. A session
  lands here, tagged **`[DRAFT]`**, once it has a **date** — so the team tracks the
  pipeline in their own Google Calendar.
- **Main calendar** — public. **Publishing** (via Communication) creates the event
  on the main calendar and clears the `[DRAFT]` copy on the admin one.

### 6.2 Content scope — program vs session

A flyer (or caption / email) can attach to the **whole program** (one flyer shared
across all sessions) or to a **specific session** (its own flyer) — the same
program-vs-per-session split as bot tasks.

### 6.3 The Communication console (detail)

The Communication tab is a **console**, not a task list:

- **Channels / actions:** Email · Instagram · WhatsApp · Publish-to-calendar (SMS
  via Twilio later). Each done by a person or armed to a **bot** on a schedule.
- **Email has two audiences:**
  - **Listserv** — marketing emails to the full mailing list, to *drive registration*.
  - **Registrants** — reminder emails to people who registered, sent at set times
    *before* the event (scheduled bot sends).
  - **Engine = Resend** for *both* (reminders + marketing) — one provider.
  - **Composing = plain text for now** (sent via Resend). Rich drag-and-drop email
    design is a **deferred upgrade**: when we want it, go all-in with an embedded
    **Unlayer** builder (skip the half-step of Resend's own dashboard editor).
  - **Listserv = Resend Audiences** — grown via a Tally **opt-in checkbox** + a
    standalone subscribe form; hosted unsubscribe handles compliance.
- **Flyers** (managed here, with **thumbnails on the flyers page** so you see what
  you upload; an Overview preview is a *nice-to-have*, not required). A flyer has a **scope**
  (whole-program OR a specific session — a program flyer is *optional*; some
  programs are session-flyers-only) and a **type**: *Marketing/Registration, Recap,
  Cancellation, … Other*. UX: **"+ Flyer" → pick scope + type → upload.** Reusable
  (browse/duplicate past ones); IG/WhatsApp actions reference the relevant flyer.
- **Registration via Tally** (wired, not just a stored link): Tally feeds
  registrants into the app — making "email the registrants" real and feeding
  attendance. Pull mechanism: **webhook** (Tally → our endpoint, real-time)
  preferred; Google-Sheets sync as a fallback. *(Integration is a fast-follow.)*

**Where registrations live in the UI:** each **session row gets an expand arrow**
opening session-level **sub-tabs** — first is **Registrations** (others TBD: e.g.
Attendance, this session's flyers). Keeps session-specific data on the session
without giving sessions a whole separate page.

---

## 7. Program types

A **type** seeds a new program's defaults: its starter **tasks/modules** and its
default **tentative-session structure** (how many sessions to spin up).

- Editable **in the app**.
- Ship with one type: **"Default"** — one session, the minimal default set.
- More later (e.g. "Weekly series" → N tentative sessions) just change the
  defaults; nothing structural.
- A type **only seeds defaults at creation** — it does not constrain sessions
  (which stay heterogeneous; audience/gender live on the session).

---

## 8. Playbooks

A **playbook** is a reusable bundle of pre-made tasks (simple + action), with
subtasks, default assignees/roles, and relative due offsets. Applying one fills
the program's task list.

- **Apply anytime, stackable, mixes with manual tasks.**
- Each playbook task is scoped **once-per-program** or **once-per-session**
  (per-session tasks materialize for each session — the two-tier solution).
- The **default playbook** (per type) is what a new program starts with.
- **Open (Q5):** how playbooks and **modules** relate — both produce tasks. Likely
  a module *is* the home for its action-tasks and a playbook just pre-enables
  modules + drops in tasks. To reconcile.

---

## 9. Decisions — Locked

- **Multi-pillar workspace**, not just a wiki. **Plan** first, then **Execute**.
- **Program** = top-level unit; **one-off = 1-session program**.
- **Sessions** 1..N; optional title (defaults to program name); date/time/location
  may be **tentative**, required only to **Publish**; **audience + gender are
  session-level** (we filter by them); sessions can be **heterogeneous**.
- **No stages** — top level is just **Active / Completed** (both derived).
- **Creation = lightweight pop-up** — name required; charter questions optional/
  skippable with suggested defaults; type seeds defaults.
- **Inside a program = one main view** (charter + sessions header, then the unified
  task list) + module surfaces. Overview and Tasks are combined, not separate tabs.
- **One unified task list**, **color-coded by module** (not split), with **List /
  Timeline / Board** views; tasks link back to their module config.
- **Tasks = simple (checkbox) or action (structured + utilities + optional bot).**
  Subtasks; optional session link; assignable to person or bot.
- **Task status = To do / Doing / Done** (light 3-state); the Board view groups by it.
- **Action setup lives in the module tab**, not a task drawer; module-created tasks
  link back to it.
- **Module tabs sit at the top of the program** (Clio-style); first tab **Overview**
  holds charter + sessions + the unified task list; switching a tab swaps the panel.
- **Sessions render as a list** with a calendar date-block per row (not cards).
- **No standalone Publish** — publishing a session to the public calendar is a
  **Communication-module action, per session** (§6.1).
- **Two Google calendars:** a private **admin calendar** holds dated `[DRAFT]`
  sessions (team pipeline); publishing creates the event on the **main public
  calendar** and clears the draft.
- **Session fields:** title, date, time, location, audience, gender, registration
  link, description (date/time/location may be tentative).
- **Content (flyer/caption/email) is program-level OR session-level** (§6.2).
- **"Execute" is not a separate pillar/stage** — that functionality lives in modules.
- **Comms channels:** Email · Instagram · WhatsApp · Publish-to-calendar (SMS later).
- **Email has two audiences:** the **listserv** (marketing → drive registration)
  and **registrants** (scheduled reminders before the event).
- **Flyers** live in Communication (thumbnails): each has a **scope**
  (program/session; program flyer optional) + a **type** (Marketing/Registration,
  Recap, Cancellation, Other); "+ Flyer" → pick type; reusable across programs.
- **Registration = Tally, wired in** (webhook preferred, Google-Sheets fallback);
  registrants feed the app, surfaced via a **session expand-arrow → sub-tabs**
  (first one "Registrations").
- **Email engine = Resend** (reminders + marketing); **plain-text emails for now**,
  rich drag-and-drop (**Unlayer**) as a deferred upgrade. **Listserv = Resend
  Audiences** grown via Tally opt-in + a subscribe form (hosted unsubscribe).
- **Create a program with just a name** — everything else optional; type defaults to
  "Default." Charter prompts = About + Stakeholders (skippable). The chosen type
  seeds modules + starter tasks + tentative sessions; **Default** = 1 tentative
  session + Communication + ~4 starter tasks.
- **Modules** (Communication, Finance, Resources, Scope, Quality — set TBD) are
  toggleable tabs holding utilities + action config; activating an action spawns
  task(s).
- **Automation = bot tasks** (action-task + trigger + action), configured in
  modules; recurring = a session-linked bot task firing per session. **Plumbing**
  deferred.
- **Publish** = action that pushes `[DRAFT]` sessions → public Google Calendar
  (decoupled from any stage).
- **Program types** seed defaults; "Default" type = 1 session; editable in-app.
- **Playbooks** apply anytime, stackable, mix with manual tasks; tasks scoped
  once-per-program or once-per-session.
- **Build like Jira, minus the upfront friction.**

---

## 10. Open questions

1. **Active → Completed rule:** auto when all sessions are past, an explicit "Mark
   complete," or both (auto-suggest + confirm)?
2. **Timeline view anchor:** driven by session dates, task due dates, or both?
3. **Stakeholders:** internal members, external contacts, or free text?
4. **Module set:** which modules ship (are Scope/WBS + Quality real for BYA, or PM
   theory we cut?); can users add custom modules?
5. **Playbooks ↔ modules:** how they compose (see §8).
6. **Action-task config UX:** tabs vs inline panel vs drawer when setting up an
   action (content / recipients / trigger).
7. **Manual override:** any escape-hatch for program status, or purely derived?
8. **Module surfaces:** do modules stay as **tabs**, or collapse further — enable
   via a menu, with each action's config opening in a **drawer** from its task
   (and module-wide utilities like template libraries living… where)?

---

## 11. Deferred / future (noted, not designed now)

- **Execute pillar** in full: attendance, registration (Tally and/or our own
  forms), photo uploads, IG/WhatsApp captions + scheduling, email scheduling,
  flyer/email templates, Twilio SMS portal.
- **Reactive automation "plumbing"** (vs bot tasks).
- **Wiki / Reference**, **Finance/Reimbursements**, **Bike Rack**, **full SMS
  texting**, **cross-program Tasks view**.
- Smaller feedback to slot in: useful calendar view; in-app link to public
  `/r/events`; easy flyer download/save; timestamped comments/notes on tasks.

---

*End — living doc, will keep growing as we talk.*
