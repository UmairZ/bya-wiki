-- Fix: the english tsvector tokenizer treats hostname-like strings
-- ("bya-logo-placeholder.svg") as a single token, so a search for "logo"
-- doesn't match a file titled "bya-logo-placeholder.svg".
--
-- Re-create the tsv columns with a regex_replace that converts
-- `.`, `_`, `-` to spaces before tokenizing. Filenames now index as
-- separate words.
--
-- Run this in Supabase Dashboard → SQL Editor. Safe to re-run.

set search_path = public;

alter table public.resources drop column if exists tsv;

alter table public.resources
  add column tsv tsvector generated always as (
    setweight(
      to_tsvector(
        'english',
        coalesce(regexp_replace(title, '[._\-]', ' ', 'g'), '')
      ),
      'A'
    ) ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

drop index if exists resources_tsv_idx;
create index resources_tsv_idx on public.resources using gin (tsv);

alter table public.pages drop column if exists tsv;

alter table public.pages
  add column tsv tsvector generated always as (
    setweight(
      to_tsvector(
        'english',
        coalesce(regexp_replace(title, '[._\-]', ' ', 'g'), '')
      ),
      'A'
    ) ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored;

drop index if exists pages_tsv_idx;
create index pages_tsv_idx on public.pages using gin (tsv);
