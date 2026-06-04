"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { flyerPublicUrl } from "@/lib/flyer-url";
import {
  removeDraftFlyerAction,
  uploadDraftFlyerAction,
} from "@/app/(app)/drafts/actions";

export function DraftFlyerEditor({
  draftId,
  flyerStoragePath,
}: {
  draftId: string;
  flyerStoragePath: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const r = await uploadDraftFlyerAction(draftId, fd);
      if (!r.ok) toast.error(r.error);
      else toast.success("Flyer uploaded.");
    });
  }

  function handleRemove() {
    if (!window.confirm("Remove this flyer?")) return;
    startTransition(async () => {
      const r = await removeDraftFlyerAction(draftId);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Flyer
        </label>
        <span className="text-[10px] text-muted-foreground/70">
          1:1 square looks best · ≤ 5 MB
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {flyerStoragePath ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border bg-muted">
            <Image
              src={flyerPublicUrl(flyerStoragePath)}
              alt="Event flyer"
              fill
              sizes="200px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex gap-2 sm:flex-col">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-3.5" aria-hidden />
              )}
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={pending}
          className={cn(
            "flex aspect-square w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 text-center transition-colors",
            dragOver
              ? "border-primary bg-brand-tint/40 text-primary"
              : "border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:bg-brand-tint/20 hover:text-foreground",
            pending && "opacity-60",
          )}
        >
          {pending ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
          <span className="text-xs font-medium">
            {pending ? "Uploading…" : "Click or drop a flyer"}
          </span>
        </button>
      )}
    </div>
  );
}
