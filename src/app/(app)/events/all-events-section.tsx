"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventsCalendar } from "./events-calendar";
import { EventsMonthList } from "./events-month-list";
import { DayDraftDialog } from "./day-draft-dialog";

/** "All events" section: month calendar (2/3) + list of events that month
 *  (1/3). Stacks on mobile. State for the displayed month lives here so
 *  calendar + list stay in sync. Clicking a day cell opens a small dialog
 *  to create a new draft for that date. */
export function AllEventsSection({ events }: { events: CalendarEvent[] }) {
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [draftDate, setDraftDate] = useState<Date | null>(null);

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
        <div className="min-w-0 md:col-span-2">
          <EventsCalendar
            events={monthEvents}
            displayedMonth={displayedMonth}
            onMonthChange={setDisplayedMonth}
            onDayClick={setDraftDate}
          />
        </div>
        <div className="min-w-0">
          <EventsMonthList
            events={monthEvents}
            displayedMonth={displayedMonth}
          />
        </div>
      </div>
      <DayDraftDialog
        date={draftDate}
        open={Boolean(draftDate)}
        onOpenChange={(next) => {
          if (!next) setDraftDate(null);
        }}
      />
    </section>
  );
}
