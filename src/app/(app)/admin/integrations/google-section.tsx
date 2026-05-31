import { CheckCircle2, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getConnectionStatus,
  listCalendars,
  type GoogleCalendarListItem,
} from "@/lib/calendar/google";
import { GoogleCalendarPicker } from "./google-calendar-picker";
import { DisconnectButton } from "./disconnect-button";

export async function GoogleSection() {
  const status = await getConnectionStatus();

  if (!status.connected) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
            <Plug className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-base font-semibold">
              Google Calendar (write access)
            </h2>
            <p className="text-sm text-muted-foreground">
              Connect the org Google account so members can create + edit
              events from the wiki without ever signing into Google
              themselves.
            </p>
          </div>
        </div>
        <div>
          <Button
            render={<a href="/api/auth/google/start" />}
            nativeButton={false}
          >
            <Plug className="size-4" aria-hidden />
            Connect Google Calendar
          </Button>
        </div>
      </section>
    );
  }

  let calendars: GoogleCalendarListItem[] = [];
  let listError: string | null = null;
  try {
    calendars = await listCalendars();
  } catch (err) {
    listError = err instanceof Error ? err.message : String(err);
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-base font-semibold">Google Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Connected as{" "}
            <span className="font-medium text-foreground">
              {status.connectedEmail ?? "(unknown account)"}
            </span>
            .
          </p>
        </div>
        <DisconnectButton />
      </div>

      {listError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Couldn't load calendars: {listError}
        </p>
      ) : (
        <GoogleCalendarPicker
          calendars={calendars}
          selectedId={status.calendarId}
        />
      )}
    </section>
  );
}
