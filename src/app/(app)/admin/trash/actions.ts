"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uniqueSlug } from "@/lib/slug";
import { deleteFromStorage } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

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

  const { error } = await supabase.from("pages").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
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

// ---------------------------------------------------------------------------
// Resources (files)
// ---------------------------------------------------------------------------

export async function restoreResourceAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/trash");
  return { ok: true };
}

export async function hardDeleteResourceAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  // Look up storage path before the row's gone.
  const { data: resource, error: lookupErr } = await supabase
    .from("resources")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (lookupErr || !resource) {
    return { ok: false, error: lookupErr?.message ?? "File not found." };
  }

  // Delete the bytes first; if that fails the DB row stays in trash so it's
  // still recoverable / re-deletable.
  try {
    await deleteFromStorage(resource.storage_path);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/trash");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Empty trash — wipes deleted pages + resources (and their stored bytes).
// ---------------------------------------------------------------------------

export async function emptyTrashAction(): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();

  // 1. Pages.
  const { error: pagesErr } = await supabase
    .from("pages")
    .delete()
    .not("deleted_at", "is", null);
  if (pagesErr) return { ok: false, error: pagesErr.message };

  // 2. Resources — fetch paths so we can also remove the stored bytes.
  const { data: deletedResources, error: lookupErr } = await supabase
    .from("resources")
    .select("storage_path")
    .not("deleted_at", "is", null);
  if (lookupErr) return { ok: false, error: lookupErr.message };

  if (deletedResources && deletedResources.length > 0) {
    const admin = createSupabaseAdminClient();
    const paths = deletedResources.map((r) => r.storage_path);
    const { error: storageErr } = await admin.storage
      .from("wiki-files")
      .remove(paths);
    if (storageErr) return { ok: false, error: storageErr.message };

    const { error: resourcesErr } = await supabase
      .from("resources")
      .delete()
      .not("deleted_at", "is", null);
    if (resourcesErr) return { ok: false, error: resourcesErr.message };
  }

  revalidatePath("/admin/trash");
  return { ok: true };
}
