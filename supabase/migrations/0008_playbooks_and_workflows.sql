-- Phase 7b: playbook templates + workflow instances + tasks.
--
-- Concepts (see phase-7-spec.md §5 for the full discussion):
--   - playbook_templates: reusable checklist owned by the org.
--   - playbook_template_tasks: tasks per template, grouped by event_stage_id.
--   - workflows: an instance of a template applied to a thing (today: a
--     Google Calendar event).
--   - tasks: actual instances copied from template tasks at apply time, owned
--     by the workflow.
--
-- Stages are NOT copied per-workflow — tasks reference public.event_stages
-- directly so renaming a stage org-wide reflects everywhere instantly.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

-- ---------------------------------------------------------------------------
-- playbook_templates
-- ---------------------------------------------------------------------------

create table if not exists public.playbook_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  archived    boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.playbook_templates is
  'Reusable owner-managed checklists. Edits do NOT propagate to live workflows; each apply takes a fresh copy.';

create index if not exists playbook_templates_active_idx
  on public.playbook_templates (archived, name);

drop trigger if exists playbook_templates_set_updated_at on public.playbook_templates;
create trigger playbook_templates_set_updated_at
  before update on public.playbook_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- playbook_template_tasks
-- ---------------------------------------------------------------------------

create table if not exists public.playbook_template_tasks (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid not null references public.playbook_templates(id) on delete cascade,
  event_stage_id        uuid not null references public.event_stages(id) on delete restrict,
  title                 text not null,
  description           text not null default '',
  sort_order            integer not null default 0,
  default_offset_days   integer,
  default_assignee_role text not null default 'any'
                         check (default_assignee_role in ('any', 'owner')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.playbook_template_tasks is
  'Task definitions inside a playbook template. sort_order is within (template_id, event_stage_id).';

create index if not exists playbook_template_tasks_template_idx
  on public.playbook_template_tasks (template_id, event_stage_id, sort_order);

drop trigger if exists playbook_template_tasks_set_updated_at on public.playbook_template_tasks;
create trigger playbook_template_tasks_set_updated_at
  before update on public.playbook_template_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workflows
-- ---------------------------------------------------------------------------

create table if not exists public.workflows (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid references public.playbook_templates(id) on delete set null,
  name         text not null,
  target_kind  text not null default 'event'
                 check (target_kind in ('event', 'page', 'space', 'standalone')),
  target_ref   text not null,
  starts_at    timestamptz,
  archived     boolean not null default false,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.workflows is
  'A playbook applied to a thing (today: a Google Calendar event keyed by uid in target_ref).';

-- One active workflow per (target_kind, target_ref) for now. Phase 8 may
-- allow multiple via automation chaining; we'll relax this then.
create unique index if not exists workflows_active_target_unique
  on public.workflows (target_kind, target_ref)
  where archived = false;

create index if not exists workflows_target_idx
  on public.workflows (target_kind, target_ref, archived);

drop trigger if exists workflows_set_updated_at on public.workflows;
create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.workflows(id) on delete cascade,
  event_stage_id  uuid not null references public.event_stages(id) on delete restrict,
  title           text not null,
  description     text not null default '',
  sort_order      integer not null default 0,
  status          text not null default 'todo'
                    check (status in ('todo', 'in_progress', 'done', 'skipped')),
  assigned_to     uuid references public.profiles(id) on delete set null,
  due_at          timestamptz,
  completed_at    timestamptz,
  completed_by    uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.tasks is
  'Concrete checklist items inside a workflow. Status drives the Events Kanban auto-placement: card sits in the first stage with any todo/in_progress task.';

create index if not exists tasks_workflow_stage_idx
  on public.tasks (workflow_id, event_stage_id, sort_order);

-- For the Events Kanban auto-placement query we frequently need
-- "open tasks per workflow per stage".
create index if not exists tasks_open_by_workflow_idx
  on public.tasks (workflow_id, event_stage_id)
  where status in ('todo', 'in_progress');

create index if not exists tasks_assigned_idx
  on public.tasks (assigned_to, status, due_at);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Stamp completed_at / completed_by when a task transitions to done.
-- Clear them on transitions back to todo / in_progress so the audit trail
-- doesn't lie.
create or replace function public.stamp_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    if new.completed_at is null then new.completed_at := now(); end if;
    if new.completed_by is null then new.completed_by := (select auth.uid()); end if;
  elsif new.status in ('todo', 'in_progress') and old.status = 'done' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_stamp_completion on public.tasks;
create trigger tasks_stamp_completion
  before update of status on public.tasks
  for each row execute function public.stamp_task_completion();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.playbook_templates      enable row level security;
alter table public.playbook_template_tasks enable row level security;
alter table public.workflows               enable row level security;
alter table public.tasks                   enable row level security;

-- playbook_templates: read all authenticated; mutate owner-only.
drop policy if exists "playbook_templates_select" on public.playbook_templates;
create policy "playbook_templates_select"
  on public.playbook_templates for select
  to authenticated using (true);

drop policy if exists "playbook_templates_owner_mutate" on public.playbook_templates;
create policy "playbook_templates_owner_mutate"
  on public.playbook_templates for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

-- playbook_template_tasks: same shape.
drop policy if exists "playbook_template_tasks_select" on public.playbook_template_tasks;
create policy "playbook_template_tasks_select"
  on public.playbook_template_tasks for select
  to authenticated using (true);

drop policy if exists "playbook_template_tasks_owner_mutate" on public.playbook_template_tasks;
create policy "playbook_template_tasks_owner_mutate"
  on public.playbook_template_tasks for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

-- workflows: read all; insert/update any active member; hard-delete owner.
drop policy if exists "workflows_select" on public.workflows;
create policy "workflows_select"
  on public.workflows for select
  to authenticated using (true);

drop policy if exists "workflows_insert_member" on public.workflows;
create policy "workflows_insert_member"
  on public.workflows for insert
  to authenticated
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "workflows_update_member" on public.workflows;
create policy "workflows_update_member"
  on public.workflows for update
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "workflows_delete_owner" on public.workflows;
create policy "workflows_delete_owner"
  on public.workflows for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- tasks: same as workflows.
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
  on public.tasks for select
  to authenticated using (true);

drop policy if exists "tasks_insert_member" on public.tasks;
create policy "tasks_insert_member"
  on public.tasks for insert
  to authenticated
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member"
  on public.tasks for update
  to authenticated
  using (public.current_user_role() in ('owner', 'editor'))
  with check (public.current_user_role() in ('owner', 'editor'));

drop policy if exists "tasks_delete_owner" on public.tasks;
create policy "tasks_delete_owner"
  on public.tasks for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Seed: "Event prep" playbook (spec §5.6)
--
-- 21 tasks spread across all four stages with default_offset_days from
-- −30d to +7d relative to the event start.
--
-- Idempotent: skipped entirely if a template named 'Event prep' already
-- exists (so re-running the migration after the owner has renamed or
-- customized the seeded playbook doesn't bring it back).
-- ---------------------------------------------------------------------------

do $$
declare
  v_template_id uuid;
  v_scoping_id  uuid;
  v_pre_event_id uuid;
  v_day_of_id   uuid;
  v_wrap_up_id  uuid;
begin
  if exists (select 1 from public.playbook_templates where name = 'Event prep') then
    return;
  end if;

  -- Look up stage ids by their default seed names. If the owner renamed
  -- them before running this migration, we fall back to sort_order.
  select id into v_scoping_id   from public.event_stages where name in ('Scoping', 'Ideation')   order by sort_order limit 1;
  select id into v_pre_event_id from public.event_stages where name = 'Pre-event';
  select id into v_day_of_id    from public.event_stages where name = 'Day-of';
  select id into v_wrap_up_id   from public.event_stages where name = 'Wrap-up';

  if v_scoping_id is null then
    select id into v_scoping_id from public.event_stages order by sort_order limit 1;
  end if;
  if v_pre_event_id is null then
    select id into v_pre_event_id from public.event_stages order by sort_order offset 1 limit 1;
  end if;
  if v_day_of_id is null then
    select id into v_day_of_id from public.event_stages order by sort_order offset 2 limit 1;
  end if;
  if v_wrap_up_id is null then
    select id into v_wrap_up_id from public.event_stages order by sort_order offset 3 limit 1;
  end if;

  insert into public.playbook_templates (name, description)
  values ('Event prep', 'Default checklist for planning any BYA event. Edit freely.')
  returning id into v_template_id;

  insert into public.playbook_template_tasks (template_id, event_stage_id, title, sort_order, default_offset_days)
  values
    (v_template_id, v_scoping_id,    'Decide event date',                        10, -30),
    (v_template_id, v_scoping_id,    'Pick speaker / topic',                     20, -28),
    (v_template_id, v_scoping_id,    'Confirm location',                         30, -25),
    (v_template_id, v_scoping_id,    'Draft budget',                             40, -24),

    (v_template_id, v_pre_event_id,  'Create flyer',                             10, -21),
    (v_template_id, v_pre_event_id,  'Post flyer to Instagram + WhatsApp',       20, -18),
    (v_template_id, v_pre_event_id,  'Open registration',                        30, -14),
    (v_template_id, v_pre_event_id,  'Recruit volunteers',                       40, -10),
    (v_template_id, v_pre_event_id,  'Order food / supplies',                    50,  -7),
    (v_template_id, v_pre_event_id,  'Send reminder #1',                         60,  -3),
    (v_template_id, v_pre_event_id,  'Send reminder #2',                         70,  -1),

    (v_template_id, v_day_of_id,     'Arrive early, set up room',                10,   0),
    (v_template_id, v_day_of_id,     'Sound / mic check',                        20,   0),
    (v_template_id, v_day_of_id,     'Welcome / sign-in table',                  30,   0),
    (v_template_id, v_day_of_id,     'Take photos',                              40,   0),
    (v_template_id, v_day_of_id,     'Run program',                              50,   0),

    (v_template_id, v_wrap_up_id,    'Pack up',                                  10,   1),
    (v_template_id, v_wrap_up_id,    'Send thank-you email',                     20,   2),
    (v_template_id, v_wrap_up_id,    'Post recap on Instagram',                  30,   3),
    (v_template_id, v_wrap_up_id,    'Archive notes + photos to Drive',          40,   5),
    (v_template_id, v_wrap_up_id,    'Reconcile expenses',                       50,   7);
end$$;
