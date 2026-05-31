"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { formatRelative } from "@/lib/format-date";
import { hardDeletePageAction, restorePageAction } from "./actions";
import type { DeletedPage } from "./page";

export function TrashRow({ page }: { page: DeletedPage }) {
  const [pending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const result = await restorePageAction(page.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${page.title}".`);
    });
  }

  function handleHardDelete() {
    if (
      !window.confirm(
        `Permanently delete "${page.title}"? This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await hardDeletePageAction(page.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Page permanently deleted.");
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <CategoryIcon name={page.category?.icon} className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{page.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {page.category?.name ?? "(no category)"} · deleted{" "}
          {formatRelative(page.deleted_at)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={pending}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHardDelete}
          disabled={pending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete forever
        </Button>
      </div>
    </div>
  );
}
