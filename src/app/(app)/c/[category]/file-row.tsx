"use client";

import { useState, useTransition } from "react";
import {
  Download,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRelative } from "@/lib/format-date";
import {
  getResourceUrlAction,
  renameResourceAction,
  softDeleteResourceAction,
  togglePinResourceAction,
} from "./file-actions";
import { FilePreviewDialog } from "./file-preview";

export type FileRowData = {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  pinned: boolean;
  updated_at: string;
};

function iconFor(type: string): LucideIcon {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("audio/")) return FileAudio;
  if (type.startsWith("video/")) return FileVideo;
  if (
    type.includes("spreadsheet") ||
    type === "text/csv" ||
    type.endsWith("/csv")
  )
    return FileSpreadsheet;
  return FileText;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileRow({ file }: { file: FileRowData }) {
  const Icon = iconFor(file.file_type);
  const [pending, startTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(file.title);

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok && result.error) toast.error(result.error);
    });
  }

  async function handleDownload() {
    const result = await getResourceUrlAction(file.id, { download: true });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:bg-brand-tint/40 -mx-1 px-1 py-0.5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{file.title}</span>
              {file.pinned && (
                <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] uppercase tracking-wide text-brand-tint-foreground">
                  Pinned
                </span>
              )}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {formatBytes(file.file_size)} · uploaded{" "}
              {formatRelative(file.updated_at)}
            </span>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="File actions"
                disabled={pending}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="size-4" aria-hidden />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setNewTitle(file.title);
                setRenameOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => call(() => togglePinResourceAction(file.id, !file.pinned))}
            >
              {file.pinned ? (
                <>
                  <PinOff className="size-4" aria-hidden />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="size-4" aria-hidden />
                  Pin to home
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (!window.confirm(`Move "${file.title}" to trash?`)) return;
                call(() => softDeleteResourceAction(file.id));
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FilePreviewDialog
        resource={{
          id: file.id,
          title: file.title,
          file_type: file.file_type,
        }}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`rename-${file.id}`}>Display name</Label>
            <Input
              id={`rename-${file.id}`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewTitle(file.title);
                setRenameOpen(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                call(async () => {
                  const r = await renameResourceAction(file.id, newTitle);
                  if (r.ok) setRenameOpen(false);
                  return r;
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
