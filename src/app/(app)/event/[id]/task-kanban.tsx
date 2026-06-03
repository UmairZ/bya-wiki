"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  Check,
  Loader2,
  MoreHorizontal,
  Move,
  Plus,
  Trash2,
  User,
  UserMinus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";
import type {
  EventStageRow,
  TaskRow,
  TaskStatus,
} from "@/lib/supabase/types";
import {
  addTaskToWorkflowAction,
  assignTaskAction,
  deleteTaskAction,
  moveTaskToStageAction,
  renameTaskAction,
  setTaskDueAction,
  setTaskStatusAction,
} from "./actions";

export type MemberSummary = {
  id: string;
  display_name: string;
};

export function TaskKanban({
  workflowId,
  eventId,
  tasks,
  stages,
  members,
}: {
  workflowId: string;
  eventId: string;
  tasks: TaskRow[];
  stages: EventStageRow[];
  members: MemberSummary[];
}) {
  const currentStageId = (() => {
    for (const s of stages) {
      const has = tasks.some(
        (t) =>
          t.event_stage_id === s.id &&
          (t.status === "todo" || t.status === "in_progress"),
      );
      if (has) return s.id;
    }
    return null;
  })();

  const byStage = new Map<string, TaskRow[]>();
  for (const s of stages) byStage.set(s.id, []);
  for (const t of tasks) {
    if (!byStage.has(t.event_stage_id)) byStage.set(t.event_stage_id, []);
    byStage.get(t.event_stage_id)!.push(t);
  }
  for (const list of byStage.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="grid auto-rows-min gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage) => {
        const list = byStage.get(stage.id) ?? [];
        const doneCount = list.filter(
          (t) => t.status === "done" || t.status === "skipped",
        ).length;
        const isCurrent = currentStageId === stage.id;
        return (
          <section
            key={stage.id}
            aria-label={stage.name}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-muted/30 p-3",
              isCurrent && "border-l-2 border-l-primary",
            )}
          >
            <div className="flex items-baseline justify-between px-1">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stage.name}
                {isCurrent && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                    current
                  </span>
                )}
              </h3>
              <span className="text-[10px] font-medium text-muted-foreground">
                {doneCount}/{list.length}
              </span>
            </div>

            <ul className="flex flex-col gap-1.5">
              {list.map((t) => (
                <li key={t.id}>
                  <TaskCard
                    task={t}
                    stages={stages}
                    members={members}
                    membersById={membersById}
                    workflowId={workflowId}
                    eventId={eventId}
                  />
                </li>
              ))}
            </ul>

            <AddTaskInline
              stageId={stage.id}
              workflowId={workflowId}
              eventId={eventId}
            />
          </section>
        );
      })}
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Local-date YYYY-MM-DD for <input type="date">.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToISO(value: string): string | null {
  if (!value) return null;
  // Treat as local date at 09:00 so it sticks to the same calendar day
  // regardless of timezone. Same trick the template apply uses for offsets.
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 9, 0, 0, 0);
  return dt.toISOString();
}

function TaskCard({
  task,
  stages,
  members,
  membersById,
  workflowId,
  eventId,
}: {
  task: TaskRow;
  stages: EventStageRow[];
  members: MemberSummary[];
  membersById: Map<string, MemberSummary>;
  workflowId: string;
  eventId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const isDone = task.status === "done";
  const isSkipped = task.status === "skipped";
  const assignee = task.assigned_to ? membersById.get(task.assigned_to) : null;

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function toggleStatus() {
    const nextStatus: TaskStatus = isDone ? "todo" : "done";
    call(() => setTaskStatusAction(task.id, nextStatus, eventId));
  }

  function commitRename() {
    if (title.trim() === task.title || !title.trim()) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    call(async () => {
      const r = await renameTaskAction(task.id, title, eventId);
      if (r.ok) setEditing(false);
      else setTitle(task.title);
      return r;
    });
  }

  function handleSkipToggle() {
    const nextStatus: TaskStatus = isSkipped ? "todo" : "skipped";
    call(() => setTaskStatusAction(task.id, nextStatus, eventId));
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    call(() => deleteTaskAction(task.id, eventId));
  }

  const dueDate = task.due_at ? new Date(task.due_at) : null;
  const dueLabel = dueDate
    ? dueDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  const isOverdue =
    dueDate && !isDone && !isSkipped && dueDate.getTime() < Date.now();

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border bg-card px-2 py-1.5 transition-colors",
        isDone && "opacity-60",
        isSkipped && "opacity-50 line-through",
      )}
    >
      <button
        type="button"
        onClick={toggleStatus}
        disabled={pending}
        aria-label={isDone ? "Mark not done" : "Mark done"}
        aria-pressed={isDone}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : isDone ? (
          <Check className="size-3" aria-hidden />
        ) : null}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {editing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            autoFocus
            className="h-6 border-0 px-1 py-0 text-sm shadow-none focus-visible:bg-muted/40"
            disabled={pending}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="cursor-text text-left text-sm font-medium leading-tight"
          >
            {task.title}
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <DueDateChip
            taskId={task.id}
            dueDate={dueDate}
            dueLabel={dueLabel}
            isOverdue={Boolean(isOverdue)}
            eventId={eventId}
            disabled={pending}
            startTransition={startTransition}
          />
          <AssigneeChip
            taskId={task.id}
            assignee={assignee ?? null}
            members={members}
            eventId={eventId}
            disabled={pending}
            startTransition={startTransition}
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
              aria-label="Task actions"
              disabled={pending}
            />
          }
        >
          <MoreHorizontal className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSkipToggle}>
            {isSkipped ? "Unskip" : "Skip"}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Move className="size-4" aria-hidden />
              Move to stage
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {stages
                .filter((s) => s.id !== task.event_stage_id)
                .map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() =>
                      call(() =>
                        moveTaskToStageAction(
                          task.id,
                          s.id,
                          workflowId,
                          eventId,
                        ),
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
  );
}

