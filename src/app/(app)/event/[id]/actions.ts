"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskInsert, TaskStatus, TaskUpdate } from "@/lib/supabase/types";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Revalidate just the event detail page. Use for edits that don't shift
 *  the event's position on the Events Kanban (rename, assign, due date). */
function revalidateEventDetail(eventId: string) {
  revalidatePath(`/event/${encodeURIComponent(eventId)}`);
}

/** Revalidate the event detail page AND the Events Kanban. Use when the
 *  edit can change the workflow's current stage (status toggle, add task,
 *  delete task, move-to-stage), which moves the card between columns. */
function revalidateEventAndKanban(eventId: string) {
  revalidatePath(`/event/${encodeURIComponent(eventId)}`);
  revalidatePath("/events");
}

/** Backwards-compat alias used by older actions; treat as the full revalidate. */
const revalidateEvent = revalidateEventAndKanban;

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export async function applyPlaybookAction(
  templateId: string,
  eventId: string,
  eventStartsAt: string | null,
  eventTitle: string,
  targetKind: "event" | "draft" = "event",
): Promise<ActionResult> {
  const { profile } = await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  // 1) Reject if a non-archived workflow already exists for this target.
  const { data: existing } = await supabase
    .from("workflows")
    .select("id")
    .eq("target_kind", targetKind)
    .eq("target_ref", eventId)
    .eq("archived", false)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: "This event already has a workflow. Archive it first if you want to apply a different playbook.",
    };
  }

  // 2) Fetch the template + its tasks.
  const [templateResp, tasksResp] = await Promise.all([
    supabase
      .from("playbook_templates")
      .select("id, name, archived")
      .eq("id", templateId)
      .single(),
    supabase
      .from("playbook_template_tasks")
      .select(
        "event_stage_id, title, description, sort_order, default_offset_days, default_assignee_role",
      )
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
  ]);
  if (templateResp.error || !templateResp.data) {
    return { ok: false, error: "Playbook not found." };
  }
  if (templateResp.data.archived) {
    return { ok: false, error: "That playbook is archived." };
  }

  // 3) Insert workflow.
  const { data: workflow, error: workflowErr } = await supabase
    .from("workflows")
    .insert({
      template_id: templateId,
      name: `${templateResp.data.name} — ${eventTitle}`,
      target_kind: targetKind,
      target_ref: eventId,
      starts_at: eventStartsAt,
      created_by: profile.id,
    } satisfies import("@/lib/supabase/types").WorkflowInsert)
    .select("id")
    .single();
  if (workflowErr || !workflow) {
    return {
      ok: false,
      error: workflowErr?.message ?? "Couldn't create workflow.",
    };
  }

  // 4) Insert tasks with due_at derived from default_offset_days (when the
  // event has a start). Carry default_offset_days through so drafts that get
  // a date set later can backfill due_at via updateDraftAction.
  const startsAtMs = eventStartsAt ? new Date(eventStartsAt).getTime() : null;
  const toInsert: TaskInsert[] = (tasksResp.data ?? []).map((t) => {
    let due: string | null = null;
    if (startsAtMs !== null && t.default_offset_days !== null) {
      const due_ms = startsAtMs + t.default_offset_days * 24 * 60 * 60 * 1000;
      due = new Date(due_ms).toISOString();
    }
    return {
      workflow_id: workflow.id,
      event_stage_id: t.event_stage_id,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      due_at: due,
      default_offset_days: t.default_offset_days,
    };
  });

  if (toInsert.length > 0) {
    const { error: tasksErr } = await supabase.from("tasks").insert(toInsert);
    if (tasksErr) {
      // Best-effort cleanup so we don't leave a workflow with no tasks.
      await supabase.from("workflows").delete().eq("id", workflow.id);
      return { ok: false, error: tasksErr.message };
    }
  }

  revalidateEvent(eventId);
  return { ok: true, data: null };
}

export async function archiveWorkflowAction(
  workflowId: string,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workflows")
    .update({ archived: true })
    .eq("id", workflowId);
  if (error) return { ok: false, error: error.message };

  revalidateEvent(eventId);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function setTaskStatusAction(
  taskId: string,
  status: TaskStatus,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEvent(eventId);
  return { ok: true, data: null };
}

export async function addTaskToWorkflowAction(
  workflowId: string,
  eventStageId: string,
  title: string,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const supabase = await createSupabaseServerClient();
  const { data: peers, error: peersErr } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("workflow_id", workflowId)
    .eq("event_stage_id", eventStageId);
  if (peersErr) return { ok: false, error: peersErr.message };
  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase.from("tasks").insert({
    workflow_id: workflowId,
    event_stage_id: eventStageId,
    title: trimmed,
    sort_order: nextSort,
  });
  if (error) return { ok: false, error: error.message };

  revalidateEvent(eventId);
  return { ok: true, data: null };
}

export async function renameTaskAction(
  taskId: string,
  title: string,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title can't be empty." };

  const supabase = await createSupabaseServerClient();
  const update: TaskUpdate = { title: trimmed };
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  // Rename doesn't shift the event on the Kanban.
  revalidateEventDetail(eventId);
  return { ok: true, data: null };
}

export async function deleteTaskAction(
  taskId: string,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEvent(eventId);
  return { ok: true, data: null };
}

export async function assignTaskAction(
  taskId: string,
  profileId: string | null,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_to: profileId })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  // Assignment doesn't shift the event on the Kanban.
  revalidateEventDetail(eventId);
  return { ok: true, data: null };
}

export async function setTaskDueAction(
  taskId: string,
  isoDate: string | null,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ due_at: isoDate })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  // Due date affects the overdue badge on /events, but seeing it 15 min
  // stale is fine; saves time on every date change to skip that revalidate.
  revalidateEventDetail(eventId);
  return { ok: true, data: null };
}

export async function moveTaskToStageAction(
  taskId: string,
  newStageId: string,
  workflowId: string,
  eventId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data: peers, error: peersErr } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("workflow_id", workflowId)
    .eq("event_stage_id", newStageId);
  if (peersErr) return { ok: false, error: peersErr.message };

  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase
    .from("tasks")
    .update({ event_stage_id: newStageId, sort_order: nextSort })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEvent(eventId);
  return { ok: true, data: null };
}
