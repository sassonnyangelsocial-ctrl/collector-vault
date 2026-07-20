create table if not exists public.seller_giveaway_draws (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 160), prize text not null check (length(trim(prize)) between 1 and 500), rules text not null check (length(trim(rules)) between 1 and 10000), eligibility text not null default '',
 entries jsonb not null check (jsonb_typeof(entries) = 'array'), winner text not null, entrant_count integer not null check (entrant_count between 2 and 100), entries_hash text not null check (length(entries_hash) = 64), no_purchase_certified boolean not null check (no_purchase_certified = true), drawn_at timestamptz not null default now()
);
alter table public.seller_giveaway_draws enable row level security;
create policy "Owners can read giveaway draws" on public.seller_giveaway_draws for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners can create giveaway draws" on public.seller_giveaway_draws for insert to authenticated with check ((select auth.uid()) = user_id and no_purchase_certified = true);
grant select, insert on public.seller_giveaway_draws to authenticated;
create index seller_giveaway_draws_user_date_idx on public.seller_giveaway_draws (user_id, drawn_at desc);
