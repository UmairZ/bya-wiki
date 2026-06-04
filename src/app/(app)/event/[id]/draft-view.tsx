"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  HelpCircle,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  deleteDraftAction,
  publishDraftAction,
  updateDraftAction,
} from "@/app/(app)/drafts/actions";
import type {
  DraftEventRow,
  EventStageRow,
  TaskRow,
} from "@/lib/supabase/types";
import { DraftFieldsEditor } from "./draft-fields-editor";
import { DraftFlyerEditor } from "./draft-flyer-editor";
import { DraftTaskList } from "./draft-task-list";
import { TaskSectionHeader } from "./task-section-header";
import { ClearTasksMenu } from "./clear-tasks-menu";
import type { MemberSummary } from "./task-card";

export function DraftView({
  draft,
  tasks,
  stages,
  members,
}: {
  draft: DraftEventRow;
  tasks: TaskRow[];
  stages: EventStageRow[];
  members: MemberSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(draft.title);

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === draft.title) {
      setTitle(draft.title);
      setEditingTitle(false);
      return;
    }
    startTransition(async () => {
      const r = await updateDraftAction(draft.id, { title: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setTitle(draft.title);
      }
      setEditingTitle(false);
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const r = await publishDraftAction(draft.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Published to calendar.");
      router.push(`/event/${encodeURIComponent(r.data.googleEventId)}`);
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete draft "${draft.title}"? All tasks attached to it will also be deleted. This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteDraftAction(draft.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Draft deleted.");
      router.push("/events");
    });
  }

  const missing: string[] = [];
  if (!draft.starts_at) missing.push("date");
  if (!draft.location?.trim()) missing.push("location");
  if (!draft.audience) missing.push("audience");
  if (!draft.gender) missing.push("gender");
  if (!draft.registration_url?.trim()) missing.push("registration link");
  if (!draft.flyer_storage_path) missing.push("flyer");
  const canPublish = missing.length === 0;

  // Drafts only ever have Drafts-stage tasks (the first stage). Fall back
  // to the first stage by sort_order if no tasks exist yet.
  const draftsStage = stages[0];
  const doneCount = tasks.filter(
    (t) => t.status === "done" || t.status === "skipped",
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link
          href="/events"
          prefetch
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Events
        </Link>
        <span className="text-muted-foreground/60">›</span>
        <span className="truncate text-foreground">{draft.title}</span>
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Badge
              variant="secondary"
              className="w-fit bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Draft
            </Badge>
            {editingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  } else if (e.key === "Escape") {
                    setTitle(draft.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                disabled={pending}
                className="h-auto border-0 px-1 py-1 text-2xl font-semibold shadow-none focus-visible:bg-muted/40"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="cursor-text text-left text-2xl font-semibold tracking-tight"
              >
                {draft.title}
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={handlePublish}
              disabled={!canPublish || pending}
              title={
                canPublish
                  ? "Create the event on Google Calendar"
                  : `Fill in ${missing.join(", ")} to publish`
              }
            >
              <Send className="size-4" aria-hidden />
              Publish to calendar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Draft actions"
                    disabled={pending}
                  />
                }
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {!canPublish && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">
              Fill in {missing.length} field
              {missing.length === 1 ? "" : "s"} to publish
            </p>
            <p className="text-xs text-muted-foreground">
              Missing:{" "}
              <span className="font-medium text-foreground/80">
                {missing.join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <DraftFlyerEditor
          draftId={draft.id}
          flyerStoragePath={draft.flyer_storage_path}
        />
        <DraftFieldsEditor draft={draft} />
      </div>

      <section aria-label="Tasks" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <h2
            className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            title="Playbooks apply after publishing — drafts only have ad-hoc tasks."
          >
            Tasks
            <HelpCircle
              className="size-3 text-muted-foreground/60"
              aria-hidden
            />
          </h2>
          <ClearTasksMenu
            targetKind="draft"
            targetRef={draft.id}
            taskCount={tasks.length}
          />
        </div>

        <TaskSectionHeader
          taskCount={tasks.length}
          doneCount={doneCount}
          appliedTemplateNames={[]}
        />

        {draftsStage ? (
          <DraftTaskList
            draftId={draft.id}
            draftsStage={draftsStage}
            allStages={stages}
            tasks={tasks}
            members={members}
          />
        ) : (
          <div className="rounded-lg border border-dashed bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
            No event stages configured yet.
          </div>
        )}
      </section>
    </div>
  );
}
