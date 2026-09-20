import { useState } from 'react';
import { api } from '../lib/api';

interface ReconcileEntry {
  orderId: string;
  csvStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  csvAmount: number | null;
  transactionTime: string | null;
  csvFailureReason: string | null;
  paymentId: string | null;
  dbStatus: string | null;
  participant: { name: string; email: string; bibNumber: string } | null;
  proposedAction: 'MARK_PAID' | 'MARK_FAILED' | null;
  note: string;
  conflict: boolean;
}

interface ReconcileSummary {
  total: number;
  actionable: number;
  conflicts: number;
  unmatched: number;
}

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export default function PaymentReconcileTab() {
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<ReconcileEntry[]>([]);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyResult, setApplyResult] = useState<{ succeeded: number; failed: number } | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    setApplyResult(null);
    try {
      const res = await api.previewPaymentReconcile(file);
      if (res.success && res.data) {
        setEntries(res.data.entries);
        setSummary(res.data.summary);
        // Pre-select every non-conflicting proposed action — conflicts
        // (money that doesn't match what our DB says) need a human look
        // before anything gets applied, so those start unchecked.
        const preselected = new Set<string>(
          res.data.entries
            .filter((e: ReconcileEntry) => e.proposedAction && !e.conflict && e.paymentId)
            .map((e: ReconcileEntry) => e.paymentId as string)
        );
        setSelected(preselected);
      } else {
        setError(res.message || 'Failed to parse CSV');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to parse CSV');
    }
    setUploading(false);
  }

  function toggle(paymentId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  }

  async function handleApply() {
    const toApply = entries.filter((e) => e.paymentId && selected.has(e.paymentId) && e.proposedAction);
    if (toApply.length === 0) return;
    if (!confirm(`Apply ${toApply.length} payment status update${toApply.length !== 1 ? 's' : ''}? This will mark registrations paid/failed and can send welcome emails.`)) return;

    setApplying(true);
    setError('');
    try {
      const updates = toApply.map((e) => ({
        paymentId: e.paymentId as string,
        action: e.proposedAction as 'MARK_PAID' | 'MARK_FAILED',
        reason: e.csvFailureReason || undefined,
        paidAt: e.transactionTime || undefined,
      }));
      const res = await api.applyPaymentReconcile(updates);
      if (res.success && res.data) {
        const succeeded = res.data.results.filter((r: any) => r.success).length;
        const failed = res.data.results.length - succeeded;
        setApplyResult({ succeeded, failed });
        // Drop applied rows from the list so a re-apply can't double-fire —
        // whatever's left is either unmatched, a conflict, or already fine.
        setEntries((prev) => prev.filter((e) => !e.paymentId || !selected.has(e.paymentId)));
        setSelected(new Set());
      } else {
        setError(res.message || 'Failed to apply updates');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to apply updates');
    }
    setApplying(false);
  }

  const selectedCount = entries.filter((e) => e.paymentId && selected.has(e.paymentId)).length;

  return (
    <div className="space-y-6">
      <div className="glass rounded-[2rem] border border-white/20 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Reconcile from Cashfree CSV</h3>
        <p className="text-xs text-slate-500 mb-4">
          Download the transactions export from your Cashfree dashboard and upload it here. This catches payments
          that succeeded or failed on Cashfree's side but never updated in our system — usually because a webhook
          delivery was missed. A user who simply dropped out of the payment flow (didn't finish authentication) is
          treated as a cancellation, not a technical failure.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-sm font-medium cursor-pointer disabled:opacity-50">
          {uploading ? 'Parsing...' : 'Upload Cashfree CSV'}
          <input
            type="file"
            accept=".csv"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </label>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 mt-3">{error}</p>
        )}
        {applyResult && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2 mt-3">
            Applied {applyResult.succeeded} update{applyResult.succeeded !== 1 ? 's' : ''}
            {applyResult.failed > 0 ? `, ${applyResult.failed} failed` : ''}.
          </p>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Rows in CSV', value: summary.total, color: 'text-slate-700', bg: 'bg-slate-50' },
            { label: 'Need Action', value: summary.actionable, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Conflicts', value: summary.conflicts, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Unmatched', value: summary.unmatched, color: 'text-slate-500', bg: 'bg-slate-50' },
          ].map((c) => (
            <div key={c.label} className={`glass rounded-[2rem] p-5 border border-white/20 shadow-sm ${c.bg}`}>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="glass rounded-[2rem] border border-white/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <p className="text-sm text-slate-600">{selectedCount} selected</p>
            <button
              onClick={handleApply}
              disabled={applying || selectedCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold disabled:opacity-50"
            >
              {applying ? 'Applying...' : `Apply ${selectedCount} Update${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {entries.map((e) => (
              <div key={e.orderId} className={`px-6 py-4 flex items-start gap-4 ${e.conflict ? 'bg-red-50/40' : ''}`}>
                <input
                  type="checkbox"
                  disabled={!e.proposedAction || !e.paymentId}
                  checked={!!e.paymentId && selected.has(e.paymentId)}
                  onChange={() => e.paymentId && toggle(e.paymentId)}
                  className="mt-1 rounded border-slate-300 disabled:opacity-30"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">
                      {e.participant?.name || 'Unmatched order'}
                    </p>
                    {e.participant && <span className="text-xs text-slate-500">#{e.participant.bibNumber}</span>}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[e.csvStatus]}`}>
                      Cashfree: {e.csvStatus}
                    </span>
                    {e.dbStatus && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        DB: {e.dbStatus}
                      </span>
                    )}
                    {e.conflict && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Needs review</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{e.note}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{e.orderId}</p>
                </div>
                {e.csvAmount != null && <p className="text-sm font-bold text-slate-900 shrink-0">₹{e.csvAmount}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
