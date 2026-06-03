"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  EventDialog,
  type EditableEvent,
} from "../../events/event-dialog";
import { deleteEventAction } from "../../events/actions";

export function EventDetailActions({
  canWrite,
  googleEventId,
  event,
}: {
  canWrite: boolean;
  googleEventId: string;
  event: EditableEvent;
}) {
  const router = useRouter();
  const [readOnly, setReadOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${event.title}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteEventAction(googleEventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Event deleted.");
      router.push("/events");
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setReadOnly((v) => !v)}
        aria-pressed={readOnly}
        title={readOnly ? "Read-only mode on" : "Read-only mode off"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
          readOnly
            ? "border-primary/40 bg-brand-tint/40 text-foreground"
            : "border-transparent bg-transparent text-muted-foreground hover:bg-muted",
        )}
      >
        <Eye className="size-3.5" aria-hidden />
        {readOnly ? "View only" : "Edit"}
      </button>
      {canWrite && !readOnly && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Event actions"
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden />
                Edit event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" aria-hidden />
                Delete event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <EventDialog
            open={editing}
            onOpenChange={setEditing}
            event={event}
          />
        </>
      )}
    </div>
  );
}
