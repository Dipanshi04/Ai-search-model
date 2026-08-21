import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from './lib/api';
import logoDark from './components/logo-dark.png';
import logoLight from './components/logo-light.png';

const Logo = ({ size = 'h-14', theme = 'dark' }: { size?: string; theme?: 'light' | 'dark' }) => (
  <img src={theme === 'dark' ? logoLight : logoDark} alt="ISA Marathon" className={`${size} w-auto max-w-full object-contain drop-shadow-md`} />
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface RunnerPosition {
  participantId: string;
  name: string;
  bibNumber: string;
  companyName?: string;
  gender?: string;
  category?: string;
  lat: number;
  lng: number;
  distance: number;
  pace: number | null;
  rank: number;
  status: string;
}

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logoUrl?: string;
}

const TIER_COLORS: Record<string, string> = {
  PLATINUM: '#e5e7eb',
  GOLD: '#f59e0b',
  SILVER: '#94a3b8',
  BRONZE: '#d97706',
};

function getSponsorInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SpectatorTracking() {
  const [runners, setRunners] = useState<RunnerPosition[]>([]);
  const [totalRunners, setTotalRunners] = useState(0);
  const [searchBib, setSearchBib] = useState('');
  const [treeCount, setTreeCount] = useState(0);
  const [co2Offset, setCo2Offset] = useState(0);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'live' | 'leaderboard' | 'search'>('live');
  const [lbCategory, setLbCategory] = useState<'overall' | 'RUN_3K' | 'RUN_5K'>('overall');
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const raceStartRef = useRef<Date | null>(null);
  const accumulatedElapsedRef = useRef(0);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [statusRes, sponsorRes, lbRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/v1/race/status`).then((r) => r.json()),
          fetch(`${API_URL}/api/v1/sponsors`).then((r) => r.json()),
          fetch(`${API_URL}/api/v1/participants/leaderboard?limit=500`).then((r) => r.json()),
        ]);

        if (statusRes.status === 'fulfilled' && statusRes.value.success) {
          const ev = statusRes.value.data?.event;
          const elapsedMs = ev?.elapsedMs || 0;
          if (elapsedMs > 0) {
            const now = new Date();
            raceStartRef.current = new Date(now.getTime() - elapsedMs);
            accumulatedElapsedRef.current = elapsedMs;
          } else if (ev?.startedAt) {
            raceStartRef.current = new Date(ev.startedAt);
          }
        }

        if (sponsorRes.status === 'fulfilled' && sponsorRes.value.success) {
          setSponsors(sponsorRes.value.data || []);
        }

        if (lbRes.status === 'fulfilled' && lbRes.value.success) {
          setTotalRunners(lbRes.value.data.length);
          setRunners(lbRes.value.data.filter((p: any) => p.status === 'RUNNING' || p.status === 'FINISHED').map((p: any) => ({
            participantId: p.id,
            name: p.name,
            bibNumber: p.bibNumber,
            companyName: p.companyName,
            gender: p.gender,
            category: p.category,
            lat: 0,
            lng: 0,
            distance: p.distance || 0,
            pace: p.pace || null,
            rank: p.rank || 0,
            status: p.status,
          })));
        }
      } catch (e) {
        console.error('Initial load error:', e);
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['polling', 'websocket'] });

    socket.on('connect', () => {
      socket.emit('join:tracking', 'default-event-id');
      socket.emit('join:leaderboard', 'default-event-id');
      socket.emit('join:event', 'default-event-id');
    });

    socket.on('race:start', (data: any) => {
      raceStartRef.current = new Date(data.startedAt);
      setTotalRunners(data.totalParticipants);
    });

    socket.on('runner:update', (data: RunnerPosition) => {
      setRunners((prev) => {
        const idx = prev.findIndex((r) => r.participantId === data.participantId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...data };
          return updated;
        }
        return [...prev, data];
      });
    });

    socket.on('leaderboard:update', (data: any) => {
      if (data.top10) {
        setRunners((prev) => {
          const map = new Map(prev.map((r) => [r.participantId, r]));
          data.top10.forEach((entry: any) => {
            map.set(entry.participantId || entry.id, {
              participantId: entry.participantId || entry.id,
              name: entry.name,
              bibNumber: entry.bibNumber,
              companyName: entry.companyName,
              gender: entry.gender,
              category: entry.category,
              lat: 0, lng: 0,
              distance: entry.distance || 0,
              pace: entry.pace || null,
              rank: entry.rank || 0,
              status: entry.status || 'RUNNING',
            });
          });
          return Array.from(map.values());
        });
      }
    });

    socket.on('trees:update', (data: any) => {
      setTreeCount(data.totalTrees);
      setCo2Offset(data.totalCO2);
    });

    socket.on('announcement', (data: any) => {
      setAnnouncement({ title: data.title, message: data.message });
      setTimeout(() => setAnnouncement(null), 15000);
    });

    socket.on('race:status', (data: any) => {
      if (data.status === 'ACTIVE') {
        // Always use server's elapsedMs to set correct start time
        if (data.elapsedMs && data.elapsedMs > 0) {
          const now = new Date();
          raceStartRef.current = new Date(now.getTime() - data.elapsedMs);
          accumulatedElapsedRef.current = 0; // Server already includes accumulated time
        } else if (!raceStartRef.current) {
          raceStartRef.current = new Date();
        }
      } else if (data.status === 'PAUSED') {
        // Store accumulated elapsed time when paused
        if (data.elapsedMs && data.elapsedMs > 0) {
          accumulatedElapsedRef.current = data.elapsedMs;
        } else if (raceStartRef.current) {
          accumulatedElapsedRef.current = Date.now() - raceStartRef.current.getTime();
        }
        raceStartRef.current = null;
      } else if (data.status === 'COMPLETED') {
        raceStartRef.current = null;
        accumulatedElapsedRef.current = 0;
      }
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (raceStartRef.current) {
        const liveMs = Date.now() - raceStartRef.current.getTime();
        setElapsedTime(Math.floor((liveMs + accumulatedElapsedRef.current) / 1000));
      } else if (accumulatedElapsedRef.current > 0) {
        setElapsedTime(Math.floor(accumulatedElapsedRef.current / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredRunners = searchBib
    ? runners.filter((r) => r.bibNumber.toLowerCase().includes(searchBib.toLowerCase()) || r.name.toLowerCase().includes(searchBib.toLowerCase()))
    : runners;

  const sortedRunners = [...filteredRunners].sort((a, b) => (b.distance || 0) - (a.distance || 0));
  const lbFiltered = lbCategory === 'overall'
    ? sortedRunners
    : sortedRunners.filter((r) => r.category === lbCategory);
  const maleRunners = sortedRunners.filter((r) => r.gender === 'MALE');
  const femaleRunners = sortedRunners.filter((r) => r.gender === 'FEMALE');
  const finishedCount = runners.filter((r) => r.status === 'FINISHED').length;
  const topThree = lbFiltered.slice(0, 3);
  const maxDistance = topThree.length > 0 ? (topThree[0]?.distance || 1) : 1;

  function rankBadge(idx: number) {
    if (idx === 0) return <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-bold">1</span>;
    if (idx === 1) return <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-400/20 text-slate-300 text-sm font-bold">2</span>;
    if (idx === 2) return <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-bold">3</span>;
    return <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-slate-400 text-sm font-bold">{idx + 1}</span>;
  }

  function runnerRow(runner: RunnerPosition, idx: number) {
    return (
      <div key={runner.participantId} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
        {rankBadge(idx)}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white truncate">{runner.name}</p>
          <p className="text-sm text-slate-400">
            #{runner.bibNumber}{runner.companyName ? ` · ${runner.companyName}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-emerald-400">{(runner.distance || 0).toFixed(2)} km</p>
          {runner.pace && <p className="text-sm text-slate-400">{runner.pace.toFixed(1)} min/km</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden select-none" style={{ background: 'var(--color-bg)' }}>
      {/* Announcement Banner */}
      {announcement && (
        <div className="bg-amber-500 text-slate-900 px-6 py-2.5 text-center shrink-0">
          <span className="font-bold text-sm">{announcement.title}: </span>
          <span className="text-sm">{announcement.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/5 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="h-12" />
            <div className="ml-2">
              <h1 className="text-lg sm:text-xl font-bold text-white leading-none">ISA TECH MARATHON</h1>
              <p className="text-xs sm:text-sm text-emerald-400/80 tracking-widest mt-0.5">LIVE TRACKING</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            {elapsedTime > 0 && (
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 leading-none">{formatDuration(elapsedTime)}</p>
                <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest mt-1">Elapsed</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white leading-none">{totalRunners}</p>
              <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest mt-1">Runners</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-violet-400 leading-none">{finishedCount}</p>
              <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest mt-1">Finished</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-400 leading-none">{treeCount}</p>
              <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest mt-1">Trees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-300 leading-none">{Math.round(co2Offset)}</p>
              <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest mt-1">kg CO2</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-white/5 px-4 sm:px-6 shrink-0">
        <div className="max-w-full mx-auto flex gap-1">
          {([
            { key: 'live', label: 'Live Tracking' },
            { key: 'leaderboard', label: 'Leaderboard' },
            { key: 'search', label: 'Find Runner' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Live Tracking Tab */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="glass-card rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={searchBib}
                    onChange={(e) => setSearchBib(e.target.value.toUpperCase())}
                    placeholder="Search by BIB number or name..."
                    className="flex-1 bg-transparent text-base sm:text-lg text-white placeholder-slate-400 outline-none"
                  />
                  {searchBib && (
                    <button onClick={() => setSearchBib('')} className="text-slate-400 hover:text-white text-sm sm:text-base">Clear</button>
                  )}
                </div>
              </div>

              {/* Gender Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Male */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-blue-400">Male Leaders</h2>
                        <p className="text-sm text-slate-400">{maleRunners.length} runners</p>
                      </div>
                    </div>
                    {maleRunners.length > 0 && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-white leading-none">{maleRunners[0]?.distance?.toFixed(2) || '0.00'}</p>
                        <p className="text-sm text-slate-400">km lead</p>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                    {maleRunners.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 text-sm">Waiting for race data...</div>
                    ) : (
                      maleRunners.slice(0, 15).map((r, i) => runnerRow(r, i))
                    )}
                  </div>
                </div>

                {/* Female */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center">
                        <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-pink-400">Female Leaders</h2>
                        <p className="text-sm text-slate-400">{femaleRunners.length} runners</p>
                      </div>
                    </div>
                    {femaleRunners.length > 0 && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-white leading-none">{femaleRunners[0]?.distance?.toFixed(2) || '0.00'}</p>
                        <p className="text-sm text-slate-400">km lead</p>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                    {femaleRunners.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 text-sm">Waiting for race data...</div>
                    ) : (
                      femaleRunners.slice(0, 15).map((r, i) => runnerRow(r, i))
                    )}
                  </div>
                </div>
              </div>

              {/* Green Impact */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-green-400 leading-none">{treeCount}</p>
                  <p className="text-sm text-slate-400 mt-2 uppercase tracking-wider">Trees Planted</p>
                </div>
                <div className="glass-card rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-emerald-400 leading-none">{Math.round(co2Offset)} kg</p>
                  <p className="text-sm text-slate-400 mt-2 uppercase tracking-wider">CO2 Saved</p>
                </div>
                <div className="glass-card rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-amber-400 leading-none">{Math.floor(co2Offset / 4600)}</p>
                  <p className="text-sm text-slate-400 mt-2 uppercase tracking-wider">Cars Offset/yr</p>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {/* Category Tabs */}
              <div className="glass-card rounded-2xl p-1.5 flex gap-1">
                {([
                  { key: 'overall' as const, label: 'Overall' },
                  { key: 'RUN_3K' as const, label: '3K' },
                  { key: 'RUN_5K' as const, label: '5K' },
                ]).map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setLbCategory(cat.key)}
                    className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
                      lbCategory === cat.key
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Top 3 */}
              {topThree.length >= 3 && (
                <div className="grid grid-cols-3 gap-4">
                  {/* 2nd */}
                  <div className="glass-card rounded-2xl p-6 text-center mt-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-400/20 flex items-center justify-center text-white text-xl font-bold mb-3">
                      2
                    </div>
                    <p className="text-base font-bold text-white truncate">{topThree[1]?.name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">#{topThree[1]?.bibNumber}</p>
                    <p className="text-xl font-bold text-slate-300 mt-3">{(topThree[1]?.distance || 0).toFixed(2)} km</p>
                  </div>

                  {/* 1st */}
                  <div className="glass-card rounded-2xl p-6 text-center border border-amber-500/20">
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center text-white text-2xl font-bold mb-3">
                      1
                    </div>
                    <p className="text-base font-bold text-white truncate">{topThree[0]?.name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">#{topThree[0]?.bibNumber}</p>
                    <p className="text-xl font-bold text-amber-400 mt-3">{(topThree[0]?.distance || 0).toFixed(2)} km</p>
                  </div>

                  {/* 3rd */}
                  <div className="glass-card rounded-2xl p-6 text-center mt-10">
                    <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center text-white text-xl font-bold mb-3">
                      3
                    </div>
                    <p className="text-base font-bold text-white truncate">{topThree[2]?.name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">#{topThree[2]?.bibNumber}</p>
                    <p className="text-xl font-bold text-orange-400 mt-3">{(topThree[2]?.distance || 0).toFixed(2)} km</p>
                  </div>
                </div>
              )}

              {/* Full Leaderboard */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-amber-400">Race Standings</h2>
                    <p className="text-sm text-slate-400 mt-0.5">{lbFiltered.length} runners</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-emerald-400 font-semibold">LIVE</span>
                  </div>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {lbFiltered.length === 0 ? (
                    <div className="p-12 text-center text-slate-600 text-sm">Waiting for race data...</div>
                  ) : (
                    lbFiltered.slice(0, 30).map((runner, idx) => {
                      const progress = maxDistance > 0 ? ((runner.distance || 0) / maxDistance) * 100 : 0;
                      return (
                        <div key={runner.participantId} className={`px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors ${idx < 3 ? 'bg-white/[0.02]' : ''}`}>
                          {rankBadge(idx)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-white truncate">{runner.name}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                runner.category === 'RUN_5K' ? 'bg-violet-500/15 text-violet-400' : 'bg-blue-500/15 text-blue-400'
                              }`}>{runner.category?.replace('RUN_', '') || '?'}</span>
                            </div>
                            <p className="text-sm text-slate-400">#{runner.bibNumber}{runner.companyName ? ` · ${runner.companyName}` : ''}</p>
                            <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500/70 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold text-emerald-400">{(runner.distance || 0).toFixed(2)} km</p>
                            {runner.pace && <p className="text-sm text-slate-400">{runner.pace.toFixed(1)} min/km</p>}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                              runner.status === 'RUNNING' ? 'bg-amber-500/10 text-amber-400' :
                              runner.status === 'FINISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>{runner.status === 'FINISHED' ? 'DONE' : runner.status === 'RUNNING' ? 'LIVE' : runner.status}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <RunnerSearchTab />
          )}
        </div>
      </main>

      {/* Sponsor Marquee */}
      {sponsors.length > 0 && (
        <div className="border-t border-white/5 px-4 sm:px-6 py-3 shrink-0">
          <div className="max-w-full mx-auto overflow-hidden">
            <div className="sponsor-ticker flex items-center gap-5">
              {[...sponsors, ...sponsors].map((sponsor, i) => (
                <div
                  key={`marquee-${sponsor.id}-${i}`}
                  className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2 shrink-0"
                  title={sponsor.name}
                >
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-6 max-w-[80px] object-contain" />
                  ) : (
                    <>
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                        style={{ backgroundColor: `${TIER_COLORS[sponsor.tier] || '#475569'}20`, color: TIER_COLORS[sponsor.tier] || '#94a3b8' }}
                      >
                        {getSponsorInitials(sponsor.name)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{sponsor.name}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Search sub-component */
function RunnerSearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await api.searchRunner(query.trim());
    if (res.success && res.data) setResults(res.data);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, BIB number, or company..."
            className="flex-1 bg-transparent text-base sm:text-lg text-white placeholder-slate-400 outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-base font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {!loading && searched && results.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-base">No runners found</div>
      )}

      <div className="space-y-3">
        {results.map((runner) => (
          <div key={runner.id} className="glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0">
              {runner.user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-base">{runner.user?.name}</p>
              <p className="text-sm text-slate-400">
                BIB: {runner.bibNumber} · {runner.category?.replace('RUN_', '')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-white">{runner.totalDistance?.toFixed(2) || '0.00'} km</p>
              <span className={`text-sm font-semibold ${
                runner.status === 'RUNNING' ? 'text-amber-400' :
                runner.status === 'FINISHED' ? 'text-emerald-400' :
                'text-slate-400'
              }`}>{runner.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
