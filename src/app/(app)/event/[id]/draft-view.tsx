"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ChevronLeft,
  MoreHorizontal,
  Send,
  Sparkles,
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
  WorkflowRow,
} from "@/lib/supabase/types";
import { DraftFieldsEditor } from "./draft-fields-editor";
import { TaskKanban, type MemberSummary } from "./task-kanban";
import {
  ApplyPlaybookPicker,
  type TemplateOption,
} from "./apply-playbook-picker";
import { WorkflowHeader } from "./workflow-header";

export function DraftView({
  draft,
  workflow,
  tasks,
  stages,
  members,
  templates,
}: {
  draft: DraftEventRow;
  workflow: WorkflowRow | null;
  tasks: TaskRow[];
  stages: EventStageRow[];
  members: MemberSummary[];
  templates: TemplateOption[];
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
        `Delete draft "${draft.title}"? Any attached workflow will be archived. This can't be undone.`,
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
  const canPublish = missing.length === 0;

  const allTasksDone =
    workflow !== null &&
    tasks.length > 0 &&
    tasks.every((t) => t.status === "done" || t.status === "skipped");

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
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Draft
              </Badge>
              {!canPublish && (
                <span className="text-xs text-muted-foreground">
                  Need: {missing.join(", ")} before you can publish
                </span>
              )}
            </div>
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

      <DraftFieldsEditor draft={draft} />

      <section aria-label="Tasks" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </h2>
          {workflow && (
            <ApplyPlaybookPicker
              templates={templates}
              eventId={draft.id}
              eventStartsAt={draft.starts_at ?? ""}
              eventTitle={draft.title}
              targetKind="draft"
              trigger="button"
            />
          )}
        </div>

        {workflow ? (
          <>
            <WorkflowHeader
              workflow={workflow}
              eventId={draft.id}
              taskCount={tasks.length}
              doneCount={
                tasks.filter(
                  (t) => t.status === "done" || t.status === "skipped",
                ).length
              }
              allDone={allTasksDone}
            />
            {tasks.length === 0 && (
              <div className="rounded-lg border border-dashed bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
                Workflow has no tasks yet — add one to each stage below.
              </div>
            )}
            <TaskKanban
              workflowId={workflow.id}
              eventId={draft.id}
              tasks={tasks}
              stages={stages}
              members={members}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/40 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">No playbook applied yet</p>
              <p className="text-xs text-muted-foreground">
                Pick a playbook to load a starter checklist. Due dates fill in
                once this draft has a date.
              </p>
            </div>
            <ApplyPlaybookPicker
              templates={templates}
              eventId={draft.id}
              eventStartsAt={draft.starts_at ?? ""}
              eventTitle={draft.title}
              targetKind="draft"
              trigger="empty-state"
            />
          </div>
        )}
      </section>
    </div>
  );
}
