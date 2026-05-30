"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";

export type SetPasswordState = { error: string } | undefined;

const MIN_PASSWORD_LENGTH = 10;

export async function setPasswordAction(
  _prev: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) {
    return { error: pwError.message };
  }

  // Clear the forced-change flag via the admin client (RLS forbids users from
  // mutating must_change_password on their own row).
  const admin = createSupabaseAdminClient();
  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", current.userId);
  if (flagError) {
    return { error: flagError.message };
  }

  redirect("/");
}
