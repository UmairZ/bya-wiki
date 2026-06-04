"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildFlyerPath,
  deleteFlyer,
  uploadFlyer,
} from "@/lib/flyer-storage";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import { parseDescription } from "@/lib/calendar/markers";
import {
  getConnectionStatus,
  updateEvent,
  type EventPayload,
} from "@/lib/calendar/google";
import type {
  AudienceTag,
  GenderTag,
  TaskInsert,
  TaskStatus,
  TaskUpdate,
} from "@/lib/supabase/types";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Revalidate just the event/draft detail page. Use for edits that don't
 *  shift the card's position on the Events Kanban (rename, assign, due date). */
function revalidateEventDetail(eventId: string) {
  revalidatePath(`/event/${encodeURIComponent(eventId)}`);
}

/** Revalidate detail page AND the Events Kanban. Use when the edit can
 *  change the card's stage placement (status toggle, add, delete, move). */
function revalidateEventAndKanban(eventId: string) {
  revalidatePath(`/event/${encodeURIComponent(eventId)}`);
  revalidatePath("/events");
}

// ---------------------------------------------------------------------------
// Apply playbook — bulk insert template tasks onto an event or draft.
//
// No workflow row created. Tasks attach directly to the target via
// target_kind + target_ref. Duplicates allowed ("dumb append" model) —
// user deletes what they don't want.
//
// Only post-publish stages (Pre-event / Day-of / Wrap-up) get populated;
// the playbook template editor enforces this at write time, but we also
// filter at apply time as a safety net.
// ---------------------------------------------------------------------------

