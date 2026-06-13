"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  clearConnection,
  setSelectedCalendar,
} from "@/lib/calendar/google";
import { type ActionResult } from "@/lib/action-result";

// ---------------------------------------------------------------------------
// ICS feed URL
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Google OAuth — calendar picker + disconnect
// ---------------------------------------------------------------------------

export async function selectGoogleCalendarAction(
  calendarId: string,
  calendarName: string,
): Promise<ActionResult> {
  await requireOwner();
  if (!calendarId) return { ok: false, error: "Pick a calendar." };
  try {
    await setSelectedCalendar(calendarId, calendarName);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/admin/integrations");
  revalidatePath("/events");
  return { ok: true, data: null };
}

export async function disconnectGoogleAction(): Promise<ActionResult> {
  await requireOwner();
  try {
    await clearConnection();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/admin/integrations");
  revalidatePath("/events");
  return { ok: true, data: null };
}
