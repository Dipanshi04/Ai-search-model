import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, [category]);

  async function loadLeaderboard() {
    setLoading(true);
    const res = await api.getLeaderboard(category || undefined, 50);
    if (res.success && res.data) {
      setLeaders(res.data);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Leaderboard</h1>

      <div className="flex gap-3 mb-8">
        {[
          { value: '', label: 'All' },
          { value: 'RUN_3K', label: '3K' },
          { value: 'RUN_5K', label: '5K' },
        ].map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="text-center text-slate-400 py-12">Loading leaderboard...</div>
      ) : leaders.length === 0 ? (
        <div className="text-center text-slate-400 py-12">No results yet</div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Rank</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">BIB</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Distance</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Pace</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((entry, i) => (
                <tr key={entry.participantId || i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-bold text-white">
                    {i < 3 ? ['text-amber-400', 'text-slate-300', 'text-orange-400'][i] : 'text-slate-400'}
                    <span className={i < 3 ? ['text-amber-400', 'text-slate-300', 'text-orange-400'][i] : 'text-slate-400'}>
                      #{entry.rank || i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{entry.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-emerald-400">{entry.bibNumber}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                      {entry.category?.replace('RUN_', '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{entry.distance?.toFixed(2)} km</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{entry.pace?.toFixed(1)} min/km</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      entry.status === 'RUNNING' ? 'bg-amber-500/10 text-amber-400' :
                      entry.status === 'FINISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}