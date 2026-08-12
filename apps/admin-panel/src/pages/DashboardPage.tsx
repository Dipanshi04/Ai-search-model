import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Stats {
  total: number;
  checkedIn: number;
  running: number;
  finished: number;
  byCategory: { category: string; _count: { category: number } }[];
}

interface RaceStatus {
  event: any;
  stats: { participants: number; checkedIn: number; running: number; finished: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [raceStatus, setRaceStatus] = useState<RaceStatus | null>(null);
  const [checkinStats, setCheckinStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, raceRes, checkinRes] = await Promise.all([
        api.getParticipantStats(),
        api.getRaceStatus(),
        api.getCheckinStats(),
      ]);

      if (statsRes.success) setStats(statsRes.data!);
      if (raceRes.success) setRaceStatus(raceRes.data!);
      if (checkinRes.success) setCheckinStats(checkinRes.data!);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Registered', value: stats?.total || 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Checked In', value: stats?.checkedIn || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Currently Running', value: stats?.running || 0, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Finished', value: stats?.finished || 0, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Trees Planted', value: 0, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Race Status', value: raceStatus?.event?.status || 'No Active Race', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">ISA Tech Marathon 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                <span className={`${card.color} text-lg font-bold`}>{typeof card.value === 'number' ? card.value : card.value.toString().charAt(0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {checkinStats && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Check-in Progress</h2>
          <div className="w-full bg-slate-700 rounded-full h-4">
            <div
              className="bg-emerald-500 h-4 rounded-full transition-all"
              style={{ width: `${checkinStats.percentage}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {checkinStats.checkedIn} of {checkinStats.total} participants checked in ({checkinStats.percentage}%)
          </p>
        </div>
      )}

      {stats?.byCategory && stats.byCategory.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Category Breakdown</h2>
          <div className="space-y-3">
            {stats.byCategory.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-slate-300">{cat.category.replace('RUN_', '').replace('_', ' ')}</span>
                <span className="text-white font-semibold">{cat._count.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}