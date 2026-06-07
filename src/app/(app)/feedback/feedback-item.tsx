"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteFeedbackAction } from "./actions";

export function FeedbackItemActions({
  id,
  canDelete,
}: {
  id: string;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this idea?")) return;
    startTransition(async () => {
      const r = await deleteFeedbackAction(id);
      if (!r.ok) toast.error(r.error);
    });
  }

  if (!canDelete) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
      aria-label="Delete idea"
      className="size-7 shrink-0 p-0 text-muted-foreground/60 opacity-100 transition-opacity hover:text-destructive pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </Button>
  );
}
