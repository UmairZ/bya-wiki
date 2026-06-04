import Link from "next/link";
import { ArrowUpRight, ChevronRight, FileText, Image as ImageIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryIcon } from "@/components/category-icon";
import { formatFullDateString } from "@/lib/date-time";

export const metadata = { title: "Resources" };

type SpaceWithCount = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  page_count: number;
  file_count: number;
  last_updated: string | null;
};

type RecentItem = {
  kind: "page" | "file";
  id: string;
  title: string;
  slug: string | null;
  category_slug: string;
  category_name: string;
  updated_at: string;
};

async function loadSpaces(): Promise<{
  spaces: SpaceWithCount[];
  recent: RecentItem[];
}> {
  const supabase = await createSupabaseServerClient();

  const [categoriesResp, livePagesResp, liveFilesResp] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("pages")
      .select("id, title, slug, category_id, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("resources")
      .select("id, title, category_id, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
  ]);

  if (categoriesResp.error) throw categoriesResp.error;

  const pageCounts = new Map<string, number>();
  const fileCounts = new Map<string, number>();
  const lastUpdated = new Map<string, string>();

  for (const row of livePagesResp.data ?? []) {
    pageCounts.set(row.category_id, (pageCounts.get(row.category_id) ?? 0) + 1);
    const prev = lastUpdated.get(row.category_id);
    if (!prev || row.updated_at > prev) {
      lastUpdated.set(row.category_id, row.updated_at);
    }
  }
  for (const row of liveFilesResp.data ?? []) {
    fileCounts.set(row.category_id, (fileCounts.get(row.category_id) ?? 0) + 1);
    const prev = lastUpdated.get(row.category_id);
    if (!prev || row.updated_at > prev) {
      lastUpdated.set(row.category_id, row.updated_at);
    }
  }

  const categoriesById = new Map(
    (categoriesResp.data ?? []).map((c) => [c.id, c]),
  );

  const spaces: SpaceWithCount[] = (categoriesResp.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    page_count: pageCounts.get(c.id) ?? 0,
    file_count: fileCounts.get(c.id) ?? 0,
    last_updated: lastUpdated.get(c.id) ?? null,
  }));

  const recentPages: RecentItem[] = (livePagesResp.data ?? [])
    .slice(0, 8)
    .map((p) => {
      const cat = categoriesById.get(p.category_id);
      return {
        kind: "page" as const,
        id: p.id,
        title: p.title ?? "Untitled",
        slug: p.slug,
        category_slug: cat?.slug ?? "",
        category_name: cat?.name ?? "",
        updated_at: p.updated_at,
      };
    });
  const recentFiles: RecentItem[] = (liveFilesResp.data ?? [])
    .slice(0, 8)
    .map((f) => {
      const cat = categoriesById.get(f.category_id);
      return {
        kind: "file" as const,
        id: f.id,
        title: f.title ?? "Untitled file",
        slug: null,
        category_slug: cat?.slug ?? "",
        category_name: cat?.name ?? "",
        updated_at: f.updated_at,
      };
    });
  const recent = [...recentPages, ...recentFiles]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 5);

  return { spaces, recent };
}

export default async function ResourcesPage() {
  const { spaces, recent } = await loadSpaces();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
      </header>

      {spaces.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center text-sm text-muted-foreground">
          No spaces yet.
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Spaces
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => {
              const total = space.page_count + space.file_count;
              return (
                <li key={space.id}>
                  <Link
                    href={`/c/${space.slug}`}
                    prefetch
                    className="group flex h-full items-start gap-3 rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground transition-colors group-hover:bg-primary/15">
                      <CategoryIcon name={space.icon} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {space.name}
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                          aria-hidden
                        />
                      </span>
                      {total === 0 ? (
                        <span className="text-xs italic text-muted-foreground/60">
                          Empty
                        </span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {space.page_count > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="size-3" aria-hidden />
                              {space.page_count}{" "}
                              {space.page_count === 1 ? "page" : "pages"}
                            </span>
                          )}
                          {space.file_count > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <ImageIcon className="size-3" aria-hidden />
                              {space.file_count}{" "}
                              {space.file_count === 1 ? "file" : "files"}
                            </span>
                          )}
                        </span>
                      )}
                      {space.last_updated && (
                        <span className="text-[11px] text-muted-foreground/70">
                          Updated {formatFullDateString(space.last_updated)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recently updated
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {recent.map((item) => {
              const href =
                item.kind === "page" && item.slug
                  ? `/c/${item.category_slug}/${item.slug}`
                  : `/c/${item.category_slug}`;
              return (
                <li key={`${item.kind}:${item.id}`}>
                  <Link
                    href={href}
                    prefetch
                    className="group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    {item.kind === "page" ? (
                      <FileText
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    ) : (
                      <ImageIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.title}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                      {item.category_name}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground/70 md:inline">
                      {formatFullDateString(item.updated_at)}
                    </span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
