"use client";

import { useTransition } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAllTasksAction } from "./actions";

export function ClearTasksMenu({
  targetKind,
  targetRef,
  taskCount,
}: {
  targetKind: "event" | "draft";
  targetRef: string;
  taskCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || taskCount === 0;

  function handleClear() {
    if (
      !window.confirm(
        `Delete all ${taskCount} task${taskCount === 1 ? "" : "s"} on this ${targetKind}? This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await clearAllTasksAction(targetKind, targetRef);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Cleared ${r.data.deleted} task${r.data.deleted === 1 ? "" : "s"}.`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Task list actions"
            disabled={pending}
          />
        }
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          variant="destructive"
          onClick={handleClear}
          disabled={disabled}
        >
          <Trash2 className="size-4" aria-hidden />
          Clear all tasks
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
