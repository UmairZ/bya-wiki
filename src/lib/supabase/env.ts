// Next.js's bundler statically replaces `process.env.NEXT_PUBLIC_*` (literal
// dot access) at build time. A dynamic lookup like `process.env[name]` is NOT
// inlined into client bundles, so we reference each NEXT_PUBLIC_* var by its
// literal name below.

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local (and Vercel project settings).",
    );
  }
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to .env.local (and Vercel project settings).",
    );
  }
  return value;
}

export function getSupabaseServiceRoleKey(): string {
  // Server-only. Dynamic lookup is fine here because this module is only
  // imported through ./admin.ts which is `import "server-only"`.
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (and Vercel project settings) — server-only, never NEXT_PUBLIC_.",
    );
  }
  return value;
}
