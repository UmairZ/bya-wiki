"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SaveIcsUrlState = { ok: true } | { error: string } | undefined;

const ICS_URL_PATTERN = /^https:\/\/[^/]+\/.+\.ics(\?.*)?$/i;

export async function saveIcsUrlAction(
  _prev: SaveIcsUrlState,
  formData: FormData,
): Promise<SaveIcsUrlState> {
  const current = await requireOwner();
  const raw = String(formData.get("ics_url") ?? "").trim();
  const url = raw === "" ? null : raw;

  if (url && !ICS_URL_PATTERN.test(url)) {
    return {
      error:
        "That doesn't look like an ICS feed URL. Expected https://…/something.ics",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      google_calendar_ics_url: url,
      updated_by: current.userId,
    })
    .eq("id", 1);
  if (error) return { error: error.message };

  updateTag("calendar");
  revalidatePath("/admin/integrations");
  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}

export async function refreshCalendarAction(): Promise<{ ok: true }> {
  await requireOwner();
  updateTag("calendar");
  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}
