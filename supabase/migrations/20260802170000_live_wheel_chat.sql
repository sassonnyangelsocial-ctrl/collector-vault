create table if not exists public.live_wheel_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_wheel_rooms(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  participant_id uuid not null,
  display_name text not null check (char_length(display_name) between 2 and 32),
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.live_wheel_chat_messages enable row level security;

create policy "Anyone can read chat in active live rooms"
on public.live_wheel_chat_messages for select
to anon, authenticated
using (exists (
  select 1 from public.live_wheel_rooms room
  where room.id = room_id and room.is_live = true
));

create policy "Guests can chat in active live rooms"
on public.live_wheel_chat_messages for insert
to anon
with check (
  sender_user_id is null
  and exists (
    select 1 from public.live_wheel_rooms room
    where room.id = room_id and room.is_live = true
  )
);

create policy "Members can chat in active live rooms"
on public.live_wheel_chat_messages for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())
  and exists (
    select 1 from public.live_wheel_rooms room
    where room.id = room_id and room.is_live = true
  )
);

create policy "Hosts can moderate their live wheel chat"
on public.live_wheel_chat_messages for delete
to authenticated
using (exists (
  select 1 from public.live_wheel_rooms room
  where room.id = room_id and room.host_user_id = (select auth.uid())
));

grant select, insert on public.live_wheel_chat_messages to anon;
grant select, insert, delete on public.live_wheel_chat_messages to authenticated;

create index if not exists live_wheel_chat_room_created_idx
on public.live_wheel_chat_messages (room_id, created_at desc);

alter publication supabase_realtime add table public.live_wheel_chat_messages;
