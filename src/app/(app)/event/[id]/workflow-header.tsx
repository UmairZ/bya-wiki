"use client";

import { useTransition } from "react";
import { Archive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkflowRow } from "@/lib/supabase/types";
import { archiveWorkflowAction } from "./actions";

export function WorkflowHeader({
  workflow,
  eventId,
  taskCount,
  doneCount,
  allDone,
}: {
  workflow: WorkflowRow;
  eventId: string;
  taskCount: number;
  doneCount: number;
  allDone: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    if (
      !window.confirm(
        `Archive "${workflow.name}"? Tasks will stay but the workflow will be removed from this event's Kanban.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await archiveWorkflowAction(workflow.id, eventId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Workflow archived.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium">{workflow.name}</p>
        <p className={cn("text-xs", allDone ? "text-primary" : "text-muted-foreground")}>
          {allDone ? (
            <>
              <CheckCircle2 className="-mt-0.5 mr-1 inline size-3" aria-hidden />
              All {taskCount} task{taskCount === 1 ? "" : "s"} done
            </>
          ) : (
            <>
              {doneCount} of {taskCount} task{taskCount === 1 ? "" : "s"} done
            </>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleArchive}
        disabled={pending}
      >
        <Archive className="size-3.5" aria-hidden />
        Archive workflow
      </Button>
    </div>
  );
}
