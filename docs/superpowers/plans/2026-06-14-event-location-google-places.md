# Event Location Google Places Autocomplete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users type into an event's Location field, pick a real place from Google Maps, and capture its official name + address (plus coordinates and Google place_id), while still allowing free-text locations.

**Architecture:** A reusable client component (`PlacesAutocomplete`) loads the Google Maps JS SDK on demand and uses the **new Places API** (`AutocompleteSuggestion` + `Place`) with session tokens to fetch suggestions and details. Pure helpers in `src/lib/places/place-pick.ts` map a selected place (or raw text) to the database fields. The draft editor saves structured columns on `draft_events`; the published editor (Google Calendar) saves only the combined text string. The existing `location` text column stays the source of truth for all existing displays and the Calendar sync.

**Tech Stack:** Next.js 16, React 19, Supabase, `@base-ui/react` + Tailwind v4, `@googlemaps/js-api-loader`, `node:test` via `tsx` for the one pure-logic unit test.

---

## File Structure

- **Create** `supabase/migrations/0014_event_location_places.sql` — adds 5 nullable structured columns to `draft_events`.
- **Modify** `src/lib/supabase/types.ts` — add the 5 fields to `DraftEventRow`, `DraftEventInsert`, `DraftEventUpdate`.
- **Create** `src/lib/places/place-pick.ts` — pure helpers: `PlacePick` type, `buildLocationString`, `LocationFields` type, `toLocationFields`.
- **Create** `src/lib/places/place-pick.test.ts` — `node:test` unit tests for the pure helpers.
- **Create** `src/components/places-autocomplete.tsx` — the reusable autocomplete input.
- **Modify** `src/app/(app)/event/[id]/draft-fields-editor.tsx` — `LocationEditor` uses the component + structured save; richer location display.
- **Modify** `src/app/(app)/event/[id]/published-fields-editor.tsx` — `LocationEditor` uses the component (text-only save).
- **Modify** `.env.local.example` — document `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Conventions used by this plan
- Type-check: `npx tsc --noEmit`
- Lint: `npm run lint`
- The repo has **no test runner**; the single pure-logic test runs via `node --import tsx --test <file>` (tsx is already a devDependency — no new test framework).
- Migrations are applied **manually** in the Supabase Dashboard → SQL Editor (see each migration file header). They are idempotent.

---

## Task 1: Add dependencies and document the env var

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.local.example`

- [ ] **Step 1: Install the Google Maps loader + types**

Run:
```bash
npm install @googlemaps/js-api-loader@^1.16.8
npm install -D @types/google.maps@^3.58.1
```

- [ ] **Step 2: Document the env var in `.env.local.example`**

Append this block to the end of `.env.local.example`:

```env

# ---- Google Maps / Places (location autocomplete) ---------------------------
#
# Maps Platform API key (NOT the OAuth client). Enable "Places API (New)" and
# "Maps JavaScript API" on the same Google Cloud project used for Calendar
# OAuth. Restrict the key by HTTP referrer (localhost + your Vercel domain) and
# to those two APIs. Safe to expose to the browser.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

- [ ] **Step 3: Verify the install**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The new `@types/google.maps` makes the `google.maps` namespace available for types.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "Add Google Maps loader dep and document Maps API key env var"
```

---

## Task 2: Database migration — structured location columns

**Files:**
- Create: `supabase/migrations/0014_event_location_places.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0014_event_location_places.sql`:

```sql
-- Phase: structured event location (Google Places).
--
-- Adds optional structured columns to draft_events alongside the existing
-- free-text `location`. They are populated when a user picks a place from the
-- Google Places autocomplete, and left null for free-text entries. The
-- `location` column continues to hold the human-readable "Name, Address" string
-- used by every existing display and by the Google Calendar sync.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

alter table public.draft_events
  add column if not exists location_name     text,
  add column if not exists location_address  text,
  add column if not exists location_lat      double precision,
  add column if not exists location_lng      double precision,
  add column if not exists location_place_id text;

comment on column public.draft_events.location_place_id is
  'Google Places place_id when the location was chosen from autocomplete; null for free-text locations.';
```

