-- Phase: structured event location (Google Places).
--
-- Adds optional structured columns to draft_events alongside the existing
-- free-text `location`. They are populated when a user picks a place from the
-- Google Places autocomplete, and left null for free-text entries. The
-- `location` column continues to hold the human-readable "Name, Address" string
-- used by every existing display and by the Google Calendar sync.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

set search_path = public;

alter table public.draft_events
  add column if not exists location_name     text,
  add column if not exists location_address  text,
  add column if not exists location_lat      double precision,
  add column if not exists location_lng      double precision,
  add column if not exists location_place_id text;

comment on column public.draft_events.location_place_id is
  'Google Places place_id when the location was chosen from autocomplete; null for free-text locations.';
