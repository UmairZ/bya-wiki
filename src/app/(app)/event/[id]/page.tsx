import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink, Link as LinkIcon } from "lucide-react";
import { MetadataGrid, MetadataRow } from "./metadata-block";
import { CopyEventButton } from "./copy-event-button";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import { parseDescription } from "@/lib/calendar/markers";
import { getConnectionStatus } from "@/lib/calendar/google";
import { getCurrentUser } from "@/lib/auth/current-user";
import { encodeEventHref } from "@/lib/calendar/event-href";
import type {
  CalendarEvent,
} from "@/lib/calendar/types";
import type {
  DraftEventRow,
  EventStageRow,
  TaskRow,
} from "@/lib/supabase/types";
import { EventDetailActions } from "./event-detail-actions";
import { EventFlyerEditor } from "./event-flyer-editor";
import { TaskChecklist } from "./task-checklist";
import { TaskSectionHeader } from "./task-section-header";
import { ClearTasksMenu } from "./clear-tasks-menu";
import {
  ApplyPlaybookPicker,
  type TemplateOption,
} from "./apply-playbook-picker";
import {
  PublishedDescriptionEditor,
  PublishedFieldsEditor,
  PublishedTitleEditor,
} from "./published-fields-editor";
import { DraftView } from "./draft-view";
import type { MemberSummary } from "./task-card";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function loadDraft(draftId: string): Promise<DraftEventRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("draft_events")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();
  return (data as DraftEventRow | null) ?? null;
}

async function loadTasksFor(
  targetRef: string,
  targetKind: "event" | "draft",
): Promise<TaskRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("target_kind", targetKind)
    .eq("target_ref", targetRef)
    .order("sort_order", { ascending: true });
  return (data ?? []) as TaskRow[];
}

type FlyerInfo = {
  path: string;
  registrationClosed: boolean;
  hiddenFromPublic: boolean;
} | null;

async function loadEventFlyerInfo(eventRef: string): Promise<FlyerInfo> {
  const supabase = await createSupabaseServerClient();
  const uid = eventRef.split("::")[0];
  const { data } = await supabase
    .from("event_flyers")
    .select("flyer_storage_path, registration_closed, hidden_from_public")
    .eq("google_event_uid", uid)
    .maybeSingle();
  if (!data) return null;
  return {
    path: data.flyer_storage_path,
    registrationClosed: data.registration_closed,
    hiddenFromPublic: data.hidden_from_public,
  };
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

async function loadTemplateNames(
  templateIds: string[],
): Promise<Map<string, string>> {
  if (templateIds.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("playbook_templates")
    .select("id, name")
    .in("id", templateIds);
  return new Map((data ?? []).map((t) => [t.id, t.name]));
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const eventId = decodeURIComponent(rawId);

  // 1) UUID → try draft. Load tasks alongside the rest rather than after the
  // draft resolves — a non-draft UUID (rare) just does one extra empty query.
  if (UUID_RE.test(eventId)) {
    const [draft, stages, members, tasks] = await Promise.all([
      loadDraft(eventId),
      loadStages(),
      loadActiveMembers(),
      loadTasksFor(eventId, "draft"),
    ]);
    if (draft) {
      return (
        <DraftView
          draft={draft}
          tasks={tasks}
          stages={stages}
          members={members}
        />
      );
    }
  }

  // 2) Published event flow.
  const [
    icsUrl,
    googleStatus,
    current,
    stages,
    tasks,
    templates,
    members,
    flyerInfo,
  ] = await Promise.all([
    getIcsUrl(),
    getConnectionStatus(),
    getCurrentUser(),
    loadStages(),
    loadTasksFor(eventId, "event"),
    loadActiveTemplates(),
    loadActiveMembers(),
    loadEventFlyerInfo(eventId),
  ]);

  if (!icsUrl) notFound();

  let events: CalendarEvent[];
  try {
    events = await getCalendarEvents({ icsUrl });
  } catch {
    notFound();
  }

  const event = events.find((e) => e.id === eventId);
  if (!event) {
    const baseUidFromUrl = eventId.split("::")[0];
    const candidates = events.filter(
      (e) => e.id.split("::")[0] === baseUidFromUrl,
    );
    if (candidates.length > 0) {
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

  const doneCount = tasks.filter(
    (t) => t.status === "done" || t.status === "skipped",
  ).length;
  const appliedTemplateIds = Array.from(
    new Set(
      tasks
        .map((t) => t.source_template_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const templateNamesById = await loadTemplateNames(appliedTemplateIds);
  const appliedTemplateNames = appliedTemplateIds
    .map((id) => templateNamesById.get(id))
    .filter((n): n is string => Boolean(n));

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
            {canWrite ? (
              <PublishedTitleEditor event={event} />
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight">
                {event.title}
              </h1>
            )}
          </div>
          <EventDetailActions
            canWrite={canWrite}
            googleEventId={googleEventId}
            eventTitle={event.title}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <EventFlyerEditor
            eventRef={event.id}
            flyerStoragePath={flyerInfo?.path ?? null}
            hasRegistrationUrl={Boolean(parsed.registration_url)}
            registrationClosed={flyerInfo?.registrationClosed ?? false}
            hiddenFromPublic={flyerInfo?.hiddenFromPublic ?? false}
          />

          <div className="flex flex-col gap-4">
            {canWrite ? (
              <PublishedFieldsEditor event={event} parsed={parsed} />
            ) : (
              <div className="relative rounded-lg border bg-card p-3">
                <CopyEventButton
                  event={{
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
                  className="absolute right-2 top-2 z-10"
                />
                <div className="pt-7 sm:pt-0">
                  <MetadataGrid
                    values={{
                      starts_at: event.starts_at,
                      ends_at: event.ends_at,
                      all_day: event.all_day,
                      location: event.location,
                      audience: parsed.audience,
                      gender: parsed.gender,
                      free_tags: parsed.tags,
                    }}
                  />
                  {parsed.registration_url && (
                    <MetadataRow
                      Icon={LinkIcon}
                      label="Register"
                      value={parsed.registration_url.replace(/^https?:\/\//, "")}
                    />
                  )}
                </div>
              </div>
            )}

            {event.html_link && (
              <div>
                <a
                  href={event.html_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ExternalLink aria-hidden />
                  Open in Google Calendar
                </a>
              </div>
            )}

            {canWrite ? (
              <PublishedDescriptionEditor event={event} parsed={parsed} />
            ) : parsed.description ? (
              <p className="whitespace-pre-line text-sm text-foreground/90">
                {parsed.description}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section aria-label="Tasks" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </h2>
          <div className="flex items-center gap-1">
            <ApplyPlaybookPicker
              templates={templates}
              eventId={event.id}
              eventStartsAt={event.starts_at}
              eventTitle={event.title}
              trigger="button"
            />
            <ClearTasksMenu
              targetKind="event"
              targetRef={event.id}
              taskCount={tasks.length}
            />
          </div>
        </div>

        <TaskSectionHeader
          taskCount={tasks.length}
          doneCount={doneCount}
          appliedTemplateNames={appliedTemplateNames}
        />

        <TaskChecklist
          targetKind="event"
          targetRef={event.id}
          tasks={tasks}
          stages={stages}
          members={members}
        />
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
