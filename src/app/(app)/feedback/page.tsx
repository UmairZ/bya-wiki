import { Sparkles } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatFullDateString } from "@/lib/date-time";
import { FeedbackForm } from "./feedback-form";
import { FeedbackItemActions } from "./feedback-item";

export const metadata = { title: "Ideas" };

type FeedbackWithAuthor = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  author_name: string | null;
};

async function loadFeedback(): Promise<FeedbackWithAuthor[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_feedback")
    .select("id, body, created_at, created_by")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  // One follow-up query to resolve display names (RLS lets every
  // signed-in user read profiles).
  const ids = Array.from(
    new Set(data.map((r) => r.created_by).filter((id): id is string => !!id)),
  );
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profs ?? []) {
      nameById.set(p.id, p.display_name);
    }
  }

  return data.map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    created_by: r.created_by,
    author_name: r.created_by ? (nameById.get(r.created_by) ?? null) : null,
  }));
}

export default async function FeedbackPage() {
  const [current, items] = await Promise.all([
    requireCurrentUser(),
    loadFeedback(),
  ]);
  const isOwner = current.profile.role === "owner";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="size-5 text-primary" aria-hidden />
          Ideas
        </h1>
        <p className="text-sm text-muted-foreground">
          Got an idea to improve this app? Drop it here.
        </p>
      </header>

      <FeedbackForm />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
          No ideas yet — be the first.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const canDelete =
              isOwner || item.created_by === current.profile.id;
            return (
              <li
                key={item.id}
                className="group flex items-start gap-2 rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="whitespace-pre-line break-words text-sm text-foreground/90">
                    {item.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.author_name ?? "Someone"} ·{" "}
                    {formatFullDateString(item.created_at)}
                  </p>
                </div>
                <FeedbackItemActions id={item.id} canDelete={canDelete} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
