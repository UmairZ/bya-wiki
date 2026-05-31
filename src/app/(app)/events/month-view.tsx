"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  formatMonth,
  isToday,
  startOfMonth,
} from "@/lib/date-time";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar/types";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  function eventsFor(date: Date): CalendarEvent[] {
    return (
      byDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ??
      []
    );
  }

  return (
    <section
      aria-label="Month view"
      className="hidden rounded-lg border bg-card md:block"
    >
      <header className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{formatMonth(cursor)}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, -1))}
            aria-label="Previous month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Next month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase text-muted-foreground">
        {DOW.map((d) => (
          <div key={d} className="px-2 py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const today = isToday(day);
          const dayEvents = eventsFor(day);
          return (
            <div
              key={i}
              className={cn(
                "min-h-24 border-b border-r p-1.5 text-xs",
                !inMonth && "bg-muted/30 text-muted-foreground",
                today && "bg-brand-tint/30",
                i % 7 === 6 && "border-r-0",
                i >= days.length - 7 && "border-b-0",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  today &&
                    "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {day.getDate()}
              </div>
              <ul className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <li
                    key={e.id}
                    title={e.title}
                    className="truncate rounded bg-brand-tint px-1.5 py-0.5 text-[11px] text-brand-tint-foreground"
                  >
                    {e.title}
                  </li>
                ))}
                {dayEvents.length > 3 && (
                  <li className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildMonthGrid(monthStart: Date): Date[] {
  const shift = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -shift);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  while (days.length > 28) {
    const lastWeek = days.slice(-7);
    if (lastWeek.every((d) => d.getMonth() !== monthStart.getMonth())) {
      days.splice(-7, 7);
    } else {
      break;
    }
  }
  return days;
}
