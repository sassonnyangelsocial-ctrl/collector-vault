create table if not exists public.live_wheel_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_code text not null unique check (room_code ~ '^[a-z0-9]{8,24}$'),
  title text not null check (length(trim(title)) between 1 and 160),
  prize text not null check (length(trim(prize)) between 1 and 500),
  eligibility text not null default '',
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array'),
  rotation numeric not null default 0,
  winner text not null default '',
  draw_status text not null default 'ready' check (draw_status in ('ready', 'spinning', 'winner', 'ended')),
  draw_sequence integer not null default 0 check (draw_sequence >= 0),
  is_live boolean not null default true,
  started_at timestamptz not null default now(), updated_at timestamptz not null default now(), ended_at timestamptz
);
alter table public.live_wheel_rooms enable row level security;
create policy "Hosts can read their live wheel rooms" on public.live_wheel_rooms for select to authenticated using ((select auth.uid()) = host_user_id);
create policy "Anyone can view active live wheel rooms" on public.live_wheel_rooms for select to anon, authenticated using (is_live = true);
create policy "Hosts can create live wheel rooms" on public.live_wheel_rooms for insert to authenticated with check ((select auth.uid()) = host_user_id);
create policy "Hosts can update live wheel rooms" on public.live_wheel_rooms for update to authenticated using ((select auth.uid()) = host_user_id) with check ((select auth.uid()) = host_user_id);
create policy "Hosts can delete live wheel rooms" on public.live_wheel_rooms for delete to authenticated using ((select auth.uid()) = host_user_id);
grant select on public.live_wheel_rooms to anon;
grant select, insert, update, delete on public.live_wheel_rooms to authenticated;
create index if not exists live_wheel_rooms_host_updated_idx on public.live_wheel_rooms (host_user_id, updated_at desc);
create index if not exists live_wheel_rooms_public_code_idx on public.live_wheel_rooms (room_code) where is_live = true;
alter publication supabase_realtime add table public.live_wheel_rooms;
