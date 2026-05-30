import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: "owner" | "editor";
  must_change_password: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CurrentUser = {
  userId: string;
  email: string;
  profile: Profile;
};

/**
 * Resolve the current signed-in user + profile from a Server Component or
 * Server Action. Returns null if unauthenticated (the proxy normally redirects
 * to /login before we get here, so null usually means the request bypassed the
 * proxy — e.g., a route handler outside the matcher).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, role, must_change_password, active, created_at, updated_at",
    )
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
  };
}

/**
 * Like getCurrentUser but redirects to /login when no session exists.
 * Use in (app) layouts/pages where a user is required.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!current.profile.active) {
    // Deactivated mid-session — kick them out.
    redirect("/login?error=deactivated");
  }
  return current;
}

/**
 * Owner-gate. Used by /team and any other owner-only surface.
 * Editors get a 404 (forbidden disclosure) rather than a chatty 403.
 */
export async function requireOwner(): Promise<CurrentUser> {
  const current = await requireCurrentUser();
  if (current.profile.role !== "owner") {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return current;
}
