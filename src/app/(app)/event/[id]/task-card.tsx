"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  Check,
  Loader2,
  MoreHorizontal,
  Move,
  Trash2,
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
import { formatMonthDay } from "@/lib/date-time";
import type {
  EventStageRow,
  TaskRow,
  TaskStatus,
} from "@/lib/supabase/types";
import {
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

/** Whether a date is in the past, evaluated against the current clock.
 *  Kept as a plain helper (not inline `Date.now()` in render) so the
 *  overdue check stays out of the component's render-purity surface. */
function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToISO(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 9, 0, 0, 0);
  return dt.toISOString();
}

export function TaskCard({
  task,
  stages,
  members,
  membersById,
  targetKind,
  targetRef,
  /** When true, hide the "move to stage" submenu (used in the flat draft list
   *  where every task is in the Drafts stage by definition). */
  hideMoveToStage = false,
  /** `card` (default) is the bordered, drop-shadow-ready style suited to a
   *  kanban column. `row` is a borderless checklist row that lives inside a
   *  shared container (used by the per-event checklist). */
  display = "card",
}: {
  task: TaskRow;
  stages: EventStageRow[];
  members: MemberSummary[];
  membersById: Map<string, MemberSummary>;
  targetKind: "event" | "draft";
  targetRef: string;
  hideMoveToStage?: boolean;
  display?: "card" | "row";
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
    call(() => setTaskStatusAction(task.id, nextStatus, targetRef));
  }

  function commitRename() {
    if (title.trim() === task.title || !title.trim()) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    call(async () => {
      const r = await renameTaskAction(task.id, title, targetRef);
      if (r.ok) setEditing(false);
      else setTitle(task.title);
      return r;
    });
  }

  function handleSkipToggle() {
    const nextStatus: TaskStatus = isSkipped ? "todo" : "skipped";
    call(() => setTaskStatusAction(task.id, nextStatus, targetRef));
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    call(() => deleteTaskAction(task.id, targetRef));
  }

  const dueDate = task.due_at ? new Date(task.due_at) : null;
  const dueLabel = dueDate ? formatMonthDay(dueDate) : null;
  const isOverdue =
    dueDate && !isDone && !isSkipped && isPast(dueDate);

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors",
        display === "card" && "border bg-card",
        display === "row" && "hover:bg-muted/40",
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
            targetRef={targetRef}
            disabled={pending}
            startTransition={startTransition}
          />
          <AssigneeChip
            taskId={task.id}
            assignee={assignee ?? null}
            members={members}
            targetRef={targetRef}
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
              className="size-6 opacity-100 transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
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
          {!hideMoveToStage && (
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
                            targetKind,
                            targetRef,
                          ),
                        )
                      }
                    >
                      {s.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
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
  targetRef,
  disabled,
  startTransition,
}: {
  taskId: string;
  assignee: MemberSummary | null;
  members: MemberSummary[];
  targetRef: string;
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
            aria-label={
              assignee ? `Assigned to ${assignee.display_name}` : "Assign"
            }
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
          <>Assign</>
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
            onClick={() => call(() => assignTaskAction(taskId, m.id, targetRef))}
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
              onClick={() => call(() => assignTaskAction(taskId, null, targetRef))}
            >
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
  targetRef,
  disabled,
  startTransition,
}: {
  taskId: string;
  dueDate: Date | null;
  dueLabel: string | null;
  isOverdue: boolean;
  targetRef: string;
  disabled: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    isoToDateInput(dueDate?.toISOString() ?? null),
  );

  function call(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function save(next: string) {
    const iso = dateInputToISO(next);
    call(async () => {
      const r = await setTaskDueAction(taskId, iso, targetRef);
      if (r.ok) setOpen(false);
      return r;
    });
  }

  function clear() {
    setValue("");
    call(async () => {
      const r = await setTaskDueAction(taskId, null, targetRef);
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

export function AddTaskInline({
  targetKind,
  targetRef,
  stageId,
  importAction,
}: {
  targetKind: "event" | "draft";
  targetRef: string;
  stageId: string;
  /** Allow caller to inject the action (e.g., the legacy event flow uses
   *  the same import; defaults to addAdhocTaskAction). */
  importAction?: (
    targetKind: "event" | "draft",
    targetRef: string,
    stageId: string,
    title: string,
  ) => Promise<{ ok: boolean; error?: string }>;
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
    const fn =
      importAction ??
      (async (kind, ref, sid, t) => {
        const { addAdhocTaskAction } = await import("./actions");
        return addAdhocTaskAction(kind, ref, sid, t);
      });

    startTransition(async () => {
      const r = await fn(targetKind, targetRef, stageId, trimmed);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't add task.");
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
        + Add task
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
