import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FilePlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryIcon } from "@/components/category-icon";
import { NewPageButton } from "./new-page-button";

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  return { title: prettifySlug(category) };
}

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("slug", slug)
    .single();
  if (categoryError || !category) notFound();

  const { data: pages } = await supabase
    .from("pages")
    .select(
      "id, title, slug, excerpt, status, pinned, updated_at, parent_id",
    )
    .eq("category_id", category.id)
    .is("deleted_at", null)
    .is("parent_id", null)
    .order("pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  const rows = pages ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/browse" className="hover:text-foreground">
          Browse
        </Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
            <CategoryIcon name={category.icon} className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {category.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? "page" : "pages"}
            </p>
          </div>
        </div>
        <NewPageButton categoryId={category.id} />
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
            <FilePlus className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">No pages yet</p>
            <p className="text-sm text-muted-foreground">
              Start the first one. Drafts don't appear to others until published.
            </p>
          </div>
          <NewPageButton categoryId={category.id} />
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {rows.map((page) => (
            <li key={page.id}>
              <Link
                href={`/p/${page.id}`}
                prefetch
                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-brand-tint/50 focus-visible:outline-none focus-visible:bg-brand-tint/50"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {page.title}
                    </span>
                    {page.status === "draft" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Draft
                      </span>
                    )}
                    {page.pinned && (
                      <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] uppercase tracking-wide text-brand-tint-foreground">
                        Pinned
                      </span>
                    )}
                  </div>
                  {page.excerpt && (
                    <span className="truncate text-xs text-muted-foreground">
                      {page.excerpt}
                    </span>
                  )}
                </div>
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
