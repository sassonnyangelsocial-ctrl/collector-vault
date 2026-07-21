create table public.public_inquiries (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 80),
  email text not null check (char_length(trim(email)) between 3 and 254),
  kind text not null check (kind in ('question','suggestion','catalog-correction','seller-pro','billing')),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  source text not null default 'about-page' check (source = 'about-page'),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.public_inquiries enable row level security;

create policy "Anyone can submit a public inquiry" on public.public_inquiries
  for insert to anon, authenticated
  with check (
    char_length(trim(name)) between 1 and 80
    and char_length(trim(email)) between 3 and 254
    and char_length(trim(message)) between 10 and 2000
    and kind in ('question','suggestion','catalog-correction','seller-pro','billing')
    and source = 'about-page'
  );

grant insert on table public.public_inquiries to anon, authenticated;
grant usage, select on sequence public.public_inquiries_id_seq to anon, authenticated;
revoke select, update, delete on table public.public_inquiries from anon, authenticated;