function AssigneeChip({
  taskId,
  assignee,
  members,
  eventId,
  disabled,
  startTransition,
}: {
  taskId: string;
  assignee: MemberSummary | null;
  members: MemberSummary[];
  eventId: string;
  disabled: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={assignee ? `Assigned to ${assignee.display_name}` : "Assign"}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:border-primary",
              assignee
                ? "border-transparent bg-primary/10 text-primary"
                : "border-dashed border-muted-foreground/40 text-muted-foreground hover:text-foreground",
            )}
          />
        }
      >
        {assignee ? (
          <>
            <Avatar className="size-3.5">
              <AvatarFallback className="bg-primary text-primary-foreground text-[8px] font-semibold">
                {initialsOf(assignee.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[6rem]">
              {assignee.display_name.split(/\s+/)[0]}
            </span>
          </>
        ) : (
          <>
            <User className="size-3" aria-hidden />
            Assign
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {members.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No active members.
          </div>
        )}
        {members.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() =>
              call(() => assignTaskAction(taskId, m.id, eventId))
            }
          >
            <Avatar className="size-5">
              <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
                {initialsOf(m.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{m.display_name}</span>
            {assignee?.id === m.id && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {assignee && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                call(() => assignTaskAction(taskId, null, eventId))
              }
            >
              <UserMinus className="size-4" aria-hidden />
              Unassign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DueDateChip({
  taskId,
  dueDate,
  dueLabel,
  isOverdue,
  eventId,
  disabled,
  startTransition,
}: {
  taskId: string;
  dueDate: Date | null;
  dueLabel: string | null;
  isOverdue: boolean;
  eventId: string;
  disabled: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(isoToDateInput(dueDate?.toISOString() ?? null));

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function save(next: string) {
    const iso = dateInputToISO(next);
    call(async () => {
      const r = await setTaskDueAction(taskId, iso, eventId);
      if (r.ok) setOpen(false);
      return r;
    });
  }

  function clear() {
    setValue("");
    call(async () => {
      const r = await setTaskDueAction(taskId, null, eventId);
      if (r.ok) setOpen(false);
      return r;
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            aria-label={dueLabel ? `Due ${dueLabel}` : "Set due date"}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:border-primary",
              isOverdue
                ? "border-transparent bg-destructive/10 text-destructive"
                : dueLabel
                  ? "border-transparent bg-muted text-foreground/80"
                  : "border-dashed border-muted-foreground/40 text-muted-foreground hover:text-foreground",
            )}
          />
        }
      >
        <Calendar className="size-3" aria-hidden />
        {dueLabel ?? "Set date"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-2">
        <div className="flex flex-col gap-2">
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          />
          <div className="flex justify-between gap-1">
            {dueLabel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={disabled}
              >
                <X className="size-3.5" aria-hidden />
                Clear
              </Button>
            )}
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => save(value)}
              disabled={disabled || !value}
            >
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddTaskInline({
  stageId,
  workflowId,
  eventId,
}: {
  stageId: string;
  workflowId: string;
  eventId: string;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function commit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      setTitle("");
      return;
    }
    startTransition(async () => {
      const r = await addTaskToWorkflowAction(
        workflowId,
        stageId,
        trimmed,
        eventId,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setTitle("");
      setAdding(false);
    });
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3.5" aria-hidden />
        Add task
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-card p-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setAdding(false);
            setTitle("");
          }
        }}
        disabled={pending}
      />
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding(false);
            setTitle("");
          }}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={commit} disabled={pending}>
          Add
        </Button>
      </div>
    </div>
  );
}
