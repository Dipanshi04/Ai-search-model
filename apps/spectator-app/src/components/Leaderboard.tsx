import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface LeaderboardProps {
  category: string;
  onCategoryChange: (cat: string) => void;
}

export default function Leaderboard({ category, onCategoryChange }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [category]);

  async function loadLeaderboard() {
    setLoading(true);
    const res = await api.getLeaderboard(category || undefined);
    if (res.success && res.data) {
      setLeaders(res.data);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {[
          { value: '', label: 'All' },
          { value: 'RUN_3K', label: '3K' },
          { value: 'RUN_5K', label: '5K' },
        ].map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              category === cat.value
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading...</div>
      ) : leaders.length === 0 ? (
        <div className="text-center text-slate-400 py-12">No results yet</div>
      ) : (
        <div className="space-y-3">
          {leaders.slice(0, 20).map((entry, i) => (
            <div
              key={entry.participantId || i}
              className={`bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4 ${
                i < 3 ? 'border-amber-500/30' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                i === 0 ? 'bg-amber-500/20 text-amber-400' :
                i === 1 ? 'bg-slate-300/20 text-slate-300' :
                i === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-slate-700 text-slate-400'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{entry.name}</p>
                <p className="text-xs text-slate-400">{entry.bibNumber} · {entry.category?.replace('RUN_', '').replace('_', ' ')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{entry.distance?.toFixed(2)} km</p>
                <p className="text-xs text-slate-400">{entry.pace?.toFixed(1)} min/km</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                entry.status === 'RUNNING' ? 'bg-amber-500/10 text-amber-400' :
                entry.status === 'FINISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-slate-500/10 text-slate-400'
              }`}>
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}