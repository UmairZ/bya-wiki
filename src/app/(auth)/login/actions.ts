"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | undefined;

const SAFE_NEXT_PATH = /^\/[^/]/;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Could not sign in." };
  }

  // Load profile to decide where to send them.
  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, active")
    .eq("id", data.user.id)
    .single<{ must_change_password: boolean; active: boolean }>();

  if (profile && !profile.active) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated." };
  }

  if (profile?.must_change_password) {
    redirect("/set-password");
  }

  const next = SAFE_NEXT_PATH.test(nextRaw) ? nextRaw : "/";
  redirect(next);
}
