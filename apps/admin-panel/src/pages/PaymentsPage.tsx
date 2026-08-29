import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface PendingPayment {
  id: string;
  reference: string | null;
  amount: number;
  status: 'PENDING' | 'CLAIMED';
  createdAt: string;
  updatedAt: string;
  returnParams: Record<string, string> | null;
  participant: {
    bibNumber: string;
    category: string;
    user: { name: string; email: string; phone: string };
  };
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.getShowtimeBroPending();
      if (res.success) setPayments(res.data || []);
    } catch (e) {
      console.error('Failed to load pending payments:', e);
    }
    setLoading(false);
  }

  async function handleVerify(id: string) {
    setBusyId(id);
    try {
      await api.verifyShowtimeBroPayment(id);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Verify failed:', e);
    }
    setBusyId(null);
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await api.rejectShowtimeBroPayment(id, reason);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Reject failed:', e);
    }
    setBusyId(null);
    setRejectingId(null);
    setReason('');
  }

  const claimedCount = payments.filter((p) => p.status === 'CLAIMED').length;
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Payments</h1>
        <p className="text-sm text-slate-500 mt-1">
          ShowtimeBro gives us a redirect back, not a signed webhook — a query param claiming
          success can be forged by anyone who types the URL. Nothing here is registered until you
          compare it against ShowtimeBro's own sales report and verify it below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-[2rem] p-5 border border-white/20 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{claimedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Returned from checkout — needs review</p>
        </div>
        <div className="glass rounded-[2rem] p-5 border border-white/20 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-950">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Still at checkout, not yet returned</p>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading&hellip;</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            Nothing waiting on reconciliation right now.
          </div>
        ) : (
          <div className="divide-y divide-white/40">
            {payments.map((p) => (
              <div key={p.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.status === 'CLAIMED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status === 'CLAIMED' ? 'Returned from checkout' : 'Awaiting checkout'}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(p.updatedAt)}</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-950">{p.participant.user.name}</p>
                    <div className="mt-1 grid gap-x-6 gap-y-0.5 sm:grid-cols-2 text-sm text-slate-600">
                      <div><span className="text-slate-400">Email:</span> {p.participant.user.email}</div>
                      <div><span className="text-slate-400">Phone:</span> {p.participant.user.phone}</div>
                      <div><span className="text-slate-400">BIB:</span> <span className="font-mono">{p.participant.bibNumber}</span></div>
                      <div><span className="text-slate-400">Category:</span> {p.participant.category === 'RUN_5K' ? '5K' : '3K'}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono">{p.reference}</span>
                      {p.returnParams && Object.keys(p.returnParams).length > 0 && (
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="underline hover:text-slate-600"
                        >
                          {expandedId === p.id ? 'Hide' : 'Show'} return params
                        </button>
                      )}
                    </div>
                    {expandedId === p.id && p.returnParams && (
                      <pre className="mt-2 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl overflow-x-auto">
                        {JSON.stringify(p.returnParams, null, 2)}
                      </pre>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-xl font-bold text-slate-950">&#8377;{p.amount}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(p.id)}
                        disabled={busyId === p.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-full text-sm font-semibold transition-colors"
                      >
                        {busyId === p.id ? 'Verifying…' : 'Verify & Register'}
                      </button>
                      <button
                        onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}
                        disabled={busyId === p.id}
                        className="px-4 py-2 bg-white/80 hover:bg-red-50 border border-slate-200 disabled:opacity-50 text-red-600 rounded-full text-sm font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>

                {rejectingId === p.id && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (e.g. not found in ShowtimeBro sales report)"
                      className="flex-1 px-4 py-2 bg-white/80 border border-white/70 rounded-full text-sm text-slate-950 focus:ring-2 focus:ring-violet-200 outline-none"
                    />
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={busyId === p.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-full text-sm font-semibold transition-colors"
                    >
                      Confirm Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
