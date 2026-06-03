import Link from "next/link";
import { notFound } from "next/navigation";
import { PenLine } from "lucide-react";
import { generateHTML } from "@tiptap/html";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import {
  TableOfContentsDesktop,
  TableOfContentsMobile,
} from "@/components/table-of-contents";
import { formatRelative } from "@/lib/format-date";
import { buildBaseExtensions } from "@/lib/tiptap/extensions";
import { InteractiveTabs } from "@/lib/tiptap/blocks/tabs-enhancer";
import { processPageHTML } from "@/lib/tiptap/process-html";
import type { TiptapDoc } from "@/lib/supabase/types";

type Props = { params: Promise<{ id: string }> };

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

function renderDoc(doc: TiptapDoc): string {
  if (!doc?.content || doc.content.length === 0) return "";
  try {
    return generateHTML(doc, buildBaseExtensions());
  } catch (err) {
    console.error("Tiptap render failed", err);
    return "";
  }
}

export default async function PageView({ params }: Props) {
  const { id } = await params;
  const [current, supabase] = await Promise.all([
    getCurrentUser(),
    createSupabaseServerClient(),
  ]);

  const { data: page, error } = await supabase
    .from("pages")
    .select(
      "id, title, slug, content, excerpt, status, pinned, updated_at, category_id, deleted_at",
    )
    .eq("id", id)
    .single();
  if (error || !page || page.deleted_at) notFound();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("id", page.category_id)
    .single();

  const rawHtml = renderDoc(page.content);
  const { html, toc } = processPageHTML(rawHtml);
  const isEmpty = html.trim() === "" || html === "<p></p>";

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-0 px-4 py-6 md:px-8 md:py-10">
      <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/resources" className="hover:text-foreground">
            Resources
          </Link>
          {category && (
            <>
              <span aria-hidden> / </span>
              <Link
                href={`/c/${category.slug}`}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {category && (
                <Link
                  href={`/c/${category.slug}`}
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
            {current && (
              <Button
                render={<Link href={`/p/${page.id}/edit`} />}
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                <PenLine className="size-4" aria-hidden />
                Edit
              </Button>
            )}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        </header>

        {toc.length > 1 && <TableOfContentsMobile entries={toc} />}

        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
              <PenLine className="size-6" aria-hidden />
            </span>
            <p className="font-medium">This page is empty</p>
            <p className="text-sm text-muted-foreground">
              Click <em>Edit</em> to start writing.
            </p>
          </div>
        ) : (
          <>
            <div
              className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-20"
              // generateHTML output is from a strict ProseMirror schema — Tiptap
              // round-trips JSON through ProseMirror, so the output is safe.
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <InteractiveTabs />
          </>
        )}
      </article>

      {toc.length > 1 && <TableOfContentsDesktop entries={toc} />}
    </div>
  );
}
