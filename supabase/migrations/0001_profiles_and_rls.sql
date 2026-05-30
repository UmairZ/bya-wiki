-- Phase 1: profiles table extending auth.users + auto-creation trigger + RLS.
--
-- Run this in Supabase Dashboard → SQL Editor (one shot).
-- Idempotent: safe to re-run.

set search_path = public;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null,
  avatar_url            text,
  role                  text not null default 'editor' check (role in ('owner', 'editor')),
  must_change_password  boolean not null default true,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user profile extending auth.users. Owner-managed roles; new accounts are forced to change their password on first login.';

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth.user is created.
-- The admin client (server-only) passes user_metadata.display_name when
-- creating accounts; fall back to the email's local part if absent.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role, must_change_password)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Member'
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'editor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- - Authenticated users may read any profile.
-- - Authenticated users may update their OWN row, but column-level grants
--   restrict the editable surface to display_name + avatar_url.
-- - Role / active / must_change_password are owner-only and mutated via
--   the service-role admin client, which bypasses RLS.
-- - INSERT/DELETE have no policy: only the auth.users trigger (security
--   definer) and the service-role client may create/delete profiles.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke update on public.profiles from authenticated;
grant  select on public.profiles to authenticated;
grant  update (display_name, avatar_url) on public.profiles to authenticated;
