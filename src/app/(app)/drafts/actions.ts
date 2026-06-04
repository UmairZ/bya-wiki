"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createEvent,
  getConnectionStatus,
} from "@/lib/calendar/google";
import type {
  AudienceTag,
  DraftEventRow,
  DraftEventUpdate,
  GenderTag,
} from "@/lib/supabase/types";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function revalidateDraft(draftId: string) {
  revalidatePath(`/event/${encodeURIComponent(draftId)}`);
  revalidatePath("/events");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createDraftAction(
  _prev: ActionResult<string> | undefined,
  formData: FormData,
): Promise<ActionResult<string>> {
  const { profile } = await requireCurrentUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("draft_events")
    .insert({ title, created_by: profile.id })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create draft." };
  }

  revalidatePath("/events");
  return { ok: true, data: data.id };
}

// ---------------------------------------------------------------------------
// Update (per-field)
// ---------------------------------------------------------------------------

type UpdatableField = keyof DraftEventUpdate;

export async function updateDraftAction(
  draftId: string,
  fields: DraftEventUpdate,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const clean: DraftEventUpdate = {};
  for (const key of Object.keys(fields) as UpdatableField[]) {
    if (fields[key] !== undefined) {
      (clean as Record<string, unknown>)[key] = fields[key];
    }
  }
  if (Object.keys(clean).length === 0) return { ok: true, data: null };

  const startsAtIsChanging = "starts_at" in clean;

  const { data: updated, error } = await supabase
    .from("draft_events")
    .update(clean)
    .eq("id", draftId)
    .select("starts_at")
    .single();
  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Update failed." };
  }

  if (startsAtIsChanging) {
    await backfillTaskDueDates(draftId, updated.starts_at);
  }

  revalidateDraft(draftId);
  return { ok: true, data: null };
}

/** When a draft's starts_at changes, recompute due_at across all tasks that
 *  were copied from a template (default_offset_days set). Tasks added
 *  ad-hoc (no offset) are left alone. */
async function backfillTaskDueDates(
  draftId: string,
  newStartsAt: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (newStartsAt === null) {
    await supabase
      .from("tasks")
      .update({ due_at: null })
      .eq("target_kind", "draft")
      .eq("target_ref", draftId)
      .not("default_offset_days", "is", null);
    return;
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, default_offset_days")
    .eq("target_kind", "draft")
    .eq("target_ref", draftId)
    .not("default_offset_days", "is", null);
  if (!tasks || tasks.length === 0) return;

  const startsAtMs = new Date(newStartsAt).getTime();

  for (const t of tasks) {
    if (t.default_offset_days === null) continue;
    const dueMs = startsAtMs + t.default_offset_days * 24 * 60 * 60 * 1000;
    await supabase
      .from("tasks")
      .update({ due_at: new Date(dueMs).toISOString() })
      .eq("id", t.id);
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteDraftAction(
  draftId: string,
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  // Tasks attached to this draft are owned by it — cascade-delete them.
  await supabase
    .from("tasks")
    .delete()
    .eq("target_kind", "draft")
    .eq("target_ref", draftId);

  const { error } = await supabase
    .from("draft_events")
    .delete()
    .eq("id", draftId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/events");
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Publish — promote to Google Calendar
// ---------------------------------------------------------------------------

export type PublishValidationError = {
  missing: Array<"date" | "location" | "audience" | "gender">;
};

function validateForPublish(draft: DraftEventRow): PublishValidationError | null {
  const missing: PublishValidationError["missing"] = [];
  if (!draft.starts_at) missing.push("date");
  if (!draft.location || !draft.location.trim()) missing.push("location");
  if (!draft.audience) missing.push("audience");
  if (!draft.gender) missing.push("gender");
  return missing.length > 0 ? { missing } : null;
}

export async function publishDraftAction(
  draftId: string,
): Promise<ActionResult<{ googleEventId: string }>> {
  await requireCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data: draft, error: draftErr } = await supabase
    .from("draft_events")
    .select("*")
    .eq("id", draftId)
    .single();
  if (draftErr || !draft) {
    return { ok: false, error: "Draft not found." };
  }

  const validation = validateForPublish(draft as DraftEventRow);
  if (validation) {
    return {
      ok: false,
      error: `Can't publish yet — missing: ${validation.missing.join(", ")}.`,
    };
  }

  const status = await getConnectionStatus();
  if (!status.connected || !status.calendarId) {
    return {
      ok: false,
      error: "Google Calendar isn't connected. Set it up in Integrations.",
    };
  }

  let created: { id: string };
  try {
    created = await createEvent(status.calendarId, {
      title: draft.title,
      description: draft.description,
      location: draft.location ?? undefined,
      registration_url: draft.registration_url ?? undefined,
      tags: draft.free_tags,
      audience: draft.audience as AudienceTag,
      gender: draft.gender as GenderTag,
      starts_at: draft.starts_at!,
      ends_at: draft.ends_at,
      all_day: draft.all_day,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const googleEventUid = `${created.id}@google.com`;

  // Transfer any tasks pointed at the draft over to the Google event UID.
  // Includes Drafts-stage tasks and any post-pub tasks that were already
  // added (rare since playbook-on-drafts is now disabled, but safe).
  await supabase
    .from("tasks")
    .update({ target_kind: "event", target_ref: googleEventUid })
    .eq("target_kind", "draft")
    .eq("target_ref", draftId);

  // Hard-delete the draft — it's now superseded by the Google event.
  await supabase.from("draft_events").delete().eq("id", draftId);

  // Bust the ICS cache so the new event appears immediately on /events.
  updateTag("calendar");
  revalidatePath("/events");
  revalidatePath(`/event/${encodeURIComponent(draftId)}`);
  revalidatePath(`/event/${encodeURIComponent(googleEventUid)}`);

  return { ok: true, data: { googleEventId: googleEventUid } };
}

// ---------------------------------------------------------------------------
// Server action shim that redirects after publish — convenient from forms.
// ---------------------------------------------------------------------------

export async function publishAndRedirectAction(
  draftId: string,
): Promise<void> {
  const result = await publishDraftAction(draftId);
  if (!result.ok) {
    redirect(
      `/event/${encodeURIComponent(draftId)}?publish_error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`/event/${encodeURIComponent(result.data.googleEventId)}`);
}
