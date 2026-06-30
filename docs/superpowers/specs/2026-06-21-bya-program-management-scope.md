# Bilal Youth Group — Program Management App: Functional Scope

**Date:** 2026-06-21
**Status:** Scope definition (functions only — no design/layout decisions)
**Purpose of this doc:** Define *what the app does*, module by module, with the integration seams between modules made explicit. This is the stable functional contract to hand to design. It deliberately says nothing about visual design, layout, or styling.

---

## 1. What the app is

One place to run **Bilal's Youth Group program** end-to-end: plan it, divide the work, market it, communicate with people, track the money, hold the reference knowledge, manage gear, and put it all in front of the community.

It has **two faces**:

- **Internal** — organizers and volunteers, logged in, doing the work of running the group.
- **Outward** — youth, parents, and the public, mostly without logging in, seeing and engaging with what's on.

It is built as **independent modules wired to a shared spine**, not as one monolith and not as several apps sharing a login. Each module is coherent on its own; the seams between them are explicit (Section 4).

---

## 2. The spine — shared substrate

Every module reads and writes one of these two core entities. This is what makes it *one app*.

### Programs
The central noun. A "Program" is flexible enough to be any of:
- a **one-off event** (Eid festival, a single game night),
- a **recurring series** (weekly youth halaqa — individual sessions roll up under it),
- a **long-running initiative** (mentorship track, a sports league holding many events).

A Program carries: title, kind (event/series/initiative), date(s)/time, location, audience, description, status (draft / published). Everything else in the app attaches *to a Program*: its tasks, budget, materials, gear list, RSVPs, attendance, and history.

