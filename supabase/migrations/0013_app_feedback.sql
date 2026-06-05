-- Lightweight in-app feedback. Anyone with a profile can submit an idea
-- for how to improve the wiki/app. Append-only from the UI for now —
-- cleanup happens through the Supabase dashboard if needed.

create table if not exists public.app_feedback (
  id          uuid primary key default gen_random_uuid(),
  body        text not null check (length(trim(body)) > 0),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists app_feedback_recent_idx
  on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

-- Everyone with a profile can read all feedback.
drop policy if exists app_feedback_read on public.app_feedback;
create policy app_feedback_read on public.app_feedback
  for select
  using (auth.uid() is not null);

-- Any authenticated user can insert, but only as themselves.
drop policy if exists app_feedback_insert on public.app_feedback;
create policy app_feedback_insert on public.app_feedback
  for insert
  with check (created_by = auth.uid());

-- Authors can delete their own; owners can delete anyone's.
drop policy if exists app_feedback_delete on public.app_feedback;
create policy app_feedback_delete on public.app_feedback
  for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );
