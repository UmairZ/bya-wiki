"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { emptyTrashAction } from "./actions";

export function EmptyTrashButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();

  function handleEmpty() {
    if (
      !window.confirm(
        `Permanently delete all ${count} page${count === 1 ? "" : "s"} in trash? This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await emptyTrashAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Trash emptied.");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEmpty}
      disabled={pending}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="size-4" aria-hidden />
      Empty trash
    </Button>
  );
}
