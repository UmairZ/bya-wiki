"use client";

import { useState, useTransition } from "react";
import { ListChecks, Sparkles } from "lucide-react";
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
import { applyPlaybookAction } from "./actions";

export type TemplateOption = {
  id: string;
  name: string;
  description: string;
  task_count: number;
};

export function ApplyPlaybookPicker({
  templates,
  eventId,
  eventStartsAt,
  eventTitle,
  trigger = "button",
}: {
  templates: TemplateOption[];
  eventId: string;
  eventStartsAt: string;
  eventTitle: string;
  trigger?: "button" | "empty-state";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(
    templates[0]?.id ?? null,
  );

  function handleApply() {
    if (!picked) {
      toast.error("Pick a playbook first.");
      return;
    }
    startTransition(async () => {
      const r = await applyPlaybookAction(
        picked,
        eventId,
        eventStartsAt,
        eventTitle,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Playbook applied.");
      setOpen(false);
    });
  }

  const triggerEl =
    trigger === "button" ? (
      <Button onClick={() => setOpen(true)} disabled={templates.length === 0}>
        <Sparkles className="size-4" aria-hidden />
        Apply playbook
      </Button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={templates.length === 0}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
      >
        <Sparkles className="size-4" aria-hidden />
        Apply a playbook
      </button>
    );

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply a playbook</DialogTitle>
            <DialogDescription>
              Copies the playbook&apos;s tasks into a new workflow on this
              event. Edits to the source playbook won&apos;t reach this
              workflow.
            </DialogDescription>
          </DialogHeader>
          {templates.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No playbooks exist yet. Owner: create one in{" "}
              <span className="font-mono text-xs">/admin/playbooks</span>.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(t.id)}
                    aria-pressed={picked === t.id}
                    className={
                      "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors " +
                      (picked === t.id
                        ? "border-primary bg-brand-tint/30"
                        : "border-transparent hover:bg-muted/40")
                    }
                  >
                    <ListChecks
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {t.name}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {t.description ||
                          `${t.task_count} task${t.task_count === 1 ? "" : "s"}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={pending || !picked || templates.length === 0}
            >
              {pending ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
