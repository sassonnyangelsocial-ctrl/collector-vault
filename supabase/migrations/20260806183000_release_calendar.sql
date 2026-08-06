alter table public.stock_alerts
  add column if not exists event_at timestamptz,
  add column if not exists event_end_at timestamptz,
  add column if not exists event_location text;

alter table public.stock_alerts
  drop constraint if exists stock_alerts_event_range_check;

alter table public.stock_alerts
  add constraint stock_alerts_event_range_check
  check (event_end_at is null or event_at is null or event_end_at >= event_at);

create index if not exists stock_alerts_event_at_idx
  on public.stock_alerts (event_at)
  where event_at is not null;

comment on column public.stock_alerts.event_at is 'Verified launch, drop, or restock event start time.';
comment on column public.stock_alerts.event_end_at is 'Optional verified event end time.';
comment on column public.stock_alerts.event_location is 'Optional store, website, or region for the event.';
