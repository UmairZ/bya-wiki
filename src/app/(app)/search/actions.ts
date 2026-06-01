"use server";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import type { CalendarEvent } from "@/lib/calendar/types";

export type WikiHit = {
  kind: "page" | "file";
  id: string;
  title: string;
  snippet: string;
  category_name: string | null;
  category_slug: string | null;
  updated_at: string;
  file_type: string | null;
  rank: number;
};

export type EventHit = {
  kind: "event";
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  html_link: string | null;
};

export type SearchResults = {
  pages: WikiHit[];
  files: WikiHit[];
  events: EventHit[];
};

const EMPTY: SearchResults = { pages: [], files: [], events: [] };

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function matchesEvent(event: CalendarEvent, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const haystack = [
    event.title ?? "",
    event.location ?? "",
    event.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export async function searchAction(query: string): Promise<SearchResults> {
  await requireCurrentUser();
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const supabase = await createSupabaseServerClient();

  // Wiki side — single RPC ranks pages + resources together.
  const wikiPromise = supabase.rpc("search_wiki", { q }).then((resp) => {
    if (resp.error) {
      console.error("search_wiki failed", resp.error);
      return [];
    }
    return (resp.data ?? []) as WikiHit[];
  });

  // Events — filter the cached ICS window in-app.
  const eventsPromise = (async (): Promise<EventHit[]> => {
    const icsUrl = await getIcsUrl();
    if (!icsUrl) return [];
    try {
      const events = await getCalendarEvents({ icsUrl });
      const tokens = tokenize(q);
      return events
        .filter((e) => matchesEvent(e, tokens))
        .slice(0, 10)
        .map<EventHit>((e) => ({
          kind: "event",
          id: e.id,
          title: e.title,
          starts_at: e.starts_at,
          ends_at: e.ends_at,
          all_day: e.all_day,
          location: e.location,
          html_link: e.html_link,
        }));
    } catch {
      return [];
    }
  })();

  const [wikiHits, events] = await Promise.all([wikiPromise, eventsPromise]);

  const pages: WikiHit[] = [];
  const files: WikiHit[] = [];
  for (const hit of wikiHits) {
    if (hit.kind === "page") pages.push(hit);
    else if (hit.kind === "file") files.push(hit);
  }

  return { pages, files, events };
}
