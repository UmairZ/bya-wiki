"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createEvent,
  getConnectionStatus,
} from "@/lib/calendar/google";
import { updateTag } from "next/cache";
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

  // Strip undefined keys so we only update what was explicitly set.
  const clean: DraftEventUpdate = {};
  for (const key of Object.keys(fields) as UpdatableField[]) {
    if (fields[key] !== undefined) {
      (clean as Record<string, unknown>)[key] = fields[key];
    }
  }
  if (Object.keys(clean).length === 0) return { ok: true, data: null };

  // Sniff if starts_at is changing — we'll backfill task due_at after.
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

/** When a draft's starts_at gets set or changed, recompute due_at across all
 *  tasks in its attached workflow using their default_offset_days. Tasks with
 *  no default_offset_days are left alone (user-customized). */
async function backfillTaskDueDates(
  draftId: string,
  newStartsAt: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { data: workflow } = await supabase
    .from("workflows")
    .select("id")
    .eq("target_kind", "draft")
    .eq("target_ref", draftId)
    .eq("archived", false)
    .maybeSingle();
  if (!workflow) return;

  if (newStartsAt === null) {
    // Date cleared — null out due_at for all tasks in the workflow.
    await supabase
      .from("tasks")
      .update({ due_at: null })
      .eq("workflow_id", workflow.id);
    return;
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, default_offset_days")
    .eq("workflow_id", workflow.id)
    .not("default_offset_days", "is", null);
  if (!tasks || tasks.length === 0) return;

  const startsAtMs = new Date(newStartsAt).getTime();

  for (const t of tasks) {
    if (t.default_offset_days === null) continue;
    const dueMs = startsAtMs + t.default_offset_days * 24 * 60 * 60 * 1000;
    const due = new Date(dueMs).toISOString();
    await supabase.from("tasks").update({ due_at: due }).eq("id", t.id);
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

  // Archive the attached workflow first (don't orphan).
  await supabase
    .from("workflows")
    .update({ archived: true })
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

  // Google's event UID for ICS feed is `<id>@google.com`. We store that in
  // workflows.target_ref so the workflow page lookup matches.
  const googleEventUid = `${created.id}@google.com`;

  // Swap any workflow attached to the draft over to the new Google event.
  await supabase
    .from("workflows")
    .update({ target_kind: "event", target_ref: googleEventUid })
    .eq("target_kind", "draft")
    .eq("target_ref", draftId);

  // Delete the draft — it's now superseded by the Google event.
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
    // Encode the error in the URL for the client to surface.
    redirect(
      `/event/${encodeURIComponent(draftId)}?publish_error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`/event/${encodeURIComponent(result.data.googleEventId)}`);
}
