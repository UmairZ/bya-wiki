import Link from "next/link";
import { notFound } from "next/navigation";
import { PenLine } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryIcon } from "@/components/category-icon";
import { formatRelative } from "@/lib/format-date";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pages")
    .select("title")
    .eq("id", id)
    .single();
  return { title: data?.title ?? "Page" };
}

export default async function PageView({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: page, error } = await supabase
    .from("pages")
    .select(
      "id, title, slug, excerpt, status, pinned, updated_at, category_id, created_by, updated_by, deleted_at",
    )
    .eq("id", id)
    .single();
  if (error || !page || page.deleted_at) notFound();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("id", page.category_id)
    .single();

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/browse" className="hover:text-foreground">
          Browse
        </Link>
        {category && (
          <>
            <span aria-hidden> / </span>
            <Link
              href={`/browse/${category.slug}`}
              className="hover:text-foreground"
            >
              {category.name}
            </Link>
          </>
        )}
        <span aria-hidden> / </span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {category && (
            <Link
              href={`/browse/${category.slug}`}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-muted"
            >
              <CategoryIcon name={category.icon} className="size-3.5" />
              <span>{category.name}</span>
            </Link>
          )}
          {page.status === "draft" && (
            <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">
              Draft
            </span>
          )}
          {page.pinned && (
            <span className="rounded-full bg-brand-tint px-2 py-0.5 uppercase tracking-wide text-brand-tint-foreground">
              Pinned
            </span>
          )}
          <span>· updated {formatRelative(page.updated_at)}</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        {page.excerpt && (
          <p className="text-base text-muted-foreground">{page.excerpt}</p>
        )}
      </header>

      <section className="rounded-lg border border-dashed bg-card/50 p-6 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
          <PenLine className="size-6" aria-hidden />
        </span>
        <p className="mt-3 font-medium">Editor lands in Phase 2b</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tiptap with slash commands, autosave, drafts and the custom layout
          blocks (tabs, collapsibles, columns, callouts, steps) come next. The
          page record exists already — only the writing surface is pending.
        </p>
      </section>
    </article>
  );
}
