-- Phase 4 (revised): resources live alongside pages inside a category.
-- No folders — categories are the only grouping. Bytes go to Supabase
-- Storage; this table holds metadata + the path.
--
-- Also creates the private storage bucket + storage RLS so the same
-- run gives you a fully working file library.
--
-- Run this in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

-- ---------------------------------------------------------------------------
-- resources table
-- ---------------------------------------------------------------------------

create table if not exists public.resources (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid not null references public.categories(id) on delete restrict,
  title          text not null,
  description    text,
  storage_path   text not null,
  file_type      text not null,
  file_size      bigint not null default 0,
  pinned         boolean not null default false,
  sort_order     integer not null default 0,
  uploaded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

comment on table public.resources is
  'Files stored in Supabase Storage, grouped by category alongside pages. storage_path is the object name within the wiki-files bucket.';

create index if not exists resources_category_idx
  on public.resources (category_id, deleted_at);

create index if not exists resources_recent_idx
  on public.resources (updated_at desc)
  where deleted_at is null;

create index if not exists resources_pinned_idx
  on public.resources (sort_order, updated_at desc)
  where pinned and deleted_at is null;

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mirrors the pages model.
-- ---------------------------------------------------------------------------

alter table public.resources enable row level security;

drop policy if exists "resources_select_authenticated" on public.resources;
create policy "resources_select_authenticated"
  on public.resources
  for select
  to authenticated
  using (deleted_at is null or public.current_user_role() = 'owner');

drop policy if exists "resources_insert_member" on public.resources;
create policy "resources_insert_member"
  on public.resources
  for insert
  to authenticated
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "resources_update_member" on public.resources;
create policy "resources_update_member"
  on public.resources
  for update
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "resources_delete_owner" on public.resources;
create policy "resources_delete_owner"
  on public.resources
  for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Supabase Storage: private bucket + RLS policies on storage.objects.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('wiki-files', 'wiki-files', false)
on conflict (id) do nothing;

-- Any active member can list + download (downloads use signed URLs minted
-- server-side via the service role, but RLS also gates direct access).
drop policy if exists "wiki_files_select_member" on storage.objects;
create policy "wiki_files_select_member"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'wiki-files'
    and public.current_user_role() in ('owner', 'editor')
  );

-- Any active member can upload.
drop policy if exists "wiki_files_insert_member" on storage.objects;
create policy "wiki_files_insert_member"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'wiki-files'
    and public.current_user_role() in ('owner', 'editor')
  );

-- Any active member can update (rename, move).
drop policy if exists "wiki_files_update_member" on storage.objects;
create policy "wiki_files_update_member"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'wiki-files'
    and public.current_user_role() in ('owner', 'editor')
  )
  with check (
    bucket_id = 'wiki-files'
    and public.current_user_role() in ('owner', 'editor')
  );

-- Only owner can permanently delete the bytes (matches resources_delete_owner).
drop policy if exists "wiki_files_delete_owner" on storage.objects;
create policy "wiki_files_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'wiki-files'
    and public.current_user_role() = 'owner'
  );
