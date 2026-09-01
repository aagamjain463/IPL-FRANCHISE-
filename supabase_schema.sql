-- ==============================================================================
-- IPL FRANCHISE — SUPABASE REALTIME MULTIPLAYER SCHEMA
-- Copy/paste this entire file into Supabase SQL Editor and run it once.
-- It is safe to re-run; policies are dropped/recreated and publication setup is guarded.
-- ==============================================================================

create table if not exists public.ipl_auction_rooms (
  room_code text primary key,
  host_id text not null,
  host_name text not null,
  status text not null default 'lobby' check (status in ('lobby','in_progress','lot_break','completed')),
  participants_count integer not null default 1,
  is_public boolean not null default true,
  state jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_ipl_auction_rooms_public_status_updated
  on public.ipl_auction_rooms (is_public, status, updated_at desc);

-- Keep updated_at fresh for manual SQL updates too. The app also sends updated_at explicitly.
create or replace function public.set_ipl_auction_room_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_ipl_auction_room_updated_at on public.ipl_auction_rooms;
create trigger set_ipl_auction_room_updated_at
  before update on public.ipl_auction_rooms
  for each row execute function public.set_ipl_auction_room_updated_at();

-- RLS is enabled, with public anon policies because room codes are the access control
-- for this casual multiplayer mode. Do NOT use service-role keys in frontend code.
alter table public.ipl_auction_rooms enable row level security;

drop policy if exists "Allow public read access to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public read access to auction rooms"
  on public.ipl_auction_rooms for select
  using (true);

drop policy if exists "Allow public insert to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public insert to auction rooms"
  on public.ipl_auction_rooms for insert
  with check (true);

drop policy if exists "Allow public update to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public update to auction rooms"
  on public.ipl_auction_rooms for update
  using (true)
  with check (true);

drop policy if exists "Allow public delete to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public delete to auction rooms"
  on public.ipl_auction_rooms for delete
  using (true);

grant select, insert, update, delete on public.ipl_auction_rooms to anon, authenticated;

-- Realtime Postgres Changes needs the table in the supabase_realtime publication.
alter table public.ipl_auction_rooms replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ipl_auction_rooms'
  ) then
    alter publication supabase_realtime add table public.ipl_auction_rooms;
  end if;
exception
  when duplicate_object then null;
end $$;
