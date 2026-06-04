import type { CalendarEvent } from "@/lib/calendar/types";
import type { DraftEventRow, EventStageRow } from "@/lib/supabase/types";

export type EnrichedEvent = {
  event: CalendarEvent;
  /** Null when no workflow is attached. */
  workflowId: string | null;
  /** Total tasks in the workflow (0 if no workflow). */
  taskCount: number;
  /** Tasks done OR skipped. */
  doneCount: number;
  /** Open tasks past their due date. */
  overdueCount: number;
  /** Stage where the card sits on the Kanban. Null = no stage can be derived
   *  (workflow has zero tasks, treat as Stage 1 fallback in the bucketer). */
  currentStageId: string | null;
  /** True when every task is done/skipped (and there's at least one task). */
  isComplete: boolean;
  /** When the workflow finished (max(completed_at)), if isComplete. */
  wrappedUpAt: string | null;
};

type RawTask = {
  workflow_id: string;
  event_stage_id: string;
  status: string;
  completed_at: string | null;
  due_at: string | null;
};

type RawWorkflow = {
  id: string;
  target_ref: string;
};

/** Compute the per-event derived state used by both the Events Kanban
 *  (where the card sits) and the Past Events list (whether it's "complete"). */
export function enrichEvents(
  events: CalendarEvent[],
  workflows: RawWorkflow[],
  tasks: RawTask[],
  stages: EventStageRow[],
): EnrichedEvent[] {
  const byTargetRef = new Map<string, RawWorkflow>();
  for (const w of workflows) byTargetRef.set(w.target_ref, w);

  const tasksByWorkflow = new Map<string, RawTask[]>();
  for (const t of tasks) {
    if (!tasksByWorkflow.has(t.workflow_id)) {
      tasksByWorkflow.set(t.workflow_id, []);
    }
    tasksByWorkflow.get(t.workflow_id)!.push(t);
  }

  const stageOrder = [...stages].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const now = Date.now();

  return events.map((event) => {
    const wf = byTargetRef.get(event.id);
    if (!wf) {
      return {
        event,
        workflowId: null,
        taskCount: 0,
        doneCount: 0,
        overdueCount: 0,
        currentStageId: null,
        isComplete: false,
        wrappedUpAt: null,
      };
    }

    const list = tasksByWorkflow.get(wf.id) ?? [];
    const doneCount = list.filter(
      (t) => t.status === "done" || t.status === "skipped",
    ).length;
    const taskCount = list.length;
    const isComplete = taskCount > 0 && doneCount === taskCount;
    const overdueCount = list.filter(
      (t) =>
        (t.status === "todo" || t.status === "in_progress") &&
        t.due_at !== null &&
        new Date(t.due_at).getTime() < now,
    ).length;

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
      workflowId: wf.id,
      taskCount,
      doneCount,
      overdueCount,
      currentStageId,
      isComplete,
      wrappedUpAt,
    };
  });
}

/** Split enriched events into the Kanban (active) and Past Events buckets.
 *  Bucketing rules (spec §4.3.1 / §4.3.2):
 *    - On Kanban: future events without workflow; OR has-workflow that's not
 *      complete (regardless of date — wrap-up tasks keep it active).
 *    - In Past Events: workflow complete (any date); OR past date with no
 *      workflow ever applied.
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
    } else if (e.workflowId) {
      kanban.push(e);
    } else if (isFuture) {
      kanban.push(e);
    } else {
      past.push(e);
    }
  }
  return { kanban, past };
}

// ---------------------------------------------------------------------------
// Drafts (Phase 7e)
// ---------------------------------------------------------------------------

export type EnrichedDraft = {
  draft: DraftEventRow;
  workflowId: string | null;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
};

export function enrichDrafts(
  drafts: DraftEventRow[],
  workflows: { id: string; target_ref: string; target_kind: string }[],
  tasks: RawTask[],
): EnrichedDraft[] {
  const byTargetRef = new Map<string, { id: string }>();
  for (const w of workflows) {
    if (w.target_kind === "draft") byTargetRef.set(w.target_ref, w);
  }

  const tasksByWorkflow = new Map<string, RawTask[]>();
  for (const t of tasks) {
    if (!tasksByWorkflow.has(t.workflow_id)) {
      tasksByWorkflow.set(t.workflow_id, []);
    }
    tasksByWorkflow.get(t.workflow_id)!.push(t);
  }

  const now = Date.now();

  return drafts.map((draft) => {
    const wf = byTargetRef.get(draft.id);
    if (!wf) {
      return {
        draft,
        workflowId: null,
        taskCount: 0,
        doneCount: 0,
        overdueCount: 0,
      };
    }
    const list = tasksByWorkflow.get(wf.id) ?? [];
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
      workflowId: wf.id,
      taskCount: list.length,
      doneCount,
      overdueCount,
    };
  });
}
