import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Plug, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import { getConnectionStatus } from "@/lib/calendar/google";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { DraftEventRow, EventStageRow } from "@/lib/supabase/types";
import { EventsKanban, type Stage } from "./events-kanban";
import { AllEventsSection } from "./all-events-section";
import {
  enrichDrafts,
  enrichEvents,
  splitForEventsPage,
} from "./workflow-state";

export const metadata = { title: "Events" };

async function loadStages(): Promise<Stage[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("event_stages")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return data ?? [];
}

async function loadAllTasks(): Promise<
  {
    target_kind: string;
    target_ref: string;
    event_stage_id: string;
    status: string;
    completed_at: string | null;
    due_at: string | null;
  }[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("target_kind, target_ref, event_stage_id, status, completed_at, due_at")
    .in("target_kind", ["event", "draft"]);
  if (error) return [];
  return data ?? [];
}

async function loadActiveDrafts(): Promise<DraftEventRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("draft_events")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DraftEventRow[];
}

export default async function EventsPage() {
  const [current, icsUrl, googleStatus, stages, allTasks, drafts] =
    await Promise.all([
      getCurrentUser(),
      getIcsUrl(),
      getConnectionStatus(),
      loadStages(),
      loadAllTasks(),
      loadActiveDrafts(),
    ]);
  const isOwner = current?.profile.role === "owner";
  const canWrite =
    Boolean(current) && googleStatus.connected && Boolean(googleStatus.calendarId);

  if (!icsUrl) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        </header>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">No calendar connected yet</p>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Set up the ICS feed (and ideally Google OAuth) in Integrations."
                : "Ask the owner to connect a Google Calendar in Integrations."}
            </p>
          </div>
          {isOwner && (
            <Button
              render={<Link href="/admin/integrations" />}
              nativeButton={false}
            >
              <Plug className="size-4" aria-hidden />
              Open Integrations
            </Button>
          )}
        </div>
      </div>
    );
  }

  let events: CalendarEvent[] = [];
  let fetchError: string | null = null;
  try {
    events = await getCalendarEvents({ icsUrl });
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  // Stage rows for enrichment carry created_at/updated_at fields the kanban
  // component doesn't need; coerce to the slim Stage type for components.
  const fullStages: EventStageRow[] = stages.map((s) => ({
    ...s,
    created_at: "",
    updated_at: "",
  }));

  const enriched = enrichEvents(events, allTasks, fullStages);
  const enrichedDrafts = enrichDrafts(drafts, allTasks);
  const { kanban } = splitForEventsPage(enriched);

  const setupSteps: { key: string; node: ReactNode }[] = [];
  if (isOwner && stages.length === 0) {
    setupSteps.push({
      key: "stages",
      node: (
        <>
          <span className="font-medium text-foreground">Event stages</span>{" "}
          aren&apos;t configured. Run migration{" "}
          <code className="font-mono text-xs">0007_event_stages.sql</code>{" "}
          or open{" "}
          <Link href="/admin/event-stages">/admin/event-stages</Link>.
        </>
      ),
    });
  }
  if (isOwner && current && !canWrite) {
    setupSteps.push({
      key: "google",
      node: (
        <>
          <span className="font-medium text-foreground">
            Google Calendar write access
          </span>{" "}
          isn&apos;t connected. Open{" "}
          <Link href="/admin/integrations">Integrations</Link> so the team
          can create and edit events from the wiki.
        </>
      ),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      </header>

      {setupSteps.length > 0 && (
        <Alert>
          <Settings aria-hidden />
          <AlertTitle>Finish setup</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 flex flex-col gap-1.5">
              {setupSteps.map((step) => (
                <li key={step.key} className="flex gap-2">
                  <span aria-hidden className="select-none">·</span>
                  <span>{step.node}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {fetchError && (
        <Alert variant="destructive">
          <AlertDescription>
            Couldn&apos;t load the calendar: {fetchError}
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Upcoming events" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming events
        </h2>
        <EventsKanban
          stages={stages}
          upcoming={kanban}
          drafts={enrichedDrafts}
        />
      </section>

      <AllEventsSection events={events} />
    </div>
  );
}
