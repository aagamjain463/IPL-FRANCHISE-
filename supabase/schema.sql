-- IPL FRANCHISE Supabase schema.
-- Live multiplayer auction uses public.ipl_auction_rooms as its active room
-- snapshot table. The rest of this file keeps the original future-proof tables.

-- ==============================================================================
-- LIVE MULTIPLAYER ROOM SNAPSHOTS (CURRENT APP PATH)
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

-- ==============================================================================
-- ORIGINAL NORMALIZED TABLES (RESERVED FOR FUTURE SERVER-AUTHORITATIVE STORAGE)
-- ==============================================================================

create table if not exists profiles (
  player_id text primary key,
  display_name text not null,
  avatar_key text not null default 'crest-gold',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leaderboard (
  player_id text primary key references profiles(player_id) on delete cascade,
  total_auctions_completed integer not null default 0,
  auctions_won integer not null default 0,
  total_money_spent_cr numeric(8,2) not null default 0,
  squad_ovr integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  win_rate numeric(5,2) not null default 0,
  ranking_points integer not null default 1000,
  current_rank integer not null default 0,
  highest_rank integer not null default 0,
  streak integer not null default 0,
  trophies integer not null default 0,
  xp integer not null default 0,
  auction_score integer not null default 0,
  weekly_points integer not null default 0,
  season_points integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists auction_rooms (
  room_code text primary key,
  host_player_id text not null references profiles(player_id),
  status text not null check (status in ('lobby','in_progress','lot_break','completed')),
  config jsonb not null,
  current_lot_index integer not null default 0,
  current_high_bid_cr numeric(8,2) not null default 0,
  current_high_bidder_id text references profiles(player_id),
  deadline_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auction_participants (
  room_code text references auction_rooms(room_code) on delete cascade,
  player_id text references profiles(player_id) on delete cascade,
  franchise_id text,
  is_host boolean not null default false,
  is_ready boolean not null default false,
  is_ai boolean not null default false,
  purse_cr numeric(8,2) not null,
  is_connected boolean not null default true,
  disconnected_at timestamptz,
  primary key (room_code, player_id)
);

create table if not exists auction_players (
  room_code text references auction_rooms(room_code) on delete cascade,
  player_id text not null,
  lot_index integer not null,
  player_snapshot jsonb not null,
  sold_to_player_id text,
  sold_price_cr numeric(8,2),
  status text not null default 'pending' check (status in ('pending','presented','sold','unsold')),
  primary key (room_code, player_id)
);

create table if not exists auction_bids (
  bid_id uuid primary key default gen_random_uuid(),
  room_code text not null references auction_rooms(room_code) on delete cascade,
  player_id text not null references profiles(player_id),
  lot_player_id text not null,
  bid_amount_cr numeric(8,2) not null,
  server_sequence bigint generated always as identity,
  accepted boolean not null default true,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists auction_events (
  event_id uuid primary key default gen_random_uuid(),
  room_code text not null references auction_rooms(room_code) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  server_sequence bigint generated always as identity,
  created_at timestamptz not null default now()
);

create table if not exists auction_results (
  room_code text references auction_rooms(room_code) on delete cascade,
  player_id text references profiles(player_id),
  final_rank integer not null,
  squad_ovr integer not null,
  money_spent_cr numeric(8,2) not null,
  money_remaining_cr numeric(8,2) not null,
  auction_score integer not null,
  primary key (room_code, player_id)
);

create table if not exists player_progression (
  player_id text references profiles(player_id) on delete cascade,
  progression_key text not null,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (player_id, progression_key)
);

alter table profiles enable row level security;
alter table leaderboard enable row level security;
alter table auction_rooms enable row level security;
alter table auction_participants enable row level security;
alter table auction_players enable row level security;
alter table auction_bids enable row level security;
alter table auction_events enable row level security;
alter table auction_results enable row level security;
alter table player_progression enable row level security;

-- Suggested policies for normalized tables: public can read leaderboard and lobby
-- snapshots; only a trusted server/service role should mutate authoritative auction
-- and leaderboard records.