### People
Names, phone, email, and **list/group membership** (organizer, volunteer, RSVP'd attendee, member, custom lists). This is the contact backbone. RSVP feeds it, communications target it, forms write into it, gear checkout points at it.

**Identity rules:**
- Internal users have accounts (see Roles).
- Outward users (youth/parents/public) **do not** get accounts. RSVP and forms capture a name + contact and create/append a People record — no login, no personal dashboard.

---

## 3. Roles

| Role | Who | Can do |
|------|-----|--------|
| **Owner** | One account | Everything, plus org settings: users, integrations, module config |
| **Organizer** | Core team | Full planning power across all modules |
| **Volunteer** | Wider helper pool | Logs in, but mainly sees and completes tasks assigned to them |
| **Public** | Youth, parents, community | No account. Browse, RSVP, submit. |

---

## 4. Integration map (the nervous system)

How the modules touch. Most flow **through the spine**; a few are direct module-to-module seams. Design should treat these as real connections, not afterthoughts.

```
                         ┌──────────────────────────────┐
                         │            SPINE              │
                         │   Programs   ·   People       │
                         └──────────────────────────────┘
   reads/writes ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲
                │  │  │  │  │  │  │  │  │  │  │  │
  Plan&Schedule─┘  │  │  │  │  │  │  │  │  │  │  └─Browse (outward)
  Tasks────────────┘  │  │  │  │  │  │  │  │  └────RSVP (outward)
  Marketing───────────┘  │  │  │  │  │  │  └───────Engage/Submit (outward)
  Communications─────────┘  │  │  │  │  └──────────Attendance & Record
  Finances──────────────────┘  │  │  └─────────────Inventory
  Knowledge/Wiki───────────────┘  └────────────────Forms & Waivers

  Direct module-to-module seams (not through spine):
   • Marketing ──→ Communications   (a finished promo becomes a broadcast)
   • Marketing ──→ Browse           (published material feeds the public feed)
   • Forms ─────→ Attendance        (registrations become the attendance roster)
   • Inventory ↔ Programs           (per-event gear lists reserve stock, flag conflicts)
   • Finances ──→ Programs          (expense spend rolls up to program budget-vs-actual)
   • RSVP ──────→ Communications    (RSVP list becomes a reminder audience)
```

---

## 5. Internal modules

Each module below lists: **Purpose · Core functions · Reads from spine · Writes to spine · Direct seams.**

### 5.1 Plan & Schedule
- **Purpose:** Create and organize the calendar of programs.
- **Core functions:** Create a program (event / series / initiative); set date(s), location, audience, description; draft vs. publish; view the calendar; for series, manage individual sessions under the parent.
- **Reads spine:** Programs (the calendar itself).
- **Writes spine:** Programs (creates/edits them — this module *owns* the Program record).
- **Seams:** Publishing a program makes it eligible for Browse, Marketing, RSVP, reminders.

### 5.2 Divide the Work (Tasks)
- **Purpose:** Break a program into work and track who's doing what.
- **Core functions:** Add tasks to a program; assign to a person; due dates; status (todo / doing / done / skipped); reusable task templates ("playbooks") that drop a standard checklist onto a program; a per-person "my tasks" view.
- **Reads spine:** Programs (tasks belong to a program), People (assignees).
- **Writes spine:** task status/assignment (attached to Program + Person).
- **Seams:** Volunteer role lands here primarily.

### 5.3 Market It
- **Purpose:** Produce and distribute promotion for a program. *(Major build — distribution integrations are the heaviest single piece of the app.)*
- **Core functions:**
  - *Make materials:* attach externally-made assets (Canva, etc.) to a program **and** generate a graphic + draft caption from brand templates filled with the program's details.
  - *Distribute:* compose once → **auto-post to channels** (Instagram, email, WhatsApp) via their APIs.
  - *Timing:* schedule promo posts and reminders so nothing slips.
- **Reads spine:** Programs (details auto-fill the material; only published programs promote).
- **Writes spine:** materials attached to the Program.
- **Seams:** **Marketing → Communications** (a finished promo can be sent as a broadcast); **Marketing → Browse** (published material appears on the public feed).
- **Out of scope:** reach/click analytics (explicitly not a need).

### 5.4 Communicate
- **Purpose:** Direct, two-way messaging with people — distinct from Marketing's broadcast-to-the-world.
- **Core functions:**
  - *Automated reminders:* SMS/email to a program's RSVPs, triggered by event timing (day-before, hour-before, day-after follow-up).
  - *Two-way SMS inbox:* a shared group number (Twilio); people text in, organizers see the thread and reply.
  - *Broadcasts:* hand-write a message, send now or schedule, to a chosen list (all RSVPs, all volunteers, a custom list), over SMS and/or email.
- **Reads spine:** People (recipients, lists), Programs (reminder triggers, RSVP audiences).
- **Writes spine:** conversation history against People records.
- **Seams:** receives from **Marketing** (promo → broadcast) and **RSVP** (RSVP list → reminder audience).
- **Tech:** Twilio for SMS; an email sender for scheduled/automated email.

### 5.5 Money (Finances)
- **Purpose:** Replace the budgeting/accounting spreadsheet — tracking only.
- **Core functions:**
  - *Budget:* a yearly approved budget broken into line items (most line items **are programs** — Youth Night, Eid Festival, Guest Speaker, etc.); budget-vs-actual per line and overall; monthly view.
  - *Expense ledger:* transactions with date, vendor, amount, budget group/program, description.
  - *Reimbursements:* who paid (Person), status (owed / reimbursed).
  - *Receipts:* attach a receipt file to a transaction.
- **Reads spine:** Programs (a budget line / an expense is tagged to a program), People (who paid).
- **Writes spine:** spend rolls up to the program's actual-vs-budget.
- **Seams:** **Finances → Programs** (each program shows its budget and live spend).
- **Out of scope (permanent):** payment processing. **Money never moves through this app.**

### 5.6 Reference Knowledge (Wiki)
- **Purpose:** Hold the reusable stuff.
- **Core functions:** Rich docs (SOPs, policies, how-tos), organized in categories; contacts; uploaded files; search; draft/publish; soft-delete/trash.
- **Reads spine:** Programs (a doc/SOP can be linked from a program or a program type).
- **Writes spine:** none directly (reference layer).
- **Seams:** Programs → Wiki (attach the relevant SOP/playbook to a program). Internal-only; not public.

### 5.7 Forms & Waivers
- **Purpose:** Collect structured input from the community — especially **parental consent for minors**.
- **Core functions:** Build a form (registration, consent/waiver, sign-up); attach it to a program; collect responses; consent/waiver records retained against the person.
- **Reads spine:** Programs (a form belongs to a program/event).
- **Writes spine:** People (responses create/append People records and capture consent).
- **Seams:** **Forms → Attendance** (a registration form is the attendance roster); Forms → RSVP (registration *is* an RSVP).

### 5.8 Inventory
- **Purpose:** Stop losing track of gear and supplies.
- **Core functions:**
  - *Durable gear:* what we own and reuse (projector, speakers, tables, sports equipment, decorations) — storage location, condition.
  - *Checkout/return:* who currently has an item, signed out for which event, returned after.
  - *Consumables/restock:* quantity-on-hand for things that run out (cups, snacks, prizes, paper); reorder signals.
  - *Per-event gear lists:* a program's "what we need" list reserves items from stock and **flags conflicts** when two programs want the same item.
- **Reads spine:** Programs (gear lists attach to a program), People (who has an item).
- **Writes spine:** checkout points an item at a Person; reservation points it at a Program.
- **Seams:** **Inventory ↔ Programs** (reservations and double-booking conflicts).

### 5.9 Track & Record (Attendance + History)
- **Purpose:** Keep a record of what happened, to learn from and report on.
- **Core functions:** Attendance per program (who came); program history/archive; notes on how it went.
- **Reads spine:** Programs (the event), People (attendees), RSVP/Forms (the expected roster).
- **Writes spine:** attendance against People + Program history.
- **Seams:** **Forms/RSVP → Attendance** (roster becomes the check-off list).

---

## 6. Outward modules (mostly no login)

### 6.1 Browse What's On
- **Purpose:** Public window into the group.
- **Core functions:** Public calendar/feed of published programs with flyer, date, location, description.
- **Reads spine:** Programs (published only) + Marketing materials.
- **Seams:** fed by Plan&Schedule (publish) and Marketing (materials).

### 6.2 Register / RSVP
- **Purpose:** Let people sign up.
- **Core functions:** Sign up / RSVP to an event, capturing name + contact. No account created.
- **Writes spine:** People (new/appended record + list membership).
- **Seams:** **RSVP → People**, **RSVP → Attendance** (expected roster), **RSVP → Communications** (reminder audience).

### 6.3 Engage / Submit
- **Purpose:** Two-way door for the community.
- **Core functions:** Submit an idea, a question, or feedback to organizers.
- **Writes spine:** lands in an organizer-visible inbox (associated to a Person if contact given).
- **Seams:** organizers triage; may become a Program (idea) or a Communications reply (question).

---

## 7. Scope boundaries

**Permanently out of scope:**
- Payment processing — money never moves through this app (finances is tracking only).
- Internal member-to-member chat — Discord/WhatsApp already own that; don't compete with it.

**Parked for later (named so design isn't surprised if they return):**
- **Event check-in** — QR/roster check-in at the door feeding Attendance.
- **Approvals** — budget/event sign-off workflow before a program goes live (would seam Programs + Finances).
- **Leadership dashboard** — roll-up for the board: programs run, attendance trends, budget-vs-actual.

---

## 8. Module summary (one-glance)

| # | Module | Face | Spine touch |
|---|--------|------|-------------|
| 1 | Plan & Schedule | Internal | Owns Programs |
| 2 | Tasks | Internal | Programs + People |
| 3 | Marketing | Internal | Programs → Comms, Browse |
| 4 | Communications | Internal | People + Programs |
| 5 | Finances | Internal | Programs (+ People) |
| 6 | Knowledge/Wiki | Internal | Programs (links) |
| 7 | Forms & Waivers | Internal | People + Programs → Attendance |
| 8 | Inventory | Internal | Programs ↔ + People |
| 9 | Track & Record | Internal | Programs + People |
| 10 | Browse | Outward | Programs (published) |
| 11 | RSVP | Outward | People → Attendance, Comms |
| 12 | Engage/Submit | Outward | Inbox (+ Person) |