- [ ] **Step 2: Apply it in Supabase**

This is a **manual step** (matches how every existing migration is run):
1. Open Supabase Dashboard → SQL Editor.
2. Paste the contents of `0014_event_location_places.sql` and run it.
3. Confirm `draft_events` now has the 5 new columns (Table Editor → `draft_events`).

> The structured save in Task 5 will fail until these columns exist. Apply this before testing Task 5.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0014_event_location_places.sql
git commit -m "Add structured location columns to draft_events"
```

---

## Task 3: Pure helpers + unit test

**Files:**
- Create: `src/lib/places/place-pick.ts`
- Test: `src/lib/places/place-pick.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/places/place-pick.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLocationString, toLocationFields } from "./place-pick";

test("buildLocationString joins name and address", () => {
  assert.equal(
    buildLocationString("Bilal Masjid", "123 Main St, Hayward, CA"),
    "Bilal Masjid, 123 Main St, Hayward, CA",
  );
});

test("buildLocationString avoids duplicating the name when the address starts with it", () => {
  assert.equal(
    buildLocationString("Bilal Masjid", "Bilal Masjid, 123 Main St"),
    "Bilal Masjid, 123 Main St",
  );
});

test("buildLocationString handles a missing part", () => {
  assert.equal(buildLocationString("", "123 Main St"), "123 Main St");
  assert.equal(buildLocationString("Bilal Masjid", ""), "Bilal Masjid");
  assert.equal(buildLocationString("  ", "  "), "");
});

test("toLocationFields with a pick fills structured columns", () => {
  const f = toLocationFields(
    { name: "Bilal Masjid", address: "123 Main St", lat: 37.6, lng: -122.0, placeId: "abc" },
    "ignored",
  );
  assert.equal(f.location, "Bilal Masjid, 123 Main St");
  assert.equal(f.location_name, "Bilal Masjid");
  assert.equal(f.location_address, "123 Main St");
  assert.equal(f.location_lat, 37.6);
  assert.equal(f.location_lng, -122.0);
  assert.equal(f.location_place_id, "abc");
});

test("toLocationFields with free text clears structured columns", () => {
  const f = toLocationFields(null, "  Main Hall  ");
  assert.equal(f.location, "Main Hall");
  assert.equal(f.location_name, null);
  assert.equal(f.location_address, null);
  assert.equal(f.location_lat, null);
  assert.equal(f.location_lng, null);
  assert.equal(f.location_place_id, null);
});

