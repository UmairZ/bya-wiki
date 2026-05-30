"use client";

import { useActionState, useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CategoryIcon, CATEGORY_ICON_NAMES } from "@/components/category-icon";
import { createCategoryAction, type ActionResult } from "./actions";
import { cn } from "@/lib/utils";

export function CreateCategoryButton() {
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState<string>("folder");
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createCategoryAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setIcon("folder");
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" aria-hidden />
        New category
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Categories are few and stable — every page lives in exactly one.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="flex flex-col gap-4">
            {state && !state.ok && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="cc-name">Name</Label>
              <Input id="cc-name" name="name" type="text" required autoFocus />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Icon</Label>
              <input type="hidden" name="icon" value={icon} />
              <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto rounded-md border p-2">
                {CATEGORY_ICON_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    aria-label={name}
                    aria-pressed={icon === name}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md transition-colors",
                      icon === name
                        ? "bg-brand-tint text-brand-tint-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <CategoryIcon name={name} className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
