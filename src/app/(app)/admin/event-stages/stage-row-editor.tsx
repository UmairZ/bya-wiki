"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
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
import {
  deleteStageAction,
  moveStageAction,
  renameStageAction,
} from "./actions";

export type StageRow = {
  id: string;
  name: string;
  sort_order: number;
};

export function StageRowEditor({
  stage,
  index,
  total,
}: {
  stage: StageRow;
  index: number;
  total: number;
}) {
  const [pending, startTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(stage.name);

  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok && result.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete "${stage.name}"? Tasks pointing at this stage will block the delete.`,
      )
    ) {
      return;
    }
    call(() => deleteStageAction(stage.id));
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{stage.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveUp || pending}
            onClick={() => call(() => moveStageAction(stage.id, "up"))}
            aria-label="Move up"
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveDown || pending}
            onClick={() => call(() => moveStageAction(stage.id, "down"))}
            aria-label="Move down"
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Stage actions"
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="size-4" aria-hidden />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename stage</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`rename-${stage.id}`}>Name</Label>
            <Input
              id={`rename-${stage.id}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Renaming here updates the stage everywhere — Events Kanban
              columns, all workflows, all playbook templates.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewName(stage.name);
                setRenameOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                call(async () => {
                  const r = await renameStageAction(stage.id, newName);
                  if (r.ok) setRenameOpen(false);
                  return r;
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
