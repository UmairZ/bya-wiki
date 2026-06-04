"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { encodeEventHref } from "@/lib/calendar/event-href";
import {
  formatMonthLong,
  formatTime,
  isoDateInOrgTz,
} from "@/lib/date-time";
import type { CalendarEvent } from "@/lib/calendar/types";

/** Month grid with prev/next navigation. Renders event chips on their start
 *  date. Click a chip to navigate to the event detail. Click empty day space
 *  (the day cell, but outside any chip) to create a new draft for that day. */
export function EventsCalendar({
  events,
  displayedMonth,
  onMonthChange,
  onDayClick,
}: {
  /** Events whose start_at falls within the currently-displayed month. */
  events: CalendarEvent[];
  /** First-of-month Date for the currently displayed month. */
  displayedMonth: Date;
  onMonthChange: (next: Date) => void;
  /** Optional: clicking an empty area in a day cell triggers this. */
  onDayClick?: (date: Date) => void;
}) {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const today = new Date();
  const todayKey = isoDateInOrgTz(today);

  // Build a 6-week grid starting from the Sunday on or before the 1st.
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1);
  gridStart.setDate(1 - firstOfMonth.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  // Bucket events by their start date in the org timezone.
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = isoDateInOrgTz(e.starts_at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  for (const list of byDay.values()) {
    list.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }

  const monthLabel = formatMonthLong(displayedMonth);

  function jump(deltaMonths: number) {
    const next = new Date(year, month + deltaMonths, 1);
    onMonthChange(next);
  }

  function goToday() {
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="h-8 px-2 text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => jump(-1)}
            aria-label="Previous month"
            className="size-8"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => jump(1)}
            aria-label="Next month"
            className="size-8"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md bg-border text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-muted/40 px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          // For grid cell keys we use the *local* date because `d` was built
          // from a local-time month iteration; mixing org-tz here would shift
          // grid placement for users far from PT.
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const isOtherMonth = d.getMonth() !== month;
          const isToday = key === todayKey;
          const dayEvents = byDay.get(key) ?? [];
          const clickable = Boolean(onDayClick);
          // Use a button if the cell is clickable; div otherwise. We snapshot
          // the date in a closure-local because `d` is shared.
          const dayDate = new Date(d);
          const cellBody = (
            <>
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center self-start rounded-full text-[10px] font-semibold",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && isOtherMonth && "text-muted-foreground/50",
                  !isToday && !isOtherMonth && "text-foreground/80",
                )}
              >
                {d.getDate()}
              </span>
              <ul className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const compactTime = e.all_day
                    ? null
                    : formatTime(e.starts_at)
                        .replace(/\s*[AP]M$/i, (m) => m.trim().toLowerCase()[0])
                        .replace(/:00/, "");
                  return (
                    <li key={e.id}>
                      <Link
                        href={encodeEventHref(e.id)}
                        prefetch
                        onClick={(ev) => ev.stopPropagation()}
                        className="flex items-center gap-1 truncate rounded border-l-2 border-l-primary/60 bg-brand-tint px-1.5 py-0.5 text-[10px] font-medium leading-tight text-brand-tint-foreground transition-colors hover:bg-brand-tint/80 hover:border-l-primary"
                        title={
                          compactTime ? `${compactTime} · ${e.title}` : e.title
                        }
                      >
                        {compactTime && (
                          <span className="shrink-0 tabular-nums text-[9px] font-semibold text-primary/80">
                            {compactTime}
                          </span>
                        )}
                        <span className="truncate">{e.title}</span>
                      </Link>
                    </li>
                  );
                })}
                {dayEvents.length > 3 && (
                  <li className="px-1 text-[9px] font-medium text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </li>
                )}
              </ul>
            </>
          );
          if (clickable) {
            return (
              <button
                type="button"
                key={key}
                onClick={() => onDayClick!(dayDate)}
                aria-label={`Create draft for ${dayDate.toLocaleDateString()}`}
                className={cn(
                  "group flex min-h-[72px] flex-col gap-0.5 bg-card p-1 text-left align-top transition-colors hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:bg-brand-tint/30 md:min-h-[88px]",
                  isOtherMonth && "bg-muted/20",
                )}
              >
                {cellBody}
              </button>
            );
          }
          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[72px] flex-col gap-0.5 bg-card p-1 align-top md:min-h-[88px]",
                isOtherMonth && "bg-muted/20",
              )}
            >
              {cellBody}
            </div>
          );
        })}
      </div>
    </div>
  );
}

