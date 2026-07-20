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
