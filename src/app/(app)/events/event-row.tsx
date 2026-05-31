import { ExternalLink, MapPin } from "lucide-react";
import { formatEventWhen } from "@/lib/date-time";
import type { CalendarEvent } from "@/lib/calendar/types";

export function EventRow({ event }: { event: CalendarEvent }) {
  const start = new Date(event.starts_at);
  return (
    <article className="flex items-start gap-3 px-4 py-3">
      <div
        className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground"
        aria-hidden
      >
        <span className="text-[10px] font-semibold uppercase">
          {start.toLocaleString(undefined, { month: "short" })}
        </span>
        <span className="text-sm font-bold leading-none">{start.getDate()}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="truncate text-sm font-medium">{event.title}</h3>
        <p className="text-xs text-muted-foreground">{formatEventWhen(event)}</p>
        {event.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" aria-hidden />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        {event.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">
            {event.description}
          </p>
        )}
      </div>

      {event.html_link && (
        <a
          href={event.html_link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Open in Google Calendar"
          title="Open in Google Calendar"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      )}
    </article>
  );
}
