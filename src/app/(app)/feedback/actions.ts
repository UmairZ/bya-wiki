"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function submitFeedbackAction(
  body: string,
): Promise<ActionResult> {
  const { profile } = await requireCurrentUser();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Write something first." };
  if (trimmed.length > 2000) {
    return { ok: false, error: "Keep it under 2000 characters." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("app_feedback")
    .insert({ body: trimmed, created_by: profile.id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/feedback");
  return { ok: true, data: null };
}

export async function deleteFeedbackAction(
  id: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  // RLS guards: only author or owner can delete.
  const { error } = await supabase.from("app_feedback").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/feedback");
  return { ok: true, data: null };
}