test("toLocationFields with empty free text nulls location", () => {
  const f = toLocationFields(null, "   ");
  assert.equal(f.location, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test src/lib/places/place-pick.test.ts`
Expected: FAIL — cannot find module `./place-pick` (it doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/places/place-pick.ts`:

```ts
/** A place chosen from Google Places autocomplete, reduced to the fields we
 *  store. */
export type PlacePick = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
};

/** The full set of location-related columns we write to draft_events. */
export type LocationFields = {
  location: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_place_id: string | null;
};

/** Human-readable single line combining the official name and address.
 *  Falls back gracefully when one part is missing, and avoids "Name, Name…"
 *  when the formatted address already starts with the name. */
export function buildLocationString(name: string, address: string): string {
  const n = name.trim();
  const a = address.trim();
  if (n && a) {
    return a.startsWith(n) ? a : `${n}, ${a}`;
  }
  return n || a;
}

/** Build the DB field set from either a structured Google pick or raw free
 *  text. A pick fills the structured columns; free text clears them and stores
 *  only the trimmed `location` string (null when empty). */
export function toLocationFields(
  pick: PlacePick | null,
  rawText: string,
): LocationFields {
  if (pick) {
    return {
      location: buildLocationString(pick.name, pick.address),
      location_name: pick.name.trim() || null,
      location_address: pick.address.trim() || null,
      location_lat: pick.lat,
      location_lng: pick.lng,
      location_place_id: pick.placeId,
    };
  }
  const trimmed = rawText.trim();
  return {
    location: trimmed === "" ? null : trimmed,
    location_name: null,
    location_address: null,
    location_lat: null,
    location_lng: null,
    location_place_id: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test src/lib/places/place-pick.test.ts`
Expected: PASS — `# pass 6`, `# fail 0`.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: PASS

```bash
git add src/lib/places/place-pick.ts src/lib/places/place-pick.test.ts
git commit -m "Add pure helpers mapping a Google place / free text to location fields"
```

---

## Task 4: Update the Supabase types

**Files:**
- Modify: `src/lib/supabase/types.ts:446-495`

- [ ] **Step 1: Add the fields to `DraftEventRow`**

In `src/lib/supabase/types.ts`, in the `DraftEventRow` type, add the five fields right after the `location: string | null;` line:

```ts
  location: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_place_id: string | null;
```

- [ ] **Step 2: Add the fields to `DraftEventInsert`**

In the same file, in `DraftEventInsert`, after `location?: string | null;` add:

```ts
  location?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_place_id?: string | null;
```

- [ ] **Step 3: Add the fields to `DraftEventUpdate`**

In the same file, in `DraftEventUpdate`, after `location?: string | null;` add:

```ts
  location?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_place_id?: string | null;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. Note: `LocationFields` from Task 3 is structurally assignable to `DraftEventUpdate` (all keys present and compatible), so passing it to `updateDraftAction` in Task 5 will type-check.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "Add structured location fields to draft event types"
```

---

## Task 5: Build the PlacesAutocomplete component

**Files:**
- Create: `src/components/places-autocomplete.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/places-autocomplete.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildLocationString, type PlacePick } from "@/lib/places/place-pick";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
};

// Cache the places-library load across every instance of the component.
let placesLibPromise: Promise<google.maps.PlacesLibrary> | null = null;

function loadPlacesLib(): Promise<google.maps.PlacesLibrary> | null {
  if (!MAPS_API_KEY) return null;
  if (!placesLibPromise) {
    const loader = new Loader({ apiKey: MAPS_API_KEY, version: "weekly" });
    placesLibPromise = loader.importLibrary("places");
  }
  return placesLibPromise;
}

export function PlacesAutocomplete({
  inputId,
  initialText,
  placeholder,
  onTextChange,
  onPick,
  onEnter,
  autoFocus,
}: {
  inputId: string;
  initialText: string;
  placeholder?: string;
  /** Fired when the user types (free text). Clears any prior pick upstream. */
  onTextChange: (text: string) => void;
  /** Fired when the user selects a Google suggestion. */
  onPick: (pick: PlacePick) => void;
  /** Fired on Enter when no suggestion is highlighted (commit free text). */
  onEnter: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function fetchSuggestions(input: string) {
    const lib = await loadPlacesLib();
    if (!lib) return; // Degraded mode: no key → plain text input, no list.
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    }
    const seq = ++seqRef.current;
    const { suggestions: results } =
      await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ["us"],
      });
    if (seq !== seqRef.current) return; // A newer keystroke superseded this.
    const mapped: Suggestion[] = results
      .map((s) => s.placePrediction)
      .filter((p): p is google.maps.places.PlacePrediction => p != null)
      .map((p) => ({
        placeId: p.placeId,
        primary: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? "",
        prediction: p,
      }));
    setSuggestions(mapped);
    setActiveIndex(-1);
  }

  function handleChange(value: string) {
    setText(value);
    onTextChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => void fetchSuggestions(value), 300);
  }

  async function handleSelect(s: Suggestion) {
    const place = s.prediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location", "id"],
    });
    const pick: PlacePick = {
      name: place.displayName ?? s.primary,
      address: place.formattedAddress ?? s.secondary,
      lat: place.location?.lat() ?? 0,
      lng: place.location?.lng() ?? 0,
      placeId: place.id ?? s.placeId,
    };
    // End the billing session after a selection.
    sessionTokenRef.current = null;
    setText(buildLocationString(pick.name, pick.address));
    setSuggestions([]);
    setActiveIndex(-1);
    onPick(pick);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0 && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (suggestions.length > 0 && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        void handleSelect(suggestions[activeIndex]);
      } else {
        onEnter();
      }
    }
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                // onMouseDown (not onClick) so it fires before the input blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  void handleSelect(s);
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  i === activeIndex ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <MapPin
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="truncate text-xs text-muted-foreground">
                      {s.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If `cn` is not exported from `@/lib/utils`, find the project's `cn` helper (used by `src/components/ui/input.tsx`) and import from there instead.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (no errors for the new file).

- [ ] **Step 4: Commit**

```bash
git add src/components/places-autocomplete.tsx
git commit -m "Add PlacesAutocomplete component using the new Places API"
```

---

## Task 6: Wire the component into the draft LocationEditor

**Files:**
- Modify: `src/app/(app)/event/[id]/draft-fields-editor.tsx:256-311` (the `LocationEditor` function)
- Modify: `src/app/(app)/event/[id]/draft-fields-editor.tsx:1-36` (imports)

- [ ] **Step 1: Add imports**

At the top of `draft-fields-editor.tsx`, add to the existing React import and add two new import lines:

Change:
```tsx
import { useState, useTransition } from "react";
```
to:
```tsx
import { useRef, useState, useTransition } from "react";
```

Then add these import lines near the other `@/` imports (e.g. after the `Input` import on line 22):
```tsx
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import { buildLocationString, toLocationFields, type PlacePick } from "@/lib/places/place-pick";
```

- [ ] **Step 2: Replace the `LocationEditor` function body**

Replace the entire `LocationEditor` function (currently lines 256-311) with:

```tsx
function LocationEditor({ draft }: { draft: DraftEventRow }) {
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(draft);
  const textRef = useRef(draft.location ?? "");
  const pickRef = useRef<PlacePick | null>(null);

  function commit() {
    save(toLocationFields(pickRef.current, textRef.current), () =>
      setOpen(false),
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button type="button" className="block w-full min-w-0 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
            {draft.location_name ? (
              <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {draft.location_name}
                  </span>
                  {draft.location_address && (
                    <span className="truncate text-xs text-muted-foreground">
                      {draft.location_address}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <MetadataRow
                Icon={MapPin}
                label="Location"
                value={draft.location}
                placeholder="+ Add location"
                required
              />
            )}
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        {/* Stop key events bubbling to the Menu's typeahead so text inputs
            receive keystrokes normally. */}
        <div
          className="flex flex-col gap-2"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Label htmlFor={`loc-${draft.id}`}>Location</Label>
          <PlacesAutocomplete
            inputId={`loc-${draft.id}`}
            initialText={draft.location ?? ""}
            placeholder="Search a place, or type your own"
            autoFocus
            onTextChange={(t) => {
              textRef.current = t;
              pickRef.current = null;
            }}
            onPick={(p) => {
              pickRef.current = p;
              textRef.current = buildLocationString(p.name, p.address);
            }}
            onEnter={commit}
          />
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={commit} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. `toLocationFields(...)` returns `LocationFields`, which is assignable to `DraftEventUpdate` (Task 4 added the matching optional keys).

- [ ] **Step 4: Manual verification** (requires Task 2 migration applied + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in `.env.local`)

Run: `npm run dev`, open a draft event, click the Location row:
1. Type "Bilal" → suggestions appear → pick one → row shows name (bold) + address (muted). Reopen DB row: `location_name`, `location_address`, `location_lat/lng`, `location_place_id` populated, `location` = "Name, Address".
2. Type a custom string ("Main Hall"), don't pick, hit Save → `location` = "Main Hall", structured columns null, row shows the plain string.
3. With no key set, the field still works as a plain input and saves free text.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/event/[id]/draft-fields-editor.tsx"
git commit -m "Use Places autocomplete + structured save in draft location editor"
```

---

## Task 7: Wire the component into the published (Google Calendar) LocationEditor

Published events live in Google Calendar, which only stores a single `location` string — so here we use the same autocomplete UX but save **only** the combined text.

**Files:**
- Modify: `src/app/(app)/event/[id]/published-fields-editor.tsx:258-313` (the `LocationEditor` function)
- Modify: `src/app/(app)/event/[id]/published-fields-editor.tsx` (imports)

- [ ] **Step 1: Add imports**

Ensure React's `useRef` is imported (add it to the existing `react` import if missing). Add near the other `@/` imports:
```tsx
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import { buildLocationString, toLocationFields, type PlacePick } from "@/lib/places/place-pick";
```

- [ ] **Step 2: Replace the `LocationEditor` function body**

Replace the `LocationEditor` function (currently lines 258-313) with:

```tsx
function LocationEditor({ values }: { values: Values }) {
  const { event } = values;
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(event.id);
  const textRef = useRef(event.location ?? "");
  const pickRef = useRef<PlacePick | null>(null);

  function commit() {
    // Google Calendar stores only a single location string.
    const { location } = toLocationFields(pickRef.current, textRef.current);
    save({ location }, () => setOpen(false));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="block w-full min-w-0 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
          >
            <MetadataRow
              Icon={MapPin}
              label="Location"
              value={event.location}
              placeholder="+ Add location"
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        <div
          className="flex flex-col gap-2"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Label htmlFor={`ploc-${event.id}`}>Location</Label>
          <PlacesAutocomplete
            inputId={`ploc-${event.id}`}
            initialText={event.location ?? ""}
            placeholder="Search a place, or type your own"
            autoFocus
            onTextChange={(t) => {
              textRef.current = t;
              pickRef.current = null;
            }}
            onPick={(p) => {
              pickRef.current = p;
              textRef.current = buildLocationString(p.name, p.address);
            }}
            onEnter={commit}
          />
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={commit} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual verification**

`npm run dev`, open a published event, edit Location: typing shows suggestions; picking one saves the "Name, Address" string to the Google Calendar event; free text still saves.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/event/[id]/published-fields-editor.tsx"
git commit -m "Use Places autocomplete in published event location editor"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full type-check, lint, build**

Run:
```bash
npx tsc --noEmit
npm run lint
npm run build
```
Expected: all PASS.

- [ ] **Step 2: Run the unit test once more**

Run: `node --import tsx --test src/lib/places/place-pick.test.ts`
Expected: PASS.

- [ ] **Step 3: Smoke-test the full flow** (key set + migration applied)

- Draft: pick a place → structured columns + combined string persist; list views (`/events`), search, copy-to-WhatsApp, and the public events page all still show the combined `location` text.
- Publish a draft with a picked location → the Google Calendar event carries the combined `location` string (unchanged sync path).

- [ ] **Step 4: Final commit (if any stragglers)**

```bash
git add -A
git commit -m "Finalize event location Google Places autocomplete" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** Config/env (Task 1), schema migration (Task 2), types (Task 4), autocomplete component with session tokens + US bias + graceful degradation (Task 5), draft wiring with structured save + free-text fallback + richer display (Task 6), Calendar-sync-safe combined string everywhere (Tasks 3/6/7), published editor (Task 7, beyond the original draft-only spec but fulfills the user's "in each event" request). Testing covered in Tasks 3 and 8.
- **No placeholders:** every code/command step is concrete.
- **Type consistency:** `PlacePick`, `LocationFields`, `buildLocationString`, `toLocationFields` names are used identically across Tasks 3, 5, 6, 7. `LocationFields` keys exactly match the columns added in Tasks 2 and 4.
- **Known assumption:** `cn` is imported from `@/lib/utils` (shadcn convention used by the UI components); Task 5 Step 2 says where to look if that path differs. The new Places API surface (`AutocompleteSuggestion.fetchAutocompleteSuggestions`, `placePrediction.toPlace()`, `place.fetchFields`) is the current, non-deprecated API.
