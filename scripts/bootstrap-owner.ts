/**
 * Idempotent one-off: creates (or upgrades) the first owner account.
 *
 * Reads .env.local for Supabase credentials and OWNER_* values for the owner.
 * If the user already exists, this resets their password and re-flags them as
 * owner — safe to re-run.
 *
 * Usage (PowerShell):
 *   $env:OWNER_EMAIL="you@example.com"
 *   $env:OWNER_DISPLAY_NAME="Your Name"
 *   $env:OWNER_PASSWORD="..."
 *   npm run bootstrap-owner
 *
 * Or in one shot via the helper at scripts/run-bootstrap-owner.ps1.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local is optional; env vars may be set externally.
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requireEnv("OWNER_EMAIL").toLowerCase();
  const displayName = requireEnv("OWNER_DISPLAY_NAME");
  const password = requireEnv("OWNER_PASSWORD");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up existing user by email.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) {
    console.error("Failed to list users:", listErr.message);
    process.exit(1);
  }

  let userId: string;
  const existing = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );

  if (existing) {
    console.log(`User ${email} already exists (${existing.id}); resetting password and re-flagging as owner.`);
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) {
      console.error("Failed to update existing user:", error.message);
      process.exit(1);
    }
    userId = existing.id;
  } else {
    console.log(`Creating user ${email}…`);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error || !data.user) {
      console.error("Failed to create user:", error?.message ?? "unknown error");
      process.exit(1);
    }
    userId = data.user.id;
  }

  // Upsert profile as owner with must_change_password=false.
  // The handle_new_user trigger may have inserted a default editor profile;
  // upsert overwrites with owner role.
  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: displayName,
        role: "owner",
        must_change_password: false,
        active: true,
      },
      { onConflict: "id" },
    );
  if (upsertErr) {
    console.error("Failed to upsert profile:", upsertErr.message);
    process.exit(1);
  }

  console.log(`\n✓ Owner bootstrap complete.`);
  console.log(`  email:        ${email}`);
  console.log(`  display_name: ${displayName}`);
  console.log(`  role:         owner`);
  console.log(`  must_change_password: false`);
  console.log(`\n  → log in at http://localhost:3000/login`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
