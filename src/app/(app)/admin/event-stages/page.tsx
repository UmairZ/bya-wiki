import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateStageButton } from "./create-stage-button";
import { StageRowEditor, type StageRow } from "./stage-row-editor";

export const metadata = { title: "Event stages" };

async function loadStages(): Promise<{
  stages: StageRow[];
  missing: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("event_stages")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return { stages: [], missing: true };
  return { stages: data ?? [], missing: false };
}

export default async function EventStagesAdminPage() {
  await requireOwner();
  const { stages, missing } = await loadStages();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Event stages
          </h1>
          <p className="text-sm text-muted-foreground">
            Org-wide columns shared by the{" "}
            <Link
              href="/events"
              className="text-primary underline-offset-4 hover:underline"
            >
              Events Kanban
            </Link>{" "}
            and every playbook. Rename here and the change reflects everywhere
            instantly.
          </p>
        </div>
        {!missing && <CreateStageButton />}
      </header>

      {missing && (
        <Alert variant="destructive">
          <AlertDescription>
            The <code className="font-mono text-xs">event_stages</code> table
            doesn&apos;t exist yet. Run migration{" "}
            <code className="font-mono text-xs">
              0007_event_stages.sql
            </code>{" "}
            in Supabase to create it.
          </AlertDescription>
        </Alert>
      )}

      {!missing && stages.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No stages yet. Add one to get started.
        </div>
      )}

      {stages.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {stages.map((stage, i) => (
            <li key={stage.id}>
              <StageRowEditor stage={stage} index={i} total={stages.length} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
