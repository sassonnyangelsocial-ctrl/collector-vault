create table public.sms_alert_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade, phone_e164 text, phone_verified_at timestamptz, sms_enabled boolean not null default false,
 event_types text[] not null default array['restock','drop','launch','inventory'], quiet_start time not null default '22:00', quiet_end time not null default '08:00', timezone text not null default 'America/New_York',
 consented_at timestamptz, unsubscribed_at timestamptz, updated_at timestamptz not null default now(),
 check (event_types <@ array['restock','drop','launch','inventory']::text[]), check (sms_enabled=false or phone_verified_at is not null)
);
alter table public.sms_alert_preferences enable row level security;
create policy "Members read SMS settings" on public.sms_alert_preferences for select to authenticated using ((select auth.uid())=user_id);
grant select on public.sms_alert_preferences to authenticated;
create table public.sms_verification_challenges (user_id uuid primary key references auth.users(id) on delete cascade,verification_hash text not null,expires_at timestamptz not null,created_at timestamptz not null default now());
alter table public.sms_verification_challenges enable row level security;
revoke all on public.sms_verification_challenges from anon,authenticated;
create policy "No client access to SMS challenges" on public.sms_verification_challenges for all to authenticated using (false) with check (false);
create table public.user_alert_sources (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null,url text not null,active boolean not null default true,created_at timestamptz not null default now(),unique(user_id,url));
alter table public.user_alert_sources enable row level security;
create policy "Members manage own alert sources" on public.user_alert_sources for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.user_alert_sources to authenticated;
create table public.sms_delivery_log (id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,alert_id bigint not null references public.stock_alerts(id) on delete cascade,provider_message_id text,status text not null,error_message text,created_at timestamptz not null default now(),unique(user_id,alert_id));
alter table public.sms_delivery_log enable row level security;
create policy "Members read own SMS delivery log" on public.sms_delivery_log for select to authenticated using ((select auth.uid())=user_id);
grant select on public.sms_delivery_log to authenticated;
