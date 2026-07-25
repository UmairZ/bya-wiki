# BYA App — Goals & Scope (v2, living capture)

> **Status:** 🟡 Living capture — being built up chunk-by-chunk from owner braindump,
> started 2026-07-19. When complete, this supersedes
> `2026-06-21-bya-program-management-scope.md`. The 06-15 workspace-revision design
> doc will be reconciled against this afterward.

---

## 1. Purpose & philosophy

> **Foundational pivot (2026-07-24):** this section originally read "highly
> customized, not general-purpose — explicitly NOT a product anyone else could
> use." The owner has consciously revised that. The original principle's real
> content — *don't build anything with no real use to BYA* — survives unchanged.

- **North star: Planning Center for masjids.** The long-term goal is the
  mosque-vertical equivalent of Planning Center — church management software
  wins through church-specific quality-of-life; the masjid version (hijri-aware
  recurrence, Ramadan rhythms, prayer times, zakat, gender-separated program
  structures) doesn't exist. The owner won't be youth director forever; the
  trajectory is toward managing the masjid, and this is the system they'd wish
  existed then.
- **Strategy: build for BYA first, prove it, generalize later.** Horizon 1 is
  this entire doc — one department's app, every feature earning its place
  through real BYA use, with Planning Center as a design reference. Horizon 2
  is masjid-wide; Horizon 3 is other masjids. No speculative features, no
  premature multi-tenancy: a system proven by one real department is the seed
  for the product; a product built before its first real user is how these
  things die.
- **Horizon-1 decisions stay horizon-1 decisions.** Choices premised on
  single-department scale (hard-coded native forms, hard-coded email templates,
  no builders) remain correct for Horizon 1 and get consciously revisited at
  generalization — not preemptively unwound now.
- **Codify tribal knowledge.** The owner currently runs processes manually, from
  memory, semi-standardized. The goal is to turn those into genuine workflows,
  automations, and written processes.
- **Succession is a first-class goal.** The processes get handed down to the next
  admin team, who improve/change them and hand them down again. The app is the
  vessel for that institutional memory — and succession-readiness at department
  scale is a rehearsal for the same property at masjid scale.

## 2. Two sections

| Section | What | Weight |
|---|---|---|
| **Internal** | The web app organizers/staff work in. Several big modules that must integrate tightly. | The bulk of the project. |
| **External** | A proper public youth website (§13). | |

## 3. Programming — the three pillars

Every program falls under (generally) one of three pillars; some serve multiple:

| Pillar | Purpose | Example |
|---|---|---|
| **Connect** | Connect youth with each other; bring them to the mosque | Weekly youth nights |
| **Grow** | Educate; spiritual growth; life skills | *(examples TBD)* |
| **Serve** | Give back — community service, volunteering | *(examples TBD)* |

> **Not an organizing principle for the app.** The pillars are how programming is
> thought about, not how the UI is structured. At most they surface as categories
> in a "new program from template" picker. Nothing else in the app organizes by
> pillar.

**Program templates noted so far** include a **Fundraiser** type (new for year 3
— e.g. Friday bake sales): just another program with a flyer, but its "form
link" is an external Zeffy donation page rather than a registration form.
Fundraisers are programs that *earn* rather than spend (§10).

**Template granularity principle (open — owner thinking on it):** program types
must be *specific enough that templates genuinely differ, but broad enough to be
reused regularly* — a template that fires once a year for one hyper-specific
event isn't a template. The eventual template list must pass this test.

## 4. Program archetypes (stakes spectrum)

Two ends of a spectrum, illustrated by real programs:

### Low-stakes recurring — e.g. weekly boys' youth night (Connect)
- Friday nights, ~2h: short reminder/lecture → activity/free time → pizza → home.
- Recurring, low-maintenance, cheap (pizza + occasional materials).
- Registration exists but is a *recommendation* — walk-ins welcome, whoever shows
  up shows up.
