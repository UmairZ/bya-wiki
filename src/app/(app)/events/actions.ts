"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  createEvent,
  deleteEvent,
  getConnectionStatus,
  updateEvent,
  type EventPayload,
} from "@/lib/calendar/google";
import {
  dateOnlyInputToISO,
  endOfDay,
  localInputToISO,
} from "@/lib/date-time";

export type EventActionState = { ok: true } | { error: string } | undefined;

async function ensureConnectedCalendar(): Promise<string> {
  const status = await getConnectionStatus();
  if (!status.connected) {
    throw new Error(
      "Google Calendar isn't connected. Ask the owner to set it up in Integrations.",
    );
  }
  if (!status.calendarId) {
    throw new Error(
      "No calendar selected. The owner needs to pick one in Integrations.",
    );
  }
  return status.calendarId;
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function readForm(formData: FormData):
  | { ok: true; payload: EventPayload }
  | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const location = String(formData.get("location") ?? "").trim() || undefined;
  const registration_url =
    String(formData.get("registration_url") ?? "").trim() || undefined;
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const audienceRaw = String(formData.get("audience") ?? "").trim();
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const audience = audienceRaw
    ? (audienceRaw as import("@/lib/supabase/types").AudienceTag)
    : null;
  const gender = genderRaw
    ? (genderRaw as import("@/lib/supabase/types").GenderTag)
    : null;
  const allDay = formData.get("all_day") === "on";

  let starts_at: string | null = null;
  let ends_at: string | null = null;

  if (allDay) {
    starts_at = dateOnlyInputToISO(String(formData.get("starts_at_date") ?? ""));
    const endDate = String(formData.get("ends_at_date") ?? "");
    if (endDate) {
      const endIso = dateOnlyInputToISO(endDate);
      ends_at = endIso ? endOfDay(new Date(endIso)).toISOString() : null;
    }
  } else {
    starts_at = localInputToISO(String(formData.get("starts_at") ?? ""));
    const endRaw = String(formData.get("ends_at") ?? "");
    ends_at = endRaw ? localInputToISO(endRaw) : null;
  }

  if (!title) return { ok: false, error: "Title is required." };
  if (!starts_at) return { ok: false, error: "Start date/time is required." };
  if (ends_at && new Date(ends_at).getTime() < new Date(starts_at).getTime()) {
    return { ok: false, error: "End must be after start." };
  }
  if (registration_url && !/^https?:\/\//i.test(registration_url)) {
    return { ok: false, error: "Registration URL must start with http(s)://" };
  }

  return {
    ok: true,
    payload: {
      title,
      description,
      location,
      registration_url,
      tags,
      audience,
      gender,
      starts_at,
      ends_at,
      all_day: allDay,
    },
  };
}

export async function createEventAction(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  await requireCurrentUser();

  let calendarId: string;
  try {
    calendarId = await ensureConnectedCalendar();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  const parsed = readForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await createEvent(calendarId, parsed.payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  updateTag("calendar");
  revalidatePath("/events");
  revalidatePath("/resources");
  return { ok: true };
}

export async function updateEventAction(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  await requireCurrentUser();

  let calendarId: string;
  try {
    calendarId = await ensureConnectedCalendar();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) return { error: "Missing event id." };

  const parsed = readForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updateEvent(calendarId, eventId, parsed.payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  updateTag("calendar");
  revalidatePath("/events");
  revalidatePath("/resources");
  return { ok: true };
}

export async function deleteEventAction(
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireCurrentUser();

  let calendarId: string;
  try {
    calendarId = await ensureConnectedCalendar();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  if (!eventId) return { ok: false, error: "Missing event id." };

  try {
    await deleteEvent(calendarId, eventId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  updateTag("calendar");
  revalidatePath("/events");
  revalidatePath("/resources");
  return { ok: true };
}

