import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

interface LeaderboardEntry {
  rank: number;
  id: string;
  bibNumber: string;
  name: string;
  company: string;
  category: string;
  status: string;
  duration: number | null;
  distance: number | null;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl text-sm shadow-lg border border-slate-100">
      <p className="font-semibold text-slate-950">{label}</p>
      <p className="text-slate-500">{payload[0]?.value} runners</p>
    </div>
  );
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [category]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const params: Record<string, string> = { status: 'FINISHED', limit: '50' };
      if (category) params.category = category;

      const [leaderRes, statsRes] = await Promise.allSettled([
        api.getParticipants(params),
        api.getParticipantStats(),
      ]);

      if (leaderRes.status === 'fulfilled' && leaderRes.value.success) {
        const entries = (leaderRes.value.data || []).map((p: any, i: number) => ({
          rank: i + 1,
          id: p.id,
          bibNumber: p.bibNumber,
          name: p.user?.name || 'Unknown',
          company: p.company?.name || '-',
          category: p.category,
          status: p.status,
          duration: p.finishDuration || null,
          distance: p.totalDistance || null,
        }));
        setLeaders(entries);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }

  const categoryData = stats?.byCategory?.map((c: any) => ({
    name: c.category.replace('RUN_', '') + 'K',
    count: c._count.category,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading leaderboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Leaderboard</h1>
          <p className="text-sm text-slate-500">{leaders.length} finishers ranked by completion</p>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm outline-none"
        >
          <option value="">All Categories</option>
          <option value="RUN_3K">3K</option>
          <option value="RUN_5K">5K</option>
        </select>
      </div>

      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366f1" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold w-16">#</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">BIB</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Name</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Company</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Category</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((entry) => (
              <tr key={entry.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                    entry.rank === 2 ? 'bg-slate-200 text-slate-600' :
                    entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {entry.rank}
                  </span>
                </td>
                <td className="px-5 py-4 text-violet-700 font-mono font-semibold">{entry.bibNumber}</td>
                <td className="px-5 py-4 text-slate-950 font-medium">{entry.name}</td>
                <td className="px-5 py-4 text-slate-600">{entry.company}</td>
                <td className="px-5 py-4">
                  <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs">
                    {entry.category?.replace('RUN_', '')}
                  </span>
                </td>
                <td className="px-5 py-4 text-amber-600 font-mono font-semibold">
                  {entry.duration ? formatDuration(entry.duration) : '-'}
                </td>
              </tr>
            ))}
            {leaders.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No finishers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
