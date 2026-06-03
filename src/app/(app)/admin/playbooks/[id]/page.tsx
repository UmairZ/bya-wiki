import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  EventStageRow,
  PlaybookTemplateRow,
  PlaybookTemplateTaskRow,
} from "@/lib/supabase/types";
import { TemplateEditor } from "./template-editor";

export const metadata = { title: "Edit playbook" };

async function load(templateId: string): Promise<{
  template: PlaybookTemplateRow;
  tasks: PlaybookTemplateTaskRow[];
  stages: EventStageRow[];
} | null> {
  const supabase = await createSupabaseServerClient();
  const [templateResp, tasksResp, stagesResp] = await Promise.all([
    supabase
      .from("playbook_templates")
      .select(
        "id, name, description, archived, created_by, created_at, updated_at",
      )
      .eq("id", templateId)
      .single(),
    supabase
      .from("playbook_template_tasks")
      .select(
        "id, template_id, event_stage_id, title, description, sort_order, default_offset_days, default_assignee_role, created_at, updated_at",
      )
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_stages")
      .select("id, name, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true }),
  ]);

  if (templateResp.error || !templateResp.data) return null;
  return {
    template: templateResp.data,
    tasks: tasksResp.data ?? [],
    stages: stagesResp.data ?? [],
  };
}

export default async function PlaybookEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwner();
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link
          href="/admin/playbooks"
          prefetch
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Playbooks
        </Link>
        <span className="text-muted-foreground/60">›</span>
        <span className="truncate text-foreground">{data.template.name}</span>
      </nav>

      <TemplateEditor
        template={data.template}
        tasks={data.tasks}
        stages={data.stages}
      />
    </div>
  );
}
