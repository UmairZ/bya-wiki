-- Phase 5: app_settings singleton — holds owner-managed integration config.
-- For now: the Google Calendar ICS URL we mirror events from.
--
-- Run this in Supabase Dashboard → SQL Editor.
-- Idempotent: safe to re-run.

set search_path = public;

create table if not exists public.app_settings (
  id                        smallint primary key default 1,
  google_calendar_ics_url   text,
  updated_at                timestamptz not null default now(),
  updated_by                uuid references public.profiles(id) on delete set null,
  constraint app_settings_singleton check (id = 1)
);

comment on table public.app_settings is
  'Owner-managed integration + app config. Exactly one row, id=1.';

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Seed the singleton row.
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- RLS — any authenticated member reads; only owner mutates.
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists "app_settings_owner_update" on public.app_settings;
create policy "app_settings_owner_update"
  on public.app_settings
  for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');
