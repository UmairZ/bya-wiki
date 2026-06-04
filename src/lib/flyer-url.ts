// Client-safe helper for resolving the public URL of a flyer in the
// event-flyers bucket. The bucket is public, so the URL pattern is
// deterministic — no server call needed.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const FLYERS_BUCKET = "event-flyers";

export function flyerPublicUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${FLYERS_BUCKET}/${storagePath}`;
}
