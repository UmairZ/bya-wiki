-- Phase 2a: wiki core schema — categories, pages, tags, page_tags + RLS.
--
-- Run this in Supabase Dashboard → SQL Editor (one shot).
-- Idempotent: safe to re-run.

set search_path = public;

-- ---------------------------------------------------------------------------
-- Helper: current user's role (owner/editor) if active, else null.
-- security definer so it can read profiles regardless of RLS.
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and active = true
$$;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  icon        text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.categories is
  'Owner-managed top-level sections. Few and stable; not free-proliferating.';

create index if not exists categories_sort_idx
  on public.categories (sort_order, name);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Seed the six starting categories. on conflict do nothing keeps this idempotent.
-- Icons are lucide-react names; the app renders them via a small map.
insert into public.categories (name, slug, icon, sort_order) values
  ('Playbooks & SOPs', 'playbooks-sops', 'book-open',   10),
  ('Events',           'events',         'calendar-days', 20),
  ('Policies',         'policies',       'scroll-text', 30),
  ('Resources',        'resources',      'wrench',      40),
  ('Contacts',         'contacts',       'users',       50),
  ('Onboarding',       'onboarding',     'sprout',      60)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------

create table if not exists public.pages (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete restrict,
  parent_id    uuid references public.pages(id) on delete cascade,
  title        text not null default 'Untitled',
  slug         text not null,
  icon         text,
  cover_url    text,
  content      jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  excerpt      text not null default '',
  status       text not null default 'draft' check (status in ('draft', 'published')),
  pinned       boolean not null default false,
  sort_order   integer not null default 0,
  created_by   uuid references public.profiles(id) on delete set null,
  updated_by   uuid references public.profiles(id) on delete set null,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.pages is
  'Wiki articles. Two-level cap (page with parent_id cannot itself be a parent) enforced by trigger.';

-- Slug uniqueness within a category (and only for non-deleted pages so trash
-- doesn't squat on slugs).
create unique index if not exists pages_category_slug_unique
  on public.pages (category_id, slug)
  where deleted_at is null;

create index if not exists pages_category_status_idx
  on public.pages (category_id, status, deleted_at);

create index if not exists pages_parent_idx
  on public.pages (parent_id)
  where parent_id is not null;

create index if not exists pages_updated_at_idx
  on public.pages (updated_at desc)
  where status = 'published' and deleted_at is null;

create index if not exists pages_pinned_idx
  on public.pages (sort_order, updated_at desc)
  where pinned and status = 'published' and deleted_at is null;

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- Two-level depth cap: a page may have a parent OR children, never both.
create or replace function public.enforce_page_depth()
returns trigger
language plpgsql
as $$
declare
  parent_parent uuid;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A page cannot be its own parent';
    end if;
    select p.parent_id into parent_parent
      from public.pages p
      where p.id = new.parent_id;
    if parent_parent is not null then
      raise exception 'Pages can be at most two levels deep (parent % is itself a child)', new.parent_id;
    end if;
    if exists (select 1 from public.pages where parent_id = new.id) then
      raise exception 'Page % already has children; it cannot become a child of another page', new.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists pages_enforce_depth on public.pages;
create trigger pages_enforce_depth
  before insert or update of parent_id on public.pages
  for each row execute function public.enforce_page_depth();

-- ---------------------------------------------------------------------------
-- tags + page_tags
-- ---------------------------------------------------------------------------

create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.page_tags (
  page_id  uuid not null references public.pages(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (page_id, tag_id)
);

create index if not exists page_tags_tag_idx on public.page_tags (tag_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.pages       enable row level security;
alter table public.tags        enable row level security;
alter table public.page_tags   enable row level security;

-- categories: everyone reads; only owner mutates.
drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
  on public.categories
  for select
  to authenticated
  using (true);

drop policy if exists "categories_owner_mutate" on public.categories;
create policy "categories_owner_mutate"
  on public.categories
  for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

-- pages: everyone reads non-deleted; any active member writes; hard delete
-- restricted to owner. Soft-delete is just an UPDATE setting deleted_at, which
-- the UPDATE policy allows.
drop policy if exists "pages_select_authenticated" on public.pages;
create policy "pages_select_authenticated"
  on public.pages
  for select
  to authenticated
  using (deleted_at is null or public.current_user_role() = 'owner');

drop policy if exists "pages_insert_member" on public.pages;
create policy "pages_insert_member"
  on public.pages
  for insert
  to authenticated
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "pages_update_member" on public.pages;
create policy "pages_update_member"
  on public.pages
  for update
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "pages_delete_owner" on public.pages;
create policy "pages_delete_owner"
  on public.pages
  for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- tags: everyone reads; any active member creates; only owner renames/deletes.
drop policy if exists "tags_select_authenticated" on public.tags;
create policy "tags_select_authenticated"
  on public.tags
  for select
  to authenticated
  using (true);

drop policy if exists "tags_insert_member" on public.tags;
create policy "tags_insert_member"
  on public.tags
  for insert
  to authenticated
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "tags_owner_mutate" on public.tags;
create policy "tags_owner_mutate"
  on public.tags
  for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

drop policy if exists "tags_owner_delete" on public.tags;
create policy "tags_owner_delete"
  on public.tags
  for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- page_tags: everyone reads; any active member writes.
drop policy if exists "page_tags_select_authenticated" on public.page_tags;
create policy "page_tags_select_authenticated"
  on public.page_tags
  for select
  to authenticated
  using (true);

drop policy if exists "page_tags_mutate_member" on public.page_tags;
create policy "page_tags_mutate_member"
  on public.page_tags
  for all
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));
