"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  );
  return browserClient;
}
