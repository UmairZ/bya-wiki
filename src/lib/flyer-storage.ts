import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const FLYERS_BUCKET = "event-flyers";

/** Public URL for a flyer object. The bucket is configured public so this
 *  URL is directly embeddable in an <img src=...> on the unauthenticated
 *  /r/events page (no signed URL needed). */
export function flyerPublicUrl(storagePath: string): string {
  const admin = createSupabaseAdminClient();
  const { data } = admin.storage.from(FLYERS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Upload a flyer to the bucket. Returns the storage_path which we persist
 *  on draft_events.flyer_storage_path or event_flyers.flyer_storage_path. */
export async function uploadFlyer(input: {
  path: string;
  body: ArrayBuffer | Uint8Array | Blob | File;
  contentType?: string;
  upsert?: boolean;
}): Promise<{ path: string }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(FLYERS_BUCKET)
    .upload(input.path, input.body, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
    });
  if (error || !data) {
    throw new Error(`Flyer upload failed: ${error?.message ?? "unknown error"}`);
  }
  return { path: data.path };
}

export async function deleteFlyer(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(FLYERS_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Flyer delete failed: ${error.message}`);
  }
}

/** Compose a storage path: <owner-prefix>/<random>-<safe-filename>. The
 *  owner-prefix is "draft" or "event" depending on where the flyer lives. */
export function buildFlyerPath(opts: {
  ownerPrefix: "draft" | "event";
  ownerId: string;
  originalName: string;
}): string {
  const safe = opts.originalName.replace(/[^\w.\-]+/g, "_").slice(0, 100);
  const id =
    Math.random().toString(36).slice(2, 6) +
    Math.random().toString(36).slice(2, 6);
  return `${opts.ownerPrefix}/${opts.ownerId}/${id}-${safe}`;
}
