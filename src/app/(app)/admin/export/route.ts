import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Owner-only JSON export of all wiki content. Dumps categories, pages,
 * resources (metadata + storage_path), tags, page_tags, and a snapshot
 * of profile display_names. Skips secrets (Google tokens, ICS URL).
 *
 * The download includes soft-deleted rows so a full restore is possible.
 * File bytes themselves are NOT exported — only paths within the
 * wiki-files bucket.
 */
export async function GET() {
  await requireOwner();
  const admin = createSupabaseAdminClient();

  const [profiles, categories, pages, resources, tags, pageTags] = await Promise.all([
    admin.from("profiles").select("id, display_name, role, active, created_at"),
    admin.from("categories").select("*").order("sort_order"),
    admin.from("pages").select("*"),
    admin.from("resources").select("*"),
    admin.from("tags").select("*"),
    admin.from("page_tags").select("*"),
  ]);

  const errors = [profiles, categories, pages, resources, tags, pageTags]
    .map((r) => r.error?.message)
    .filter(Boolean);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: `Export failed: ${errors.join("; ")}` },
      { status: 500 },
    );
  }

  const exportedAt = new Date().toISOString();
  const body = {
    meta: {
      app: "bya-wiki",
      version: 1,
      exported_at: exportedAt,
      note: "Includes soft-deleted rows. File bytes live in Supabase Storage at storage_path; not included here.",
    },
    profiles: profiles.data ?? [],
    categories: categories.data ?? [],
    pages: pages.data ?? [],
    resources: resources.data ?? [],
    tags: tags.data ?? [],
    page_tags: pageTags.data ?? [],
  };

  const stamp = exportedAt.replace(/[:.]/g, "-").slice(0, 19);
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bya-wiki-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
