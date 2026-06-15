# Event Location: Google Places Autocomplete — Design

**Date:** 2026-06-14
**Status:** Approved (pending spec review)

## Goal

When editing an event's **Location** field, let the user type and get
live suggestions from Google Maps, then pick a place so we capture its
**official name** and **address** (plus coordinates and a stable Google ID).
Typing a custom location that isn't in Google must still be savable.

## Background (current state)

- Location is a single text column `draft_events.location` (`string | null`).
- Edited in `src/app/(app)/event/[id]/draft-fields-editor.tsx` →
  `LocationEditor` (a `DropdownMenu` wrapping a plain `<Input>`).
- Saved via `updateDraftAction()` in `src/app/(app)/drafts/actions.ts`
  (Supabase + Next.js server action).
- On publish, `draft.location` is passed through to the Google Calendar event.
- No maps/geocoding library or Places key exists yet.
- Stack: Next.js (custom build — see AGENTS.md), Supabase, `@base-ui/react`
  v1.5.0 + Tailwind v4, shadcn-style UI components.

## Approach

Chosen: **custom autocomplete using the new Places API**, rendered in the
existing dropdown UI. Loaded client-side with `@googlemaps/js-api-loader`,
using `AutocompleteSuggestion` + `Place` and session tokens for efficient
billing. Free-text fallback falls out naturally.

(Rejected: Google's prebuilt `PlaceAutocompleteElement` widget — hard to
style/embed, weak free-text story. Server-side proxy — unnecessary; a
referrer-restricted `NEXT_PUBLIC_` key is the standard safe pattern.)

## Section 1 — Config & API key

- Enable **Places API (New)** and **Maps JavaScript API** on the existing
  Google Cloud project (same one as Calendar OAuth).
- API key restricted by **HTTP referrer** (localhost + Vercel domain) and to
  the two APIs above.
- Env var **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`**:
  - Added to `.env.local` (local) — done.
  - Added to Vercel Environment Variables (Production/Preview/Development).
  - Documented in `.env.local.example`. *(to add during implementation)*
- Result bias: **US**, set in code on the autocomplete request.

## Section 2 — Database schema

Supabase migration adds five nullable columns to `draft_events`, keeping the
existing `location` text column:

| Column | Type | Purpose |
|---|---|---|
| `location_name` | `text` | Official place name |
| `location_address` | `text` | Formatted address |
| `location_lat` | `double precision` | Latitude |
| `location_lng` | `double precision` | Longitude |
| `location_place_id` | `text` | Google place ID (stable reference) |

- `location` stays and is auto-filled with `"Name, Address"` when a place is
  picked, so all existing displays and the Calendar sync keep working.
- Free-text entries set only `location`; structured columns stay `null`.
- Update `DraftEventRow` and `DraftEventUpdate` in
  `src/lib/supabase/types.ts` to include the five new fields.

## Section 3 — Autocomplete component

New `src/components/places-autocomplete.tsx`:

- Lazily loads the Google SDK via `@googlemaps/js-api-loader` (new dependency)
  only when the field is opened.
- Debounced (~300ms) calls to `AutocompleteSuggestion`, biased to US, results
  rendered in a dropdown matching existing `@base-ui`/Tailwind styling.
- Selecting a suggestion fetches `Place` details: name, formatted address,
  lat/lng, place_id.
- Uses an `AutocompleteSessionToken` so type→pick bills as one session; a new
  token is started after each selection.
- Graceful degradation: if the SDK fails to load or the key is missing, it
  renders as a plain text input — the field never breaks.
- Props (sketch): `value`, `onSelect(structured)`, `onTextChange(raw)`,
  initial text, placeholder. Exact shape finalized in the plan.

## Section 4 — Field wiring & fallback

In `LocationEditor` (`draft-fields-editor.tsx`), replace the plain `<Input>`
with `PlacesAutocomplete`:

- **Pick a Google result** → save all five structured columns and set
  `location = "Name, Address"`.
- **Type with no match, then Save** → save `location` = raw text, structured
  columns set to `null` (free-text fallback).
- Save still goes through `updateDraftAction()` (now passing the structured
  fields too).
- **Display:** where the event location is shown, render name in bold with the
  address muted beneath when structured data exists; otherwise the plain
  `location` text.
- **Google Calendar sync:** unchanged — continues reading `location`.

## Non-goals / YAGNI

- No map preview / pin rendering.
- No directions or "open in Maps" links yet (place_id + coords make this easy
  to add later).
- No backfill of structured data for existing events (they keep their plain
  `location` text and display as-is).
- No server-side Places proxy.

## Testing

- Type a known venue → suggestions appear → pick one → name+address+coords+
  place_id persist; `location` shows `"Name, Address"`.
- Type a custom string with no pick → saves as plain text, structured null.
- Edit an existing plain-text event → still works, displays plain text.
- Missing/invalid key → field degrades to plain text input, save still works.
- Published event still carries `location` into Google Calendar.
