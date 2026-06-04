-- Phase 7g: Flyers + public-facing event grid.
--
-- Flyers are required on every published event. Drafts get a flyer column;
-- on publish the path transfers into a new event_flyers table keyed by the
-- Google event UID (since the draft row is deleted at publish time).
--
-- The "event-flyers" Storage bucket is public so the unauthenticated
-- /r/events page can <img src="..."> directly without signed URLs.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

-- ---------------------------------------------------------------------------
-- draft_events.flyer_storage_path
-- ---------------------------------------------------------------------------

alter table public.draft_events
  add column if not exists flyer_storage_path text;

-- ---------------------------------------------------------------------------
-- event_flyers (keyed by Google Calendar event UID, e.g. "<uid>@google.com")
-- ---------------------------------------------------------------------------

create table if not exists public.event_flyers (
  google_event_uid    text primary key,
  flyer_storage_path  text not null,
  uploaded_by         uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.event_flyers is
  'Flyer image storage paths for published Google Calendar events. Read by the public /r/events page. One row per event UID.';

create index if not exists event_flyers_uploaded_idx
  on public.event_flyers (updated_at desc);

drop trigger if exists event_flyers_set_updated_at on public.event_flyers;
create trigger event_flyers_set_updated_at
  before update on public.event_flyers
  for each row execute function public.set_updated_at();

alter table public.event_flyers enable row level security;

-- Everyone (authenticated or not) can read — these are public flyers shown
-- on the unauthenticated /r/events page.
drop policy if exists "event_flyers_select_all" on public.event_flyers;
create policy "event_flyers_select_all"
  on public.event_flyers for select
  to anon, authenticated
  using (true);

-- Mutate: any active member.
drop policy if exists "event_flyers_mutate_member" on public.event_flyers;
create policy "event_flyers_mutate_member"
  on public.event_flyers for all
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));

-- ---------------------------------------------------------------------------
-- Storage bucket: event-flyers (public read)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('event-flyers', 'event-flyers', true)
on conflict (id) do update set public = excluded.public;

-- Storage policies: authenticated members upload + update + delete; anyone
-- (including unauthenticated visitors to /r/events) reads.

drop policy if exists "event_flyers_storage_read" on storage.objects;
create policy "event_flyers_storage_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'event-flyers');

drop policy if exists "event_flyers_storage_insert" on storage.objects;
create policy "event_flyers_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-flyers'
    and public.current_user_role() in ('owner', 'editor')
  );

drop policy if exists "event_flyers_storage_update" on storage.objects;
create policy "event_flyers_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-flyers'
    and public.current_user_role() in ('owner', 'editor')
  )
  with check (
    bucket_id = 'event-flyers'
    and public.current_user_role() in ('owner', 'editor')
  );

drop policy if exists "event_flyers_storage_delete" on storage.objects;
create policy "event_flyers_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-flyers'
    and public.current_user_role() in ('owner', 'editor')
  );
