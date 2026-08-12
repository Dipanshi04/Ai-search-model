import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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

export default function SpectatorTracking() {
  const [runners, setRunners] = useState<RunnerPosition[]>([]);
  const [totalRunners, setTotalRunners] = useState(0);
  const [searchBib, setSearchBib] = useState('');
  const [treeCount, setTreeCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ transports: ['polling', 'websocket'] });

    socket.on('connect', () => {
      const eventId = 'default-event-id';
      socket.emit('join:tracking', eventId);
      socket.emit('join:leaderboard', eventId);
      socket.emit('join:event', eventId);
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

    socket.on('trees:update', (data: any) => {
      setTreeCount(data.totalTrees);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    fetch(`/api/v1/tracking/positions?eventId=default-event-id`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setRunners(res.data); });

    fetch(`/api/v1/participants/leaderboard?eventId=default-event-id&limit=500`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setTotalRunners(res.data.length);
          // Merge gender info from leaderboard into runners
          const genderMap = new Map<string, string>();
          res.data.forEach((p: any) => {
            if (p.id && p.gender) genderMap.set(p.id, p.gender);
          });
          setRunners((prev) => prev.map((r) => ({
            ...r,
            gender: r.gender || genderMap.get(r.participantId) || '',
          })));
        }
      });
  }, []);

  const allRunners = searchBib
    ? runners.filter((r) => r.bibNumber.toLowerCase().includes(searchBib.toLowerCase()))
    : runners;

  const maleRunners = allRunners
    .filter((r) => r.gender === 'MALE')
    .sort((a, b) => (b.distance || 0) - (a.distance || 0));

  const femaleRunners = allRunners
    .filter((r) => r.gender === 'FEMALE')
    .sort((a, b) => (b.distance || 0) - (a.distance || 0));

  const topMale = maleRunners[0];
  const topFemale = femaleRunners[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-emerald-400">ISA Tech Marathon 2026</h1>
            <p className="text-xs text-slate-500">Live Race Tracking</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{totalRunners}</p>
              <p className="text-[10px] text-slate-500 uppercase">Runners</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{treeCount}</p>
              <p className="text-[10px] text-slate-500 uppercase">Trees</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Search */}
        <input
          type="text"
          value={searchBib}
          onChange={(e) => setSearchBib(e.target.value.toUpperCase())}
          placeholder="Search by BIB number..."
          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {/* Male and Female Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Male Runners Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">M</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Male Runners</h2>
                <p className="text-[10px] text-slate-500">{maleRunners.length} participants</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-700">
                  <th className="text-left pb-2 w-8">#</th>
                  <th className="text-left pb-2">Name</th>
                  <th className="text-left pb-2">BIB</th>
                  <th className="text-right pb-2">Distance</th>
                </tr>
              </thead>
              <tbody>
                {maleRunners.length === 0 ? (
                  <tr><td colSpan={4} className="text-slate-500 text-sm text-center py-4">Waiting...</td></tr>
                ) : (
                  maleRunners.map((runner, idx) => (
                    <tr key={runner.participantId} className="border-b border-slate-700/50 last:border-0">
                      <td className={`py-2 font-bold text-sm ${
                        idx === 0 ? 'text-amber-400' :
                        idx === 1 ? 'text-slate-300' :
                        idx === 2 ? 'text-orange-400' :
                        'text-slate-500'
                      }`}>{idx + 1}</td>
                      <td className="py-2 text-sm text-white">{runner.name}</td>
                      <td className="py-2 text-xs text-slate-400 font-mono">{runner.bibNumber}</td>
                      <td className="py-2 text-sm font-bold text-blue-400 text-right">{(runner.distance || 0).toFixed(2)} km</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Female Runners Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                <span className="text-pink-400 font-bold text-sm">F</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xs font-bold text-pink-400 uppercase tracking-wider">Female Runners</h2>
                <p className="text-[10px] text-slate-500">{femaleRunners.length} participants</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-700">
                  <th className="text-left pb-2 w-8">#</th>
                  <th className="text-left pb-2">Name</th>
                  <th className="text-left pb-2">BIB</th>
                  <th className="text-right pb-2">Distance</th>
                </tr>
              </thead>
              <tbody>
                {femaleRunners.length === 0 ? (
                  <tr><td colSpan={4} className="text-slate-500 text-sm text-center py-4">Waiting...</td></tr>
                ) : (
                  femaleRunners.map((runner, idx) => (
                    <tr key={runner.participantId} className="border-b border-slate-700/50 last:border-0">
                      <td className={`py-2 font-bold text-sm ${
                        idx === 0 ? 'text-amber-400' :
                        idx === 1 ? 'text-slate-300' :
                        idx === 2 ? 'text-orange-400' :
                        'text-slate-500'
                      }`}>{idx + 1}</td>
                      <td className="py-2 text-sm text-white">{runner.name}</td>
                      <td className="py-2 text-xs text-slate-400 font-mono">{runner.bibNumber}</td>
                      <td className="py-2 text-sm font-bold text-pink-400 text-right">{(runner.distance || 0).toFixed(2)} km</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
