import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryRowEditor } from "./category-row-editor";
import { CreateCategoryButton } from "./create-category-button";

export const metadata = { title: "Categories" };

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  item_count: number;
};

async function loadCategories(): Promise<CategoryWithCount[]> {
  const supabase = await createSupabaseServerClient();
  const [catsResp, pagesResp, filesResp] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("pages").select("category_id").is("deleted_at", null),
    supabase.from("resources").select("category_id").is("deleted_at", null),
  ]);
  if (catsResp.error) throw catsResp.error;

  const counts = new Map<string, number>();
  for (const row of pagesResp.data ?? []) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  for (const row of filesResp.data ?? []) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  return (catsResp.data ?? []).map((c) => ({
    ...c,
    item_count: counts.get(c.id) ?? 0,
  }));
}

export default async function CategoriesAdminPage() {
  await requireOwner();
  const categories = await loadCategories();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Owner-managed. Keep this list short — flat structure is what makes
            information findable.
          </p>
        </div>
        <CreateCategoryButton />
      </header>

      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {categories.map((category, i) => (
          <li key={category.id}>
            <CategoryRowEditor
              category={category}
              canMoveUp={i > 0}
              canMoveDown={i < categories.length - 1}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
