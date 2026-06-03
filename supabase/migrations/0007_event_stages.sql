-- Phase 7a: event_stages — org-wide stages used by the Events Kanban,
-- playbook templates, and workflow tasks.
--
-- Org-wide (single shared list) so renaming "Pre-event" → "Planning"
-- reflects everywhere immediately. Owner-managed from /admin/event-stages.
-- Tables that will reference event_stages.id (playbook_template_tasks,
-- tasks) ship in 7b — deletion of a stage will be blocked at that point
-- by FK on delete restrict.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

create table if not exists public.event_stages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.event_stages is
  'Org-wide event stages. Workflows + playbook tasks reference rows here directly; rename and every workflow updates.';

create index if not exists event_stages_sort_idx
  on public.event_stages (sort_order, name);

drop trigger if exists event_stages_set_updated_at on public.event_stages;
create trigger event_stages_set_updated_at
  before update on public.event_stages
  for each row execute function public.set_updated_at();

-- Seed the four defaults. Idempotent via name uniqueness check; we DON'T
-- add a unique constraint on name because the owner is free to rename a
-- stage later.
insert into public.event_stages (name, sort_order)
select v.name, v.sort_order
from (values
  ('Scoping',    10),
  ('Pre-event',  20),
  ('Day-of',     30),
  ('Wrap-up',    40)
) as v(name, sort_order)
where not exists (
  select 1 from public.event_stages where event_stages.name = v.name
);

alter table public.event_stages enable row level security;

drop policy if exists "event_stages_select_authenticated" on public.event_stages;
create policy "event_stages_select_authenticated"
  on public.event_stages
  for select
  to authenticated
  using (true);

drop policy if exists "event_stages_owner_mutate" on public.event_stages;
create policy "event_stages_owner_mutate"
  on public.event_stages
  for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');
