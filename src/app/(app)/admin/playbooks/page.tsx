import Link from "next/link";
import { Archive, ArrowRight, ListChecks } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateTemplateButton } from "./create-template-button";

export const metadata = { title: "Playbooks" };

type TemplateRow = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  task_count: number;
};

async function loadTemplates(): Promise<{
  templates: TemplateRow[];
  missing: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const [templatesResp, tasksResp] = await Promise.all([
    supabase
      .from("playbook_templates")
      .select("id, name, description, archived")
      .order("archived", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("playbook_template_tasks").select("template_id"),
  ]);

  if (templatesResp.error) return { templates: [], missing: true };

  const counts = new Map<string, number>();
  for (const row of tasksResp.data ?? []) {
    counts.set(row.template_id, (counts.get(row.template_id) ?? 0) + 1);
  }

  return {
    templates: (templatesResp.data ?? []).map((t) => ({
      ...t,
      task_count: counts.get(t.id) ?? 0,
    })),
    missing: false,
  };
}

export default async function PlaybooksAdminPage() {
  await requireOwner();
  const { templates, missing } = await loadTemplates();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Playbooks</h1>
        {!missing && <CreateTemplateButton />}
      </header>

      {missing && (
        <Alert variant="destructive">
          <AlertDescription>
            Tables aren&apos;t set up yet. Run migration{" "}
            <code className="font-mono text-xs">
              0008_playbooks_and_workflows.sql
            </code>{" "}
            in Supabase.
          </AlertDescription>
        </Alert>
      )}

      {!missing && templates.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No playbooks yet. Create one to get started.
        </div>
      )}

      {templates.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/playbooks/${t.id}`}
                prefetch
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-tint/30 focus-visible:outline-none focus-visible:bg-brand-tint/30"
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
                  <ListChecks className="size-5" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {t.name}
                    </span>
                    {t.archived && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Archive className="size-3" aria-hidden />
                        Archived
                      </Badge>
                    )}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {t.description ||
                      `${t.task_count} task${t.task_count === 1 ? "" : "s"}`}
                  </span>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
