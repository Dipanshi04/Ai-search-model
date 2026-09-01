import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface GreenStats {
  totalFinished: number;
  treesPlanted: number;
  co2Saved: number;
  distanceCovered: number;
}

const KM_PER_TREE = 5;
const CO2_PER_TREE_KG = 22;

export default function GreenMissionPage() {
  const [stats, setStats] = useState<GreenStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, treesRes] = await Promise.all([
          api.getParticipantStats(),
          api.getTreeCounter(),
        ]);
        const finished = (statsRes.success && statsRes.data?.finished) || 0;
        if (treesRes.success && treesRes.data) {
          setStats({
            totalFinished: finished,
            treesPlanted: treesRes.data.totalTrees,
            co2Saved: parseFloat(treesRes.data.totalCO2.toFixed(1)),
            distanceCovered: parseFloat(treesRes.data.totalKm.toFixed(1)),
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Green Mission</h1>
        <p className="text-sm text-slate-500 mt-1">Environmental impact of the marathon — every step counts</p>
      </div>

      {/* Impact Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Trees Planted',
            value: stats?.treesPlanted || 0,
            icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'CO2 Saved',
            value: `${stats?.co2Saved || 0} kg`,
            icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
            color: 'text-teal-600',
            bg: 'bg-teal-50',
          },
          {
            label: 'Distance Covered',
            value: `${stats?.distanceCovered || 0} km`,
            icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            label: 'Finishers',
            value: stats?.totalFinished || 0,
            icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-4.78 2.25h-1.5m0 0a6.003 6.003 0 01-4.78-2.25',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map((card) => (
          <div key={card.label} className="glass rounded-[2rem] p-5 border border-white/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                <svg className={`w-5 h-5 ${card.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mission Statement */}
      <div className="glass rounded-[2rem] p-8 border border-white/20 shadow-sm">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-950 mb-3">Our Green Commitment</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            For every {KM_PER_TREE} kilometers covered by the field &mdash; combined, not per runner &mdash; we plant a tree in
            partnership with local environmental organizations, updated live as distance accrues.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-600">1 tree</p>
              <p className="text-xs text-slate-500 mt-1">per {KM_PER_TREE} km covered</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-teal-50 border border-teal-100">
              <p className="text-2xl font-bold text-teal-600">{CO2_PER_TREE_KG} kg</p>
              <p className="text-xs text-slate-500 mt-1">CO2 saved per tree</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-violet-50 border border-violet-100">
              <p className="text-2xl font-bold text-violet-600">{stats?.distanceCovered || 0} km</p>
              <p className="text-xs text-slate-500 mt-1">total distance covered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
