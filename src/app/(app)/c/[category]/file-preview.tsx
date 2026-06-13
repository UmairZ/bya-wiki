"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getResourceUrlAction } from "./file-actions";

export type PreviewableResource = {
  id: string;
  title: string;
  file_type: string;
};

function isImage(type: string) {
  return type.startsWith("image/");
}
function isPdf(type: string) {
  return type === "application/pdf" || type === "application/x-pdf";
}

export function FilePreviewDialog({
  resource,
  open,
  onOpenChange,
}: {
  resource: PreviewableResource | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  // Keyed by resource id so a stale url never shows for a newly-opened file:
  // while the id doesn't match, the derived url/error below read as "loading".
  const [fetched, setFetched] = useState<{
    id: string;
    url: string | null;
    error: string | null;
  }>({ id: "", url: null, error: null });

  useEffect(() => {
    if (!open || !resource) return;
    const id = resource.id;
    let cancelled = false;
    getResourceUrlAction(id).then((result) => {
      if (cancelled) return;
      setFetched(
        result.ok
          ? { id, url: result.url, error: null }
          : { id, url: null, error: result.error },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, resource]);

  async function triggerDownload() {
    if (!resource) return;
    const result = await getResourceUrlAction(resource.id, { download: true });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    window.location.href = result.url;
  }

  if (!resource) return null;

  // Surface url/error only when they belong to the open resource.
  const url = fetched.id === resource.id ? fetched.url : null;
  const error = fetched.id === resource.id ? fetched.error : null;

  const previewable = isImage(resource.file_type) || isPdf(resource.file_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{resource.title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[200px] flex-col items-center justify-center">
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : !url ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          ) : isImage(resource.file_type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={resource.title}
              className="mx-auto max-h-[70vh] w-auto rounded-md"
            />
          ) : isPdf(resource.file_type) ? (
            <iframe
              src={url}
              title={resource.title}
              className="h-[70vh] w-full rounded-md border"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No inline preview for this file type.
              </p>
              <Button onClick={triggerDownload}>
                <Download className="size-4" aria-hidden />
                Download
              </Button>
            </div>
          )}
        </div>

        {previewable && url && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={triggerDownload}>
              <Download className="size-4" aria-hidden />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={url} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}
            >
              <ExternalLink className="size-4" aria-hidden />
              Open in new tab
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
