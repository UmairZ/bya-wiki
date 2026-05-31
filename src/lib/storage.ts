import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const WIKI_FILES_BUCKET = "wiki-files";

/**
 * Upload a file blob to the wiki-files bucket. Returns the storage_path
 * (object name) which we persist on the resources row.
 *
 * We deliberately use the admin client so the upload bypasses RLS and we
 * never need an authenticated supabase client on the server (this server
 * action has already gated on requireCurrentUser).
 */
export async function uploadToStorage(input: {
  path: string;
  body: ArrayBuffer | Uint8Array | Blob | File;
  contentType?: string;
  upsert?: boolean;
}): Promise<{ path: string }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(WIKI_FILES_BUCKET)
    .upload(input.path, input.body, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
    });
  if (error || !data) {
    throw new Error(`Upload failed: ${error?.message ?? "unknown error"}`);
  }
  return { path: data.path };
}

/**
 * Mint a short-lived signed URL for a stored file. Default 5 min lifetime —
 * long enough for a download to complete; not long enough to share around.
 */
export async function createDownloadUrl(
  path: string,
  options?: { expiresIn?: number; download?: boolean | string },
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(WIKI_FILES_BUCKET)
    .createSignedUrl(path, options?.expiresIn ?? 300, {
      download: options?.download,
    });
  if (error || !data) {
    throw new Error(
      `Signed URL failed: ${error?.message ?? "unknown error"}`,
    );
  }
  return data.signedUrl;
}

/**
 * Permanently delete the bytes. Only call after a hard delete of the
 * resources row.
 */
export async function deleteFromStorage(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(WIKI_FILES_BUCKET)
    .remove([path]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Compose a storage path from a category id, a random suffix, and the
 * original filename. Layout keeps files grouped by category for easy
 * inspection in the Supabase dashboard.
 */
export function buildStoragePath(opts: {
  categoryId: string;
  originalName: string;
}): string {
  const safe = opts.originalName.replace(/[^\w.\-]+/g, "_").slice(0, 100);
  // 8-char base36 = ~41 bits of entropy; plenty for collision-free per file.
  const id =
    Math.random().toString(36).slice(2, 6) +
    Math.random().toString(36).slice(2, 6);
  return `${opts.categoryId}/${id}-${safe}`;
}
