"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStageAction, type ActionResult } from "./actions";

export function CreateStageButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createStageAction, undefined);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setOpen(false);
      toast.success("Stage added.");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New stage
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form action={formAction}>
            <DialogHeader>
              <DialogTitle>New stage</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="stage-name">Name</Label>
              <Input
                id="stage-name"
                name="name"
                placeholder="e.g. Review"
                autoFocus
                required
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
                {pending ? "Adding…" : "Add stage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
