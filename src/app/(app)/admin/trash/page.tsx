import { Trash2 } from "lucide-react";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrashRow } from "./trash-row";
import { TrashFileRow, type DeletedResource } from "./trash-file-row";
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

type TrashRowItem =
  | { kind: "page"; deleted_at: string; data: DeletedPage }
  | { kind: "file"; deleted_at: string; data: DeletedResource };

async function loadDeleted(): Promise<TrashRowItem[]> {
  const supabase = await createSupabaseServerClient();

  const [pagesResp, resourcesResp] = await Promise.all([
    supabase
      .from("pages")
      .select("id, title, excerpt, deleted_at, updated_at, category_id")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("resources")
      .select("id, title, file_type, deleted_at, category_id")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);

  if (pagesResp.error) throw pagesResp.error;
  // Resources may not exist yet if migration 0005 hasn't run; swallow.

  const categoryIds = Array.from(
    new Set([
      ...(pagesResp.data ?? []).map((p) => p.category_id),
      ...(resourcesResp.data ?? []).map((r) => r.category_id),
    ]),
  );
  const { data: cats } =
    categoryIds.length > 0
      ? await supabase
          .from("categories")
          .select("id, name, slug, icon")
          .in("id", categoryIds)
      : { data: [] };
  const byId = new Map((cats ?? []).map((c) => [c.id, c]));

  const items: TrashRowItem[] = [
    ...(pagesResp.data ?? []).map<TrashRowItem>((p) => {
      const cat = byId.get(p.category_id);
      return {
        kind: "page",
        deleted_at: p.deleted_at as string,
        data: {
          id: p.id,
          title: p.title,
          excerpt: p.excerpt,
          deleted_at: p.deleted_at as string,
          updated_at: p.updated_at,
          category: cat
            ? { name: cat.name, slug: cat.slug, icon: cat.icon }
            : null,
        },
      };
    }),
    ...(resourcesResp.data ?? []).map<TrashRowItem>((r) => {
      const cat = byId.get(r.category_id);
      return {
        kind: "file",
        deleted_at: r.deleted_at as string,
        data: {
          id: r.id,
          title: r.title,
          file_type: r.file_type,
          deleted_at: r.deleted_at as string,
          category: cat ? { name: cat.name, slug: cat.slug } : null,
        },
      };
    }),
  ];

  items.sort(
    (a, b) =>
      new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime(),
  );

  return items;
}

export default async function TrashPage() {
  await requireOwner();
  const items = await loadDeleted();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Soft-deleted pages and files. Restore to bring them back; hard
            delete is permanent (and removes the bytes from storage).
          </p>
        </div>
        {items.length > 0 && <EmptyTrashButton count={items.length} />}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Trash2 className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Trash is empty</p>
            <p className="text-sm text-muted-foreground">
              Deleted pages and files show up here so you can restore them.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {items.map((item) =>
            item.kind === "page" ? (
              <li key={`page-${item.data.id}`}>
                <TrashRow page={item.data} />
              </li>
            ) : (
              <li key={`file-${item.data.id}`}>
                <TrashFileRow file={item.data} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
