create table if not exists public.seller_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'Whatnot',
  external_show_id text not null,
  title text not null,
  category text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'completed' check (status in ('scheduled','live','completed','cancelled')),
  orders_count integer not null default 0 check (orders_count >= 0),
  items_sold integer not null default 0 check (items_sold >= 0),
  unique_buyers integer not null default 0 check (unique_buyers >= 0),
  peak_viewers integer not null default 0 check (peak_viewers >= 0),
  gross_sales numeric(14,2) not null default 0,
  refunds numeric(14,2) not null default 0,
  commission_fees numeric(14,2) not null default 0,
  processing_fees numeric(14,2) not null default 0,
  fee_taxes numeric(14,2) not null default 0,
  seller_paid_shipping numeric(14,2) not null default 0,
  shipping_adjustments numeric(14,2) not null default 0,
  promotion_fees numeric(14,2) not null default 0,
  giveaway_costs numeric(14,2) not null default 0,
  tips numeric(14,2) not null default 0,
  other_income numeric(14,2) not null default 0,
  other_expenses numeric(14,2) not null default 0,
  payout_amount numeric(14,2) not null default 0,
  notes text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, platform, external_show_id),
  unique(id, user_id)
);

create table if not exists public.seller_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid,
  purchase_order_id uuid references public.seller_purchase_orders(id) on delete set null,
  category text not null check (category in ('inventory','shipping_supplies','postage','promotion','giveaway','mileage','software','labor','taxes','refund','other')),
  merchant text,
  description text not null,
  expense_date date not null default current_date,
  amount numeric(14,2) not null check (amount >= 0),
  quantity numeric(12,2) not null default 1 check (quantity >= 0),
  payment_method text,
  tax_deductible boolean not null default true,
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_expenses_show_owner_fkey foreign key (show_id, user_id)
    references public.seller_shows(id, user_id) on delete cascade
);

create table if not exists public.seller_import_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'Whatnot',
  import_type text not null check (import_type in ('weekly_orders','ledger','seller_statement','show_report','order_history','unknown')),
  file_name text not null,
  rows_read integer not null default 0 check (rows_read >= 0),
  rows_imported integer not null default 0 check (rows_imported >= 0),
  shows_imported integer not null default 0 check (shows_imported >= 0),
  status text not null default 'completed' check (status in ('completed','partial','failed')),
  error_message text,
  imported_at timestamptz not null default now()
);

alter table public.seller_sales
  add column if not exists show_id uuid,
  add column if not exists show_title text,
  add column if not exists sale_type text not null default 'live',
  add column if not exists commission_fee numeric(14,2) not null default 0,
  add column if not exists processing_fee numeric(14,2) not null default 0,
  add column if not exists fee_tax numeric(14,2) not null default 0,
  add column if not exists promotion_fee numeric(14,2) not null default 0,
  add column if not exists refund_amount numeric(14,2) not null default 0,
  add column if not exists giveaway_shipping numeric(14,2) not null default 0,
  add column if not exists shipping_adjustment numeric(14,2) not null default 0,
  add column if not exists buyer_shipping numeric(14,2) not null default 0,
  add column if not exists buyer_tax numeric(14,2) not null default 0,
  add column if not exists net_earnings numeric(14,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seller_sales_show_owner_fkey'
      and conrelid = 'public.seller_sales'::regclass
  ) then
    alter table public.seller_sales
      add constraint seller_sales_show_owner_fkey foreign key (show_id, user_id)
      references public.seller_shows(id, user_id) on delete restrict;
  end if;
end $$;

create index if not exists seller_shows_user_started_idx on public.seller_shows(user_id, started_at desc);
create index if not exists seller_expenses_user_date_idx on public.seller_expenses(user_id, expense_date desc);
create index if not exists seller_expenses_user_category_idx on public.seller_expenses(user_id, category);
create index if not exists seller_expenses_show_idx on public.seller_expenses(show_id);
create index if not exists seller_expenses_purchase_order_idx on public.seller_expenses(purchase_order_id);
create index if not exists seller_import_runs_user_imported_idx on public.seller_import_runs(user_id, imported_at desc);
create index if not exists seller_sales_show_idx on public.seller_sales(show_id);

alter table public.seller_shows enable row level security;
alter table public.seller_expenses enable row level security;
alter table public.seller_import_runs enable row level security;

create policy "seller_shows_own_rows" on public.seller_shows
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "seller_expenses_own_rows" on public.seller_expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "seller_import_runs_own_rows" on public.seller_import_runs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.seller_shows to authenticated;
grant select, insert, update, delete on public.seller_expenses to authenticated;
grant select, insert, update, delete on public.seller_import_runs to authenticated;
grant select, insert, update, delete on public.seller_sales to authenticated;
