"use client";

import { useActionState, useEffect, useState } from "react";
import { FilePlus } from "lucide-react";
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
import { createPageAction, type CreatePageState } from "../actions";

export function NewPageButton({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    CreatePageState,
    FormData
  >(createPageAction, undefined);

  useEffect(() => {
    if (!pending && state === undefined) setOpen(false);
  }, [pending, state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <FilePlus className="size-4" aria-hidden />
        New page
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New page</DialogTitle>
            <DialogDescription>
              Creates a draft. You can rename it any time.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="flex flex-col gap-4">
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <input type="hidden" name="category_id" value={categoryId} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="np-title">Title</Label>
              <Input
                id="np-title"
                name="title"
                type="text"
                autoComplete="off"
                placeholder="Untitled"
                autoFocus
              />
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
                {pending ? "Creating…" : "Create draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
