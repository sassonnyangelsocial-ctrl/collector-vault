create extension if not exists "pgcrypto";

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  series text not null,
  brand text default 'User Added',
  rarity text default 'Regular',
  quantity integer not null default 0 check (quantity >= 0),
  owned boolean not null default false,
  wishlist boolean not null default false,
  iso boolean not null default false,
  diso boolean not null default false,
  for_trade boolean not null default false,
  notes text,
  created_at timestamptz default now()
);

alter table public.collection_items enable row level security;

drop policy if exists "Owner reads collection" on public.collection_items;
drop policy if exists "Owner adds collection" on public.collection_items;
drop policy if exists "Owner updates collection" on public.collection_items;
drop policy if exists "Owner deletes collection" on public.collection_items;

create policy "Owner reads collection" on public.collection_items for select using (auth.uid() = user_id);
create policy "Owner adds collection" on public.collection_items for insert with check (auth.uid() = user_id);
create policy "Owner updates collection" on public.collection_items for update using (auth.uid() = user_id);
create policy "Owner deletes collection" on public.collection_items for delete using (auth.uid() = user_id);

-- Status fields used by the catalog-backed dashboard.
alter table if exists public.user_figures
  add column if not exists iso boolean not null default false,
  add column if not exists diso boolean not null default false;

create index if not exists idx_user_figures_figure_id on public.user_figures (figure_id);

-- Official catalog provenance and auditable market estimates.
alter table if exists public.series
  add column if not exists source_url text,
  add column if not exists verified_at timestamptz;

alter table if exists public.figures
  add column if not exists image_source_url text,
  add column if not exists image_verified_at timestamptz,
  add column if not exists edition_type text not null default 'regular';

create table if not exists public.figure_market_values (
  id uuid primary key default gen_random_uuid(),
  figure_id uuid not null references public.figures(id) on delete cascade,
  currency text not null default 'USD',
  estimated_value numeric(10,2),
  low_value numeric(10,2),
  high_value numeric(10,2),
  as_of_date date not null,
  source_urls jsonb not null default '[]'::jsonb,
  sample_size integer,
  methodology text not null,
  confidence text not null default 'low',
  created_at timestamptz not null default now(),
  unique (figure_id, currency, as_of_date)
);

create index if not exists idx_figure_market_values_latest
  on public.figure_market_values (figure_id, currency, as_of_date desc);

alter table public.figure_market_values enable row level security;
drop policy if exists "Public reads market values" on public.figure_market_values;
create policy "Public reads market values" on public.figure_market_values for select using (true);
