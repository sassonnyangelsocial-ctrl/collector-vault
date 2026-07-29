create table if not exists public.market_comparables (
  id uuid primary key default gen_random_uuid(),
  figure_id uuid not null references public.figures(id) on delete cascade,
  source text not null check (source in ('eBay sold','Mercari sold','Whatnot sold','Other verified sale')),
  title text not null check (char_length(trim(title)) between 3 and 300),
  source_url text not null check (source_url ~ '^https://'),
  price numeric(10,2) not null check (price > 0 and price < 100000),
  shipping numeric(10,2) not null default 0 check (shipping >= 0 and shipping < 10000),
  sold_on date not null,
  condition text not null default 'Used' check (condition in ('New','Used','Unknown')),
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (figure_id, source_url)
);

create index if not exists market_comparables_figure_sold_on_idx
  on public.market_comparables (figure_id, sold_on desc);
create index if not exists market_comparables_created_by_idx
  on public.market_comparables (created_by);

alter table public.market_comparables enable row level security;

create policy "Admins manage market comparables" on public.market_comparables
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (created_by = (select auth.uid()) and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "Admins insert market values" on public.figure_market_values
for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "Admins update market values" on public.figure_market_values
for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
