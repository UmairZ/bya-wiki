-- Phase 7f: Tasks become first-class. Drop the "workflow" wrapper.
--
-- Today: tasks belong to workflows, workflows belong to events/drafts. You
-- can't add a task without first applying a playbook (which creates the
-- workflow). That's friction nobody wanted.
--
-- After this migration:
--   - tasks attach directly to events/drafts via target_kind + target_ref
--     (mirror of what workflows had)
--   - "+ Add task" works on any event/draft with no setup
--   - "Apply playbook" is a bulk-insert of template tasks — no wrapper row
--   - Multiple playbooks can stack on one event; duplicates allowed (the
--     "dumb append" model — user deletes what they don't want)
--   - source_template_id on each task lets us still show "this came from
--     Event prep" and group by source for UI/reporting
--
-- Also: remove any Drafts-stage tasks from the seeded "Event prep" template,
-- since playbooks no longer populate the Drafts stage.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

-- ---------------------------------------------------------------------------
-- Add new columns to tasks
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists target_kind text
  check (target_kind in ('event', 'draft', 'page', 'space', 'standalone'));

alter table public.tasks
  add column if not exists target_ref text;

alter table public.tasks
  add column if not exists source_template_id uuid
  references public.playbook_templates(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Backfill target_kind + target_ref + source_template_id from workflows
-- ---------------------------------------------------------------------------

update public.tasks t
set
  target_kind = w.target_kind,
  target_ref = w.target_ref,
  source_template_id = w.template_id
from public.workflows w
where t.workflow_id = w.id
  and t.target_kind is null;

-- ---------------------------------------------------------------------------
-- Drop workflow_id (after backfill)
-- ---------------------------------------------------------------------------

alter table public.tasks
  drop column if exists workflow_id;

-- Now make the new columns non-nullable.
alter table public.tasks
  alter column target_kind set not null;

alter table public.tasks
  alter column target_ref set not null;

-- Drop the old open-by-workflow index since the column is gone.
drop index if exists public.tasks_open_by_workflow_idx;

-- New indexes for the common lookups: tasks per target, open tasks per target.
create index if not exists tasks_target_idx
  on public.tasks (target_kind, target_ref, event_stage_id, sort_order);

create index if not exists tasks_open_by_target_idx
  on public.tasks (target_kind, target_ref, event_stage_id)
  where status in ('todo', 'in_progress');

-- ---------------------------------------------------------------------------
-- Drop the workflows table (and its trigger/policies cascade)
-- ---------------------------------------------------------------------------

drop table if exists public.workflows cascade;

-- ---------------------------------------------------------------------------
-- Strip Drafts-stage tasks from the seeded "Event prep" template (and any
-- other template) — playbooks no longer populate the Drafts column. Owner
-- can still create them manually if they want, but the seed shouldn't.
-- ---------------------------------------------------------------------------

delete from public.playbook_template_tasks
where event_stage_id in (
  select id from public.event_stages
  where name in ('Drafts', 'Scoping', 'Ideation')
);

-- ---------------------------------------------------------------------------
-- Optional but tidy: if any tasks exist with target_kind = 'event' but no
-- corresponding draft (because their draft was published earlier), the
-- backfill already pointed them at the Google event UID. Nothing to do here.
-- ---------------------------------------------------------------------------
