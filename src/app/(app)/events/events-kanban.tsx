import Link from "next/link";
import { AlertCircle, MapPin } from "lucide-react";
import { formatEventWhen } from "@/lib/date-time";
import { parseDescription } from "@/lib/calendar/markers";
import { encodeEventHref } from "@/lib/calendar/event-href";
import { cn } from "@/lib/utils";
import type { EnrichedEvent } from "./workflow-state";

export type Stage = {
  id: string;
  name: string;
  sort_order: number;
};

function bucketEvents(events: EnrichedEvent[], stages: Stage[]) {
  const buckets = new Map<string, EnrichedEvent[]>();
  for (const s of stages) buckets.set(s.id, []);
  const firstStageId = stages[0]?.id;

  for (const enriched of events) {
    const target = enriched.currentStageId ?? firstStageId;
    if (!target) continue;
    if (!buckets.has(target)) buckets.set(target, []);
    buckets.get(target)!.push(enriched);
  }

  for (const list of buckets.values()) {
    list.sort(
      (a, b) =>
        new Date(a.event.starts_at).getTime() -
        new Date(b.event.starts_at).getTime(),
    );
  }
  return buckets;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const segments = Array.from({ length: Math.min(total, 8) }, (_, i) => {
    const slot = Math.floor((i / Math.min(total, 8)) * total);
    return slot < done;
  });
  return (
    <div className="flex items-center gap-1">
      <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

function EventCard({ enriched }: { enriched: EnrichedEvent }) {
  const { event, taskCount, doneCount, overdueCount } = enriched;
  const start = new Date(event.starts_at);
  const parsed = parseDescription(event.description);
  return (
    <Link
      href={encodeEventHref(event.id)}
      prefetch
      className={cn(
        "group flex flex-col gap-1.5 rounded-md border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        overdueCount > 0 && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground"
          aria-hidden
        >
          <span className="text-[10px] font-semibold uppercase">
            {start.toLocaleString(undefined, { month: "short" })}
          </span>
          <span className="text-sm font-bold leading-none">
            {start.getDate()}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-1">
            <h3 className="truncate text-sm font-medium flex-1">{event.title}</h3>
            {overdueCount > 0 && (
              <span
                className="flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold text-destructive"
                title={`${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}`}
              >
                <AlertCircle className="size-2.5" aria-hidden />
                {overdueCount}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {formatEventWhen(event)}
          </p>
        </div>
      </div>
      {event.location && (
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3" aria-hidden />
          <span className="truncate">{event.location}</span>
        </p>
      )}
      {parsed.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {parsed.tags.slice(0, 3).map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      {taskCount > 0 ? (
        <ProgressBar done={doneCount} total={taskCount} />
      ) : (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
          no playbook
        </span>
      )}
    </Link>
  );
}

export function EventsKanban({
  stages,
  upcoming,
}: {
  stages: Stage[];
  upcoming: EnrichedEvent[];
}) {
  if (stages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
        No stages configured. Owner: visit{" "}
        <Link
          href="/admin/event-stages"
          className="text-primary underline-offset-4 hover:underline"
        >
          /admin/event-stages
        </Link>{" "}
        to set them up.
      </div>
    );
  }
  const buckets = bucketEvents(upcoming, stages);
  return (
    <div className="grid auto-rows-min gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage) => {
        const list = buckets.get(stage.id) ?? [];
        return (
          <section
            key={stage.id}
            aria-label={stage.name}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-muted/30 p-3",
            )}
          >
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stage.name}
              </h2>
              <span className="text-[10px] font-medium text-muted-foreground">
                {list.length}
              </span>
            </div>
            {list.length === 0 ? (
              <div className="rounded-md border border-dashed bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground/70">
                Empty
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((enriched) => (
                  <li key={enriched.event.id}>
                    <EventCard enriched={enriched} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
