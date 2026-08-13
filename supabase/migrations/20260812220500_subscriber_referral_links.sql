create table public.subscriber_invite_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{10,32}$'),
  created_at timestamptz not null default now()
);

alter table public.subscriber_invite_links enable row level security;

create policy "Subscribers read own invite link" on public.subscriber_invite_links
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Subscribers create own invite link" on public.subscriber_invite_links
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.subscriber_invite_links to authenticated;
