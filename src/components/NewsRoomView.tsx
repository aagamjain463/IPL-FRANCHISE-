import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Newspaper, Search, Tag, Flame } from 'lucide-react';

export const NewsRoomView: React.FC = () => {
  const { gameState } = useGame();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('All');

  const allNews = useMemo(() => (gameState?.newsFeed || []) as any[], [gameState?.newsFeed]);
  const tags = useMemo(() => ['All', ...Array.from(new Set(allNews.map(n => n.category || 'General')))], [allNews]);

  const filtered = allNews
    .filter(n => (tagFilter === 'All' ? true : (n.category || 'General') === tagFilter))
    .filter(n => (search ? ((n.title || '') + ' ' + (n.summary || '')).toLowerCase().includes(search.toLowerCase()) : true))
    .sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 }[a.impactRating || 'Medium'] ?? 1;
      const rankB = { High: 0, Medium: 1, Low: 2 }[b.impactRating || 'Medium'] ?? 1;
      return rank - rankB;
    });

  return (
    <div className="space-y-5 pb-16 animate-fadeIn max-w-3xl mx-auto">
      <div className="bg-[#0f172a] p-6 rounded-3xl border border-[#1e293b] shadow-2xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <Newspaper className="w-7 h-7 text-cyan-300" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">The Franchise Room</h2>
          <p className="text-xs text-[#94a3b8]">Every headline from your world — cricket desk, transfer wires, and board notes.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-2xl px-4 py-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#64748b]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search headlines…"
            className="bg-transparent outline-none text-sm text-white placeholder:text-[#64748b] w-full"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition cursor-pointer ${
                tagFilter === tag ? 'bg-[#00FF87]/15 border-[#00FF87]/50 text-[#00FF87]' : 'bg-[#0f172a] border-[#1e293b] text-[#94a3b8] hover:border-[#334155]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0f172a] rounded-3xl border border-[#1e293b] p-10 text-center text-[#64748b] text-sm">No headlines yet — go win something.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n: any, i: number) => (
            <article
              key={n.id || i}
              className={`w-full text-left p-4 rounded-2xl border transition bg-[#0f172a] ${
                n.impactRating === 'High' ? 'border-[#D4AF37]/40' : 'border-[#1e293b]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#64748b] flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> {n.category || 'General'}
                  {n.impactRating === 'High' && <Flame className="w-3 h-3 text-[#D4AF37]" />}
                </span>
                <span className="text-[10px] font-mono text-[#64748b]">{n.timestampFormatted || ''}</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">{n.title}</h3>
              <p className="text-[11px] text-[#94a3b8] mt-1.5 leading-relaxed">{n.summary}</p>
              {n.fullBody && <p className="text-[11px] text-[#64748b] mt-2 leading-relaxed">{n.fullBody}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
