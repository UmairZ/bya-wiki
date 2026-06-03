import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encodeEventHref } from "@/lib/calendar/event-href";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tasks" };

type MyTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "skipped";
  due_at: string | null;
  stage_name: string;
  workflow_name: string;
  workflow_id: string;
  target_ref: string;
};

type Group = {
  key: "overdue" | "today" | "week" | "later" | "anytime";
  label: string;
  tone?: "destructive";
  tasks: MyTask[];
};

function startOfLocalDay(d = new Date()): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function bucket(task: MyTask, now: number): Group["key"] {
  if (!task.due_at) return "anytime";
  const due = new Date(task.due_at).getTime();
  const today0 = startOfLocalDay(new Date(now));
  const tomorrow0 = today0 + 24 * 60 * 60 * 1000;
  const weekEnd = today0 + 7 * 24 * 60 * 60 * 1000;
  if (due < today0) return "overdue";
  if (due < tomorrow0) return "today";
  if (due < weekEnd) return "week";
  return "later";
}

async function loadMyTasks(userId: string): Promise<MyTask[]> {
  const supabase = await createSupabaseServerClient();

  const { data: tasks, error: tErr } = await supabase
    .from("tasks")
    .select("id, title, status, due_at, event_stage_id, workflow_id")
    .eq("assigned_to", userId)
    .in("status", ["todo", "in_progress"])
    .order("due_at", { ascending: true, nullsFirst: false });
  if (tErr || !tasks || tasks.length === 0) return [];

  const workflowIds = Array.from(new Set(tasks.map((t) => t.workflow_id)));
  const stageIds = Array.from(new Set(tasks.map((t) => t.event_stage_id)));

  const [workflowsResp, stagesResp] = await Promise.all([
    supabase
      .from("workflows")
      .select("id, name, target_ref, archived")
      .in("id", workflowIds),
    supabase.from("event_stages").select("id, name").in("id", stageIds),
  ]);

  const workflowsById = new Map(
    (workflowsResp.data ?? [])
      .filter((w) => !w.archived)
      .map((w) => [w.id, w]),
  );
  const stageById = new Map(
    (stagesResp.data ?? []).map((s) => [s.id, s]),
  );

  return tasks
    .map((t) => {
      const w = workflowsById.get(t.workflow_id);
      if (!w) return null;
      const stage = stageById.get(t.event_stage_id);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        due_at: t.due_at,
        stage_name: stage?.name ?? "—",
        workflow_name: w.name,
        workflow_id: w.id,
        target_ref: w.target_ref,
      } as MyTask;
    })
    .filter((t): t is MyTask => t !== null);
}

export default async function MyTasksPage() {
  const { userId, profile } = await requireCurrentUser();
  const myTasks = await loadMyTasks(userId);

  const now = Date.now();
  const groupsBy: Record<Group["key"], MyTask[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    anytime: [],
  };
  for (const t of myTasks) {
    groupsBy[bucket(t, now)].push(t);
  }

  const groups: Group[] = [
    { key: "overdue", label: "Overdue", tone: "destructive", tasks: groupsBy.overdue },
    { key: "today", label: "Today", tasks: groupsBy.today },
    { key: "week", label: "This week", tasks: groupsBy.week },
    { key: "later", label: "Later", tasks: groupsBy.later },
    { key: "anytime", label: "Anytime (no due date)", tasks: groupsBy.anytime },
  ];

  const totalOpen = myTasks.length;
  const firstName = profile.display_name.split(/\s+/)[0] || profile.display_name;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">My tasks</h1>
        <p className="text-sm text-muted-foreground">
          {totalOpen === 0 ? (
            <>You&apos;re all clear, {firstName}.</>
          ) : (
            <>
              {totalOpen} open task{totalOpen === 1 ? "" : "s"} assigned to you.
            </>
          )}
        </p>
      </header>

      {totalOpen === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/40 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
            <CheckCircle2 className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Inbox zero.</p>
            <p className="text-sm text-muted-foreground">
              When someone assigns a task to you, it&apos;ll show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups
            .filter((g) => g.tasks.length > 0)
            .map((g) => (
              <section
                key={g.key}
                aria-label={g.label}
                className="flex flex-col gap-2"
              >
                <div className="flex items-baseline gap-2">
                  <h2
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      g.tone === "destructive"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {g.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {g.tasks.length}
                  </span>
                </div>
                <ul className="flex flex-col divide-y rounded-lg border bg-card">
                  {g.tasks.map((t) => (
                    <li key={t.id}>
                      <TaskRow task={t} now={now} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, now }: { task: MyTask; now: number }) {
  const due = task.due_at ? new Date(task.due_at) : null;
  const isOverdue = due && due.getTime() < startOfLocalDay(new Date(now));
  const dueLabel = due
    ? due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : null;

  return (
    <Link
      href={encodeEventHref(task.target_ref)}
      prefetch
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:bg-brand-tint/30"
    >
      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40">
        <Inbox className="size-3 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-sm font-medium">{task.title}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {task.workflow_name}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {task.stage_name}
        </span>
        {dueLabel && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              isOverdue
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-foreground/80",
            )}
          >
            {isOverdue ? (
              <AlertCircle className="size-3" aria-hidden />
            ) : (
              <CalendarClock className="size-3" aria-hidden />
            )}
            {dueLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
