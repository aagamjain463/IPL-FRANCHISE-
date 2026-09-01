-- IPL FRANCHISE multiplayer + leaderboard schema template.
-- This repository has no Supabase client configured yet. Do not place service-role keys in the browser.
-- Apply this in Supabase when DATABASE_URL/SUPABASE env wiring is added server-side.

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

-- Suggested policies: public can read leaderboard and lobby snapshots; only server/service role mutates authoritative auction and leaderboard records.
