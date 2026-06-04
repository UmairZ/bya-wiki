"use client";

import { cn } from "@/lib/utils";
import type { EventStageRow, TaskRow } from "@/lib/supabase/types";
import { AddTaskInline, TaskCard, type MemberSummary } from "./task-card";

export type { MemberSummary };

export function TaskKanban({
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
  // Current stage = first stage (across all 4) with any todo/in_progress task.
  const currentStageId = (() => {
    for (const s of stages) {
      const has = tasks.some(
        (t) =>
          t.event_stage_id === s.id &&
          (t.status === "todo" || t.status === "in_progress"),
      );
      if (has) return s.id;
    }
    return null;
  })();

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
    <div className="grid auto-rows-min gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage) => {
        const list = byStage.get(stage.id) ?? [];
        const doneCount = list.filter(
          (t) => t.status === "done" || t.status === "skipped",
        ).length;
        const isCurrent = currentStageId === stage.id;
        const stagePct =
          list.length === 0 ? 0 : Math.round((doneCount / list.length) * 100);
        const stageAllDone = list.length > 0 && doneCount === list.length;
        return (
          <section
            key={stage.id}
            aria-label={stage.name}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-muted/30 p-3",
              isCurrent && "border-l-2 border-l-primary",
            )}
          >
            <div className="flex flex-col gap-1.5 px-1">
              <div className="flex items-baseline justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stage.name}
                  {isCurrent && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                      current
                    </span>
                  )}
                </h3>
                <span
                  className={cn(
                    "text-[10px] font-medium tabular-nums",
                    stageAllDone ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {doneCount}/{list.length}
                </span>
              </div>
              <div
                aria-hidden
                className="h-1 w-full overflow-hidden rounded-full bg-muted/60"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    stageAllDone
                      ? "bg-primary"
                      : list.length === 0
                        ? ""
                        : "bg-primary/60",
                  )}
                  style={{ width: `${stagePct}%` }}
                />
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {list.map((t) => (
                <li key={t.id}>
                  <TaskCard
                    task={t}
                    stages={stages}
                    members={members}
                    membersById={membersById}
                    targetKind={targetKind}
                    targetRef={targetRef}
                  />
                </li>
              ))}
            </ul>

            <AddTaskInline
              targetKind={targetKind}
              targetRef={targetRef}
              stageId={stage.id}
            />
          </section>
        );
      })}
    </div>
  );
}
