"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/current-user";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CreateMemberResult = ActionResult<{
  email: string;
  tempPassword: string;
}>;

export type ResetPasswordResult = ActionResult<{
  email: string;
  tempPassword: string;
}>;

function generateTempPassword(): string {
  // 12 random bytes → ~16 base64url chars; ample entropy.
  return randomBytes(12).toString("base64url");
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRole(value: FormDataEntryValue | null): "owner" | "editor" {
  return value === "owner" ? "owner" : "editor";
}

export async function createMemberAction(
  _prev: CreateMemberResult | undefined,
  formData: FormData,
): Promise<CreateMemberResult> {
  await requireOwner();

  const email = normalizeEmail(formData.get("email"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = normalizeRole(formData.get("role"));

  if (!email) return { ok: false, error: "Email is required." };
  if (!displayName) return { ok: false, error: "Display name is required." };

  const tempPassword = generateTempPassword();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Could not create user." };
  }

  // The handle_new_user trigger inserted a profile with role=editor +
  // must_change_password=true. Upgrade role if the owner requested it.
  if (role === "owner") {
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: "owner" })
      .eq("id", data.user.id);
    if (roleErr) return { ok: false, error: roleErr.message };
  }

  revalidatePath("/team");
  return { ok: true, data: { email, tempPassword } };
}

export async function resetMemberPasswordAction(
  userId: string,
): Promise<ResetPasswordResult> {
  await requireOwner();

  const admin = createSupabaseAdminClient();
  const tempPassword = generateTempPassword();

  const { data: updated, error } = await admin.auth.admin.updateUserById(
    userId,
    { password: tempPassword },
  );
  if (error || !updated.user) {
    return { ok: false, error: error?.message ?? "Could not reset password." };
  }

  const { error: flagErr } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (flagErr) return { ok: false, error: flagErr.message };

  revalidatePath("/team");
  return {
    ok: true,
    data: { email: updated.user.email ?? "", tempPassword },
  };
}

export async function setMemberRoleAction(
  userId: string,
  role: "owner" | "editor",
): Promise<ActionResult> {
  const current = await requireOwner();
  if (userId === current.userId && role !== "owner") {
    return { ok: false, error: "You can't demote yourself." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true, data: null };
}

export async function setMemberActiveAction(
  userId: string,
  active: boolean,
): Promise<ActionResult> {
  const current = await requireOwner();
  if (userId === current.userId && !active) {
    return { ok: false, error: "You can't deactivate yourself." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true, data: null };
}
