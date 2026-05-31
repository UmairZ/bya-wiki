"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Pencil,
  Ticket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEventWhen } from "@/lib/date-time";
import { parseDescription } from "@/lib/calendar/markers";
import type { CalendarEvent } from "@/lib/calendar/types";
import { deleteEventAction } from "./actions";

/** Extract Google's eventId from an ICS UID (`<eventId>@google.com`),
 *  ignoring any "::<instance-iso>" suffix we appended for recurring rows. */
function extractGoogleEventId(eventRowId: string): string | null {
  const base = eventRowId.split("::")[0];
  const at = base.indexOf("@");
  const id = at === -1 ? base : base.slice(0, at);
  return id || null;
}
import { EventDialog, type EditableEvent } from "./event-dialog";

export function EventRow({
  event,
  canEdit,
}: {
  event: CalendarEvent;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const start = new Date(event.starts_at);
  const parsed = parseDescription(event.description);
  const eventId = extractGoogleEventId(event.id);

  function handleDelete() {
    if (!eventId) {
      toast.error("Can't delete: missing Google event id.");
      return;
    }
    if (!window.confirm(`Delete "${event.title}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteEventAction(eventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Event deleted.");
    });
  }

  function openEdit() {
    if (!eventId) {
      toast.error("Can't edit: missing Google event id.");
      return;
    }
    setEditing(true);
  }

  const editable: EditableEvent | null = eventId
    ? {
        eventId,
        title: event.title,
        description: parsed.description,
        location: event.location ?? "",
        registration_url: parsed.registration_url ?? "",
        tags: parsed.tags,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        all_day: event.all_day,
      }
    : null;

  return (
    <>
      <article className="flex items-start gap-3 px-4 py-3">
        <div
          className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground"
          aria-hidden
        >
          <span className="text-[10px] font-semibold uppercase">
            {start.toLocaleString(undefined, { month: "short" })}
          </span>
          <span className="text-sm font-bold leading-none">
            {start.getDate()}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-sm font-medium">{event.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatEventWhen(event)}
          </p>
          {event.location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          {parsed.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1 pt-0.5">
              {parsed.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {parsed.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">
              {parsed.description}
            </p>
          )}
          {parsed.registration_url && (
            <a
              href={parsed.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-[var(--brand-hover)]"
            >
              <Ticket className="size-3.5" aria-hidden />
              Register
            </a>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {event.html_link && (
            <a
              href={event.html_link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open in Google Calendar"
              title="Open in Google Calendar"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Event actions"
                    disabled={pending}
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={openEdit}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </article>

      {canEdit && editable && (
        <EventDialog
          open={editing}
          onOpenChange={setEditing}
          event={editable}
        />
      )}
    </>
  );
}
