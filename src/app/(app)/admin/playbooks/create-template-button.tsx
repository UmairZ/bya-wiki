"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { createTemplateAction } from "./actions";

export function CreateTemplateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTemplateAction(undefined, formData);
      if (result.ok) {
        setOpen(false);
        toast.success("Playbook created.");
        router.push(`/admin/playbooks/${result.data}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New playbook
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New playbook</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="pb-name">Name</Label>
              <Input
                id="pb-name"
                name="name"
                placeholder="e.g. Retreat planning"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                You&apos;ll add tasks in the next screen.
              </p>
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
