import Link from "next/link";
import { AlertCircle, MapPin } from "lucide-react";
import {
  dayOfMonthInOrgTz,
  formatEventWhen,
  formatMonthDay,
  formatMonthShort,
} from "@/lib/date-time";
import { parseDescription } from "@/lib/calendar/markers";
import { encodeEventHref } from "@/lib/calendar/event-href";
import { cn } from "@/lib/utils";
import type { EnrichedDraft, EnrichedEvent } from "./workflow-state";
import { AddDraftComposer } from "./add-draft-composer";

export type Stage = {
  id: string;
  name: string;
  sort_order: number;
};

/** Place published events into Pre-event/Day-of/Wrap-up columns. The first
 *  column is reserved for drafts (DB-backed); published events skip it. If a
 *  published event somehow has open tasks only in the first stage, it falls
 *  through to stage 2 — by definition publishing means we're past drafting. */
function bucketEvents(events: EnrichedEvent[], stages: Stage[]) {
  const buckets = new Map<string, EnrichedEvent[]>();
  for (const s of stages) buckets.set(s.id, []);
  const draftsStageId = stages[0]?.id;
  const fallbackPublishedStageId = stages[1]?.id ?? stages[0]?.id;

  for (const enriched of events) {
    let target = enriched.currentStageId ?? fallbackPublishedStageId;
    if (target === draftsStageId) {
      // Published events don't live in the Drafts column.
      target = fallbackPublishedStageId;
    }
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
            {formatMonthShort(event.starts_at)}
          </span>
          <span className="text-sm font-bold leading-none">
            {dayOfMonthInOrgTz(event.starts_at)}
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

function DraftCard({ enriched }: { enriched: EnrichedDraft }) {
  const { draft, taskCount, doneCount, overdueCount } = enriched;
  const dateLabel = draft.starts_at ? formatMonthDay(draft.starts_at) : null;
  return (
    <Link
      href={`/event/${encodeURIComponent(draft.id)}`}
      prefetch
      className={cn(
        "group flex flex-col gap-1.5 rounded-md border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        overdueCount > 0 && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-muted-foreground"
          aria-hidden
        >
          <span className="text-[10px] font-semibold uppercase">DRF</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-1">
            <h3 className="truncate text-sm font-medium flex-1">{draft.title}</h3>
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
            {dateLabel ?? "No date set"}
            {draft.location && ` · ${draft.location}`}
          </p>
        </div>
      </div>
      {taskCount > 0 ? (
        <div className="flex items-center gap-1">
          <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((doneCount / taskCount) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {doneCount}/{taskCount}
          </span>
        </div>
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
  drafts,
}: {
  stages: Stage[];
  upcoming: EnrichedEvent[];
  drafts: EnrichedDraft[];
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
  // Sort drafts: those with a date first (asc), dateless after.
  const sortedDrafts = [...drafts].sort((a, b) => {
    const aT = a.draft.starts_at ? new Date(a.draft.starts_at).getTime() : Infinity;
    const bT = b.draft.starts_at ? new Date(b.draft.starts_at).getTime() : Infinity;
    return aT - bT;
  });

  return (
    <div className="grid auto-rows-min gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage, idx) => {
        const isDraftsColumn = idx === 0;
        const eventList = buckets.get(stage.id) ?? [];
        const draftList = isDraftsColumn ? sortedDrafts : [];
        const totalCount = draftList.length + eventList.length;
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
                {totalCount}
              </span>
            </div>
            {isDraftsColumn && <AddDraftComposer />}
            {totalCount === 0 ? (
              <div className="rounded-md border border-dashed bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground/70">
                Empty
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {draftList.map((d) => (
                  <li key={`draft-${d.draft.id}`}>
                    <DraftCard enriched={d} />
                  </li>
                ))}
                {eventList.map((enriched) => (
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
