"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskInsert, TaskStatus, TaskUpdate } from "@/lib/supabase/types";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Revalidate just the event/draft detail page. Use for edits that don't
 *  shift the card's position on the Events Kanban (rename, assign, due date). */
function revalidateEventDetail(eventId: string) {
  revalidatePath(`/event/${encodeURIComponent(eventId)}`);
}

/** Revalidate detail page AND the Events Kanban. Use when the edit can
 *  change the card's stage placement (status toggle, add, delete, move). */
function revalidateEventAndKanban(eventId: string) {
  revalidatePath(`/event/${encodeURIComponent(eventId)}`);
  revalidatePath("/events");
}

// ---------------------------------------------------------------------------
// Apply playbook — bulk insert template tasks onto an event or draft.
//
// No workflow row created. Tasks attach directly to the target via
// target_kind + target_ref. Duplicates allowed ("dumb append" model) —
// user deletes what they don't want.
//
// Only post-publish stages (Pre-event / Day-of / Wrap-up) get populated;
// the playbook template editor enforces this at write time, but we also
// filter at apply time as a safety net.
// ---------------------------------------------------------------------------

export async function applyPlaybookAction(
  templateId: string,
  targetRef: string,
  targetStartsAt: string | null,
  _targetTitle: string,
  targetKind: "event" | "draft" = "event",
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  // Fetch template (verify exists + not archived) + its tasks.
  const [templateResp, tasksResp, draftsStageResp] = await Promise.all([
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
    // First stage (Drafts) — we skip its tasks when applying.
    supabase
      .from("event_stages")
      .select("id")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (templateResp.error || !templateResp.data) {
    return { ok: false, error: "Playbook not found." };
  }
  if (templateResp.data.archived) {
    return { ok: false, error: "That playbook is archived." };
  }

  const draftsStageId = draftsStageResp.data?.id;
  const eligible = (tasksResp.data ?? []).filter(
    (t) => t.event_stage_id !== draftsStageId,
  );

  const startsAtMs = targetStartsAt ? new Date(targetStartsAt).getTime() : null;
  const toInsert: TaskInsert[] = eligible.map((t) => {
    let due: string | null = null;
    if (startsAtMs !== null && t.default_offset_days !== null) {
      const dueMs = startsAtMs + t.default_offset_days * 24 * 60 * 60 * 1000;
      due = new Date(dueMs).toISOString();
    }
    return {
      target_kind: targetKind,
      target_ref: targetRef,
      event_stage_id: t.event_stage_id,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      due_at: due,
      default_offset_days: t.default_offset_days,
      source_template_id: templateId,
    };
  });

  if (toInsert.length === 0) {
    return {
      ok: false,
      error: "This playbook has no tasks in any post-publish stage.",
    };
  }

  const { error } = await supabase.from("tasks").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function setTaskStatusAction(
  taskId: string,
  status: TaskStatus,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function addAdhocTaskAction(
  targetKind: "event" | "draft",
  targetRef: string,
  eventStageId: string,
  title: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const supabase = await createSupabaseServerClient();
  const { data: peers, error: peersErr } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .eq("event_stage_id", eventStageId);
  if (peersErr) return { ok: false, error: peersErr.message };
  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase.from("tasks").insert({
    target_kind: targetKind,
    target_ref: targetRef,
    event_stage_id: eventStageId,
    title: trimmed,
    sort_order: nextSort,
  });
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function renameTaskAction(
  taskId: string,
  title: string,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title can't be empty." };

  const supabase = await createSupabaseServerClient();
  const update: TaskUpdate = { title: trimmed };
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventDetail(targetRef);
  return { ok: true, data: null };
}

export async function deleteTaskAction(
  taskId: string,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function moveTaskToStageAction(
  taskId: string,
  newStageId: string,
  targetKind: "event" | "draft",
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data: peers, error: peersErr } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .eq("event_stage_id", newStageId);
  if (peersErr) return { ok: false, error: peersErr.message };

  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase
    .from("tasks")
    .update({ event_stage_id: newStageId, sort_order: nextSort })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function assignTaskAction(
  taskId: string,
  profileId: string | null,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_to: profileId })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventDetail(targetRef);
  return { ok: true, data: null };
}

export async function setTaskDueAction(
  taskId: string,
  isoDate: string | null,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ due_at: isoDate })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventDetail(targetRef);
  return { ok: true, data: null };
}

/** Nuke every task attached to this event/draft. Owner-only — uses RLS:
 *  task delete policy currently allows owners only. */
export async function clearAllTasksAction(
  targetKind: "event" | "draft",
  targetRef: string,
): Promise<ActionResult<{ deleted: number }>> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: { deleted: (data ?? []).length } };
}
