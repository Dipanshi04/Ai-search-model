import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export default function CheckinPage() {
  const [bibInput, setBibInput] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [_error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
    inputRef.current?.focus();
  }, []);

  async function loadStats() {
    try {
      const res = await api.getCheckinStats();
      if (res.success) setStats(res.data);
    } catch (e) {
      console.error('Failed to load checkin stats:', e);
    }
  }

  async function handleScan() {
    if (!bibInput.trim()) return;

    setError('');
    try {
      const res = await api.scanCheckin(bibInput.trim());

      if (res.success) {
        setLastResult({ success: true, ...res.data });
        setBibInput('');
        loadStats();
      } else {
        setLastResult({ success: false, message: res.message });
        setError(res.message || 'Check-in failed');
      }
    } catch (e: any) {
      setLastResult({ success: false, message: e.message || 'Check-in failed' });
      setError(e.message || 'Check-in failed');
    }

    inputRef.current?.focus();
  }

  async function handleUndo(id: string) {
    try {
      await api.undoCheckin(id);
      setLastResult(null);
      loadStats();
    } catch (e) {
      console.error('Failed to undo checkin:', e);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Check-in</h1>
        <p className="text-sm text-slate-500 mt-1">Scan participants and confirm registration at the start line.</p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass rounded-[2rem] p-5 border border-white/20 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-950">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total</p>
          </div>
          <div className="glass rounded-[2rem] p-5 border border-white/20 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-700">{stats.checkedIn}</p>
            <p className="text-xs text-slate-500 mt-1">Checked In</p>
          </div>
          <div className="glass rounded-[2rem] p-5 border border-white/20 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-700">{(stats.total || 0) - (stats.checkedIn || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Remaining</p>
          </div>
        </div>
      )}

      <div className="glass rounded-[2rem] border border-white/20 p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-600 mb-3">
          Scan QR code or enter BIB number
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            ref={inputRef}
            type="text"
            value={bibInput}
            onChange={(e) => setBibInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="ISA1001"
            className="flex-1 px-4 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-lg font-mono focus:ring-2 focus:ring-violet-200 outline-none"
          />
          <button
            onClick={handleScan}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-semibold transition-colors"
          >
            Check In
          </button>
        </div>
      </div>

      {lastResult && (
        <div className={`p-6 rounded-[2rem] border ${
          lastResult.success
            ? 'bg-emerald-50/80 border-emerald-200'
            : 'bg-red-50/80 border-red-200'
        }`}>
          {lastResult.success ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold">
                OK
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-slate-950">{lastResult.message}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                  <div><span className="font-semibold text-slate-700">BIB:</span> {lastResult.participant?.bibNumber}</div>
                  <div><span className="font-semibold text-slate-700">Category:</span> {lastResult.participant?.category}</div>
                  <div><span className="font-semibold text-slate-700">Name:</span> {lastResult.participant?.user?.name}</div>
                  <div><span className="font-semibold text-slate-700">Company:</span> {lastResult.participant?.company?.name || '—'}</div>
                </div>
                <button
                  onClick={() => handleUndo(lastResult.participant.id)}
                  className="mt-4 text-sm text-slate-600 hover:text-red-600"
                >
                  Undo check-in
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-lg font-bold">!</div>
              <p className="text-red-700 text-sm">{lastResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}