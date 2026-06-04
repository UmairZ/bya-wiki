-- Per-event flyer visibility flags for the public /r/events page.
--
-- registration_closed: still render the tile (link still clickable) but
--   show a "Registration closed" badge.
-- hidden_from_public: skip the tile entirely on /r/events. The flyer
--   stays attached to the event for internal team reference; only the
--   public surface is affected.
--
-- Both default false so existing flyers continue to appear unchanged.

alter table public.event_flyers
  add column if not exists registration_closed boolean not null default false,
  add column if not exists hidden_from_public  boolean not null default false;
