
-- Keep the directory useful without making profile visibility depend on
-- trade_threads. The previous connected-profile check formed a circular RLS
-- dependency with the direct-message insert policy.
drop policy if exists "Read discoverable or connected profiles" on public.trade_profiles;

create policy "Read own or discoverable trade profiles"
on public.trade_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or discoverable
);
