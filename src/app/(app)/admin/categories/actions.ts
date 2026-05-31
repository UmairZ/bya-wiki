"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify, uniqueSlug } from "@/lib/slug";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function revalidateBrowse() {
  revalidatePath("/");
  revalidatePath("/admin/categories");
}

export async function createCategoryAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingErr } = await supabase
    .from("categories")
    .select("slug, sort_order");
  if (existingErr) return { ok: false, error: existingErr.message };

  const slug = uniqueSlug(
    slugify(name),
    (existing ?? []).map((c) => c.slug),
  );
  const nextSort =
    Math.max(0, ...(existing ?? []).map((c) => c.sort_order)) + 10;

  const { error } = await supabase
    .from("categories")
    .insert({ name, slug, icon, sort_order: nextSort });
  if (error) return { ok: false, error: error.message };

  await revalidateBrowse();
  return { ok: true, data: null };
}

export async function renameCategoryAction(
  id: string,
  name: string,
): Promise<ActionResult> {
  await requireOwner();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateBrowse();
  return { ok: true, data: null };
}

export async function setCategoryIconAction(
  id: string,
  icon: string | null,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ icon })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateBrowse();
  return { ok: true, data: null };
}

export async function moveCategoryAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  const { data: all, error: allErr } = await supabase
    .from("categories")
    .select("id, sort_order, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (allErr) return { ok: false, error: allErr.message };

  const ordered = all ?? [];
  const index = ordered.findIndex((c) => c.id === id);
  if (index < 0) return { ok: false, error: "Category not found." };

  const swapWith =
    direction === "up" ? ordered[index - 1] : ordered[index + 1];
  if (!swapWith) return { ok: true, data: null }; // already at edge

  const self = ordered[index];
  // Swap sort_order between self and neighbor.
  const { error: e1 } = await supabase
    .from("categories")
    .update({ sort_order: swapWith.sort_order })
    .eq("id", self.id);
  if (e1) return { ok: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("categories")
    .update({ sort_order: self.sort_order })
    .eq("id", swapWith.id);
  if (e2) return { ok: false, error: e2.message };

  await revalidateBrowse();
  return { ok: true, data: null };
}

export async function deleteCategoryAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  // Block delete if any pages still live in this category.
  const { count, error: countErr } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);
  if (countErr) return { ok: false, error: countErr.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This category still has ${count} page${count === 1 ? "" : "s"}. Move or delete them first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateBrowse();
  return { ok: true, data: null };
}
