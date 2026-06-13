"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { type ActionResult } from "@/lib/action-result";

async function revalidateStages() {
  revalidatePath("/events");
  revalidatePath("/admin/event-stages");
}

export async function createStageAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: existingErr } = await supabase
    .from("event_stages")
    .select("sort_order");
  if (existingErr) return { ok: false, error: existingErr.message };
  const nextSort =
    Math.max(0, ...(existing ?? []).map((s) => s.sort_order)) + 10;

  const { error } = await supabase
    .from("event_stages")
    .insert({ name, sort_order: nextSort });
  if (error) return { ok: false, error: error.message };

  await revalidateStages();
  return { ok: true, data: null };
}

export async function renameStageAction(
  id: string,
  name: string,
): Promise<ActionResult> {
  await requireOwner();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("event_stages")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateStages();
  return { ok: true, data: null };
}

export async function moveStageAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  const { data: all, error: allErr } = await supabase
    .from("event_stages")
    .select("id, sort_order, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (allErr) return { ok: false, error: allErr.message };

  const ordered = all ?? [];
  const index = ordered.findIndex((s) => s.id === id);
  if (index < 0) return { ok: false, error: "Stage not found." };

  const swapWith =
    direction === "up" ? ordered[index - 1] : ordered[index + 1];
  if (!swapWith) return { ok: true, data: null };

  const self = ordered[index];
  const { error: e1 } = await supabase
    .from("event_stages")
    .update({ sort_order: swapWith.sort_order })
    .eq("id", self.id);
  if (e1) return { ok: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("event_stages")
    .update({ sort_order: self.sort_order })
    .eq("id", swapWith.id);
  if (e2) return { ok: false, error: e2.message };

  await revalidateStages();
  return { ok: true, data: null };
}

export async function deleteStageAction(id: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  // In 7b the playbook_template_tasks / tasks tables will reference stages
  // via FK on delete restrict, so the database will reject the delete. For
  // now there's nothing to check — just delete.
  const { error } = await supabase
    .from("event_stages")
    .delete()
    .eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "This stage is referenced by tasks. Move them to another stage first.",
      };
    }
    return { ok: false, error: error.message };
  }

  await revalidateStages();
  return { ok: true, data: null };
}
