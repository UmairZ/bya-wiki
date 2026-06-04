"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  isoToDateOnlyInput,
  isoToLocalInput,
} from "@/lib/date-time";
import {
  createEventAction,
  updateEventAction,
  type EventActionState,
} from "./actions";
import {
  AUDIENCE_VALUES,
  GENDER_VALUES,
  type AudienceTag,
  type GenderTag,
} from "@/lib/supabase/types";

export type EditableEvent = {
  eventId: string;
  title: string;
  description: string;
  location: string;
  registration_url: string;
  tags: string[];
  audience: AudienceTag | null;
  gender: GenderTag | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
};

export function EventDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  event: EditableEvent | null;
}) {
  const isEdit = event !== null;
  const action = isEdit ? updateEventAction : createEventAction;

  const [state, formAction, pending] = useActionState<
    EventActionState,
    FormData
  >(action, undefined);

  const [allDay, setAllDay] = useState(event?.all_day ?? false);

  useEffect(() => {
    setAllDay(event?.all_day ?? false);
  }, [event]);

  useEffect(() => {
    if (state && "ok" in state && state.ok) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit event" : "New event"}
          </DialogTitle>
          <DialogDescription>
            Saves to your connected Google Calendar.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          {state && "error" in state && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {isEdit && (
            <input type="hidden" name="event_id" value={event.eventId} />
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              name="title"
              type="text"
              defaultValue={event?.title ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="ev-allday"
              type="checkbox"
              name="all_day"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            <Label htmlFor="ev-allday" className="cursor-pointer">
              All day
            </Label>
          </div>

          {allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ev-start-date">Starts</Label>
                <Input
                  id="ev-start-date"
                  name="starts_at_date"
                  type="date"
                  defaultValue={isoToDateOnlyInput(event?.starts_at)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ev-end-date">Ends (optional)</Label>
                <Input
                  id="ev-end-date"
                  name="ends_at_date"
                  type="date"
                  defaultValue={isoToDateOnlyInput(event?.ends_at)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ev-start">Starts</Label>
                <Input
                  id="ev-start"
                  name="starts_at"
                  type="datetime-local"
                  defaultValue={isoToLocalInput(event?.starts_at)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ev-end">Ends (optional)</Label>
                <Input
                  id="ev-end"
                  name="ends_at"
                  type="datetime-local"
                  defaultValue={isoToLocalInput(event?.ends_at)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-location">Location (optional)</Label>
            <Input
              id="ev-location"
              name="location"
              type="text"
              defaultValue={event?.location ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-reg">Registration URL (optional)</Label>
            <Input
              id="ev-reg"
              name="registration_url"
              type="url"
              placeholder="https://forms.gle/…"
              defaultValue={event?.registration_url ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              Shows as a Register button on the event.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-audience">Audience</Label>
              <select
                id="ev-audience"
                name="audience"
                defaultValue={event?.audience ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">—</option>
                {AUDIENCE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-gender">Gender</Label>
              <select
                id="ev-gender"
                name="gender"
                defaultValue={event?.gender ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">—</option>
                {GENDER_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-tags">Tags (optional)</Label>
            <Input
              id="ev-tags"
              name="tags"
              type="text"
              placeholder="youth, fundraiser, weekly"
              defaultValue={event?.tags.join(", ") ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Shows as chips.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-description">Description (optional)</Label>
            <textarea
              id="ev-description"
              name="description"
              rows={3}
              defaultValue={event?.description ?? ""}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
