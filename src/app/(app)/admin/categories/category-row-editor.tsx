"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image as IconPickerIcon,
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
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import {
  deleteCategoryAction,
  moveCategoryAction,
  renameCategoryAction,
  setCategoryIconAction,
} from "./actions";
import type { CategoryWithCount } from "./page";

export function CategoryRowEditor({
  category,
  canMoveUp,
  canMoveDown,
}: {
  category: CategoryWithCount;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<string | null>(category.icon);
  const [newName, setNewName] = useState(category.name);

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok && result.error) toast.error(result.error);
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
          <CategoryIcon name={category.icon} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{category.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            /c/{category.slug} · {category.item_count}{" "}
            {category.item_count === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveUp || pending}
            onClick={() => call(() => moveCategoryAction(category.id, "up"))}
            aria-label="Move up"
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canMoveDown || pending}
            onClick={() => call(() => moveCategoryAction(category.id, "down"))}
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
                  aria-label="Category actions"
                  disabled={pending}
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="size-4" aria-hidden />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPendingIcon(category.icon);
                  setIconOpen(true);
                }}
              >
                <IconPickerIcon className="size-4" aria-hidden />
                Change icon
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  call(() => deleteCategoryAction(category.id))
                }
              >
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
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`rename-${category.id}`}>Name</Label>
            <Input
              id={`rename-${category.id}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Slug stays as /c/{category.slug}.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewName(category.name);
                setRenameOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                call(async () => {
                  const r = await renameCategoryAction(category.id, newName);
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

      <Dialog open={iconOpen} onOpenChange={setIconOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change icon</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto rounded-md border p-2">
            {CATEGORY_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setPendingIcon(name)}
                aria-label={name}
                aria-pressed={pendingIcon === name}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md transition-colors",
                  pendingIcon === name
                    ? "bg-brand-tint text-brand-tint-foreground"
                    : "hover:bg-muted",
                )}
              >
                <CategoryIcon name={name} className="size-4" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIconOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                call(async () => {
                  const r = await setCategoryIconAction(
                    category.id,
                    pendingIcon,
                  );
                  if (r.ok) setIconOpen(false);
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
