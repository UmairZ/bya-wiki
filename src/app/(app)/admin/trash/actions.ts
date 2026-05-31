"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/slug";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function restorePageAction(id: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  const { data: page, error: lookupErr } = await supabase
    .from("pages")
    .select("id, category_id, slug, title")
    .eq("id", id)
    .single();
  if (lookupErr || !page) {
    return { ok: false, error: lookupErr?.message ?? "Page not found." };
  }

  // Slug may have been reused by a sibling created after this page was
  // deleted (the partial unique index excludes soft-deleted rows). Bump
  // the slug if there's a live collision.
  const { data: siblings, error: siblingsErr } = await supabase
    .from("pages")
    .select("slug")
    .eq("category_id", page.category_id)
    .is("deleted_at", null);
  if (siblingsErr) return { ok: false, error: siblingsErr.message };

  const liveSlugs = new Set((siblings ?? []).map((s) => s.slug));
  const restoredSlug = liveSlugs.has(page.slug)
    ? uniqueSlug(page.slug, liveSlugs)
    : page.slug;

  const update: { deleted_at: null; slug?: string } = { deleted_at: null };
  if (restoredSlug !== page.slug) update.slug = restoredSlug;

  const { error } = await supabase
    .from("pages")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/browse");
  revalidatePath("/admin/trash");
  return { ok: true };
}

export async function hardDeletePageAction(id: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/trash");
  return { ok: true };
}

export async function emptyTrashAction(): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("pages")
    .delete()
    .not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/trash");
  return { ok: true };
}
