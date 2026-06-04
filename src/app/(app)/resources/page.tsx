import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryIcon } from "@/components/category-icon";

export const metadata = { title: "Resources" };

type SpaceWithCount = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  item_count: number;
};

async function loadSpaces(): Promise<SpaceWithCount[]> {
  const supabase = await createSupabaseServerClient();

  const [categoriesResp, livePagesResp, liveFilesResp] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("pages").select("category_id").is("deleted_at", null),
    supabase.from("resources").select("category_id").is("deleted_at", null),
  ]);

  if (categoriesResp.error) throw categoriesResp.error;

  const counts = new Map<string, number>();
  for (const row of livePagesResp.data ?? []) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  for (const row of liveFilesResp.data ?? []) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return (categoriesResp.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    item_count: counts.get(c.id) ?? 0,
  }));
}

export default async function ResourcesPage() {
  const spaces = await loadSpaces();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
      </header>

      {spaces.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center text-sm text-muted-foreground">
          No spaces yet.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <li key={space.id}>
              <Link
                href={`/c/${space.slug}`}
                prefetch
                className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-brand-tint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
                  <CategoryIcon name={space.icon} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {space.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {space.item_count}{" "}
                    {space.item_count === 1 ? "item" : "items"}
                  </span>
                </span>
                <ChevronRight
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
