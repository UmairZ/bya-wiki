"use client";

import { useRouter } from "next/navigation";
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
import { deleteEventAction } from "../../events/actions";

export function EventDetailActions({
  canWrite,
  googleEventId,
  eventTitle,
}: {
  canWrite: boolean;
  googleEventId: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${eventTitle}"? This can't be undone.`)) {
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

  if (!canWrite) return null;

  return (
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
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" aria-hidden />
          Delete event
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
