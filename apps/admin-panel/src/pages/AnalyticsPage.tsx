import { useState, useEffect } from 'react';

interface OverviewData {
  totalRegistered: number;
  totalCheckedIn: number;
  totalStarted: number;
  totalFinished: number;
  totalDistanceKm: string;
  totalTreesPlanted: number;
  co2SavedKg: string;
  checkinRate: string;
  finishRate: string;
}

interface FinishRateData {
  finished: number;
  dropped: number;
  active: number;
  registered: number;
  total: number;
}

interface PaceRange {
  range: string;
  count: number;
}

interface CompanyData {
  companyId: string;
  companyName: string;
  totalRunners: number;
  finished: number;
  totalDistance: number;
  treesPlanted: number;
}

interface FinishTimeEntry {
  rank: number;
  id: string;
  name: string;
  bibNumber: string;
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

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [finishRate, setFinishRate] = useState<FinishRateData | null>(null);
  const [paceData, setPaceData] = useState<PaceRange[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [finishTimes, setFinishTimes] = useState<FinishTimeEntry[]>([]);
  const [tab, setTab] = useState<'overview' | 'finishers' | 'companies' | 'pace'>('overview');

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const eventId = import.meta.env.VITE_EVENT_ID || '';

    const fetchAnalytics = async () => {
      const params = eventId ? `?eventId=${eventId}` : '';
      const [overviewRes, finishRateRes, paceRes, companyRes, finishTimesRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/analytics/overview${params}`).then(r => r.json()),
        fetch(`${API_URL}/api/v1/analytics/finish-rate${params}`).then(r => r.json()),
        fetch(`${API_URL}/api/v1/analytics/pace-distribution${params}`).then(r => r.json()),
        fetch(`${API_URL}/api/v1/analytics/company-participation${params}`).then(r => r.json()),
        fetch(`${API_URL}/api/v1/analytics/finish-times${params}`).then(r => r.json()),
      ]);
      if (overviewRes.success) setOverview(overviewRes.data);
      if (finishRateRes.success) setFinishRate(finishRateRes.data);
      if (paceRes.success) setPaceData(paceRes.data);
      if (companyRes.success) setCompanies(companyRes.data);
      if (finishTimesRes.success) setFinishTimes(finishTimesRes.data);
    };

    fetchAnalytics();
  }, []);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'finishers', label: 'Finishers' },
    { key: 'companies', label: 'Companies' },
    { key: 'pace', label: 'Pace Distribution' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Registered', value: overview.totalRegistered, color: 'text-blue-400' },
            { label: 'Checked In', value: overview.totalCheckedIn, color: 'text-cyan-400' },
            { label: 'Started', value: overview.totalStarted, color: 'text-amber-400' },
            { label: 'Finished', value: overview.totalFinished, color: 'text-green-400' },
            { label: 'Check-in Rate', value: `${overview.checkinRate}%`, color: 'text-cyan-400' },
            { label: 'Finish Rate', value: `${overview.finishRate}%`, color: 'text-green-400' },
            { label: 'Total Distance', value: `${overview.totalDistanceKm} km`, color: 'text-purple-400' },
            { label: 'Trees Planted', value: overview.totalTreesPlanted, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'overview' && finishRate && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-4">Status Breakdown</h3>
          <div className="flex gap-4">
            {[
              { label: 'Finished', value: finishRate.finished, color: 'bg-green-500' },
              { label: 'Active', value: finishRate.active, color: 'bg-amber-500' },
              { label: 'DNF', value: finishRate.dropped, color: 'bg-red-500' },
              { label: 'Registered', value: finishRate.registered, color: 'bg-slate-500' },
            ].map((item) => (
              <div key={item.label} className="flex-1 text-center">
                <div className={`h-2 rounded-full ${item.color} mb-2`}
                     style={{ width: `${finishRate.total > 0 ? (item.value / finishRate.total) * 100 : 0}%` }} />
                <p className="text-white font-bold text-lg">{item.value}</p>
                <p className="text-slate-400 text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'finishers' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold">Finish Times ({finishTimes.length} finishers)</h3>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">BIB</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {finishTimes.map((ft) => (
                  <tr key={ft.id} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">{ft.rank}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono">{ft.bibNumber}</td>
                    <td className="px-4 py-3 text-white">{ft.name}</td>
                    <td className="px-4 py-3 text-amber-400 font-mono">
                      {ft.duration ? formatDuration(ft.duration) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'companies' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold">Company Participation</h3>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Company</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Runners</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Finished</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Distance (km)</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Trees</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.companyId} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 text-white">{c.companyName}</td>
                    <td className="px-4 py-3 text-blue-400">{c.totalRunners}</td>
                    <td className="px-4 py-3 text-green-400">{c.finished}</td>
                    <td className="px-4 py-3 text-purple-400">{(c.totalDistance / 1000).toFixed(1)}</td>
                    <td className="px-4 py-3 text-green-400">{c.treesPlanted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pace' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-4">Pace Distribution (min/km)</h3>
          <div className="space-y-3">
            {paceData.map((p) => {
              const maxCount = Math.max(...paceData.map((x) => x.count), 1);
              return (
                <div key={p.range} className="flex items-center gap-4">
                  <span className="text-slate-400 text-sm w-24">{p.range}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${(p.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-sm font-bold w-8 text-right">{p.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
