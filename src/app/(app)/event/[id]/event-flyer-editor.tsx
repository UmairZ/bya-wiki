"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { flyerPublicUrl } from "@/lib/flyer-url";
import {
  removeEventFlyerAction,
  uploadEventFlyerAction,
} from "./actions";

/** Flyer editor for a published event. Same shape as DraftFlyerEditor; talks
 *  to event_flyers via target_ref (the GCal event UID). */
export function EventFlyerEditor({
  eventRef,
  flyerStoragePath,
  hasRegistrationUrl,
}: {
  eventRef: string;
  flyerStoragePath: string | null;
  /** When true + a flyer exists, the event will appear on /r/events. When
   *  false + a flyer exists, we surface a warning since the public page
   *  requires both. */
  hasRegistrationUrl: boolean;
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
      const r = await uploadEventFlyerAction(eventRef, fd);
      if (!r.ok) toast.error(r.error);
      else toast.success("Flyer updated.");
    });
  }

  function handleRemove() {
    if (!window.confirm("Remove this flyer?")) return;
    startTransition(async () => {
      const r = await removeEventFlyerAction(eventRef);
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
          {!hasRegistrationUrl && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
              <AlertTriangle
                className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <p className="text-foreground/80">
                Flyer set but no registration link —{" "}
                <span className="font-medium">won&apos;t appear on /r/events</span>{" "}
                until added.
              </p>
            </div>
          )}
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
            "flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 text-center transition-colors",
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
