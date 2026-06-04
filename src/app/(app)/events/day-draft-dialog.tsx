"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
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
import {
  createDraftAction,
  type ActionResult,
} from "@/app/(app)/drafts/actions";
import { formatFullDateString } from "@/lib/date-time";

/** Title-only dialog that creates a draft with a pre-set date and jumps to
 *  it. Triggered by clicking a day cell on the All Events calendar. Cancel
 *  closes without creating anything. */
export function DayDraftDialog({
  date,
  open,
  onOpenChange,
}: {
  /** Selected day. Null when closed. */
  date: Date | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult<string> | undefined,
    FormData
  >(createDraftAction, undefined);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      formRef.current?.reset();
      onOpenChange(false);
      router.push(`/event/${encodeURIComponent(state.data)}`);
    } else {
      toast.error(state.error);
    }
  }, [state, router, onOpenChange]);

  // Format YYYY-MM-DD for the hidden field and a nice label for the heading.
  const seedDate = date ? toYmd(date) : "";
  const dateLabel = date ? formatFullDateString(date) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form ref={formRef} action={formAction}>
          <DialogHeader>
            <DialogTitle>New draft for {dateLabel}</DialogTitle>
            <DialogDescription>
              Just a title for now — date is pre-filled. You can change it on
              the detail page.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="seed_date" value={seedDate} />
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="dd-title">Title</Label>
            <Input
              id="dd-title"
              name="title"
              placeholder="Event title"
              autoFocus
              required
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  );
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
