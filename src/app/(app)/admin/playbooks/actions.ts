"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlaybookTemplateTaskUpdate } from "@/lib/supabase/types";

import { type ActionResult } from "@/lib/action-result";

async function revalidateAdminPlaybooks(templateId?: string) {
  revalidatePath("/admin/playbooks");
  if (templateId) revalidatePath(`/admin/playbooks/${templateId}`);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function createTemplateAction(
  _prev: ActionResult<string> | undefined,
  formData: FormData,
): Promise<ActionResult<string>> {
  const { profile } = await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("playbook_templates")
    .insert({ name, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks();
  return { ok: true, data: data.id };
}

export async function renameTemplateAction(
  id: string,
  name: string,
): Promise<ActionResult> {
  await requireOwner();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("playbook_templates")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(id);
  return { ok: true, data: null };
}

export async function setTemplateDescriptionAction(
  id: string,
  description: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("playbook_templates")
    .update({ description: description.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(id);
  return { ok: true, data: null };
}

export async function setTemplateArchivedAction(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("playbook_templates")
    .update({ archived })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(id);
  return { ok: true, data: null };
}

export async function deleteTemplateAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("playbook_templates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks();
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function addTaskAction(
  templateId: string,
  eventStageId: string,
  title: string,
): Promise<ActionResult> {
  await requireOwner();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingErr } = await supabase
    .from("playbook_template_tasks")
    .select("sort_order")
    .eq("template_id", templateId)
    .eq("event_stage_id", eventStageId);
  if (existingErr) return { ok: false, error: existingErr.message };

  const nextSort =
    Math.max(0, ...(existing ?? []).map((t) => t.sort_order)) + 10;

  const { error } = await supabase.from("playbook_template_tasks").insert({
    template_id: templateId,
    event_stage_id: eventStageId,
    title: trimmed,
    sort_order: nextSort,
  });
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(templateId);
  return { ok: true, data: null };
}

export async function updateTaskAction(
  taskId: string,
  templateId: string,
  fields: {
    title?: string;
    default_offset_days?: number | null;
    default_assignee_role?: "any" | "owner";
  },
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  const update: PlaybookTemplateTaskUpdate = {};
  if (typeof fields.title === "string") {
    const trimmed = fields.title.trim();
    if (!trimmed) return { ok: false, error: "Title can't be empty." };
    update.title = trimmed;
  }
  if (fields.default_offset_days !== undefined) {
    update.default_offset_days = fields.default_offset_days;
  }
  if (fields.default_assignee_role !== undefined) {
    update.default_assignee_role = fields.default_assignee_role;
  }
  if (Object.keys(update).length === 0) return { ok: true, data: null };

  const { error } = await supabase
    .from("playbook_template_tasks")
    .update(update)
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(templateId);
  return { ok: true, data: null };
}

export async function deleteTaskAction(
  taskId: string,
  templateId: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("playbook_template_tasks")
    .delete()
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(templateId);
  return { ok: true, data: null };
}

export async function moveTaskAction(
  taskId: string,
  templateId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  const { data: self, error: selfErr } = await supabase
    .from("playbook_template_tasks")
    .select("id, event_stage_id, sort_order")
    .eq("id", taskId)
    .single();
  if (selfErr) return { ok: false, error: selfErr.message };

  const { data: peers, error: peersErr } = await supabase
    .from("playbook_template_tasks")
    .select("id, sort_order")
    .eq("template_id", templateId)
    .eq("event_stage_id", self.event_stage_id)
    .order("sort_order", { ascending: true });
  if (peersErr) return { ok: false, error: peersErr.message };

  const ordered = peers ?? [];
  const idx = ordered.findIndex((p) => p.id === taskId);
  const swap = direction === "up" ? ordered[idx - 1] : ordered[idx + 1];
  if (!swap) return { ok: true, data: null };

  const { error: e1 } = await supabase
    .from("playbook_template_tasks")
    .update({ sort_order: swap.sort_order })
    .eq("id", self.id);
  if (e1) return { ok: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("playbook_template_tasks")
    .update({ sort_order: self.sort_order })
    .eq("id", swap.id);
  if (e2) return { ok: false, error: e2.message };

  await revalidateAdminPlaybooks(templateId);
  return { ok: true, data: null };
}

export async function moveTaskToStageAction(
  taskId: string,
  templateId: string,
  newStageId: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  const { data: peers, error: peersErr } = await supabase
    .from("playbook_template_tasks")
    .select("sort_order")
    .eq("template_id", templateId)
    .eq("event_stage_id", newStageId);
  if (peersErr) return { ok: false, error: peersErr.message };

  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase
    .from("playbook_template_tasks")
    .update({ event_stage_id: newStageId, sort_order: nextSort })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await revalidateAdminPlaybooks(templateId);
  return { ok: true, data: null };
}
