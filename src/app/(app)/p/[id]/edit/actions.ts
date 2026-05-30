"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deriveExcerpt, tiptapToPlainText } from "@/lib/tiptap/plain-text";
import type { PageStatus, PageUpdate, TiptapDoc } from "@/lib/supabase/types";

export type SavePagePatch = {
  title?: string;
  content?: TiptapDoc;
};

export type SaveResult =
  | { ok: true; updated_at: string; excerpt: string }
  | { ok: false; error: string };

export async function savePageAction(
  id: string,
  patch: SavePagePatch,
): Promise<SaveResult> {
  const current = await requireCurrentUser();
  if (!id) return { ok: false, error: "Missing page id." };

  const supabase = await createSupabaseServerClient();

  const update: PageUpdate = { updated_by: current.userId };
  if (typeof patch.title === "string") {
    update.title = patch.title.trim() || "Untitled";
  }
  if (patch.content) {
    update.content = patch.content;
    const plain = tiptapToPlainText(patch.content);
    update.excerpt = deriveExcerpt(plain);
  }

  const { data, error } = await supabase
    .from("pages")
    .update(update)
    .eq("id", id)
    .select("updated_at, excerpt")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save." };
  }

  revalidatePath(`/p/${id}`);
  return { ok: true, updated_at: data.updated_at, excerpt: data.excerpt };
}

export async function setPageStatusAction(
  id: string,
  status: PageStatus,
): Promise<SaveResult> {
  const current = await requireCurrentUser();
  if (status !== "draft" && status !== "published") {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .update({ status, updated_by: current.userId })
    .eq("id", id)
    .select("updated_at, excerpt")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update status." };
  }

  revalidatePath(`/p/${id}`);
  revalidatePath("/browse");
  return { ok: true, updated_at: data.updated_at, excerpt: data.excerpt };
}
