import React, { useState } from 'react';
import { 
  Database, Check, Copy, ExternalLink, X, ShieldCheck, 
  Sparkles, RefreshCw, AlertCircle 
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  isSupabaseConfigured,
  getSupabaseClient
} from '../../services/supabaseClient';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- IPL FRANCHISE Live Multiplayer Supabase Schema
-- Safe to re-run in Supabase SQL Editor

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

alter table public.ipl_auction_rooms enable row level security;

drop policy if exists "Allow public read access to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public read access to auction rooms"
  on public.ipl_auction_rooms for select using (true);

drop policy if exists "Allow public insert to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public insert to auction rooms"
  on public.ipl_auction_rooms for insert with check (true);

drop policy if exists "Allow public update to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public update to auction rooms"
  on public.ipl_auction_rooms for update using (true) with check (true);

drop policy if exists "Allow public delete to auction rooms" on public.ipl_auction_rooms;
create policy "Allow public delete to auction rooms"
  on public.ipl_auction_rooms for delete using (true);

grant select, insert, update, delete on public.ipl_auction_rooms to anon, authenticated;

alter table public.ipl_auction_rooms replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ipl_auction_rooms'
  ) then
    alter publication supabase_realtime add table public.ipl_auction_rooms;
  end if;
exception when duplicate_object then null;
end $$;`;

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose, onConfigured }) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter both Supabase URL and Anon Key');
      return;
    }

    if (!url.startsWith('https://')) {
      setTestStatus('error');
      setTestMessage('Supabase URL must start with https://');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing Supabase Realtime & Database connection...');

    try {
      saveSupabaseCredentials(url.trim(), anonKey.trim());
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Failed to initialize Supabase client.');
      }

      // Try selecting from table
      const { error } = await client.from('ipl_auction_rooms').select('room_code').limit(1);
      if (error) {
        if (error.code === '42P01') {
          setTestStatus('error');
          setTestMessage('Connected to Supabase, but "ipl_auction_rooms" table is missing. Run the SQL schema script below in Supabase SQL Editor!');
          return;
        }
        throw error;
      }

      setTestStatus('success');
      setTestMessage('Connected successfully to Supabase Database & Realtime!');
      onConfigured?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Failed to connect. Check URL, Anon Key, and Table Schema.');
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestStatus('idle');
    setTestMessage('Supabase disconnected. Running in Local/Server mode.');
    onConfigured?.();
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Supabase Realtime Multiplayer Engine
                {isConfigured ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    Optional Cloud Sync
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Powers cross-device multiplayer bidding on Vercel & custom domains</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Info Box */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Sparkles className="w-4 h-4" /> Why connect Supabase?
            </div>
            <p>
              When hosting on static platforms like <strong className="text-white">Vercel</strong>, Supabase provides persistent war rooms and live bidding between friends. For everyone to see the same room list automatically, set <strong className="text-white">VITE_SUPABASE_URL</strong> and <strong className="text-white">VITE_SUPABASE_ANON_KEY</strong> in your deployment; this modal is a per-browser override for testing.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzproject.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Found in your Supabase Project Settings → API → Project URL</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supabase Anon (Public) Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Found in your Supabase Project Settings → API → anon public key</p>
            </div>

            {testMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testStatus === 'success' 
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                  : testStatus === 'error'
                  ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                  : 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
              }`}>
                {testStatus === 'testing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                ) : testStatus === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{testMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={testStatus === 'testing'}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testStatus === 'testing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Connection...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" /> Save & Connect Supabase
                  </>
                )}
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition border border-slate-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>

          {/* SQL Schema helper */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">Supabase SQL Schema (One-Click)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Run in SQL Editor</span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 transition"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied SQL!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy SQL Schema
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 font-mono overflow-x-auto max-h-36">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Need a free Supabase project?</span>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
