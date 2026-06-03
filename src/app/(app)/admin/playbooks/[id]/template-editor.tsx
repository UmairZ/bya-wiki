"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Move,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  EventStageRow,
  PlaybookTemplateRow,
  PlaybookTemplateTaskRow,
} from "@/lib/supabase/types";
import {
  addTaskAction,
  deleteTaskAction,
  deleteTemplateAction,
  moveTaskAction,
  moveTaskToStageAction,
  renameTemplateAction,
  setTemplateArchivedAction,
  setTemplateDescriptionAction,
  updateTaskAction,
} from "../actions";

export function TemplateEditor({
  template,
  tasks,
  stages,
}: {
  template: PlaybookTemplateRow;
  tasks: PlaybookTemplateTaskRow[];
  stages: EventStageRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function handleNameBlur() {
    if (name.trim() === template.name || !name.trim()) {
      setName(template.name);
      return;
    }
    call(() => renameTemplateAction(template.id, name));
  }

  function handleDescriptionBlur() {
    if (description === template.description) return;
    call(() => setTemplateDescriptionAction(template.id, description));
  }

  function handleArchiveToggle() {
    call(() =>
      setTemplateArchivedAction(template.id, !template.archived),
    );
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete playbook "${template.name}"? This can't be undone. Existing workflows applied from this template are unaffected.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteTemplateAction(template.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Playbook deleted.");
      router.push("/admin/playbooks");
    });
  }

  const tasksByStage = new Map<string, PlaybookTemplateTaskRow[]>();
  for (const s of stages) tasksByStage.set(s.id, []);
  for (const t of tasks) {
    if (!tasksByStage.has(t.event_stage_id)) tasksByStage.set(t.event_stage_id, []);
    tasksByStage.get(t.event_stage_id)!.push(t);
  }
  for (const list of tasksByStage.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label htmlFor="pb-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              id="pb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              className="text-lg font-semibold"
              disabled={pending}
            />
            <div className="flex items-center gap-2">
              {template.archived && (
                <Badge variant="secondary">
                  <Archive className="size-3" aria-hidden />
                  Archived
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Playbook actions"
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleArchiveToggle}>
                {template.archived ? (
                  <>
                    <ArchiveRestore className="size-4" aria-hidden />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="size-4" aria-hidden />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="pb-desc" className="text-xs uppercase tracking-wider text-muted-foreground">
            Description
          </Label>
          <Textarea
            id="pb-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="What this playbook is for. Shown when picking it for an event."
            rows={2}
            disabled={pending}
          />
        </div>
      </header>

      <div className="grid auto-rows-min gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => {
          const list = tasksByStage.get(stage.id) ?? [];
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              tasks={list}
              allStages={stages}
              templateId={template.id}
              pending={pending}
              startTransition={startTransition}
            />
          );
        })}
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  tasks,
  allStages,
  templateId,
  pending,
  startTransition,
}: {
  stage: EventStageRow;
  tasks: PlaybookTemplateTaskRow[];
  allStages: EventStageRow[];
  templateId: string;
  pending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    call(async () => {
      const r = await addTaskAction(templateId, stage.id, trimmed);
      if (r.ok) {
        setNewTitle("");
        setAdding(false);
      }
      return r;
    });
  }

  return (
    <section
      aria-label={stage.name}
      className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
    >
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {stage.name}
        </h2>
        <span className="text-[10px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 && !adding && (
        <p className="rounded-md border border-dashed bg-background/40 px-3 py-4 text-center text-xs text-muted-foreground/70">
          No tasks yet.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {tasks.map((t, i) => (
          <li key={t.id}>
            <TaskRow
              task={t}
              templateId={templateId}
              allStages={allStages}
              canMoveUp={i > 0}
              canMoveDown={i < tasks.length - 1}
              pending={pending}
              startTransition={startTransition}
            />
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex flex-col gap-2 rounded-md border bg-card p-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              } else if (e.key === "Escape") {
                setAdding(false);
                setNewTitle("");
              }
            }}
          />
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewTitle("");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={pending}>
              Add
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" aria-hidden />
          Add task
        </button>
      )}
    </section>
  );
}

function TaskRow({
  task,
  templateId,
  allStages,
  canMoveUp,
  canMoveDown,
  pending,
  startTransition,
}: {
  task: PlaybookTemplateTaskRow;
  templateId: string;
  allStages: EventStageRow[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  pending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [offset, setOffset] = useState<string>(
    task.default_offset_days == null ? "" : String(task.default_offset_days),
  );

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function handleTitleBlur() {
    if (title.trim() === task.title || !title.trim()) {
      setTitle(task.title);
      return;
    }
    call(() => updateTaskAction(task.id, templateId, { title }));
  }

  function handleOffsetBlur() {
    const trimmed = offset.trim();
    if (trimmed === "") {
      if (task.default_offset_days == null) return;
      call(() =>
        updateTaskAction(task.id, templateId, {
          default_offset_days: null,
        }),
      );
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      setOffset(
        task.default_offset_days == null
          ? ""
          : String(task.default_offset_days),
      );
      toast.error("Offset must be a whole number of days.");
      return;
    }
    if (n === task.default_offset_days) return;
    call(() =>
      updateTaskAction(task.id, templateId, { default_offset_days: n }),
    );
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    call(() => deleteTaskAction(task.id, templateId));
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="border-0 px-1 py-1 text-sm font-medium shadow-none focus-visible:border focus-visible:bg-muted/40"
        disabled={pending}
      />
      <div className="flex items-center gap-1">
        <Label
          htmlFor={`offset-${task.id}`}
          className="text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          Offset
        </Label>
        <Input
          id={`offset-${task.id}`}
          value={offset}
          onChange={(e) => setOffset(e.target.value)}
          onBlur={handleOffsetBlur}
          placeholder="0"
          className="h-7 w-16 px-2 text-xs"
          disabled={pending}
        />
        <span className="text-[10px] text-muted-foreground">days</span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!canMoveUp || pending}
            onClick={() => call(() => moveTaskAction(task.id, templateId, "up"))}
            aria-label="Move up"
          >
            <ChevronUp className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!canMoveDown || pending}
            onClick={() =>
              call(() => moveTaskAction(task.id, templateId, "down"))
            }
            aria-label="Move down"
          >
            <ChevronDown className="size-3.5" aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Task actions"
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Move className="size-4" aria-hidden />
                  Move to stage
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {allStages
                    .filter((s) => s.id !== task.event_stage_id)
                    .map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() =>
                          call(() =>
                            moveTaskToStageAction(task.id, templateId, s.id),
                          )
                        }
                      >
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