- Marketing = wide-net; no automated reminder blasts. Maybe a personal "you
  coming tomorrow?" text to a couple of kids.
- Because it's weekly, one low-attendance night is no big deal.

### High-stakes one-off — e.g. Ramadan overnight (once a year)
- 8–12 hours: iftar → overnight program → suhoor → Fajr → home.
- **Registration 100% required, no walk-ons.**
- On registration: confirmation **email + text** (both currently manual — must
  become automated).
- Reminders: **2 weeks before, 1 week before, night before** — each via text +
  email (currently manual — must become automated).

**Implication:** comms behavior is per-program-type, not global. Registration
always triggers confirmation text + email; reminder cadence varies from zero
(youth night) to 3+ (overnight).

## 5. Communications module

- **SMS:** Twilio for automated texting (confirmations, scheduled reminders).
- **Email: Resend + React Email (decided 2026-07-22, reconfirming the 06-15
  lock).** The app is the automation layer, so the provider is an API pipe +
  audience/unsubscribe compliance (Resend Audiences covers the listserv).
  Emails are authored as **React Email templates** — hard-coded per email type
  (confirmation, reminder, newsletter shell), same philosophy as native forms —
  compiling to email-client-safe responsive HTML, so no drag-and-drop builder
  is needed. New templates get real-client spot checks (Gmail mobile etc.)
  before use. Supersedes the old "plain text now, Unlayer later" note.
