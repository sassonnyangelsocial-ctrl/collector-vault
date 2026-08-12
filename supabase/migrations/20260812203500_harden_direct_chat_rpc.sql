create policy "Read blocks involving self" on public.trade_blocks
  for select to authenticated
  using ((select auth.uid()) in (blocker_id, blocked_id));

create policy "Start direct subscriber conversations" on public.trade_threads
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and member_a = (select auth.uid())
    and member_b <> (select auth.uid())
    and conversation_kind = 'direct'
    and requested_figure_id is null
    and offered_figure_id is null
    and exists (
      select 1 from public.trade_profiles mine
      join public.trade_profiles other on other.user_id = member_b
      where mine.user_id = (select auth.uid()) and mine.discoverable and other.discoverable
    )
    and not exists (
      select 1 from public.trade_blocks
      where (blocker_id = member_a and blocked_id = member_b)
         or (blocker_id = member_b and blocked_id = member_a)
    )
  );

grant insert on public.trade_threads to authenticated;

alter function public.start_direct_conversation(uuid) security invoker;

