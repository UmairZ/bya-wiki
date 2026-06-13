"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDraftAction } from "@/app/(app)/drafts/actions";

/** Inline composer at the top of the Drafts column. One-line title input;
 *  submit creates the draft and navigates to its detail page so you can
 *  fill the rest in. */
export function AddDraftComposer() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDraftAction(undefined, formData);
      if (result.ok) {
        formRef.current?.reset();
        setOpen(false);
        router.push(`/event/${encodeURIComponent(result.data)}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3.5" aria-hidden />
        Add draft
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-1.5 rounded-md border bg-card p-2"
    >
      <Input
        name="title"
        placeholder="Event title"
        required
        autoFocus
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </Button>
      </div>
    </form>
  );
}
