"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadFileAction } from "./file-actions";

async function uploadFiles(
  categoryId: string,
  files: FileList | File[],
): Promise<void> {
  const list = Array.from(files);
  if (list.length === 0) return;
  let okCount = 0;
  for (const file of list) {
    const fd = new FormData();
    fd.set("category_id", categoryId);
    fd.set("file", file);
    const result = await uploadFileAction(fd);
    if (!result.ok) {
      toast.error(`${file.name}: ${result.error}`);
    } else {
      okCount++;
    }
  }
  if (okCount > 0) {
    toast.success(
      okCount === 1 ? "1 file uploaded." : `${okCount} files uploaded.`,
    );
  }
}

export function UploadButton({ categoryId }: { categoryId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function pickFiles() {
    inputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    startTransition(async () => {
      await uploadFiles(categoryId, files);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <>
      <Button onClick={pickFiles} variant="outline" disabled={pending}>
        <Upload className="size-4" aria-hidden />
        {pending ? "Uploading…" : "Upload file"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </>
  );
}

/**
 * Window-level drop target — listens for dragover/drop anywhere on the page
 * and uploads dropped files to the category. Renders a viewport-wide overlay
 * while the user is dragging files in.
 *
 * Counter-based drag tracking handles the fact that dragenter/leave fire for
 * every nested element; we only flip "dragOver" on/off when the count
 * crosses zero.
 */
export function DropZone({
  categoryId,
  children,
}: {
  categoryId: string;
  children: React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const counterRef = useRef(0);

  useEffect(() => {
    function hasFiles(e: DragEvent): boolean {
      return Boolean(e.dataTransfer?.types?.includes("Files"));
    }

    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counterRef.current += 1;
      if (counterRef.current === 1) setDragOver(true);
    }

    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    }

    function onDragLeave(e: DragEvent) {
      if (!hasFiles(e)) return;
      counterRef.current = Math.max(0, counterRef.current - 1);
      if (counterRef.current === 0) setDragOver(false);
    }

    function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counterRef.current = 0;
      setDragOver(false);
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      startTransition(async () => {
        await uploadFiles(categoryId, files);
      });
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [categoryId]);

  return (
    <>
      {children}
      {(dragOver || pending) && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-brand-tint/60 backdrop-blur-sm"
          aria-live="polite"
        >
          <div className="rounded-xl border-2 border-dashed border-primary bg-background/90 px-8 py-6 text-center shadow-lg">
            <p className="text-base font-semibold text-foreground">
              {pending ? "Uploading…" : "Drop to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Files go to this category.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
