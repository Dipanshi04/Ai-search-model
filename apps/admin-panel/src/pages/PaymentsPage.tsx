import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PaymentReconcileTab from '../components/PaymentReconcileTab';

interface PaymentRow {
  id: string;
  reference: string | null;
  provider: 'RAZORPAY' | 'SHOWTIMEBRO' | 'CASHFREE';
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'CLAIMED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  participant: {
    bibNumber: string;
    category: string;
    user: { name: string; email: string; phone: string };
  };
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-slate-200 text-slate-600',
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  CLAIMED: 'bg-blue-100 text-blue-700',
};

const PROVIDER_STYLES: Record<string, string> = {
  CASHFREE: 'bg-violet-100 text-violet-700',
  RAZORPAY: 'bg-indigo-100 text-indigo-700',
  SHOWTIMEBRO: 'bg-slate-200 text-slate-600',
};

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
  const [tab, setTab] = useState<'list' | 'reconcile'>('list');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; completed: number; failed: number; pending: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [recheckQuery, setRecheckQuery] = useState('');
  const [rechecking, setRechecking] = useState(false);
  const [recheckMessage, setRecheckMessage] = useState('');

  useEffect(() => {
    load();
  }, [statusFilter, providerFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPayments({ status: statusFilter, provider: providerFilter, limit: 200 });
      if (res.success) {
        setPayments(res.data || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (e) {
      console.error('Failed to load payments:', e);
    }
    setLoading(false);
  }

  async function handleVerify(id: string) {
    setBusyId(id);
    try {
      await api.verifyPaymentManual(id);
      await load();
    } catch (e) {
      console.error('Verify failed:', e);
    }
    setBusyId(null);
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await api.rejectPaymentManual(id, reason);
      await load();
    } catch (e) {
      console.error('Reject failed:', e);
    }
    setBusyId(null);
    setRejectingId(null);
    setReason('');
  }

  async function handleRecheck() {
    const query = recheckQuery.trim();
    setRechecking(true);
    setRecheckMessage('');
    try {
      const params = query
        ? (query.includes('@') ? { email: query } : { bibNumber: query })
        : {};
      if (!query && !confirm('No BIB or email entered — this will sweep every already-paid participant and close out all their stray pending payments at once. Continue?')) {
        setRechecking(false);
        return;
      }
      const res = await api.recheckPayments(params);
      if (res.success && res.data) {
        setRecheckMessage(res.data.message);
        if (res.data.closed > 0) await load();
      } else {
        setRecheckMessage(res.message || 'Recheck failed');
      }
    } catch (e: any) {
      setRecheckMessage(e.message || 'Recheck failed');
    }
    setRechecking(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Payments</h1>
        <p className="text-sm text-slate-500 mt-1">Every payment attempt, across every provider — Cashfree is the live one.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: 'list' as const, label: 'All Payments' },
          { key: 'reconcile' as const, label: 'Reconcile from CSV' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reconcile' && <PaymentReconcileTab />}

      {tab === 'list' && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Payments', value: summary?.total ?? '—', color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Completed', value: summary?.completed ?? '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed', value: summary?.failed ?? '—', color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending', value: summary?.pending ?? '—', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((c) => (
          <div key={c.label} className={`glass rounded-[2rem] p-5 border border-white/20 shadow-sm ${c.bg}`}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm"
        >
          {['ALL', 'FAILED', 'COMPLETED', 'PENDING', 'PROCESSING', 'CLAIMED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
          ))}
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm"
        >
          {['ALL', 'CASHFREE', 'RAZORPAY', 'SHOWTIMEBRO'].map((p) => (
            <option key={p} value={p}>{p === 'ALL' ? 'All providers' : p}</option>
          ))}
        </select>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">
          Recheck &amp; Clean Up — closes out stray PENDING payments for a participant who's already marked paid
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={recheckQuery}
            onChange={(e) => setRecheckQuery(e.target.value)}
            placeholder="BIB number or email (leave blank to sweep everyone)"
            className="flex-1 min-w-[16rem] px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
          />
          <button
            onClick={handleRecheck}
            disabled={rechecking}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-sm font-semibold disabled:opacity-50"
          >
            {rechecking ? 'Rechecking...' : 'Recheck'}
          </button>
        </div>
        {recheckMessage && <p className="text-xs text-slate-600 mt-2">{recheckMessage}</p>}
      </div>

      <div className="glass rounded-[2rem] border border-white/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No payments match these filters.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.participant?.user?.name || 'Unknown'}</p>
                    <span className="text-xs text-slate-500">#{p.participant?.bibNumber}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PROVIDER_STYLES[p.provider] || 'bg-slate-100 text-slate-600'}`}>
                      {p.provider}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || 'bg-slate-100 text-slate-600'}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.participant?.user?.email} &middot; {timeAgo(p.createdAt)}
                    {p.paidAt ? ` · paid ${timeAgo(p.paidAt)}` : ''}
                  </p>
                  {p.status === 'FAILED' && p.failureReason && (
                    <p className="text-xs text-red-600 mt-1">Reason: {p.failureReason}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 shrink-0">₹{p.amount}</p>

                {(p.status === 'PENDING' || p.status === 'CLAIMED' || p.status === 'PROCESSING') && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleVerify(p.id)}
                      disabled={busyId === p.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                    {rejectingId === p.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason"
                          className="px-2 py-1.5 border border-slate-200 rounded-full text-xs w-28"
                        />
                        <button
                          onClick={() => handleReject(p.id)}
                          disabled={busyId === p.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-semibold disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRejectingId(p.id)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-semibold"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
