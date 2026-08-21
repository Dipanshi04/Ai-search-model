import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl text-sm shadow-lg border border-slate-100">
      <p className="font-semibold text-slate-950">{label || payload[0]?.name}</p>
      <p className="text-slate-500">{payload[0]?.value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [finishRate, setFinishRate] = useState<FinishRateData | null>(null);
  const [paceData] = useState<PaceRange[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [finishTimes] = useState<FinishTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'finishers' | 'companies' | 'pace'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const [overviewRes, finishRateRes, , companyRes] = await Promise.allSettled([
          api.getParticipantStats(),
          api.getCheckinStats(),
          api.getEvents(),
          api.getCompanies(),
          api.getParticipantStats(),
        ]);

        if (overviewRes.status === 'fulfilled' && overviewRes.value.success) {
          const d = overviewRes.value.data;
          setOverview({
            totalRegistered: d?.total || 0,
            totalCheckedIn: d?.checkedIn || 0,
            totalStarted: d?.running || 0,
            totalFinished: d?.finished || 0,
            totalDistanceKm: ((d?.finished || 0) * 4.2).toFixed(1),
            totalTreesPlanted: Math.floor((d?.finished || 0) * 0.5),
            co2SavedKg: ((d?.finished || 0) * 2.1).toFixed(1),
            checkinRate: d?.total ? ((d.checkedIn / d.total) * 100).toFixed(1) : '0',
            finishRate: d?.total ? ((d.finished / d.total) * 100).toFixed(1) : '0',
          });
        }

        if (finishRateRes.status === 'fulfilled' && finishRateRes.value.success) {
          const d = finishRateRes.value.data;
          setFinishRate({
            finished: d?.finished || 0,
            dropped: 0,
            active: d?.running || 0,
            registered: (d?.total || 0) - (d?.checkedIn || 0),
            total: d?.total || 0,
          });
        }

        if (companyRes.status === 'fulfilled' && companyRes.value.success) {
          setCompanies(companyRes.value.data || []);
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
          Loading analytics...
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'finishers', label: 'Finishers' },
    { key: 'companies', label: 'Companies' },
    { key: 'pace', label: 'Pace Distribution' },
  ];

  const statusBreakdown = finishRate ? [
    { name: 'Finished', value: finishRate.finished, fill: '#10b981' },
    { name: 'Active', value: finishRate.active, fill: '#f59e0b' },
    { name: 'Registered', value: finishRate.registered, fill: '#6366f1' },
  ] : [];

  const paceChartData = paceData.map((p) => ({ name: p.range, count: p.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Race performance metrics and participant insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
              tab === t.key
                ? 'text-violet-700 bg-violet-50 border-b-2 border-violet-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Registered', value: overview.totalRegistered, color: 'text-indigo-600' },
              { label: 'Checked In', value: overview.totalCheckedIn, color: 'text-emerald-600' },
              { label: 'Finished', value: overview.totalFinished, color: 'text-purple-600' },
              { label: 'Check-in Rate', value: `${overview.checkinRate}%`, color: 'text-violet-600' },
              { label: 'Finish Rate', value: `${overview.finishRate}%`, color: 'text-emerald-600' },
              { label: 'Total Distance', value: `${overview.totalDistanceKm} km`, color: 'text-amber-600' },
              { label: 'Trees Planted', value: overview.totalTreesPlanted, color: 'text-emerald-600' },
              { label: 'CO2 Saved', value: `${overview.co2SavedKg} kg`, color: 'text-teal-600' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-[2rem] p-5 border border-white/20 shadow-sm">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {finishRate && (
            <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500 mb-4">Status Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {statusBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center gap-3">
                  {statusBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="text-sm text-slate-600 flex-1">{item.name}</span>
                      <span className="text-sm font-semibold text-slate-950">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Finishers Tab */}
      {tab === 'finishers' && (
        <div className="glass rounded-[2rem] border border-white/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-slate-500">Finish Times ({finishTimes.length} finishers)</h3>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-white/80">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">#</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">BIB</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {finishTimes.map((ft) => (
                  <tr key={ft.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-600">{ft.rank}</td>
                    <td className="px-5 py-3 text-violet-700 font-mono font-semibold">{ft.bibNumber}</td>
                    <td className="px-5 py-3 text-slate-950 font-medium">{ft.name}</td>
                    <td className="px-5 py-3 text-amber-600 font-mono font-semibold">
                      {ft.duration ? formatDuration(ft.duration) : '-'}
                    </td>
                  </tr>
                ))}
                {finishTimes.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No finish times recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {tab === 'companies' && (
        <div className="glass rounded-[2rem] border border-white/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-slate-500">Company Participation</h3>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-white/80">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Company</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Runners</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Finished</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.companyId} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-950 font-medium">{c.companyName}</td>
                    <td className="px-5 py-3 text-indigo-600 font-semibold">{c.totalRunners}</td>
                    <td className="px-5 py-3 text-emerald-600 font-semibold">{c.finished}</td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">No company data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pace Tab */}
      {tab === 'pace' && (
        <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Pace Distribution (min/km)</h3>
          {paceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paceChartData} margin={{ left: 10, right: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={false} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No pace data available yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
