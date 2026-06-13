"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { ParsedDescription } from "@/lib/calendar/markers";
import { updateEventFieldAction, type EventFieldPatch } from "./actions";
import {
  EventFieldsGrid,
  InlineDescriptionEditor,
  type FieldPatch,
  type FieldValues,
} from "./event-field-editors";

export function PublishedFieldsEditor({
  event,
  parsed,
}: {
  event: CalendarEvent;
  parsed: ParsedDescription;
}) {
  const [pending, startTransition] = useTransition();

  function save(patch: FieldPatch, onSuccess?: () => void) {
    startTransition(async () => {
      // A published event always has a date; the date editor never clears it,
      // so a null starts_at is dropped rather than sent to Google.
      const eventPatch: EventFieldPatch = {};
      if (patch.starts_at != null) eventPatch.starts_at = patch.starts_at;
      if (patch.ends_at !== undefined) eventPatch.ends_at = patch.ends_at;
      if (patch.all_day !== undefined) eventPatch.all_day = patch.all_day;
      if (patch.location !== undefined) eventPatch.location = patch.location;
      if (patch.audience !== undefined) eventPatch.audience = patch.audience;
      if (patch.gender !== undefined) eventPatch.gender = patch.gender;
      if (patch.registration_url !== undefined)
        eventPatch.registration_url = patch.registration_url;
      if (patch.tags !== undefined) eventPatch.tags = patch.tags;
      if (patch.description !== undefined)
        eventPatch.description = patch.description;
      const r = await updateEventFieldAction(event.id, eventPatch);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess?.();
    });
  }

  const values: FieldValues = {
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    all_day: event.all_day,
    location: event.location,
    audience: parsed.audience,
    gender: parsed.gender,
    registration_url: parsed.registration_url,
    tags: parsed.tags,
  };

  return (
    <div className="flex flex-col gap-3">
      <EventFieldsGrid
        values={values}
        save={save}
        pending={pending}
        idPrefix={`event-${event.id}`}
        copyData={{
          title: event.title,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          all_day: event.all_day,
          location: event.location,
          audience: parsed.audience,
          gender: parsed.gender,
          free_tags: parsed.tags,
          registration_url: parsed.registration_url,
          description: parsed.description,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function PublishedTitleEditor({ event }: { event: CalendarEvent }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [pending, startTransition] = useTransition();

  function commit() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === event.title) {
      setTitle(event.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await updateEventFieldAction(event.id, { title: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setTitle(event.title);
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setTitle(event.title);
            setEditing(false);
          }
        }}
        autoFocus
        disabled={pending}
        className="h-auto border-0 px-1 py-1 text-2xl font-semibold shadow-none focus-visible:bg-muted/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-text rounded-md px-1 py-1 text-left text-2xl font-semibold tracking-tight transition-colors hover:bg-muted/40",
        pending && "opacity-60",
      )}
    >
      {event.title}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function PublishedDescriptionEditor({
  event,
  parsed,
}: {
  event: CalendarEvent;
  parsed: ParsedDescription;
}) {
  const [pending, startTransition] = useTransition();

  function save(patch: FieldPatch, onSuccess?: () => void) {
    startTransition(async () => {
      const eventPatch: EventFieldPatch = {};
      if (patch.description !== undefined)
        eventPatch.description = patch.description;
      const r = await updateEventFieldAction(event.id, eventPatch);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess?.();
    });
  }

  return (
    <InlineDescriptionEditor
      value={parsed.description}
      save={save}
      pending={pending}
    />
  );
}