- **Registration forms — native primary, Tally secondary. (Decided 2026-07-19;
  revises the 06-15 doc's "Tally wired-in" lock.)**
  - Year 3 context: programming is now mostly recurring/repetitive on a
    consistent schedule (year 2 was experimentation — new event types monthly;
    that's over). Registration is rigid: the same forms, tied to specific
    program types, reused all year.
  - **Native forms** cover that bulk. A native form is **hard-coded per program
    type** — adding a new one is a code change, not a UI flow. Explicitly NO
    drag-and-drop form builder, no CMS-style form editing in the app.
  - **Tally stays as an integration** for genuinely new/experimental programs
    that need a bespoke form quickly.
  - **Revision (2026-07-19): anything involving money is external, via Zeffy**
    (the zero-fee nonprofit platform). Native forms can't take payment, and
    Stripe-style processing is deliberately out — at this program's scale the
    fees would be losing money for no reason. So:
    - **Paid registration** (Grow classes/workshops with $15–30 seat fees) →
      Zeffy form link.
    - **Donation links** (fundraisers) → Zeffy donation page link.
    - Native forms remain primary for everything *free*.
    - *(Technical note, parked: Zeffy can send every submission to a webhook —
      possible future ingestion path, not designed now.)*
- **Forms are standard building blocks, attachable per event (1..N):**
  - **Registration form** — the standard one, tied to program type.
  - **Liability form** — for camps/overnights, anything with transportation, or
    certain activities (e.g. archery). Parent-completed, needs an
    **e-signature** box. Kept as its own standard form rather than merged into
    registration — you tack multiple forms onto an event as needed.
  - **Registration is incomplete until ALL required forms are done** (e.g.
    registration + liability both submitted).
  - **Feedback form** — post-event, for some events; can target parents and/or
    kids.
- Staff can be assigned to comms work (send messages, set up message schedules).

## 6. Marketing module

- Per program: create flyer + registration form; publish flyer at a lead time
  that depends on the program (a month out for big programs; days-of-week for a
  youth night — flyer ready ~1 week ahead, published the prior Sunday for a
  Friday night).
- Flyer must always carry: location, time, date, and registration link (if
  registration applies).
- **AI-assisted flyer prompt generation (new key feature):** once program details
  are entered (date, time, location, speaker, multiple dates, activities, …), the
  app generates a ready-made design prompt — a **"Copy marketing prompt"
  button** — that the owner pastes into Claude design tooling. The prompt bakes in
  the standing requirements that today get retyped every time: dimensions
  (e.g. 1080×1080, 1:1), contact-info footer, reference to a past flyer's style,
  etc. Workflow: generate design → export to Canva → small human edits → done.
- **Deliberately not fully automated** — flyer creation keeps a human touch;
  only the prompt-assembly is automated.
- Flyer creation is assignable to staff.
- **Social media (added 2026-07-19):** integrations with **Instagram, Facebook,
  Threads, Twitter/X** — both feed posts and **stories**.
- **One promotion schedule per program:** the automated-marketing piece is a
  schedule covering all channels — when emails go out, when texts go out, when
  social posts go up, when stories go up.

## 7. Tasks & playbooks

- Recurring event types share a playbook: publish flyer, decide date, decide
  speaker/lecture-giver, decide activity owner, who picks up pizza, room setup,
  snacks, reminders — "always the same things to decide."
- **Apply a playbook to a program → task list auto-populates.** Tasks get
  assignees.
- **Playbooks are living, not static:** learnings from a run (always bring the
  soccer ball; arrive early to move the mic over) get added, so the playbook
  evolves forward. No changelog needed on the playbook itself.
- **Dual purpose — template + audit log:** each past program keeps its own
  instantiated task list, so you can look back at exactly what was done for any
  given run, while the playbook is the ever-evolving forward version.
- Explicitly more than an audit log — a Google Doc could do that; the point is
  applying the past to the future.

### 7.1 Task phases: before / during / after

Tasks fall into three phases relative to the event:
- **Before** — the organizational runway (e.g. make the flyer, build the
  registration form, purchase materials).
- **During** — day-of execution. These behave differently from normal PM tasks
  (§7.2).
- **After** — post-event work.

### 7.2 Run of show (day-of view) — concept, mechanism undecided

The core insight: running an event is more intense than normal project
management. A typical to-do line item has an assignee and a due *date*; day-of
work needs tracking **to the minute** — a far more zoomed-in view than any
day/month-granularity task list.

So: some kind of view, inside a specific program/day, where you can see the
run of show live on your phone — the schedule, who's doing what, when each
thing happens — with your own items surfaced first when logged in.

**Deliberately NOT decided yet** (owner: examples, not decisions):
- How the schedule is structured (timed sections? runner/supporter roles per
  section? something else entirely).
- Whether there's an explicit "event mode" or just an always-there view.
- Illustrative-only examples given: set up chairs, test the mic, water bottle
  just before the speaker finishes, questions prepared.

## 8. Event history & records

Replaces the current Google Drive system (folder per event → media subfolder,
receipts subfolder, plan doc + post-event-analysis doc), which "works" but forces
clicking into every folder/doc to see anything.

- **Browsable history of all past events**, viewable in one place: date,
  location, time, registration count, attendance count.
- **Roster detail per event:** who registered and showed, registered no-shows,
  walk-ins who never registered.
- **Staffing history too:** who the volunteers/staff were for each event — the
  no-show tracking applies to staff, not just kids.
- Each event keeps its media, receipts, plan, and post-event analysis attached
  in context (the things scattered across Drive today).

## 9. People (CRM) module

"I just want information on people." A CRM — the reporting metric layer and the
contact book in one. Contact kinds:

- **Guest lecturers / speakers** (incl. out-of-town): phone, email, who on the
  team is their primary point of contact / reached out last time, their event
  history.
- **Staff / volunteers:** contact info, which events they volunteered for, who
  reached out to them last time / whether anyone can.
- **Volunteer-hour tracking (decided 2026-07-22 — needed):** accumulate service
  hours per person from the events they worked (e.g. kids who need documented
  service hours). Details TBD.
- **Parents** and **kids** — full contact records.
- **Organizations** (partner youth groups, collaborators):
  - Contact record like any other, plus a **linked file store** (e.g. logos,
    tagged as such).
  - Program creation gets an optional **"in collaboration with"** picker over
    known organizations → marketing auto-attaches their info and offers their
    logos for download when making the flyer.
  - Partnership flavors: they market our materials, split costs, or **donate**.
    Tracking has-donated-before / donation potential is a loose idea — fit
    unclear (owner: "no idea how this fits, just a thought").

**People ↔ Programs linkage (decided 2026-07-22):** people are associated with
programs in a **role** — registrant, family member, staff, speaker,
organization, etc. Clicking a person shows every program/event they've been
involved in. This linkage is what resolved the speaker-cost question: a
speaker's fee lives in the *program's* ledger (§10); from the speaker's People
record you click through their programs and see what each one paid them. No
duplicate cost field on the person.

**Feeds marketing/comms:** People is the source for newsletters and listservs —
subscription groups like "volunteering opportunities," "weekly programming,"
"Ramadan-only programming," etc.

## 10. Finance — reimbursements

**Strictly internal** — behind staff login only, never a public surface. Only
people with staff accounts pay out-of-pocket and get reimbursed.

**Current manual flow being replaced:**
1. Staff buy something and hand/send the owner a receipt (photo or physical).
2. Owner photographs/scans it, uploads to Drive, adds a row to the accounting
   spreadsheet.
3. Getting the money, two variants:
   - **Batch:** owner compiles a spreadsheet of all reimbursements/expenses with
     the total + receipts attached → masjid **treasurer** reviews → sends owner
     the money → owner distributes to staff.
   - **Single person:** owner sends the cost + receipt + the person's phone
     number to the treasurer, who reimburses them directly.
   - In practice, treasurer→owner→distribute is usually easier.

**What the app should do:** staff submit reimbursement requests themselves
(amount + receipt upload), replacing the owner-as-middleman collection step. The
treasurer is outside the app — output still needs to reach them as a
reviewable package (the batch-total-plus-receipts artifact).

**Scope decision (2026-07-19): expenses yes, budgeting no.**
- **No budgeting module.** Full budget-vs-actual would just replace the existing
  Excel spreadsheet; budgeting stays outside the app.
- **Reimbursement requests are tied to an event/program** — they're part of the
  program. Since there's no company card, essentially every expense *is* a
  someone-spent-then-got-reimbursed transaction, so reimbursements double as the
  expense ledger for free.
- What this buys, "live": per-program expense totals ("what did we spend on this
  program?"), and year-level views — spend across all programs, spend by program
  type, where the money mainly goes.
- **Manual expense entry (decided):** for the several occasions where the
  organization pays a vendor/speaker directly with no reimbursement, a manual
  expense can be logged against a program — keeps per-program totals complete.
  Two record flavors, one ledger: reimbursement (has payee + status) and direct
  expense (no payee/status).
- **Income too, not just expenses (decided 2026-07-19):** some programs *make*
  money — paid-registration classes (seat fees via Zeffy) and fundraisers
  (donations via Zeffy). The per-program math must account for money in as well
  as out: **net = income − expenses**, not just an expense total. Still not
  budgeting — just recording what was actually earned/spent per program.

**Structure (decided 2026-07-22): accounting is both levels.**
- **Per-program:** each program has its accounting sub-section — its itemized
  ledger (e.g. a guest speaker's honorarium, flight, hotel, food as separate
  line items). Answers "what did X cost *at this event*."
- **Broader reporting module:** a standalone accounting/reporting section for
  cross-program questions. Transactions can be **linked to a person or
  organization** (in addition to their program), so reporting can show **all
  transactions related to a person/org**: total ever spent on a guest speaker,
  total an organization has donated, plus the year-level rollups already noted.
- This is also how **org donation tracking** lands: a donation is just an income
  transaction linked to the org; "has this org donated before / how much" is a
  report, not a feature.

**Vendors (2026-07-24):** the current spreadsheet has a **vendor** column (who
we paid — "Domino's", "Amazon", or a speaker's name) and a **description**
column (why — "guest speaker honorarium"). The app mirrors that: every
transaction has a payee + description. Payee resolution, kept deliberately
light:
- If the payee is a **person/org already in the CRM** (speaker, staff
  reimbursee, partner org) → link to that record.
- If it's a commercial **vendor** (Domino's, Amazon) → a lightweight vendor
  list: autocomplete over past vendors, create-on-first-use. This standardizes
  names (no "Dominos"/"Domino's Pizza" drift) and makes "everything we've ever
  bought from Domino's" a free report — WITHOUT promoting vendors to full CRM
  contacts with phone numbers and event history. They're just standardized
  labels.

**⚠ Complexity guard (owner, 2026-07-24):** accounting is the module most
likely to balloon. Even with the limited scope it can get convoluted. Design
rule: **simple is best — resist over-engineering.** The project's real risk
isn't the number of parts, it's making the parts work together as intended;
every cross-link (like transactions↔people) must earn its keep.

## 11. Staff access & permissions

- Staff have access: see their assigned tasks, the marketing module, the texting
  surface.
- Owner assigns work (flyers, message schedules, tasks).
- **Permissions model: pinned (2026-07-22).** Owner genuinely doesn't know what
  it should look like yet. Current reality to design from: the owner personally
  handles ~all logistics, 100% of finances, and marketing; staff contribute in
  meetings (feedback, event ideas) and **run events day-of**. So today the
  honest model is roughly "owner does everything; staff execute day-of" — the
  permissions design should start from that and grow, not presume a mature
  role matrix.

---

## 12. Development layer (LMS-flavored) — added 2026-07-24

The point of the group is **development**, not "come hang out, eat pizza, go
home." This layer makes the development trackable — for kids and for the
mentors who teach them. It borrows the *shape* of a learning management system
without pretending events are a school.

### The container is the program type
- A recurring program type/series (e.g. Boys Youth Nights, Boys Junior Youth
  Nights) behaves like a running "course." Granting a mentor access to the
  container grants the **entire history** of that series.
- **Past is read-only** for mentors; only admins can modify history.
- Each container holds three kinds of institutional memory, surfaced together:
  the **playbook** (how to run it), the **history + post-event debrief notes**
  (what happened, what worked), and the **materials** (what was taught/
  presented). A mentor prepping next week reads the artifact *and* the
  hindsight side by side — that pairing is what prevents starting from scratch.
- This container-scoped access is the leading candidate shape for the pinned
  permissions model (§11).

### Materials & the snapshot rule
- Working files live in **Google Drive** (shared drive) — the app is not a
  file-editing surface, and no version history is needed.
- **Hard rule: attaching a file to an event means freezing a snapshot copy,
  never linking a live file.** Otherwise editing this year's deck silently
  rewrites what history says was used last year. Flow: download a past
  artifact → edit → upload the copy to *your* event.

### Kid accounts (planned fully, implemented in phases)
- **Accounts are additive, never required.** Browsing, registering, and
  subscribing stay login-free; an account only unlocks personal things: my
  event history, my volunteer hours, my photos.
- **The CRM is the identity layer:** an account is just login credentials
  attached to an existing People record. This is why accounts can be designed
  now and shipped late with no rework.
- **Minors & consent:** creating an account for a middle/high-schooler requires
  parental consent, riding the existing consent-form machinery. Parent-accounts-
  with-kid-profiles vs. kid-accounts-with-captured-consent: TBD.
- **Photos, private by default:** full event albums attach to kids' accounts;
  the **public** galleries (§13) are curated — group shots / blurred only.
  Deliberate posture for minors.

### Quizzes & grading
- A "quiz" today = a **Tally form attached to an event** — zero new build.
- Native quiz/grading machinery: **deferred, likely to class-type (Grow)
  programs only** if it ever comes, as an enableable module. Not designed now.

### Sunday school — horizon, explicitly not scope
- Long-shot goal: the K–12 Sunday school (currently paper-based, politically
  separate) eventually folds under youth programming. Not soon; not certain.
- **Policy: don't build for it, don't foreclose it.** The existing shapes
  already fit (enrollment = registration, classes = programs with sessions,
  teachers = staff roles); grading is the only new primitive it would demand.
  If it happens, the app is ready; if not, nothing was wasted.

## 13. External — the public youth website

Not just event listings: a proper website where the community learns **what BYA
is, how it started, and who runs it**.

### Identity
- **"Bilal Youth Affairs" (BYA)** is a coined brand, not a registered entity —
  the actual state-registered nonprofit is **Bilal Masjid**; BYA is a department
  under it. The name exists so "who's running this program?" has a recognizable
  answer. The site should make this what-BYA-is story clear.

### Transparency — the driving motivation
- The mosque's standing problem: **nobody knows who is who** — who the president
  is, who runs what. Even regular volunteers (even a board member's own family)
  only half-know. That opacity has bred community distrust.
- The youth site rectifies this **for this department**: people can see who runs
  BYA, where to go, and who to talk to. Modeling transparency the wider mosque
  lacks.

### Leadership structure (to publish on the site)
- **Two youth directors** — one male (the owner), one female — at the top of the
  department, reporting **directly to the masjid board**.
- **Advisory committee:** currently one board member + one adult who was there
  at BYA's inception (teaches the Sunday-school high-school class, deeply
  invested in youth work, brought the owner in). She serves in an advisory
  capacity and still organizes some programs, though that's being phased out.
- Youth directors are **young professionals** — college grads, responsible
  enough to be trusted with finances etc.

### The pipeline vision (context shaping the roles)
- Long-term leadership ladder: **middle-school junior youth programs → high
  school program → university students as mentors → a recent graduate (~21–25)
  as youth director.**
- Deliberate counter to the current all-near-retirement board: leadership should
  be young; elders serve in advisory roles (past a point they no longer have the
  energy to *run* programs). Age itself isn't the criterion — qualifications
  are — but "too old to run programs" is a real failure mode being designed
  against.

### Published role definitions (key feature)
For each role: **responsibilities, expectations, and who should hold it** —
published on the public site. Dual purpose:
1. **Accountability** — the team holds itself to written expectations.
2. **Recruitment** — the community can see what it takes to get involved, which
   is entirely missing today.

### Target audiences (priority order)
1. **Kids and their parents** — the primary audience, full stop.
2. Staff, other organizations, the community at large.

The bar: a site people **regularly visit** — a proper resource for the
community, not a brochure.

### Programs & events tracking (the "what's going on" surface)
- The problem: it's genuinely hard to know what's happening at the mosque. Even
  the WhatsApp announcements group is a firehose — too many posts to follow.
- The site is the one place to keep up with **youth events specifically**.
- The interface must handle every program shape: **one-time programs, recurring
  programs, classes, registration-based events**, etc.
- Three time horizons, all browsable: **now** (what's happening currently),
  **future** (what's coming), and **past** (what already happened).

### Locked feature set beyond events (decided 2026-07-22)
All fed by data the internal app already generates — no ongoing editorial
burden:

- **Photo galleries / event recaps** — publish curated media from each event's
  internal media store; the youth repeat-visit driver. **Curated means
  group-shots/blurred only (§12): full albums live behind kid accounts, not on
  the public site.**
- **"My volunteer hours" lookup** — kids/parents look up documented service
  hours (feeds from §9 volunteer-hour tracking).
- **Calendar subscription** — ICS feed / add-to-Google-Calendar so youth events
  land in family calendars automatically.
- **Per-program "what to expect" pages** — drop-off/pickup, what to bring,
  who's supervising; the playbook data wearing a public face.
- **Get involved** — published role definitions + an actual volunteer signup
  form, closing the recruitment loop.
- **Donate link** — Zeffy.
- **Subscribe to email/text notifications** — public opt-in to the
  listserv/subscription groups (feeds the §9 People module; Twilio/Resend on
  the send side).

*(External section continues — owner has more to add.)*

---

## 14. Build vs. buy (added 2026-07-24)

Principle (owner): *if it's not broke, don't fix it* — before building a chunk,
check whether something purpose-built already owns it.

**Already carved out (buy decisions made through this doc):** Zeffy (payments/
donations) · Tally (bespoke free forms) · Twilio (SMS) · Resend (email) ·
Google Drive (working files) · Canva + Claude (design) · Google Calendar
(calendar plumbing). The app keeps orchestration; services keep the
commodities.

**The evaluation gate: Planning Center (ChMS).** The closest existing product
to this doc — People (households/parents), Registrations (forms + waivers),
Services (a mature minute-by-minute run-of-show with assigned positions ≈
§7.2), Check-Ins (minor attendance), Calendar, Giving. Owner's first read of
the site: "exactly what I want, values line up." **Before final architecture:
sign up for the free tier, run one fake youth night through it end-to-end, and
record where the church shape helps vs. grates.** Outcome is either (a) adopt
modules and build around them, or (b) consciously reject with reasons written
down.

**The church-vs-mosque observation (owner):** PC wins *because* it's built
specifically for churches — vertical quality-of-life details. Those same
details make it slightly off for mosques: five daily prayers, Ramadan, Quran,
zakat. For this department's program management, most gaps are masjid-wide
concerns (zakat → already Zeffy'd; prayer times → not program management). The
sharp edge that IS ours: **Islamic-calendar-anchored programming** — "every
Ramadan" recurrence and hijri-aware scheduling, which Gregorian-recurrence
software handles badly. If we build custom, mosque-shaped QoL (hijri-aware
recurrence, Ramadan-mode, gender-separated program structures) is our version
of PC's vertical edge.

**"Planning Center for masjids" — adopted as the north star (2026-07-24).**
Originally parked as contradicting §1; the owner then consciously revised §1.
The product thesis is now the long-term goal, with the path unchanged: *build
for BYA first, prove it, generalize later* (see §1 horizons). Horizon-1 scope
is still exactly this doc — the pivot changes the destination, not the next
step.

**Stays custom regardless (nothing out there does these):** living playbooks,
copy-marketing-prompt, the transparency/roles public site, per-program net
ledger with treasurer handoff, and the seams between modules — the integration
fabric is the project.

---

## Parked questions (to resolve after the braindump)

1. ~~Tally vs. native forms~~ — **resolved:** native hard-coded forms primary,
   Tally secondary for new/experimental programs (§5).
2. ~~Email provider~~ — **resolved:** Resend + React Email templates (§5).
3. Permissions model for staff — **pinned with context** (§11): today it's
   "owner does everything, staff execute day-of"; design should grow from that.
   **Leading candidate shape emerged (§12):** access scoped per program-type
   container (mentor sees a series' full history, past read-only, admin above).
   Also open: run-of-show as explicit "event mode" vs. always-there view (§7.2).
11. Kid-account model: parent accounts with kid profiles vs. kid accounts with
    captured parental consent (§12).
12. **Planning Center evaluation (§14)** — free-tier trial with one fake youth
    night, BEFORE final architecture. Decides adopt-and-build-around vs.
    reject-with-reasons.
4. **Template list + granularity** — which program types exist as templates
   (specific-but-reusable test, §3). Owner is thinking on it; some Grow/Serve
   programs work differently and will shape this.
5. External section — entire scope pending.
6. ~~Finance/accounting pin~~ — **resolved:** reimbursements (§10).
7. ~~Speaker/guest costs~~ — **resolved:** costs live in the program ledger;
   the People↔Programs role linkage provides the click-through (§9).
8. ~~Organization donations tracking~~ — **resolved:** donations are income
   transactions linked to the org; totals come from the reporting module (§10).
9. ~~Budget-vs-actual~~ — **resolved:** no budgeting module; expenses/
   reimbursements only, tied to programs (§10).
10. ~~Direct-paid expenses~~ — **resolved:** manual expense entry is in; one
    ledger, two flavors (reimbursement vs. direct expense) (§10).

---

*Living capture — sections will be added/expanded as the braindump continues.*
