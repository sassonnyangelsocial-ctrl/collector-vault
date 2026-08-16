-- Keep the Marine Series secret discoverable in the same active directory as its regular figures.
-- The official product page confirms the series includes secret figures; this record uses a
-- collector-reference image because the official lineup does not individually reveal secrets.
insert into public.figures (
  series_id, name, slug, rarity, sort_order, active, image_url, image_source_url,
  image_verified_at, edition_type, verification_source, aliases
)
select
  s.id,
  'Secret Turtle',
  'secret-turtle-secret',
  'Secret',
  940,
  true,
  'https://angelvaulttracker.com/app/sonny_png_library/regulars/marine-collections/marine-series/13__turtle.png',
  'https://sonnyangelusa.com/products/minifigure-marine-series-2019',
  now(),
  'secret',
  'official_series_page_and_collector_reference',
  array['Turtle Secret', 'Marine Series Secret Turtle']::text[]
from public.series s
where s.name = 'Marine Series' and s.active = true
order by s.id
limit 1
on conflict (series_id, slug) do update set
  name = excluded.name,
  rarity = excluded.rarity,
  active = true,
  image_url = excluded.image_url,
  image_source_url = excluded.image_source_url,
  image_verified_at = excluded.image_verified_at,
  edition_type = excluded.edition_type,
  verification_source = excluded.verification_source,
  aliases = excluded.aliases;

create table if not exists public.seller_spreadsheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'inventory' check (kind in ('inventory', 'packing', 'restock', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_spreadsheet_rows (
  id uuid primary key default gen_random_uuid(),
  spreadsheet_id uuid not null references public.seller_spreadsheets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sort_order integer not null default 0,
  item text not null default '',
  quantity numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_spreadsheets_user_idx on public.seller_spreadsheets(user_id, updated_at desc);
create index if not exists seller_spreadsheet_rows_sheet_idx on public.seller_spreadsheet_rows(spreadsheet_id, sort_order);

alter table public.seller_spreadsheets enable row level security;
alter table public.seller_spreadsheet_rows enable row level security;

create policy "seller_spreadsheets_owner_select" on public.seller_spreadsheets for select to authenticated using ((select auth.uid()) = user_id);
create policy "seller_spreadsheets_owner_insert" on public.seller_spreadsheets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "seller_spreadsheets_owner_update" on public.seller_spreadsheets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "seller_spreadsheets_owner_delete" on public.seller_spreadsheets for delete to authenticated using ((select auth.uid()) = user_id);

create policy "seller_spreadsheet_rows_owner_select" on public.seller_spreadsheet_rows for select to authenticated using ((select auth.uid()) = user_id);
create policy "seller_spreadsheet_rows_owner_insert" on public.seller_spreadsheet_rows for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "seller_spreadsheet_rows_owner_update" on public.seller_spreadsheet_rows for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "seller_spreadsheet_rows_owner_delete" on public.seller_spreadsheet_rows for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.seller_spreadsheets to authenticated;
grant select, insert, update, delete on public.seller_spreadsheet_rows to authenticated;
