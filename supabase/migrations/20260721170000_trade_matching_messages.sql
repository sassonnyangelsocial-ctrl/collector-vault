create table public.trade_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trade_threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  member_a uuid not null references auth.users(id) on delete cascade,
  member_b uuid not null references auth.users(id) on delete cascade,
  requested_figure_id uuid not null references public.figures(id),
  offered_figure_id uuid not null references public.figures(id),
  status text not null default 'pending' check (status in ('pending','active','declined','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_a <> member_b)
);

create unique index trade_threads_open_match on public.trade_threads
  (least(member_a,member_b), greatest(member_a,member_b), requested_figure_id, offered_figure_id)
  where status in ('pending','active');

create table public.trade_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.trade_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index trade_messages_thread_created on public.trade_messages(thread_id, created_at);

create table public.trade_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.trade_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references public.trade_threads(id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);

alter table public.trade_profiles enable row level security;
alter table public.trade_threads enable row level security;
alter table public.trade_messages enable row level security;
alter table public.trade_blocks enable row level security;
alter table public.trade_reports enable row level security;

create policy "Read own or conversation profiles" on public.trade_profiles for select to authenticated using (
  (select auth.uid()) = user_id or exists (
    select 1 from public.trade_threads t where (select auth.uid()) in (t.member_a,t.member_b) and user_id in (t.member_a,t.member_b)
  )
);
create policy "Create own trade profile" on public.trade_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own trade profile" on public.trade_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Participants read trade threads" on public.trade_threads for select to authenticated using ((select auth.uid()) in (member_a,member_b));
create policy "Participants update trade threads" on public.trade_threads for update to authenticated using ((select auth.uid()) in (member_a,member_b)) with check ((select auth.uid()) in (member_a,member_b));

create policy "Participants read messages" on public.trade_messages for select to authenticated using (
  exists (select 1 from public.trade_threads t where t.id=thread_id and (select auth.uid()) in (t.member_a,t.member_b))
);
create policy "Participants send messages" on public.trade_messages for insert to authenticated with check (
  sender_id=(select auth.uid()) and exists (select 1 from public.trade_threads t where t.id=thread_id and (select auth.uid()) in (t.member_a,t.member_b) and t.status in ('pending','active'))
);
create policy "Manage own blocks" on public.trade_blocks for all to authenticated using (blocker_id=(select auth.uid())) with check (blocker_id=(select auth.uid()));
create policy "Create own reports" on public.trade_reports for insert to authenticated with check (
  reporter_id=(select auth.uid()) and reporter_id<>reported_user_id and
  (thread_id is null or exists (select 1 from public.trade_threads t where t.id=thread_id and (select auth.uid()) in (t.member_a,t.member_b) and reported_user_id in (t.member_a,t.member_b)))
);
create policy "Read own reports" on public.trade_reports for select to authenticated using (reporter_id=(select auth.uid()));

grant select,insert,update on public.trade_profiles to authenticated;
grant select on public.trade_threads to authenticated;
grant update(status,updated_at) on public.trade_threads to authenticated;
grant select,insert on public.trade_messages to authenticated;
grant select,insert,delete on public.trade_blocks to authenticated;
grant select,insert on public.trade_reports to authenticated;
grant usage,select on sequence public.trade_messages_id_seq to authenticated;

create or replace function public.find_trade_matches()
returns table(other_user_id uuid, display_name text, requested_figure_id uuid, requested_name text, offered_figure_id uuid, offered_name text)
language sql security definer set search_path = '' as $$
  select other.user_id, p.display_name, wanted.figure_id, wf.name, offered.figure_id, ofig.name
  from public.trade_profiles me
  join public.user_figures wanted on wanted.user_id=me.user_id and (wanted.iso or wanted.diso)
  join public.user_figures other on other.figure_id=wanted.figure_id and other.for_trade
  join public.trade_profiles p on p.user_id=other.user_id and p.discoverable
  join public.user_figures offered on offered.user_id=me.user_id and offered.for_trade
  join public.user_figures their_want on their_want.user_id=other.user_id and their_want.figure_id=offered.figure_id and (their_want.iso or their_want.diso)
  join public.figures wf on wf.id=wanted.figure_id
  join public.figures ofig on ofig.id=offered.figure_id
  where me.user_id=(select auth.uid()) and me.discoverable and other.user_id<>me.user_id
    and not exists (select 1 from public.trade_blocks b where (b.blocker_id=me.user_id and b.blocked_id=other.user_id) or (b.blocker_id=other.user_id and b.blocked_id=me.user_id))
  order by p.display_name, wf.name limit 100;
$$;

create or replace function public.start_trade_conversation(p_other uuid, p_requested uuid, p_offered uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); new_id uuid;
begin
  if me is null or me=p_other then raise exception 'Invalid trade participant'; end if;
  if not exists (select 1 from public.trade_profiles a join public.trade_profiles b on b.user_id=p_other where a.user_id=me and a.discoverable and b.discoverable) then raise exception 'Both members must enable trade matching'; end if;
  if not exists (select 1 from public.user_figures mine join public.user_figures theirs on theirs.user_id=p_other and theirs.figure_id=p_requested where mine.user_id=me and mine.figure_id=p_requested and (mine.iso or mine.diso) and theirs.for_trade) then raise exception 'Requested figure is no longer a match'; end if;
  if not exists (select 1 from public.user_figures mine join public.user_figures theirs on theirs.user_id=p_other and theirs.figure_id=p_offered where mine.user_id=me and mine.figure_id=p_offered and mine.for_trade and (theirs.iso or theirs.diso)) then raise exception 'Offered figure is no longer a match'; end if;
  if exists (select 1 from public.trade_blocks where (blocker_id=me and blocked_id=p_other) or (blocker_id=p_other and blocked_id=me)) then raise exception 'Conversation unavailable'; end if;
  insert into public.trade_threads(created_by,member_a,member_b,requested_figure_id,offered_figure_id)
  values(me,me,p_other,p_requested,p_offered) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.find_trade_matches() from public, anon;
revoke all on function public.start_trade_conversation(uuid,uuid,uuid) from public, anon;
grant execute on function public.find_trade_matches() to authenticated;
grant execute on function public.start_trade_conversation(uuid,uuid,uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trade_messages') then
    alter publication supabase_realtime add table public.trade_messages;
  end if;
end $$;
