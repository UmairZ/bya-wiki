-- Phase 5 (OAuth): server-only Google Calendar connection.
--
-- Tokens live in a separate table from app_settings so we can lock RLS
-- down entirely — no authenticated reads, no policies = no access except
-- via the service-role admin client. The wiki UI only ever sees this
-- through dedicated server actions.
--
-- Run this in Supabase Dashboard → SQL Editor.

set search_path = public;

create table if not exists public.google_oauth_connection (
  id                          smallint primary key default 1,
  refresh_token               text not null,
  access_token                text,
  access_token_expires_at     timestamptz,
  connected_email             text,
  calendar_id                 text,
  calendar_name               text,
  connected_by                uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint google_oauth_connection_singleton check (id = 1)
);

comment on table public.google_oauth_connection is
  'Server-only Google OAuth tokens + selected calendar. Service-role access only — no RLS policies grant authenticated access.';

drop trigger if exists google_oauth_connection_set_updated_at
  on public.google_oauth_connection;
create trigger google_oauth_connection_set_updated_at
  before update on public.google_oauth_connection
  for each row execute function public.set_updated_at();

-- RLS on, but no policies = deny all to authenticated/anon. Service role
-- bypasses RLS and is the only client that ever touches this table.
--
-- We deliberately do NOT revoke default grants. Those grants are what
-- PostgREST's schema introspection uses; revoking them removes the table
-- from the REST API schema cache for everyone, including service-role
-- requests. RLS alone is the access barrier.
alter table public.google_oauth_connection enable row level security;