export async function applyPlaybookAction(
  templateId: string,
  targetRef: string,
  targetStartsAt: string | null,
  _targetTitle: string,
  targetKind: "event" | "draft" = "event",
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  // Fetch template (verify exists + not archived) + its tasks.
  const [templateResp, tasksResp, draftsStageResp] = await Promise.all([
    supabase
      .from("playbook_templates")
      .select("id, name, archived")
      .eq("id", templateId)
      .single(),
    supabase
      .from("playbook_template_tasks")
      .select(
        "event_stage_id, title, description, sort_order, default_offset_days, default_assignee_role",
      )
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
    // First stage (Drafts) — we skip its tasks when applying.
    supabase
      .from("event_stages")
      .select("id")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (templateResp.error || !templateResp.data) {
    return { ok: false, error: "Playbook not found." };
  }
  if (templateResp.data.archived) {
    return { ok: false, error: "That playbook is archived." };
  }

  const draftsStageId = draftsStageResp.data?.id;
  const eligible = (tasksResp.data ?? []).filter(
    (t) => t.event_stage_id !== draftsStageId,
  );

  const startsAtMs = targetStartsAt ? new Date(targetStartsAt).getTime() : null;
  const toInsert: TaskInsert[] = eligible.map((t) => {
    let due: string | null = null;
    if (startsAtMs !== null && t.default_offset_days !== null) {
      const dueMs = startsAtMs + t.default_offset_days * 24 * 60 * 60 * 1000;
      due = new Date(dueMs).toISOString();
    }
    return {
      target_kind: targetKind,
      target_ref: targetRef,
      event_stage_id: t.event_stage_id,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      due_at: due,
      default_offset_days: t.default_offset_days,
      source_template_id: templateId,
    };
  });

  if (toInsert.length === 0) {
    return {
      ok: false,
      error: "This playbook has no tasks in any post-publish stage.",
    };
  }

  const { error } = await supabase.from("tasks").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function setTaskStatusAction(
  taskId: string,
  status: TaskStatus,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function addAdhocTaskAction(
  targetKind: "event" | "draft",
  targetRef: string,
  eventStageId: string,
  title: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const supabase = await createSupabaseServerClient();
  const { data: peers, error: peersErr } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .eq("event_stage_id", eventStageId);
  if (peersErr) return { ok: false, error: peersErr.message };
  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase.from("tasks").insert({
    target_kind: targetKind,
    target_ref: targetRef,
    event_stage_id: eventStageId,
    title: trimmed,
    sort_order: nextSort,
  });
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function renameTaskAction(
  taskId: string,
  title: string,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title can't be empty." };

  const supabase = await createSupabaseServerClient();
  const update: TaskUpdate = { title: trimmed };
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventDetail(targetRef);
  return { ok: true, data: null };
}

export async function deleteTaskAction(
  taskId: string,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function moveTaskToStageAction(
  taskId: string,
  newStageId: string,
  targetKind: "event" | "draft",
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data: peers, error: peersErr } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .eq("event_stage_id", newStageId);
  if (peersErr) return { ok: false, error: peersErr.message };

  const nextSort =
    Math.max(0, ...(peers ?? []).map((p) => p.sort_order)) + 10;

  const { error } = await supabase
    .from("tasks")
    .update({ event_stage_id: newStageId, sort_order: nextSort })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: null };
}

export async function assignTaskAction(
  taskId: string,
  profileId: string | null,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_to: profileId })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventDetail(targetRef);
  return { ok: true, data: null };
}

export async function setTaskDueAction(
  taskId: string,
  isoDate: string | null,
  targetRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ due_at: isoDate })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateEventDetail(targetRef);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Published-event field updates (one field at a time)
//
// Each click-to-edit popover on the published event detail calls this with
// just the field(s) it changed. We fetch the current event from the ICS
// feed, merge in the patch, and PATCH Google with the full payload. PATCH
// preserves fields we don't touch (most importantly `recurrence` /RRULE).
// ---------------------------------------------------------------------------

export type EventFieldPatch = Partial<{
  title: string;
  description: string;
  location: string | null;
  registration_url: string | null;
  tags: string[];
  audience: AudienceTag | null;
  gender: GenderTag | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
}>;

export async function updateEventFieldAction(
  eventRef: string,
  patch: EventFieldPatch,
): Promise<ActionResult> {
  await requireCurrentUser();

  const icsUrl = await getIcsUrl();
  if (!icsUrl) {
    return { ok: false, error: "Calendar isn't connected." };
  }
  const status = await getConnectionStatus();
  if (!status.connected || !status.calendarId) {
    return {
      ok: false,
      error: "Google Calendar isn't connected for writes.",
    };
  }

  let events;
  try {
    events = await getCalendarEvents({ icsUrl });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const event = events.find((e) => e.id === eventRef);
  if (!event) {
    return { ok: false, error: "Event not found in feed." };
  }

  // Extract Google's eventId from `<uid>@google.com[::<iso>]` — Google's API
  // wants the bare id, not the ICS UID with @google.com.
  const baseUid = event.id.split("::")[0];
  const at = baseUid.indexOf("@");
  const googleEventId = at === -1 ? baseUid : baseUid.slice(0, at);

  const parsed = parseDescription(event.description);

  // Merge: patch wins; explicit `null` in patch is intentional clear.
  const payload: EventPayload = {
    title: "title" in patch ? (patch.title ?? "") : event.title,
    description:
      "description" in patch ? (patch.description ?? "") : parsed.description,
    location:
      "location" in patch
        ? (patch.location ?? undefined)
        : (event.location ?? undefined),
    registration_url:
      "registration_url" in patch
        ? (patch.registration_url ?? undefined)
        : (parsed.registration_url ?? undefined),
    tags: "tags" in patch ? (patch.tags ?? []) : parsed.tags,
    audience: "audience" in patch ? patch.audience : parsed.audience,
    gender: "gender" in patch ? patch.gender : parsed.gender,
    starts_at: "starts_at" in patch ? patch.starts_at! : event.starts_at,
    ends_at: "ends_at" in patch ? (patch.ends_at ?? null) : event.ends_at,
    all_day: "all_day" in patch ? !!patch.all_day : event.all_day,
  };

  try {
    await updateEvent(status.calendarId, googleEventId, payload);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  updateTag("calendar");
  revalidatePath(`/event/${encodeURIComponent(eventRef)}`);
  revalidatePath("/events");
  revalidatePath("/r/events");
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Flyer (published event)
//
// The event_flyers table is keyed by the base Google event UID
// (`<uid>@google.com`, no `::<iso>` suffix). Recurring event instances all
// share the same master UID's flyer.
// ---------------------------------------------------------------------------

function baseGoogleUid(eventRef: string): string {
  return eventRef.split("::")[0];
}

export async function uploadEventFlyerAction(
  eventRef: string,
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const { profile } = await requireCurrentUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick an image file." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Flyer must be 5 MB or smaller." };
  }

  const uid = baseGoogleUid(eventRef);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const storagePath = buildFlyerPath({
    ownerPrefix: "event",
    ownerId: uid,
    originalName: file.name,
  });

  try {
    await uploadFlyer({
      path: storagePath,
      body: bytes,
      contentType: file.type,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("event_flyers")
    .select("flyer_storage_path")
    .eq("google_event_uid", uid)
    .maybeSingle();

  const { error } = await supabase.from("event_flyers").upsert({
    google_event_uid: uid,
    flyer_storage_path: storagePath,
    uploaded_by: profile.id,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  if (existing?.flyer_storage_path) {
    try {
      await deleteFlyer(existing.flyer_storage_path);
    } catch {
      /* non-fatal */
    }
  }

  revalidatePath(`/event/${encodeURIComponent(eventRef)}`);
  revalidatePath("/r/events");
  return { ok: true, data: { path: storagePath } };
}

export async function setFlyerFlagsAction(
  eventRef: string,
  patch: { registration_closed?: boolean; hidden_from_public?: boolean },
): Promise<ActionResult> {
  await requireCurrentUser();
  const uid = baseGoogleUid(eventRef);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("event_flyers")
    .update(patch)
    .eq("google_event_uid", uid);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/event/${encodeURIComponent(eventRef)}`);
  revalidatePath("/r/events");
  return { ok: true, data: null };
}

export async function removeEventFlyerAction(
  eventRef: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const uid = baseGoogleUid(eventRef);
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("event_flyers")
    .select("flyer_storage_path")
    .eq("google_event_uid", uid)
    .maybeSingle();
  if (!existing) return { ok: true, data: null };

  const { error } = await supabase
    .from("event_flyers")
    .delete()
    .eq("google_event_uid", uid);
  if (error) return { ok: false, error: error.message };

  try {
    await deleteFlyer(existing.flyer_storage_path);
  } catch {
    /* non-fatal */
  }

  revalidatePath(`/event/${encodeURIComponent(eventRef)}`);
  revalidatePath("/r/events");
  return { ok: true, data: null };
}

/** Nuke every task attached to this event/draft. Owner-only — uses RLS:
 *  task delete policy currently allows owners only. */
export async function clearAllTasksAction(
  targetKind: "event" | "draft",
  targetRef: string,
): Promise<ActionResult<{ deleted: number }>> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidateEventAndKanban(targetRef);
  return { ok: true, data: { deleted: (data ?? []).length } };
}
