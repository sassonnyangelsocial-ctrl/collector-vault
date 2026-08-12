create table if not exists public.incoming_figures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  figure_id uuid not null references public.figures(id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 999),
  status text not null default 'ordered' check (status in ('ordered', 'shipped', 'out_for_delivery', 'received', 'cancelled')),
  seller text check (seller is null or char_length(seller) <= 120),
  order_date date,
  expected_date date,
  tracking_url text check (tracking_url is null or tracking_url ~ '^https?://'),
  notes text check (notes is null or char_length(notes) <= 1000),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incoming_figures_user_status
  on public.incoming_figures (user_id, status, expected_date, created_at desc);
create index if not exists idx_incoming_figures_user_figure
  on public.incoming_figures (user_id, figure_id)
  where status not in ('received', 'cancelled');

alter table public.incoming_figures enable row level security;
grant select, insert, update, delete on table public.incoming_figures to authenticated;

drop policy if exists "Owners read incoming figures" on public.incoming_figures;
drop policy if exists "Owners add incoming figures" on public.incoming_figures;
drop policy if exists "Owners update incoming figures" on public.incoming_figures;
drop policy if exists "Owners delete incoming figures" on public.incoming_figures;

create policy "Owners read incoming figures" on public.incoming_figures
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners add incoming figures" on public.incoming_figures
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update incoming figures" on public.incoming_figures
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners delete incoming figures" on public.incoming_figures
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.receive_incoming_figure(incoming_id uuid)
returns public.incoming_figures
language plpgsql
security invoker
set search_path = public
as $$
declare
  item public.incoming_figures;
begin
  update public.incoming_figures
  set status = 'received', received_at = now(), updated_at = now()
  where id = incoming_id
    and user_id = (select auth.uid())
    and status not in ('received', 'cancelled')
  returning * into item;

  if item.id is null then
    raise exception 'Incoming item not found or already completed';
  end if;

  insert into public.user_figures (user_id, figure_id, owned, quantity)
  values ((select auth.uid()), item.figure_id, true, item.quantity)
  on conflict (user_id, figure_id) do update
    set owned = true,
        quantity = public.user_figures.quantity + excluded.quantity,
        updated_at = now();

  return item;
end;
$$;

revoke all on function public.receive_incoming_figure(uuid) from public, anon;
grant execute on function public.receive_incoming_figure(uuid) to authenticated;

