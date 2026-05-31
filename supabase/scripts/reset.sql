-- DESTRUCTIVE — wipes the public schema and every auth user.
--
-- Run this once when you want a totally fresh start, then re-run
-- supabase/migrations/0001 → 0002 → 0003 in order, then bootstrap a new
-- owner.
--
-- Not idempotent and not chained to anything: this file lives under
-- supabase/scripts/ instead of supabase/migrations/ so it can never run
-- as part of a normal migration sweep.

begin;

-- Drop tables in dependency order. CASCADE handles incidental FKs.
drop table if exists public.app_settings cascade;
drop table if exists public.page_tags    cascade;
drop table if exists public.tags         cascade;
drop table if exists public.pages        cascade;
drop table if exists public.categories   cascade;
drop table if exists public.profiles     cascade;

-- Drop functions/triggers that aren't tied to a surviving table.
drop function if exists public.set_updated_at()       cascade;
drop function if exists public.handle_new_user()      cascade;
drop function if exists public.current_user_role()    cascade;
drop function if exists public.enforce_page_depth()   cascade;

-- Wipe every auth.user — cascades to anything left behind.
delete from auth.users;

commit;
