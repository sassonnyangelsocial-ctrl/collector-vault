create table if not exists public.seller_suppliers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, contact_name text, email text, phone text, website text, lead_time_days integer default 0,
  minimum_order numeric(12,2) default 0, payment_terms text, rating integer default 5 check (rating between 1 and 5),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.seller_purchase_orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references public.seller_suppliers(id) on delete set null, order_number text, order_type text not null default 'case',
  order_date date not null default current_date, status text not null default 'ordered', units integer default 0,
  total_cost numeric(12,2) default 0, eta date, tracking_number text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.seller_sales (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'Whatnot', external_order_id text not null default '', buyer_handle text, product_name text not null,
  sold_at timestamptz not null default now(), quantity integer not null default 1, gross_sales numeric(12,2) default 0,
  platform_fees numeric(12,2) default 0, shipping_cost numeric(12,2) default 0, cogs numeric(12,2) default 0,
  payout_amount numeric(12,2) default 0, status text, raw_data jsonb, created_at timestamptz not null default now(),
  unique(user_id, platform, external_order_id)
);
create index if not exists seller_suppliers_user_idx on public.seller_suppliers(user_id);
create index if not exists seller_purchase_orders_user_idx on public.seller_purchase_orders(user_id);
create index if not exists seller_purchase_orders_supplier_idx on public.seller_purchase_orders(supplier_id);
create index if not exists seller_sales_user_sold_idx on public.seller_sales(user_id,sold_at desc);
alter table public.seller_suppliers enable row level security;
alter table public.seller_purchase_orders enable row level security;
alter table public.seller_sales enable row level security;
create policy "seller_suppliers_own_rows" on public.seller_suppliers for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "seller_purchase_orders_own_rows" on public.seller_purchase_orders for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "seller_sales_own_rows" on public.seller_sales for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
