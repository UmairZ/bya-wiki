"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventStageRow, TaskRow } from "@/lib/supabase/types";
import { AddTaskInline, TaskCard, type MemberSummary } from "./task-card";

export type { MemberSummary };

/** Per-event tasks UI. Replaces the kanban-in-kanban with a sectioned
 *  checklist threaded by a vertical rail down the left margin, plus a row
 *  of 4 stage stat pills at the top. The 4-stage flow is still visible
 *  (pedagogy) but the body reads as a single checklist you work through. */
export function TaskChecklist({
  targetKind,
  targetRef,
  tasks,
  stages,
  members,
}: {
  targetKind: "event" | "draft";
  targetRef: string;
  tasks: TaskRow[];
  stages: EventStageRow[];
  members: MemberSummary[];
}) {
  const currentId = currentStageId(stages, tasks);

  // Open the current stage by default; persist toggles within the session.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(currentId ? [currentId] : []),
  );

  // If the current stage changes (a stage's last todo got ticked, advancing
  // us forward), open the new current stage too — without collapsing what
  // the user already opened. Done via the prev-value render pattern rather
  // than an effect, so there's no extra commit/re-render.
  const [prevCurrentId, setPrevCurrentId] = useState(currentId);
  if (currentId !== prevCurrentId) {
    setPrevCurrentId(currentId);
    if (currentId) {
      setExpanded((prev) => {
        if (prev.has(currentId)) return prev;
        const next = new Set(prev);
        next.add(currentId);
        return next;
      });
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const byStage = new Map<string, TaskRow[]>();
  for (const s of stages) byStage.set(s.id, []);
  for (const t of tasks) {
    if (!byStage.has(t.event_stage_id)) byStage.set(t.event_stage_id, []);
    byStage.get(t.event_stage_id)!.push(t);
  }
  for (const list of byStage.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative pl-8">
        <RailLine stages={stages} byStage={byStage} currentId={currentId} />

        <div className="flex flex-col gap-2">
          {stages.map((stage) => {
            const list = byStage.get(stage.id) ?? [];
            const open = expanded.has(stage.id);
            return (
              <StageSection
                key={stage.id}
                stage={stage}
                stages={stages}
                tasks={list}
                isCurrent={stage.id === currentId}
                open={open}
                onToggle={() => toggle(stage.id)}
                members={members}
                membersById={membersById}
                targetKind={targetKind}
                targetRef={targetRef}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function currentStageId(
  stages: EventStageRow[],
  tasks: TaskRow[],
): string | null {
  for (const s of stages) {
    const has = tasks.some(
      (t) =>
        t.event_stage_id === s.id &&
        (t.status === "todo" || t.status === "in_progress"),
    );
    if (has) return s.id;
  }
  return null;
}

function stageProgress(list: TaskRow[]) {
  const done = list.filter(
    (t) => t.status === "done" || t.status === "skipped",
  ).length;
  const total = list.length;
  return {
    done,
    total,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

function RailLine({
  stages,
  byStage,
  currentId,
}: {
  stages: EventStageRow[];
  byStage: Map<string, TaskRow[]>;
  currentId: string | null;
}) {
  const currentIdx = stages.findIndex((s) => s.id === currentId);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-3 top-2 bottom-2 flex flex-col"
    >
      {stages.map((stage, idx) => {
        const list = byStage.get(stage.id) ?? [];
        const p = stageProgress(list);
        const isPast = currentIdx !== -1 && idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isComplete = p.total > 0 && p.done === p.total;
        return (
          <div key={stage.id} className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                "size-3 shrink-0 rounded-full",
                isCurrent
                  ? "bg-primary ring-4 ring-primary/20"
                  : isPast || isComplete
                    ? "bg-primary/60"
                    : "bg-muted-foreground/30",
              )}
            />
            {idx < stages.length - 1 && (
              <div
                className={cn(
                  "w-px flex-1",
                  isPast || (isCurrent && p.pct === 100)
                    ? "bg-primary/40"
                    : isCurrent
                      ? "bg-gradient-to-b from-primary/40 to-muted-foreground/20"
                      : "border-l border-dashed border-muted-foreground/30 bg-transparent",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StageSection({
  stage,
  stages,
  tasks,
  isCurrent,
  open,
  onToggle,
  members,
  membersById,
  targetKind,
  targetRef,
}: {
  stage: EventStageRow;
  stages: EventStageRow[];
  tasks: TaskRow[];
  isCurrent: boolean;
  open: boolean;
  onToggle: () => void;
  members: MemberSummary[];
  membersById: Map<string, MemberSummary>;
  targetKind: "event" | "draft";
  targetRef: string;
}) {
  const p = stageProgress(tasks);
  const empty = tasks.length === 0;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section
      aria-label={stage.name}
      className={cn(
        "overflow-hidden rounded-lg",
        isCurrent && "bg-primary/[0.03] ring-1 ring-primary/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30"
      >
        <Chevron
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
          {stage.name}
          {isCurrent && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
              current
            </span>
          )}
        </h3>
        <span
          className={cn(
            "ml-auto text-xs font-medium tabular-nums",
            p.pct === 100 && p.total > 0
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          {p.done}/{p.total}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {empty ? (
            <p className="px-2 py-3 text-center text-xs italic text-muted-foreground/60">
              No tasks in this stage yet.
            </p>
          ) : (
            tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                stages={stages}
                members={members}
                membersById={membersById}
                targetKind={targetKind}
                targetRef={targetRef}
                display="row"
              />
            ))
          )}
          <div className="mt-1">
            <AddTaskInline
              targetKind={targetKind}
              targetRef={targetRef}
              stageId={stage.id}
            />
          </div>
        </div>
      )}
    </section>
  );
}
