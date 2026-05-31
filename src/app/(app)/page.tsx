import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  MapPin,
  Paperclip,
  Pin,
} from "lucide-react";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/category-icon";
import { formatRelative } from "@/lib/format-date";
import { formatEventWhen } from "@/lib/date-time";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import type { CalendarEvent } from "@/lib/calendar/types";

export const metadata = { title: "Home" };

type HomeItem = {
  kind: "page" | "file";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  pinned: boolean;
  updated_at: string;
  category: { name: string; slug: string } | null;
  file_type?: string;
};

type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  page_count: number;
};

async function loadHomeData(): Promise<{
  categories: CategoryWithCount[];
  pinned: HomeItem[];
  recent: HomeItem[];
  upcoming: CalendarEvent[];
}> {
  const supabase = await createSupabaseServerClient();

  const [
    categoriesResp,
    livePagesResp,
    pinnedPagesResp,
    recentPagesResp,
    pinnedFilesResp,
    recentFilesResp,
    icsUrl,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("pages")
      .select("category_id")
      .is("deleted_at", null),
    supabase
      .from("pages")
      .select("id, title, excerpt, updated_at, category_id")
      .eq("status", "published")
      .eq("pinned", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("pages")
      .select("id, title, excerpt, updated_at, category_id")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8),
    // Resources are read-only in the Home dashboard; they may not exist yet
    // if migration 0005 hasn't run, so we swallow the error rather than
    // breaking Home.
    supabase
      .from("resources")
      .select("id, title, file_type, file_size, updated_at, category_id")
      .eq("pinned", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("resources")
      .select("id, title, file_type, file_size, updated_at, category_id")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8),
    getIcsUrl(),
  ]);

  if (categoriesResp.error) throw categoriesResp.error;

  const counts = new Map<string, number>();
  for (const row of livePagesResp.data ?? []) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  const categories: CategoryWithCount[] = (categoriesResp.data ?? []).map(
    (c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      page_count: counts.get(c.id) ?? 0,
    }),
  );

  const cats = new Map(categories.map((c) => [c.id, c]));

  function pageItems(
    rows: { id: string; title: string; updated_at: string; category_id: string }[] | null,
  ): HomeItem[] {
    return (rows ?? []).map((row) => {
      const cat = cats.get(row.category_id);
      return {
        kind: "page",
        id: row.id,
        title: row.title,
        subtitle: `${cat?.name ?? "—"} · ${formatRelative(row.updated_at)}`,
        href: `/p/${row.id}`,
        pinned: true,
        updated_at: row.updated_at,
        category: cat ? { name: cat.name, slug: cat.slug } : null,
      };
    });
  }

  function fileItems(
    rows:
      | { id: string; title: string; file_type: string; updated_at: string; category_id: string }[]
      | null,
  ): HomeItem[] {
    return (rows ?? []).map((row) => {
      const cat = cats.get(row.category_id);
      return {
        kind: "file",
        id: row.id,
        title: row.title,
        subtitle: `${cat?.name ?? "—"} · ${formatRelative(row.updated_at)}`,
        href: cat ? `/c/${cat.slug}` : "/",
        pinned: true,
        updated_at: row.updated_at,
        category: cat ? { name: cat.name, slug: cat.slug } : null,
        file_type: row.file_type,
      };
    });
  }

  const pinned: HomeItem[] = [
    ...pageItems(pinnedPagesResp.data),
    ...fileItems(pinnedFilesResp.data),
  ].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  const recent: HomeItem[] = [
    ...pageItems(recentPagesResp.data),
    ...fileItems(recentFilesResp.data),
  ]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 8);

  let upcoming: CalendarEvent[] = [];
  if (icsUrl) {
    try {
      const all = await getCalendarEvents({ icsUrl, pastWindowDays: 0 });
      const now = Date.now();
      upcoming = all
        .filter((e) => {
          const endOrStart = e.ends_at ?? e.starts_at;
          return new Date(endOrStart).getTime() >= now;
        })
        .slice(0, 5);
    } catch {
      upcoming = [];
    }
  }

  return {
    categories,
    pinned,
    recent,
    upcoming,
  };
}

function ItemRow({ item }: { item: HomeItem }) {
  const Icon = item.kind === "file" ? Paperclip : FileText;
  return (
    <Link
      href={item.href}
      prefetch
      className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:bg-brand-tint/40"
    >
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{item.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {item.subtitle}
        </span>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-3 text-xs text-muted-foreground">{children}</p>
  );
}

export default async function HomePage() {
  const { profile } = await requireCurrentUser();
  const firstName = profile.display_name.split(/\s+/)[0] || profile.display_name;
  const { categories, pinned, recent, upcoming } = await loadHomeData();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center gap-4">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={56}
          height={56}
          priority
          className="rounded-full"
        />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{APP_NAME}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Welcome, {firstName}.
          </h1>
        </div>
      </header>

      <section aria-label="Categories" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Categories
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/c/${category.slug}`}
                prefetch
                className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-brand-tint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
                  <CategoryIcon name={category.icon} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {category.page_count}{" "}
                    {category.page_count === 1 ? "page" : "pages"}
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
      </section>

      <section
        aria-label="Dashboard"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Pin className="size-3.5" aria-hidden />
              Pinned
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 pt-0">
            {pinned.length === 0 ? (
              <EmptyHint>
                Nothing pinned yet. Open a page → Edit → Pin to surface it
                here.
              </EmptyHint>
            ) : (
              pinned.map((p) => <ItemRow key={`${p.kind}-${p.id}`} item={p} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recently updated
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 pt-0">
            {recent.length === 0 ? (
              <EmptyHint>
                No published pages yet. Pick a category above to create one.
              </EmptyHint>
            ) : (
              recent.map((p) => <ItemRow key={`${p.kind}-${p.id}`} item={p} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-3.5" aria-hidden />
              Upcoming events
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 pt-0">
            {upcoming.length === 0 ? (
              <EmptyHint>
                Nothing on the calendar.{" "}
                <Link
                  href="/events"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open events
                </Link>
                .
              </EmptyHint>
            ) : (
              upcoming.map((event) => (
                <Link
                  key={event.id}
                  href="/events"
                  prefetch
                  className="group flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-tint/40 focus-visible:bg-brand-tint/40 focus-visible:outline-none"
                >
                  <div
                    className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground"
                    aria-hidden
                  >
                    <span className="text-[10px] font-semibold uppercase">
                      {new Date(event.starts_at).toLocaleString(undefined, {
                        month: "short",
                      })}
                    </span>
                    <span className="text-sm font-bold leading-none">
                      {new Date(event.starts_at).getDate()}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {event.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatEventWhen(event)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden />
                        {event.location}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
