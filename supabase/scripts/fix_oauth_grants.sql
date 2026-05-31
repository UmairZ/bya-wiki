-- One-shot fix for the early version of migration 0004 that revoked
-- default grants on google_oauth_connection. Revoking made PostgREST drop
-- the table from its schema cache, so even service-role requests failed.
-- Re-grant defaults; RLS (no policies) still blocks authenticated/anon
-- from reading rows.
--
-- Run this in Supabase Dashboard → SQL Editor if you ran the original
-- 0004 migration. Safe to re-run.

grant all on public.google_oauth_connection to authenticated;
grant all on public.google_oauth_connection to anon;
grant all on public.google_oauth_connection to service_role;

-- Nudge PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
