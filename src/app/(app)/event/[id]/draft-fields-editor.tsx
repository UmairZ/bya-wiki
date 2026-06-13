"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { DraftEventRow, DraftEventUpdate } from "@/lib/supabase/types";
import { updateDraftAction } from "@/app/(app)/drafts/actions";
import {
  EventFieldsGrid,
  InlineDescriptionEditor,
  type FieldPatch,
  type FieldValues,
} from "./event-field-editors";

export function DraftFieldsEditor({ draft }: { draft: DraftEventRow }) {
  const [pending, startTransition] = useTransition();

  function save(patch: FieldPatch, onSuccess?: () => void) {
    startTransition(async () => {
      // Normalized `tags` maps to the draft column `free_tags`.
      const { tags, ...rest } = patch;
      const update: DraftEventUpdate = { ...rest };
      if (tags !== undefined) update.free_tags = tags;
      const r = await updateDraftAction(draft.id, update);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess?.();
    });
  }

  const values: FieldValues = {
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    all_day: draft.all_day,
    location: draft.location,
    audience: draft.audience,
    gender: draft.gender,
    registration_url: draft.registration_url,
    tags: draft.free_tags,
  };

  return (
    <div className="flex flex-col gap-3">
      <EventFieldsGrid
        values={values}
        save={save}
        pending={pending}
        idPrefix={`draft-${draft.id}`}
        required
        allowClearDate
        copyData={{
          title: draft.title,
          starts_at: draft.starts_at,
          ends_at: draft.ends_at,
          all_day: draft.all_day,
          location: draft.location,
          audience: draft.audience,
          gender: draft.gender,
          free_tags: draft.free_tags,
          registration_url: draft.registration_url,
          description: draft.description,
        }}
      />

      <InlineDescriptionEditor
        value={draft.description ?? ""}
        save={save}
        pending={pending}
      />
    </div>
  );
}
