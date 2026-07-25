# Planning Center vs. BYA Scope — Evaluation Gate (§14)

**Date:** 2026-07-24 · **Status:** Desk research done; hands-on trial pending.
Companion to `2026-07-19-bya-app-goals-and-scope.md`. Sources: planningcenter.com,
their pricing/help pages, developer docs, third-party pricing guides (2026).

## PC's product map (à la carte, per-module pricing)

| PC product | What it does | Free tier |
|---|---|---|
| **People** | Member database: households (parents↔kids), lists, workflows, forms | Free up to ~100 profiles |
| **Registrations** | Event signups, forms, waivers, ticketing, payments | 5 attendees on largest event — trial-only in practice |
| **Services** | Minute-by-minute service plans, positions/teams assigned, live mobile view, plan templates, archived past plans with attachments | Limited plans/month |
| **Check-Ins** | Attendance, minor check-in/out security | ~10 check-ins/day |
| **Calendar** | Rooms, resources, org calendar | Priced by rooms |
| **Giving** | Donations (2.15% + $0.30 card / 0% + $0.30 ACH) | Per-donation pricing |
| **Groups** | Community groups + chat | 15 members total |
| **Church Center** | Branded member-facing web portal + mobile app tying it all together | Included |
| Publishing / Home / Music Stand | Custom pages & sermons / dashboard / sheet music | — |

Small-org ballpark: **$0–50/month**. API: REST across most products, OAuth for
third-party apps, free-tier accessible. **Caveat to verify in trial: the
Registrations API has historically been read-heavy/limited — a problem if we
want to build around it.**

## Module-by-module vs. our scope doc

| Our doc | PC coverage | Verdict |
|---|---|---|
| §7.2 Run of show (minute-level, positions, live on phone) | **Services** — this exact thing, mature, plus templates and archived history with attachments | **PC's strongest overlap.** Steal the design at minimum |
| §9 People/CRM (households, roles, lists) | **People** — strong, free at our scale | Strong overlap |
| §8 Attendance/rosters, minor security | **Check-Ins + Registrations** | Strong overlap (counts/rosters; NOT media/receipts/post-mortems) |
| §5 Forms: free registration, waivers/consent | **Registrations** | Good overlap; verify e-sign waivers + API writability |
| §13 External site (calendar, register, donate, subscribe) | **Church Center** | Substantial overlap; NOT transparency/roles pages, galleries, hours lookup |
| §5 Comms (Twilio SMS, Resend cadences) | Email in-product; SMS only via integrations (e.g. Clearstream) | Partial |
| §7 Pre-event task playbooks (living, evolving) | **No real equivalent** — PC churches pair it with Trello/Asana | **Gap — ours** |
| §6 Marketing (copy-prompt, social scheduling) | Nothing | **Gap — ours** |
| §10 Finance (expense ledger, reimbursements, net) | Giving is donations-only; no expenses/reimbursements | **Gap — ours** |
| §12 Development layer (materials snapshots, kid portals, hours) | Services plan-archives only; no LMS, no per-kid albums, no hours | **Gap — ours** |
| §14 Hijri/Ramadan-aware recurrence | Gregorian only | **Gap — the masjid vertical thesis** |
| Money: zero-fee stance (Zeffy) | PC charges card fees on Registrations/Giving | **Conflict** |

## Read on the three §14 outcomes

PC nails the *congregational plumbing* (people, signups, check-ins, run of
show, member portal) and has nothing for our *institutional-memory and
money-out* layers (playbooks, marketing, ledger, development layer) — which are
exactly the parts the scope doc calls the project's heart. And the north-star
pivot (§1) means adopting PC would outsource the very domain we intend to build
a product in.

**Leaning (to confirm by trial):** don't adopt as foundation; use as the design
reference for Services/Check-Ins/Church Center patterns; possibly keep nothing
running long-term. The trial should try to falsify this.

## Hands-on trial checklist (the falsification pass)

Set up one fake youth night end-to-end on free tiers, and answer:

1. **Services:** build the run of show. How close is this to our §7.2 dream?
   What would we shamelessly copy? Do plan templates ≈ our playbooks after all?
2. **Registrations:** consent/liability handling — real e-signature or just a
   checkbox? Can a *free* event skip all payment plumbing cleanly?
3. **People:** model one family (parent + 2 kids + household). Does the
   household model fit our parent/kid/consent chain?
4. **Check-Ins:** minor check-in/out flow — what security details should we
   copy (pickup codes, etc.)?
5. **Church Center:** how much of §13 does it cover out of the box, and does
   the church framing feel wrong for a masjid audience?
6. **API:** confirm Registrations write limits; could we sync PC People ↔ our
   CRM if we ever ran hybrid?
7. **Feel:** where does church-shape grate (terminology, sacraments, sermon
   framing) vs. where is it neutral?
