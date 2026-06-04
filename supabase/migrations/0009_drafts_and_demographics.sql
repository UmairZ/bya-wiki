-- Phase 7e: Drafts (private-first event creation) + demographics tags +
-- task offset backfill support.
--
-- Drafts let you start an event with just a title — date, location, etc. fill
-- in over time. Drafts live in our DB only; "Publish to calendar" creates the
-- real Google Calendar event and swaps workflows.target_ref over.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

-- ---------------------------------------------------------------------------
-- Rename the first stage to "Drafts" (idempotent, handles either prior name)
-- ---------------------------------------------------------------------------

update public.event_stages
set name = 'Drafts'
where name in ('Scoping', 'Ideation');

-- ---------------------------------------------------------------------------
-- draft_events
-- ---------------------------------------------------------------------------

create table if not exists public.draft_events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  starts_at         timestamptz,
  ends_at           timestamptz,
  all_day           boolean not null default false,
  location          text,
  description       text not null default '',
  registration_url  text,
  audience          text check (
    audience in (
      'Kids', 'Jr. Youth', 'Youth', 'Young Professionals', 'Family'
    )
  ),
  gender            text check (gender in ('Girls', 'Boys', 'Both')),
  free_tags         text[] not null default '{}',
  archived          boolean not null default false,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.draft_events is
  'Wiki-only draft events. Promoted to Google Calendar via the publishDraft action, which copies fields into a new GCal event, updates the attached workflow target_ref, and hard-deletes the draft.';

create index if not exists draft_events_active_idx
  on public.draft_events (archived, starts_at nulls last);

drop trigger if exists draft_events_set_updated_at on public.draft_events;
create trigger draft_events_set_updated_at
  before update on public.draft_events
  for each row execute function public.set_updated_at();

alter table public.draft_events enable row level security;

drop policy if exists "draft_events_select" on public.draft_events;
create policy "draft_events_select"
  on public.draft_events for select
  to authenticated using (true);

drop policy if exists "draft_events_insert_member" on public.draft_events;
create policy "draft_events_insert_member"
  on public.draft_events for insert
  to authenticated
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "draft_events_update_member" on public.draft_events;
create policy "draft_events_update_member"
  on public.draft_events for update
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "draft_events_delete_owner" on public.draft_events;
create policy "draft_events_delete_owner"
  on public.draft_events for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- Editors need delete too so they can drop their own drafts and so the
-- publishDraft action (which hard-deletes the draft) works for non-owners.
drop policy if exists "draft_events_delete_member" on public.draft_events;
create policy "draft_events_delete_member"
  on public.draft_events for delete
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'));

-- ---------------------------------------------------------------------------
-- workflows.target_kind: add 'draft'
-- ---------------------------------------------------------------------------

alter table public.workflows
  drop constraint if exists workflows_target_kind_check;

alter table public.workflows
  add constraint workflows_target_kind_check
  check (target_kind in ('event', 'page', 'space', 'standalone', 'draft'));

-- ---------------------------------------------------------------------------
-- tasks.default_offset_days
--
-- Needed so that when a draft's date gets set (or changed), we can recompute
-- due_at across all of its workflow's tasks. We copy the value from
-- playbook_template_tasks at apply time going forward; this migration also
-- best-effort backfills existing rows by matching (template_id, stage_id, title).
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists default_offset_days integer;

-- Best-effort backfill. Skips tasks whose workflow has no template_id, or
-- whose (stage, title) doesn't uniquely match a template task.
update public.tasks t
set default_offset_days = sub.default_offset_days
from (
  select t2.id as task_id,
         max(pt.default_offset_days) as default_offset_days,
         count(pt.id) as match_count
  from public.tasks t2
  join public.workflows w on w.id = t2.workflow_id
  left join public.playbook_template_tasks pt
    on pt.template_id = w.template_id
   and pt.event_stage_id = t2.event_stage_id
   and pt.title = t2.title
  where t2.default_offset_days is null
    and w.template_id is not null
  group by t2.id
) sub
where t.id = sub.task_id
  and sub.match_count = 1
  and sub.default_offset_days is not null;
