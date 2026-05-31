import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Pin } from "lucide-react";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-date";

export const metadata = { title: "Home" };

type HomePage = {
  id: string;
  title: string;
  excerpt: string;
  updated_at: string;
  category: { name: string; slug: string } | null;
};

async function loadHomeData(): Promise<{
  pinned: HomePage[];
  recent: HomePage[];
}> {
  const supabase = await createSupabaseServerClient();

  const [pinnedResp, recentResp, categoriesResp] = await Promise.all([
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
    supabase.from("categories").select("id, name, slug"),
  ]);

  const cats = new Map(
    (categoriesResp.data ?? []).map((c) => [c.id, c]),
  );

  function decorate(rows: typeof pinnedResp.data): HomePage[] {
    return (rows ?? []).map((row) => {
      const cat = cats.get(row.category_id);
      return {
        id: row.id,
        title: row.title,
        excerpt: row.excerpt,
        updated_at: row.updated_at,
        category: cat ? { name: cat.name, slug: cat.slug } : null,
      };
    });
  }

  return {
    pinned: decorate(pinnedResp.data),
    recent: decorate(recentResp.data),
  };
}

function PageRow({ page }: { page: HomePage }) {
  return (
    <Link
      href={`/p/${page.id}`}
      prefetch
      className="group flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:bg-brand-tint/40"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{page.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {page.category?.name ?? "—"} · {formatRelative(page.updated_at)}
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
  const { pinned, recent } = await loadHomeData();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
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
              pinned.map((p) => <PageRow key={p.id} page={p} />)
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
                No published pages yet. Head to{" "}
                <Link
                  href="/browse"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Browse
                </Link>{" "}
                to create one.
              </EmptyHint>
            ) : (
              recent.map((p) => <PageRow key={p.id} page={p} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Upcoming events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <p className="pt-2 text-xs text-muted-foreground">
              Next events from the calendar will surface here (Phase 5).
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
