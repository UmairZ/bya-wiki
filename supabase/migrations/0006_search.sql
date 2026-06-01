-- Phase 3: Postgres full-text search.
--
-- Adds generated tsvector columns to pages and resources, GIN indexes for
-- fast @@ matches, and an RPC that returns ranked results across both.
-- Events are NOT indexed here — they live in Google Calendar and are
-- filtered in app code at query time.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

-- ---------------------------------------------------------------------------
-- pages.tsv  (title weight A, excerpt B)
-- ---------------------------------------------------------------------------

-- regexp_replace turns dashes/underscores/dots into spaces before
-- tokenizing so filenames like "bya-logo-placeholder.svg" index as
-- ["bya", "logo", "placeholder", "svg"] instead of one whole token.
alter table public.pages
  add column if not exists tsv tsvector generated always as (
    setweight(
      to_tsvector(
        'english',
        coalesce(regexp_replace(title, '[._\-]', ' ', 'g'), '')
      ),
      'A'
    ) ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored;

create index if not exists pages_tsv_idx
  on public.pages using gin (tsv);

-- ---------------------------------------------------------------------------
-- resources.tsv  (title A, description B)
-- ---------------------------------------------------------------------------

alter table public.resources
  add column if not exists tsv tsvector generated always as (
    setweight(
      to_tsvector(
        'english',
        coalesce(regexp_replace(title, '[._\-]', ' ', 'g'), '')
      ),
      'A'
    ) ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index if not exists resources_tsv_idx
  on public.resources using gin (tsv);

-- ---------------------------------------------------------------------------
-- search_wiki(q) — single RPC returns ranked pages + resources interleaved.
--
-- Returns the columns the UI needs to render a result row, plus a kind
-- discriminator and a numeric rank. SECURITY INVOKER so the caller's RLS
-- still applies (no leakage of soft-deleted rows to non-owners).
-- ---------------------------------------------------------------------------

create or replace function public.search_wiki(q text)
returns table (
  kind          text,
  id            uuid,
  title         text,
  snippet       text,
  category_id   uuid,
  category_name text,
  category_slug text,
  updated_at    timestamptz,
  file_type     text,
  rank          real
)
language sql
stable
security invoker
set search_path = public
as $$
  with query as (
    select websearch_to_tsquery('english', q) as tsq
  )
  -- Pages
  select
    'page'::text                     as kind,
    p.id,
    p.title,
    coalesce(nullif(p.excerpt, ''), '') as snippet,
    p.category_id,
    c.name                            as category_name,
    c.slug                            as category_slug,
    p.updated_at,
    null::text                        as file_type,
    ts_rank(p.tsv, (select tsq from query)) as rank
  from public.pages p
  left join public.categories c on c.id = p.category_id
  where p.deleted_at is null
    and p.tsv @@ (select tsq from query)

  union all

  -- Resources
  select
    'file'::text                     as kind,
    r.id,
    r.title,
    coalesce(nullif(r.description, ''), '') as snippet,
    r.category_id,
    c.name                            as category_name,
    c.slug                            as category_slug,
    r.updated_at,
    r.file_type,
    ts_rank(r.tsv, (select tsq from query)) as rank
  from public.resources r
  left join public.categories c on c.id = r.category_id
  where r.deleted_at is null
    and r.tsv @@ (select tsq from query)

  order by rank desc, updated_at desc
  limit 30
$$;

grant execute on function public.search_wiki(text) to authenticated;
