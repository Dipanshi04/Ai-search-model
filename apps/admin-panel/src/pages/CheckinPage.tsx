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
    const res = await api.getCheckinStats();
    if (res.success) setStats(res.data);
  }

  async function handleScan() {
    if (!bibInput.trim()) return;

    setError('');
    const res = await api.scanCheckin(bibInput.trim());

    if (res.success) {
      setLastResult({ success: true, ...res.data });
      setBibInput('');
      loadStats();
    } else {
      setLastResult({ success: false, message: res.message });
      setError(res.message || 'Check-in failed');
    }

    inputRef.current?.focus();
  }

  async function handleUndo(id: string) {
    await api.undoCheckin(id);
    setLastResult(null);
    loadStats();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Check-in</h1>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.checkedIn}</p>
            <p className="text-xs text-slate-400">Checked In</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.notCheckedIn}</p>
            <p className="text-xs text-slate-400">Remaining</p>
          </div>
        </div>
      )}

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Scan QR Code or Enter BIB Number
        </label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={bibInput}
            onChange={(e) => setBibInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="ISA1001"
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            onClick={handleScan}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            Check In
          </button>
        </div>
      </div>

      {lastResult && (
        <div className={`p-6 rounded-xl border ${
          lastResult.success
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          {lastResult.success ? (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg font-bold mt-1">OK</div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-emerald-400">{lastResult.message}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">BIB:</span> <span className="text-white">{lastResult.participant?.bibNumber}</span></div>
                  <div><span className="text-slate-400">Category:</span> <span className="text-white">{lastResult.participant?.category}</span></div>
                  <div><span className="text-slate-400">Name:</span> <span className="text-white">{lastResult.participant?.user?.name}</span></div>
                  <div><span className="text-slate-400">Company:</span> <span className="text-white">{lastResult.participant?.company?.name || '—'}</span></div>
                </div>
                <button
                  onClick={() => handleUndo(lastResult.participant.id)}
                  className="mt-3 text-xs text-slate-400 hover:text-red-400"
                >
                  Undo check-in
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-lg font-bold">!</div>
              <p className="text-red-400">{lastResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}