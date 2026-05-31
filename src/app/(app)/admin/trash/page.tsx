import { Trash2 } from "lucide-react";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryIcon } from "@/components/category-icon";
import { formatRelative } from "@/lib/format-date";
import { TrashRow } from "./trash-row";
import { EmptyTrashButton } from "./empty-trash-button";

export const metadata = { title: "Trash" };

export type DeletedPage = {
  id: string;
  title: string;
  excerpt: string;
  deleted_at: string;
  updated_at: string;
  category: { name: string; slug: string; icon: string | null } | null;
};

async function loadDeleted(): Promise<DeletedPage[]> {
  const supabase = await createSupabaseServerClient();
  const { data: pages, error } = await supabase
    .from("pages")
    .select(
      "id, title, excerpt, deleted_at, updated_at, category_id",
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;

  if (!pages || pages.length === 0) return [];

  const categoryIds = Array.from(new Set(pages.map((p) => p.category_id)));
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .in("id", categoryIds);
  const byId = new Map((cats ?? []).map((c) => [c.id, c]));

  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    deleted_at: p.deleted_at as string,
    updated_at: p.updated_at,
    category: byId.get(p.category_id)
      ? {
          name: byId.get(p.category_id)!.name,
          slug: byId.get(p.category_id)!.slug,
          icon: byId.get(p.category_id)!.icon,
        }
      : null,
  }));
}

export default async function TrashPage() {
  await requireOwner();
  const pages = await loadDeleted();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Soft-deleted pages. Restore to bring them back; hard delete is
            permanent.
          </p>
        </div>
        {pages.length > 0 && <EmptyTrashButton count={pages.length} />}
      </header>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Trash2 className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Trash is empty</p>
            <p className="text-sm text-muted-foreground">
              Deleted pages show up here so you can restore them.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {pages.map((page) => (
            <li key={page.id}>
              <TrashRow page={page} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
