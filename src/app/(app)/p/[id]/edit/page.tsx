import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PageRow } from "@/lib/supabase/types";
import { PageEditor } from "./page-editor";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pages")
    .select("title")
    .eq("id", id)
    .single();
  return { title: data?.title ? `Edit: ${data.title}` : "Edit page" };
}

export default async function EditPageRoute({ params }: Props) {
  const { id } = await params;
  await requireCurrentUser();

  const supabase = await createSupabaseServerClient();

  const { data: page, error } = await supabase
    .from("pages")
    .select(
      "id, title, slug, content, status, pinned, updated_at, category_id, deleted_at",
    )
    .eq("id", id)
    .single<
      Pick<
        PageRow,
        | "id"
        | "title"
        | "slug"
        | "content"
        | "status"
        | "pinned"
        | "updated_at"
        | "category_id"
        | "deleted_at"
      >
    >();
  if (error || !page || page.deleted_at) notFound();

  const { data: category } = await supabase
    .from("categories")
    .select("name, slug, icon")
    .eq("id", page.category_id)
    .single();

  return (
    <PageEditor
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        status: page.status,
        pinned: page.pinned,
        updated_at: page.updated_at,
        category_id: page.category_id,
      }}
      category={category}
    />
  );
}
