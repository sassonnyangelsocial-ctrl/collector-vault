alter table public.trade_profiles
  add column if not exists contact_email text,
  add column if not exists email_visible boolean not null default false;

alter table public.trade_profiles
  drop constraint if exists trade_profiles_contact_email_check;

alter table public.trade_profiles
  add constraint trade_profiles_contact_email_check
  check (
    contact_email is null
    or (
      char_length(contact_email) <= 254
      and contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
  );

insert into public.trade_profiles (user_id, display_name, discoverable, contact_email, email_visible)
select
  u.id,
  coalesce(nullif(trim(p.display_name), ''), 'Collector ' || upper(substr(u.id::text, 1, 6))),
  true,
  null,
  false
from auth.users u
left join public.profiles p on p.id = u.id
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    'Collector ' || upper(substr(new.id::text, 1, 6))
  );

  insert into public.profiles(id, display_name)
  values (new.id, chosen_name);

  insert into public.trade_profiles(user_id, display_name, discoverable, contact_email, email_visible)
  values (new.id, chosen_name, true, null, false)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
