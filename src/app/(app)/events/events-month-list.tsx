"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { encodeEventHref } from "@/lib/calendar/event-href";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  dayOfMonthInOrgTz,
  formatEventWhen,
  formatMonthLong,
  formatMonthShort,
  isoDateInOrgTz,
} from "@/lib/date-time";

/** Chronological list of events for the displayed month. Stays in sync with
 *  the calendar via the parent's `displayedMonth` state. */
export function EventsMonthList({
  events,
  displayedMonth,
}: {
  events: CalendarEvent[];
  displayedMonth: Date;
}) {
  const monthLabel = formatMonthLong(displayedMonth);

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const today = new Date();
  const todayKey = isoDateInOrgTz(today);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{monthLabel}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {sorted.length} event{sorted.length === 1 ? "" : "s"}
        </span>
      </header>

      {sorted.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground/70">
          Nothing scheduled.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {sorted.map((e) => {
            const start = new Date(e.starts_at);
            const isPast =
              (e.ends_at ? new Date(e.ends_at).getTime() : start.getTime()) <
              today.getTime();
            const isToday = isoDateInOrgTz(start) === todayKey;
            return (
              <li key={e.id}>
                <Link
                  href={encodeEventHref(e.id)}
                  prefetch
                  className={cn(
                    "flex items-start gap-3 px-1 py-2 transition-colors hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:bg-brand-tint/30",
                    isPast && "opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 flex-col items-center justify-center rounded-md text-center",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "bg-brand-tint text-brand-tint-foreground",
                    )}
                    aria-hidden
                  >
                    <span className="text-[9px] font-semibold uppercase leading-none">
                      {formatMonthShort(start)}
                    </span>
                    <span className="text-sm font-bold leading-none mt-0.5">
                      {dayOfMonthInOrgTz(start)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h4 className="truncate text-sm font-medium">{e.title}</h4>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatEventWhen(e)}
                    </p>
                    {e.location && (
                      <p className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">{e.location}</span>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

