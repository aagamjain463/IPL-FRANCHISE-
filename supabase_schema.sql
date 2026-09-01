-- ==============================================================================
-- IPL MEGA AUCTION 2026 - SUPABASE REALTIME MULTIPLAYER SCHEMA
-- Copy and paste this SQL into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create Auction Rooms Table
create table if not exists public.ipl_auction_rooms (
  room_code text primary key,
  host_id text not null,
  host_name text not null,
  status text not null default 'lobby',
  participants_count integer default 1,
  is_public boolean default true,
  state jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.ipl_auction_rooms enable row level security;

-- 3. Create Public Policies (Allows seamless multiplayer join, bid, and sync)
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
  using (true);

drop policy if exists "Allow public delete to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public delete to auction rooms"
  on public.ipl_auction_rooms for delete
  using (true);

-- 4. Enable Supabase Realtime Broadcast & Postgres Changes
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ipl_auction_rooms'
  ) then
    alter publication supabase_realtime add table public.ipl_auction_rooms;
  end if;
end $$;
