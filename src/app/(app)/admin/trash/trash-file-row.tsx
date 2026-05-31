"use client";

import { useTransition } from "react";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format-date";
import {
  hardDeleteResourceAction,
  restoreResourceAction,
} from "./actions";

export type DeletedResource = {
  id: string;
  title: string;
  file_type: string;
  deleted_at: string;
  category: { name: string; slug: string } | null;
};

export function TrashFileRow({ file }: { file: DeletedResource }) {
  const [pending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreResourceAction(file.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${file.title}".`);
    });
  }

  function handleHardDelete() {
    if (
      !window.confirm(
        `Permanently delete "${file.title}"? This wipes the bytes too and can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await hardDeleteResourceAction(file.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("File permanently deleted.");
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{file.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {file.category?.name ?? "(no category)"} · deleted{" "}
          {formatRelative(file.deleted_at)}
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
