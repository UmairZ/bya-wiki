"use client";

import { CheckCircle2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

/** Slim summary row above the Task Kanban. Replaces the old workflow-named
 *  header — shows total progress + which playbooks have been applied. */
export function TaskSectionHeader({
  taskCount,
  doneCount,
  appliedTemplateNames,
}: {
  taskCount: number;
  doneCount: number;
  appliedTemplateNames: string[];
}) {
  const allDone = taskCount > 0 && doneCount === taskCount;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full",
            allDone ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {allDone ? (
            <CheckCircle2 className="size-4" aria-hidden />
          ) : (
            <ListChecks className="size-4" aria-hidden />
          )}
        </span>
        <span className={cn("text-sm font-medium", allDone && "text-primary")}>
          {taskCount === 0
            ? "No tasks yet"
            : allDone
              ? `All ${taskCount} task${taskCount === 1 ? "" : "s"} done`
              : `${doneCount} of ${taskCount} task${taskCount === 1 ? "" : "s"} done`}
        </span>
      </div>

      {appliedTemplateNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>Applied:</span>
          {appliedTemplateNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/80"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
