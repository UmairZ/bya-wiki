import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FilePlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryIcon } from "@/components/category-icon";
import { NewPageButton } from "./new-page-button";
import { DropZone, UploadButton } from "./upload-button";
import { FileRow, type FileRowData } from "./file-row";

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

type PageItem = {
  kind: "page";
  id: string;
  title: string;
  excerpt: string;
  status: "draft" | "published";
  pinned: boolean;
  updated_at: string;
};

type FileItem = { kind: "file" } & FileRowData;

type Item = PageItem | FileItem;

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("slug", slug)
    .single();
  if (categoryError || !category) notFound();

  const [pagesResp, filesResp] = await Promise.all([
    supabase
      .from("pages")
      .select(
        "id, title, slug, excerpt, status, pinned, updated_at, parent_id",
      )
      .eq("category_id", category.id)
      .is("deleted_at", null)
      .is("parent_id", null),
    supabase
      .from("resources")
      .select(
        "id, title, description, file_type, file_size, pinned, updated_at",
      )
      .eq("category_id", category.id)
      .is("deleted_at", null),
  ]);

  const items: Item[] = [
    ...(pagesResp.data ?? []).map<PageItem>((p) => ({
      kind: "page",
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      status: p.status,
      pinned: p.pinned,
      updated_at: p.updated_at,
    })),
    ...(filesResp.data ?? []).map<FileItem>((f) => ({
      kind: "file",
      id: f.id,
      title: f.title,
      description: f.description,
      file_type: f.file_type,
      file_size: f.file_size,
      pinned: f.pinned,
      updated_at: f.updated_at,
    })),
  ];

  // Pinned first, then most-recently-updated. Pages and files mix freely.
  items.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });

  return (
    <DropZone categoryId={category.id}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/resources" className="hover:text-foreground">
            Resources
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
                {items.length} {items.length === 1 ? "item" : "items"}
                {" · "}
                drag files anywhere to upload
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton categoryId={category.id} />
            <NewPageButton categoryId={category.id} />
          </div>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
              <FilePlus className="size-6" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-medium">Nothing here yet</p>
              <p className="text-sm text-muted-foreground">
                Start a page, upload a file, or drag-and-drop anywhere on this
                screen.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UploadButton categoryId={category.id} />
              <NewPageButton categoryId={category.id} />
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {items.map((item) =>
              item.kind === "page" ? (
                <li key={`page-${item.id}`}>
                  <Link
                    href={`/p/${item.id}`}
                    prefetch
                    className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-brand-tint/50 focus-visible:outline-none focus-visible:bg-brand-tint/50"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        {item.status === "draft" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Draft
                          </span>
                        )}
                        {item.pinned && (
                          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] uppercase tracking-wide text-brand-tint-foreground">
                            Pinned
                          </span>
                        )}
                      </div>
                      {item.excerpt && (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.excerpt}
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              ) : (
                <li key={`file-${item.id}`}>
                  <FileRow file={item} />
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </DropZone>
  );
}
