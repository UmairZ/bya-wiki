import Link from "next/link";
import { CalendarDays, Plug, RefreshCw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import type { CalendarEvent } from "@/lib/calendar/types";
import { MonthView } from "./month-view";
import { EventRow } from "./event-row";

export const metadata = { title: "Events" };

function splitUpcomingPast(events: CalendarEvent[]): {
  upcoming: CalendarEvent[];
  past: CalendarEvent[];
} {
  const now = Date.now();
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];
  for (const event of events) {
    const endOrStart = event.ends_at ?? event.starts_at;
    if (new Date(endOrStart).getTime() >= now) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }
  past.sort(
    (a, b) =>
      new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );
  return { upcoming, past };
}

export default async function EventsPage() {
  const [current, icsUrl] = await Promise.all([getCurrentUser(), getIcsUrl()]);
  const isOwner = current?.profile.role === "owner";

  if (!icsUrl) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        </header>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">No calendar connected yet</p>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Connect your Google Calendar ICS feed in Integrations."
                : "Ask the owner to connect a Google Calendar in Integrations."}
            </p>
          </div>
          {isOwner && (
            <Button
              render={<Link href="/admin/integrations" />}
              nativeButton={false}
            >
              <Plug className="size-4" aria-hidden />
              Open Integrations
            </Button>
          )}
        </div>
      </div>
    );
  }

  let events: CalendarEvent[] = [];
  let fetchError: string | null = null;
  try {
    events = await getCalendarEvents({ icsUrl });
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const { upcoming, past } = splitUpcomingPast(events);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Synced from Google Calendar. Edits happen there; this view caches
            for ~15 min.
          </p>
        </div>
        {isOwner && (
          <Button
            render={<Link href="/admin/integrations" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="size-4" aria-hidden />
            Manage feed
          </Button>
        )}
      </header>

      {fetchError && (
        <Alert variant="destructive">
          <AlertDescription>
            Couldn't load the calendar: {fetchError}
          </AlertDescription>
        </Alert>
      )}

      {events.length > 0 && <MonthView events={events} />}

      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
            Nothing on the calendar in the next few months.
          </div>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {upcoming.map((e) => (
              <li key={e.id}>
                <EventRow event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Past
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card opacity-80">
            {past.slice(0, 20).map((e) => (
              <li key={e.id}>
                <EventRow event={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
