# BYA

A program management app I built for Bilal Youth Affairs, the youth department of a masjid. It replaces a scatter of spreadsheets, group chats, and tribal knowledge with one place to plan events, keep documentation, and track the work around them.

I built this partly as a test: I wanted to see how a program management app might actually feel to use, using a department I know well as the case. Rather than designing for a hypothetical market, I built for one real department first, let every feature earn its place through actual BYA use, and made the choices that only make sense at single-department scale deliberately, leaving them to revisit later rather than generalizing early.

## What it does

- **Wiki pages organized by category.** Rich-text pages authored with Tiptap, grouped into categories, with file uploads attached. This is the documentation and standard-operating-procedure side.
- **Events with playbook templates.** An event can have a playbook applied to it, which generates a task list from a reusable template. The recurring shape of "run this kind of event" gets captured once and reused.
- **Tasks, team, finances, feedback, and a bike-rack** for parked ideas.
- **Google Calendar integration.** Events sync from a connected Google Calendar or an ICS URL, parsed with `node-ical`. A public read-only events route exposes the calendar without login.
- **Soft-delete trash.** Deleted pages and files go to a trash area and can be restored, rather than being removed outright.
- **Auth and roles** through Supabase, with an owner-bootstrap script for first setup.

## Stack

Next.js App Router, Supabase for auth and data, Tiptap for rich text, TanStack Query on the client, Tailwind with shadcn components, `node-ical` for calendar parsing. Playwright drives the one end-to-end test, which covers the public events route.

```
src/app/(app)/        the authenticated app: c/[category], event/[id], tasks, finances, team, admin/*
src/app/(auth)/       login, set-password
src/app/(public)/     r/events, the public calendar
scripts/bootstrap-owner.ts
e2e/                  Playwright
```

## Running it

```bash
npm install
npm run dev             # localhost:3000
npm run build
npm run test:e2e        # Playwright
npm run bootstrap-owner # create the first owner account
```

Supabase and Google credentials go in `.env.local`. See `.env.local.example` for the required keys.

## Status

This is Horizon 1: one department's app, in real use. Masjid-wide and multi-masjid use are longer-term directions, not built yet, and the single-department decisions in here are correct for where it is now.
