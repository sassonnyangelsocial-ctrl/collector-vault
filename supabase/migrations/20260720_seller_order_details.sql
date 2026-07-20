alter table public.seller_purchase_orders
add column if not exists vendor_name text,
add column if not exists description text,
add column if not exists case_count integer not null default 0,
add column if not exists units_per_case integer not null default 0,
add column if not exists subtotal numeric(12,2) not null default 0,
add column if not exists shipping_cost numeric(12,2) not null default 0,
add column if not exists tax_amount numeric(12,2) not null default 0,
add column if not exists discount_amount numeric(12,2) not null default 0,
add column if not exists payment_method text,
add column if not exists payment_status text not null default 'unpaid',
add column if not exists paid_at date,
add column if not exists carrier text,
add column if not exists received_at date;
grant select,insert,update,delete on public.seller_purchase_orders to authenticated;
