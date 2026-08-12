alter table public.trade_threads
  alter column requested_figure_id drop not null,
  alter column offered_figure_id drop not null,
  add column if not exists conversation_kind text not null default 'trade' check (conversation_kind in ('trade', 'direct')),
  add column if not exists topic text check (topic is null or char_length(trim(topic)) between 1 and 120);
create unique index if not exists trade_threads_open_direct on public.trade_threads (least(member_a, member_b), greatest(member_a, member_b)) where conversation_kind = 'direct' and status in ('pending', 'active');
drop policy if exists "Read own or conversation profiles" on public.trade_profiles;
create policy "Read discoverable or connected profiles" on public.trade_profiles for select to authenticated using ((select auth.uid()) = user_id or discoverable or exists (select 1 from public.trade_threads t where (select auth.uid()) in (t.member_a, t.member_b) and user_id in (t.member_a, t.member_b)));
create or replace function public.start_direct_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); thread_id uuid;
begin
  if me is null or me = p_other then raise exception 'Invalid conversation participant'; end if;
  if not exists (select 1 from public.trade_profiles mine join public.trade_profiles other on other.user_id = p_other where mine.user_id = me and mine.discoverable and other.discoverable) then raise exception 'Both collectors must enable subscriber messages'; end if;
  if exists (select 1 from public.trade_blocks where (blocker_id = me and blocked_id = p_other) or (blocker_id = p_other and blocked_id = me)) then raise exception 'Conversation unavailable'; end if;
  select id into thread_id from public.trade_threads where conversation_kind = 'direct' and status in ('pending', 'active') and least(member_a, member_b) = least(me, p_other) and greatest(member_a, member_b) = greatest(me, p_other) limit 1;
  if thread_id is null then insert into public.trade_threads(created_by, member_a, member_b, conversation_kind, topic) values(me, me, p_other, 'direct', 'Collector conversation') returning id into thread_id; end if;
  return thread_id;
end $$;
revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
