import "server-only";

import { unstable_cache } from "next/cache";
import type {
  EventInstance,
  ParameterValue,
  VEvent,
} from "node-ical";
import type { CalendarEvent } from "./types";

/**
 * Convert ParameterValue<string> (which may be either a bare string or a
 * { val, params } object) into a plain string.
 */
function asString(value: ParameterValue<string> | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  // The object form has .val
  return String((value as { val?: string }).val ?? "");
}

function googleEventLink(event: VEvent): string | null {
  // node-ical stores Google's X-APPLE-* / etc. in the parsed object; the
  // standard URL property is fine for the htmlLink equivalent.
  const url = (event as VEvent & { url?: string }).url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function deriveAllDay(event: VEvent, start?: Date | null): boolean {
  if ((event as VEvent & { datetype?: string }).datetype === "date") return true;
  if (start && (start as Date & { dateOnly?: boolean }).dateOnly) return true;
  return false;
}

function vEventToCalendarEvent(event: VEvent): CalendarEvent | null {
  const start = (event.start ?? null) as (Date & { dateOnly?: boolean }) | null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const end = (event.end ?? null) as Date | null;

  return {
    id: String(event.uid ?? `${start.toISOString()}-${asString(event.summary)}`),
    title: asString(event.summary).trim() || "Untitled event",
    description: asString(event.description).trim() || null,
    location: asString(event.location).trim() || null,
    starts_at: start.toISOString(),
    ends_at: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    all_day: deriveAllDay(event, start),
    html_link: googleEventLink(event),
  };
}

function instanceToCalendarEvent(
  base: VEvent,
  instance: EventInstance,
): CalendarEvent {
  const start = instance.start;
  const end = instance.end;
  return {
    id: `${base.uid ?? "ev"}::${start.toISOString()}`,
    title: asString(instance.summary).trim() || asString(base.summary).trim() || "Untitled event",
    description: asString(base.description).trim() || null,
    location: asString(base.location).trim() || null,
    starts_at: start.toISOString(),
    ends_at: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    all_day: Boolean(instance.isFullDay),
    html_link: googleEventLink(instance.event ?? base),
  };
}

export type GetCalendarEventsOptions = {
  icsUrl: string;
  /** How many days back to surface in the "past" view. */
  pastWindowDays?: number;
  /** How many days forward to expand recurring rules over. */
  futureWindowDays?: number;
};

/**
 * Internal: do the actual ICS fetch + parse + expand. Wrapped below in
 * unstable_cache so the *parsed* CalendarEvent[] is cached across requests
 * — not just the HTTP body. node-ical's parse + recurrence expansion is
 * 100-500ms of CPU per call, and we'd otherwise pay it on every render of
 * /events and /event/[id].
 */
async function fetchAndParseCalendar({
  icsUrl,
  pastWindowDays = 60,
  futureWindowDays = 180,
}: GetCalendarEventsOptions): Promise<CalendarEvent[]> {
  const response = await fetch(icsUrl, {
    // 15-minute edge cache, busted via revalidateTag('calendar') after the
    // owner updates the URL or hits "Fetch now".
    next: { revalidate: 900, tags: ["calendar"] },
    headers: { Accept: "text/calendar, text/plain;q=0.8, */*;q=0.1" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch calendar feed (${response.status} ${response.statusText}).`,
    );
  }

  const body = await response.text();
  // Dynamic import keeps node-ical's transitive temporal-polyfill (which
  // breaks Turbopack's build-time module collection on Windows) out of the
  // eager graph.
  const ical = await import("node-ical");
  const parsed = ical.sync.parseICS(body);

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - pastWindowDays);
  const to = new Date(now);
  to.setDate(to.getDate() + futureWindowDays);

  const events: CalendarEvent[] = [];

  for (const key in parsed) {
    const component = parsed[key];
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;

    if (event.rrule) {
      // Recurring — expand into instances within the window.
      try {
        const instances = ical.expandRecurringEvent(event, { from, to });
        for (const instance of instances) {
          events.push(instanceToCalendarEvent(event, instance));
        }
      } catch (err) {
        // A single bad RRULE shouldn't take down the whole calendar.
        console.error("Failed to expand recurring event", event.uid, err);
        const single = vEventToCalendarEvent(event);
        if (single) events.push(single);
      }
      continue;
    }

    const single = vEventToCalendarEvent(event);
    if (!single) continue;
    const start = new Date(single.starts_at).getTime();
    const end = single.ends_at
      ? new Date(single.ends_at).getTime()
      : start;
    if (end < from.getTime() || start > to.getTime()) continue;
    events.push(single);
  }

  events.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  return events;
}

/**
 * Public API. Cached by (icsUrl, pastWindowDays, futureWindowDays) for 15
 * minutes; tagged 'calendar' so existing revalidateTag('calendar') calls
 * (in events/actions.ts after a Google Calendar write) bust the parsed
 * cache, not just the HTTP body cache.
 */
const cachedFetchAndParse = unstable_cache(
  async (
    icsUrl: string,
    pastWindowDays: number,
    futureWindowDays: number,
  ): Promise<CalendarEvent[]> => {
    return fetchAndParseCalendar({
      icsUrl,
      pastWindowDays,
      futureWindowDays,
    });
  },
  ["calendar-events"],
  { revalidate: 900, tags: ["calendar"] },
);

export async function getCalendarEvents(
  options: GetCalendarEventsOptions,
): Promise<CalendarEvent[]> {
  return cachedFetchAndParse(
    options.icsUrl,
    options.pastWindowDays ?? 60,
    options.futureWindowDays ?? 180,
  );
}

/**
 * Cheap helper for routes that just need to know "do we have a connection?".
 * Reads the singleton app_settings row via the server client.
 */
export async function getIcsUrl(): Promise<string | null> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("google_calendar_ics_url")
    .eq("id", 1)
    .single();
  const value = data?.google_calendar_ics_url?.trim();
  return value && value.length > 0 ? value : null;
}
