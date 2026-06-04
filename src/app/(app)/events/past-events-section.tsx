"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatEventWhen } from "@/lib/date-time";
import { encodeEventHref } from "@/lib/calendar/event-href";
import type { EnrichedEvent } from "./workflow-state";

export function PastEventsSection({ events }: { events: EnrichedEvent[] }) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");

  // Default sort: most-recent wrap-up first; fall back to event date.
  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      const aT = a.wrappedUpAt
        ? new Date(a.wrappedUpAt).getTime()
        : new Date(a.event.starts_at).getTime();
      const bT = b.wrappedUpAt
        ? new Date(b.wrappedUpAt).getTime()
        : new Date(b.event.starts_at).getTime();
      return bT - aT;
    });
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) => e.event.title.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <section aria-label="Past events" className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
      >
        <ChevronRight
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Past events
        </h2>
        <span className="text-xs text-muted-foreground">
          {open ? "" : "expand"} · {events.length} total
        </span>
      </button>

      {open && (
        <>
          {events.length > 8 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter past events…"
                className="pl-8"
              />
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
              {events.length === 0 ? "No past events yet." : "No matches."}
            </div>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border bg-card">
              {filtered.map((enriched) => {
                const { event, isComplete, wrappedUpAt } = enriched;
                const start = new Date(event.starts_at);
                const wrappedLabel = wrappedUpAt
                  ? new Date(wrappedUpAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : null;
                return (
                  <li key={event.id}>
                    <Link
                      href={encodeEventHref(event.id)}
                      prefetch
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:bg-brand-tint/30"
                    >
                      <div
                        className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        <span className="text-[10px] font-semibold uppercase">
                          {start.toLocaleString(undefined, { month: "short" })}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {start.getDate()}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h3 className="truncate text-sm font-medium">
                          {event.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatEventWhen(event)}
                        </p>
                        {event.location && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" aria-hidden />
                            <span className="truncate">{event.location}</span>
                          </p>
                        )}
                      </div>
                      {isComplete ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <CheckCircle2 className="size-3" aria-hidden />
                          {wrappedLabel
                            ? `wrapped ${wrappedLabel}`
                            : "completed"}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          no playbook
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
