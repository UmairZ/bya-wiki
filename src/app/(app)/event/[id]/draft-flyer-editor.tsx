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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {flyerStoragePath ? (
        <div className="flex flex-col gap-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
            <Image
              src={flyerPublicUrl(flyerStoragePath)}
              alt="Event flyer"
              fill
              sizes="(min-width: 768px) 260px, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="flex-1"
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
              aria-label="Remove flyer"
            >
              <Trash2 className="size-3.5" aria-hidden />
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
            // Amber dropzone preserves the "required field" signal that
            // used to live on the (now-removed) FLYER label.
            "flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-amber-500/10 text-center transition-colors",
            dragOver
              ? "border-primary bg-brand-tint/40 text-primary"
              : "border-amber-500/50 text-amber-700 hover:border-primary/40 hover:bg-brand-tint/20 hover:text-foreground dark:text-amber-400",
            pending && "opacity-60",
          )}
        >
          {pending ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
          <span className="text-xs font-medium">
            {pending ? "Uploading…" : "Add a flyer (required to publish)"}
          </span>
        </button>
      )}
    </div>
  );
}
