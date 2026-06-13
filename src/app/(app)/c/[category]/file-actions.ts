"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildStoragePath,
  createDownloadUrl,
  uploadToStorage,
} from "@/lib/storage";
import { type ActionResult } from "@/lib/action-result";

export type UploadResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file

export async function uploadFileAction(
  formData: FormData,
): Promise<UploadResult> {
  const current = await requireCurrentUser();

  const categoryId = String(formData.get("category_id") ?? "");
  const file = formData.get("file");

  if (!categoryId) return { ok: false, error: "Missing category." };
  if (!(file instanceof File)) {
    return { ok: false, error: "No file in request." };
  }
  if (file.size === 0) return { ok: false, error: "File is empty." };
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large (max ${MAX_BYTES / 1024 / 1024} MB).`,
    };
  }

  const path = buildStoragePath({
    categoryId,
    originalName: file.name || "file",
  });

  // Read the File into a Uint8Array on the server. Passing the raw File
  // object through to @supabase/storage-js crashes the Next.js worker
  // (the File proxy doesn't round-trip cleanly across the action boundary).
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (err) {
    return {
      ok: false,
      error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    await uploadToStorage({
      path,
      body: bytes,
      contentType: file.type || "application/octet-stream",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const supabase = await createSupabaseServerClient();
  const { data: inserted, error } = await supabase
    .from("resources")
    .insert({
      category_id: categoryId,
      title: file.name || "Untitled file",
      storage_path: path,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      uploaded_by: current.userId,
    })
    .select("id, category:categories(slug)")
    .single<{ id: string; category: { slug: string } | null }>();
  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Could not save file." };
  }

  revalidatePath("/");
  if (inserted.category?.slug) revalidatePath(`/c/${inserted.category.slug}`);
  return { ok: true, id: inserted.id };
}

export async function renameResourceAction(
  id: string,
  title: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resources")
    .update({ title: trimmed })
    .eq("id", id)
    .select("category:categories(slug)")
    .single<{ category: { slug: string } | null }>();
  if (error) return { ok: false, error: error.message };

  if (data?.category?.slug) revalidatePath(`/c/${data.category.slug}`);
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function togglePinResourceAction(
  id: string,
  pinned: boolean,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resources")
    .update({ pinned })
    .eq("id", id)
    .select("category:categories(slug)")
    .single<{ category: { slug: string } | null }>();
  if (error) return { ok: false, error: error.message };

  if (data?.category?.slug) revalidatePath(`/c/${data.category.slug}`);
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function softDeleteResourceAction(
  id: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("category:categories(slug)")
    .single<{ category: { slug: string } | null }>();
  if (error) return { ok: false, error: error.message };

  if (data?.category?.slug) revalidatePath(`/c/${data.category.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/trash");
  return { ok: true, data: null };
}

export type DownloadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Mint a short-lived signed URL for a stored file. Used for both inline
 * preview (image/PDF) and download.
 */
export async function getResourceUrlAction(
  id: string,
  options?: { download?: boolean },
): Promise<DownloadResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resources")
    .select("storage_path, title, deleted_at")
    .eq("id", id)
    .single();
  if (error || !data) return { ok: false, error: "File not found." };
  if (data.deleted_at) return { ok: false, error: "File is in trash." };

  try {
    const url = await createDownloadUrl(data.storage_path, {
      expiresIn: 300,
      download: options?.download ? data.title : undefined,
    });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
