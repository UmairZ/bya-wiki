"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify, uniqueSlug } from "@/lib/slug";

export type CreatePageState = { error: string } | undefined;

export async function createPageAction(
  _prev: CreatePageState,
  formData: FormData,
): Promise<CreatePageState> {
  const current = await requireCurrentUser();

  const categoryId = String(formData.get("category_id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Untitled";

  if (!categoryId) return { error: "Category is required." };

  const supabase = await createSupabaseServerClient();

  // Pull existing slugs in this category so we don't collide on insert.
  const { data: siblings, error: siblingsErr } = await supabase
    .from("pages")
    .select("slug")
    .eq("category_id", categoryId)
    .is("deleted_at", null);
  if (siblingsErr) return { error: siblingsErr.message };

  const slug = uniqueSlug(
    slugify(title),
    (siblings ?? []).map((row) => row.slug),
  );

  const { data: inserted, error: insertErr } = await supabase
    .from("pages")
    .insert({
      category_id: categoryId,
      title,
      slug,
      status: "draft",
      created_by: current.userId,
      updated_by: current.userId,
    })
    .select("id, category_id, category:categories(slug)")
    .single<{
      id: string;
      category_id: string;
      category: { slug: string } | null;
    }>();

  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? "Could not create page." };
  }

  // Home + category overview pull live counts; bust both.
  revalidatePath("/");
  if (inserted.category?.slug) revalidatePath(`/c/${inserted.category.slug}`);
  redirect(`/p/${inserted.id}`);
}
