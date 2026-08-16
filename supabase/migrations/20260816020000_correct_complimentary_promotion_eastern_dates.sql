create or replace function private.create_membership_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_at >= timestamptz '2026-08-15 00:00:00 America/New_York'
     and new.created_at < timestamptz '2026-08-17 00:00:00 America/New_York' then
    insert into public.memberships (
      user_id, status, billing_interval, current_period_end,
      grandfathered, complimentary_access
    ) values (
      new.id, 'active', 'year', new.created_at + interval '1 year',
      false, true
    )
    on conflict (user_id) do nothing;
  else
    insert into public.memberships (user_id, status, grandfathered, complimentary_access)
    values (new.id, 'incomplete', false, false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

update public.memberships m
set status = 'active',
    billing_interval = 'year',
    current_period_end = u.created_at + interval '1 year',
    complimentary_access = true,
    updated_at = now()
from auth.users u
where m.user_id = u.id
  and u.created_at >= timestamptz '2026-08-15 00:00:00 America/New_York'
  and u.created_at < timestamptz '2026-08-17 00:00:00 America/New_York'
  and m.status not in ('active', 'trialing');
