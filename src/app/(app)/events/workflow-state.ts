// "Event state" — derives Kanban placement + overdue counts from the raw
// tasks attached to each event/draft. No workflow wrapper anymore (Phase 7f);
// tasks point at events/drafts directly via target_kind + target_ref.

import type { CalendarEvent } from "@/lib/calendar/types";
import type { DraftEventRow, EventStageRow } from "@/lib/supabase/types";

export type EnrichedEvent = {
  event: CalendarEvent;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
  /** First stage with any todo/in_progress task, or null if no open tasks. */
  currentStageId: string | null;
  /** True when there's at least one task and all are done/skipped. */
  isComplete: boolean;
  /** When the workflow finished (max(completed_at)) if isComplete. */
  wrappedUpAt: string | null;
};

export type EnrichedDraft = {
  draft: DraftEventRow;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
};

type RawTask = {
  target_kind: string;
  target_ref: string;
  event_stage_id: string;
  status: string;
  completed_at: string | null;
  due_at: string | null;
};

function groupTasksByTarget(tasks: RawTask[]) {
  const byEventRef = new Map<string, RawTask[]>();
  const byDraftRef = new Map<string, RawTask[]>();
  for (const t of tasks) {
    const map = t.target_kind === "draft" ? byDraftRef : byEventRef;
    if (!map.has(t.target_ref)) map.set(t.target_ref, []);
    map.get(t.target_ref)!.push(t);
  }
  return { byEventRef, byDraftRef };
}

export function enrichEvents(
  events: CalendarEvent[],
  tasks: RawTask[],
  stages: EventStageRow[],
): EnrichedEvent[] {
  const { byEventRef } = groupTasksByTarget(tasks);
  const stageOrder = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const now = Date.now();

  return events.map((event) => {
    const list = byEventRef.get(event.id) ?? [];
    if (list.length === 0) {
      return {
        event,
        taskCount: 0,
        doneCount: 0,
        overdueCount: 0,
        currentStageId: null,
        isComplete: false,
        wrappedUpAt: null,
      };
    }

    const doneCount = list.filter(
      (t) => t.status === "done" || t.status === "skipped",
    ).length;
    const overdueCount = list.filter(
      (t) =>
        (t.status === "todo" || t.status === "in_progress") &&
        t.due_at !== null &&
        new Date(t.due_at).getTime() < now,
    ).length;
    const isComplete = doneCount === list.length;

    let currentStageId: string | null = null;
    for (const s of stageOrder) {
      const hasOpen = list.some(
        (t) =>
          t.event_stage_id === s.id &&
          (t.status === "todo" || t.status === "in_progress"),
      );
      if (hasOpen) {
        currentStageId = s.id;
        break;
      }
    }

    let wrappedUpAt: string | null = null;
    if (isComplete) {
      const stamps = list
        .map((t) => t.completed_at)
        .filter((s): s is string => Boolean(s))
        .map((s) => new Date(s).getTime());
      if (stamps.length > 0) {
        wrappedUpAt = new Date(Math.max(...stamps)).toISOString();
      }
    }

    return {
      event,
      taskCount: list.length,
      doneCount,
      overdueCount,
      currentStageId,
      isComplete,
      wrappedUpAt,
    };
  });
}

export function enrichDrafts(
  drafts: DraftEventRow[],
  tasks: RawTask[],
): EnrichedDraft[] {
  const { byDraftRef } = groupTasksByTarget(tasks);
  const now = Date.now();

  return drafts.map((draft) => {
    const list = byDraftRef.get(draft.id) ?? [];
    const doneCount = list.filter(
      (t) => t.status === "done" || t.status === "skipped",
    ).length;
    const overdueCount = list.filter(
      (t) =>
        (t.status === "todo" || t.status === "in_progress") &&
        t.due_at !== null &&
        new Date(t.due_at).getTime() < now,
    ).length;
    return {
      draft,
      taskCount: list.length,
      doneCount,
      overdueCount,
    };
  });
}

/** Split published events into Kanban (active) vs Past Events buckets.
 *  Rules unchanged from before:
 *  - On Kanban: future events without tasks, OR has-tasks-not-complete
 *  - In Past Events: tasks all done (any date), OR past date with no tasks
 */
export function splitForEventsPage(
  enriched: EnrichedEvent[],
  now: number = Date.now(),
): { kanban: EnrichedEvent[]; past: EnrichedEvent[] } {
  const kanban: EnrichedEvent[] = [];
  const past: EnrichedEvent[] = [];
  for (const e of enriched) {
    const endOrStart = e.event.ends_at ?? e.event.starts_at;
    const isFuture = new Date(endOrStart).getTime() >= now;
    if (e.isComplete) {
      past.push(e);
    } else if (e.taskCount > 0) {
      kanban.push(e);
    } else if (isFuture) {
      kanban.push(e);
    } else {
      past.push(e);
    }
  }
  return { kanban, past };
}
