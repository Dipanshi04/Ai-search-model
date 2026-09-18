import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Stats {
  total: number;
  checkedIn: number;
  running: number;
  finished: number;
  byCategory: { category: string; _count: { category: number } }[];
  byTshirtSize: { tshirtSize: string; _count: { tshirtSize: number } }[];
  missingTshirtSize: number;
}

const TSHIRT_SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface RaceStatus {
  event: any;
  stats: { participants: number; checkedIn: number; running: number; finished: number };
}

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: 'bg-blue-50 text-blue-700 border border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border border-amber-200',
  COMPLETED: 'bg-purple-50 text-purple-700 border border-purple-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
};

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

function RingChart({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const r = 58;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e0e7ff" strokeWidth="12" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-950">{pct}%</span>
        <span className="text-xs text-slate-500 mt-0.5">checked in</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl text-sm shadow-lg border border-slate-100">
      <p className="font-semibold text-slate-950">{label || payload[0]?.name}</p>
      <p className="text-slate-500">{payload[0]?.value} participants</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [raceStatus, setRaceStatus] = useState<RaceStatus | null>(null);
  const [checkinStats, setCheckinStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, raceRes, checkinRes, eventsRes] = await Promise.allSettled([
          api.getParticipantStats(),
          api.getRaceStatus(),
          api.getCheckinStats(),
          api.getEvents(),
        ]);
        if (statsRes.status === 'fulfilled' && statsRes.value.success) setStats(statsRes.value.data!);
        if (raceRes.status === 'fulfilled' && raceRes.value.success) setRaceStatus(raceRes.value.data!);
        if (checkinRes.status === 'fulfilled' && checkinRes.value.success) setCheckinStats(checkinRes.value.data!);
        if (eventsRes.status === 'fulfilled' && eventsRes.value.success) setEvents(eventsRes.value.data!);
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

  const event = raceStatus?.event;
  const total = stats?.total || 0;
  const checkedIn = stats?.checkedIn || checkinStats?.checkedIn || 0;
  const running = stats?.running || 0;
  const finished = stats?.finished || 0;

  const categoryData = (stats?.byCategory || []).map((c) => ({
    name: c.category.replace('RUN_', '') + 'K',
    value: c._count.category,
  }));

  const tshirtData = (stats?.byTshirtSize || [])
    .map((t) => ({ size: t.tshirtSize, value: t._count.tshirtSize }))
    .sort((a, b) => {
      const ai = TSHIRT_SIZE_ORDER.indexOf(a.size);
      const bi = TSHIRT_SIZE_ORDER.indexOf(b.size);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  const tshirtTotal = tshirtData.reduce((sum, t) => sum + t.value, 0);
  const missingTshirtSize = stats?.missingTshirtSize || 0;

  const funnelData = [
    { name: 'Registered', value: total, fill: '#6366f1' },
    { name: 'Checked In', value: checkedIn, fill: '#10b981' },
    { name: 'Running', value: running, fill: '#f59e0b' },
    { name: 'Finished', value: finished, fill: '#a855f7' },
  ];

  const upcomingEvents = events
    .filter((e) => e.status === 'UPCOMING')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {event
            ? `${event.name} — ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
            : 'ISA Tech Marathon Platform'}
        </p>
      </div>

      {/* Race Status Banner */}
      {event && (
        <div className="glass rounded-[2rem] border border-white/20 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${event.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <div>
                <p className="text-xs text-slate-500">Race Status</p>
                <p className="text-lg font-bold text-slate-950">{event.status}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Distances:</span>
                <span className="font-semibold text-slate-700">
                  {event.raceDistances?.map((d: any) => d.name).join(' & ') || 'None'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Registration:</span>
                <span className={`font-semibold ${event.registrationOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                  {event.registrationOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Registered', value: total, color: 'text-indigo-600' },
          { label: 'Checked In', value: checkedIn, color: 'text-emerald-600' },
          { label: 'Running', value: running, color: 'text-amber-600' },
          { label: 'Finished', value: finished, color: 'text-purple-600' },
        ].map((card) => (
          <div key={card.label} className="glass rounded-[2rem] p-5 border border-white/20 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-in Ring */}
        <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Check-in Progress</h3>
          <RingChart value={checkedIn} max={total || 1} color="#6366f1" />
          <p className="text-sm text-slate-600 mt-4">{checkedIn} of {total}</p>
        </div>

        {/* Category Pie */}
        <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">By Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
              No registrations yet
            </div>
          )}
        </div>

        {/* Funnel Bar */}
        <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Race Funnel</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="name"
                width={90}
                tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* T-Shirt Sizes */}
      <div className="glass rounded-[2rem] border border-white/20 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500">T-Shirt Sizes</h3>
          <span className="text-xs text-slate-400">{tshirtTotal} with a size on file</span>
        </div>
        {tshirtData.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {tshirtData.map((t) => (
              <div key={t.size} className="rounded-2xl bg-white/60 border border-white/40 px-4 py-3 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.size}</p>
                <p className="text-2xl font-bold text-slate-950 mt-1">{t.value}</p>
              </div>
            ))}
            {missingTshirtSize > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Missing</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{missingTshirtSize}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
            No t-shirt sizes on file yet
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="glass rounded-[2rem] border border-white/20 shadow-sm">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-500">Upcoming Events</h3>
            <a href="/events" className="text-xs font-medium text-violet-600 hover:text-violet-700 transition">View all</a>
          </div>
          <div className="px-6 pb-5 space-y-3">
            {upcomingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between p-3 rounded-[1.5rem] bg-white/50 border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950 truncate">{ev.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[ev.status] || 'bg-slate-50 text-slate-600'}`}>
                    {ev.status}
                  </span>
                  <span className="text-xs text-slate-400 w-14 text-right">{ev._count?.participants || 0} reg.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
