"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventsCalendar } from "./events-calendar";
import { EventsMonthList } from "./events-month-list";

/** "All events" section: month calendar (2/3) + list of events that month
 *  (1/3). Stacks on mobile. State for the displayed month lives here so
 *  navigation stays in sync. */
export function AllEventsSection({ events }: { events: CalendarEvent[] }) {
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthEvents = useMemo(() => {
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    return events.filter((e) => {
      const start = new Date(e.starts_at);
      return start.getFullYear() === year && start.getMonth() === month;
    });
  }, [events, displayedMonth]);

  return (
    <section aria-label="All events" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        All events
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <EventsCalendar
            events={monthEvents}
            displayedMonth={displayedMonth}
            onMonthChange={setDisplayedMonth}
          />
        </div>
        <div>
          <EventsMonthList
            events={monthEvents}
            displayedMonth={displayedMonth}
          />
        </div>
      </div>
    </section>
  );
}
