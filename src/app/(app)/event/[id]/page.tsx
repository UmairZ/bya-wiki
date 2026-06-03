import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import { parseDescription } from "@/lib/calendar/markers";
import { getConnectionStatus } from "@/lib/calendar/google";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatEventWhen } from "@/lib/date-time";
import { encodeEventHref } from "@/lib/calendar/event-href";
import type {
  CalendarEvent,
} from "@/lib/calendar/types";
import type {
  EventStageRow,
  TaskRow,
  WorkflowRow,
} from "@/lib/supabase/types";
import { EventDetailActions } from "./event-detail-actions";
import { TaskKanban, type MemberSummary } from "./task-kanban";
import {
  ApplyPlaybookPicker,
  type TemplateOption,
} from "./apply-playbook-picker";
import { WorkflowHeader } from "./workflow-header";

async function loadStages(): Promise<EventStageRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("event_stages")
    .select("id, name, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return data ?? [];
}

async function loadWorkflowAndTasks(eventId: string): Promise<{
  workflow: WorkflowRow | null;
  tasks: TaskRow[];
}> {
  const supabase = await createSupabaseServerClient();
  const { data: workflow } = await supabase
    .from("workflows")
    .select(
      "id, template_id, name, target_kind, target_ref, starts_at, archived, created_by, created_at, updated_at",
    )
    .eq("target_kind", "event")
    .eq("target_ref", eventId)
    .eq("archived", false)
    .maybeSingle();

  if (!workflow) return { workflow: null, tasks: [] };

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, workflow_id, event_stage_id, title, description, sort_order, status, assigned_to, due_at, completed_at, completed_by, created_at, updated_at",
    )
    .eq("workflow_id", workflow.id)
    .order("sort_order", { ascending: true });

  return { workflow, tasks: tasks ?? [] };
}

async function loadActiveMembers(): Promise<MemberSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("active", true)
    .order("display_name", { ascending: true });
  return (data ?? []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
  }));
}

async function loadActiveTemplates(): Promise<TemplateOption[]> {
  const supabase = await createSupabaseServerClient();
  const [templatesResp, tasksResp] = await Promise.all([
    supabase
      .from("playbook_templates")
      .select("id, name, description, archived")
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase.from("playbook_template_tasks").select("template_id"),
  ]);
  if (templatesResp.error) return [];

  const counts = new Map<string, number>();
  for (const row of tasksResp.data ?? []) {
    counts.set(row.template_id, (counts.get(row.template_id) ?? 0) + 1);
  }
  return (templatesResp.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    task_count: counts.get(t.id) ?? 0,
  }));
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const eventId = decodeURIComponent(rawId);

  const [
    icsUrl,
    googleStatus,
    current,
    stages,
    workflowState,
    templates,
    members,
  ] = await Promise.all([
    getIcsUrl(),
    getConnectionStatus(),
    getCurrentUser(),
    loadStages(),
    loadWorkflowAndTasks(eventId),
    loadActiveTemplates(),
    loadActiveMembers(),
  ]);

  if (!icsUrl) notFound();

  let events: CalendarEvent[];
  try {
    events = await getCalendarEvents({ icsUrl });
  } catch {
    notFound();
  }

  // Match the URL's event id against the ICS feed.
  //
  // Recurring events expose per-instance ids of the form `<uid>::<iso>`. When
  // the master is edited via Google API, the next ICS feed may shift instance
  // start times slightly (timezone, DST, second-precision rounding) — leaving
  // the URL pointing at a stale instance ISO. Fall back to matching by the
  // base UID (everything before `::`) and redirect to the canonical URL of
  // the matched instance so the browser address bar stays accurate.
  let event = events.find((e) => e.id === eventId);
  if (!event) {
    const baseUidFromUrl = eventId.split("::")[0];
    const candidates = events.filter(
      (e) => e.id.split("::")[0] === baseUidFromUrl,
    );
    if (candidates.length > 0) {
      // Prefer the instance closest in time to whatever was in the URL.
      const urlIsoPart = eventId.split("::")[1];
      const urlMs = urlIsoPart ? new Date(urlIsoPart).getTime() : NaN;
      const best = Number.isFinite(urlMs)
        ? candidates.reduce((acc, c) =>
            Math.abs(new Date(c.starts_at).getTime() - urlMs) <
            Math.abs(new Date(acc.starts_at).getTime() - urlMs)
              ? c
              : acc,
          )
        : candidates[0];
      redirect(encodeEventHref(best.id));
    }
    notFound();
  }

  const parsed = parseDescription(event.description);
  const canWrite =
    Boolean(current) && googleStatus.connected && Boolean(googleStatus.calendarId);

  const baseUid = event.id.split("::")[0];
  const at = baseUid.indexOf("@");
  const googleEventId = at === -1 ? baseUid : baseUid.slice(0, at);

  const { workflow, tasks } = workflowState;
  const allTasksDone =
    workflow !== null &&
    tasks.length > 0 &&
    tasks.every((t) => t.status === "done" || t.status === "skipped");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link
          href="/events"
          prefetch
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Events
        </Link>
        <span className="text-muted-foreground/60">›</span>
        <span className="truncate text-foreground">{event.title}</span>
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {formatEventWhen(event)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden />
                  {event.location}
                </span>
              )}
            </div>
            {parsed.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {parsed.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <EventDetailActions
            canWrite={canWrite}
            googleEventId={googleEventId}
            event={{
              eventId: googleEventId,
              title: event.title,
              description: parsed.description,
              location: event.location ?? "",
              registration_url: parsed.registration_url ?? "",
              tags: parsed.tags,
              starts_at: event.starts_at,
              ends_at: event.ends_at,
              all_day: event.all_day,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {parsed.registration_url && (
            <a
              href={parsed.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--brand-hover)]"
            >
              <Ticket className="size-4" aria-hidden />
              Register
            </a>
          )}
          {event.html_link && (
            <a
              href={event.html_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-4" aria-hidden />
              Open in Google Calendar
            </a>
          )}
        </div>

        {parsed.description && (
          <p className="whitespace-pre-line text-sm text-foreground/90">
            {parsed.description}
          </p>
        )}
      </header>

      <section aria-label="Tasks" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </h2>
          {workflow && (
            <ApplyPlaybookPicker
              templates={templates}
              eventId={event.id}
              eventStartsAt={event.starts_at}
              eventTitle={event.title}
              trigger="button"
            />
          )}
        </div>

        {workflow ? (
          <>
            <WorkflowHeader
              workflow={workflow}
              eventId={event.id}
              taskCount={tasks.length}
              doneCount={
                tasks.filter(
                  (t) => t.status === "done" || t.status === "skipped",
                ).length
              }
              allDone={allTasksDone}
            />
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
                Workflow has no tasks yet — add one to each stage below.
              </div>
            ) : null}
            <TaskKanban
              workflowId={workflow.id}
              eventId={event.id}
              tasks={tasks}
              stages={stages}
              members={members}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/40 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">No playbook applied yet</p>
              <p className="text-xs text-muted-foreground">
                Pick a playbook to load a starter checklist for this event.
              </p>
            </div>
            <ApplyPlaybookPicker
              templates={templates}
              eventId={event.id}
              eventStartsAt={event.starts_at}
              eventTitle={event.title}
              trigger="empty-state"
            />
          </div>
        )}
      </section>

      <section aria-label="Attached files" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Attached files
          </h2>
          <span className="text-xs text-muted-foreground/70">
            Attachments ship in Phase 7d
          </span>
        </div>
        <div className="rounded-lg border border-dashed bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
          No files attached.
        </div>
      </section>
    </div>
  );
}
