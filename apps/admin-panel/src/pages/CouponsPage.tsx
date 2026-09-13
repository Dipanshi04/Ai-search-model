import { useState, useEffect } from 'react';
import { api } from '../lib/api';

type CouponAudience = 'ALL' | 'PREMIUM_ONLY';

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  audience: CouponAudience;
  createdAt: string;
}

interface CouponUsage {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  participant: {
    bibNumber: string;
    category: string;
    user: { name: string; email: string };
  } | null;
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ code: string; discountPercent: string; active: boolean; usageLimit: string; expiresAt: string; audience: CouponAudience }>({
    code: '', discountPercent: '', active: true, usageLimit: '', expiresAt: '', audience: 'ALL',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [usagesCoupon, setUsagesCoupon] = useState<Coupon | null>(null);
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(false);

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await api.getCoupons();
      if (res.success && res.data) setCoupons(res.data);
    } catch (e) {
      console.error('Failed to fetch coupons:', e);
    }
  }

  function resetForm() {
    setForm({ code: '', discountPercent: '', active: true, usageLimit: '', expiresAt: '', audience: 'ALL' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const percent = Number(form.discountPercent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      setError('Discount must be a whole number between 1 and 100.');
      return;
    }
    const payload = {
      code: form.code.trim().toUpperCase(),
      discountPercent: percent,
      active: form.active,
      usageLimit: form.usageLimit.trim() === '' ? null : Number(form.usageLimit),
      expiresAt: form.expiresAt || null,
      audience: form.audience,
    };
    try {
      const res = editingId
        ? await api.updateCoupon(editingId, payload)
        : await api.createCoupon(payload);
      if (!res.success) {
        setError(res.message || 'Failed to save coupon');
        return;
      }
      setShowModal(false);
      resetForm();
      setEditingId(null);
      fetchCoupons();
    } catch (e: any) {
      setError(e.message || 'Failed to save coupon');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon? It will stop working immediately.')) return;
    try {
      await api.deleteCoupon(id);
      fetchCoupons();
    } catch (e) {
      console.error('Failed to delete coupon:', e);
    }
  }

  async function handleToggleActive(c: Coupon) {
    setToggleBusyId(c.id);
    try {
      await api.updateCoupon(c.id, { active: !c.active });
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      console.error('Failed to update coupon:', e);
    }
    setToggleBusyId(null);
  }

  async function openUsages(c: Coupon) {
    setUsagesCoupon(c);
    setUsages([]);
    setUsagesLoading(true);
    try {
      const res = await api.getCouponUsages(c.id);
      if (res.success && res.data) setUsages(res.data);
    } catch (e) {
      console.error('Failed to fetch coupon usages:', e);
    }
    setUsagesLoading(false);
  }

  function openEdit(c: Coupon) {
    setForm({
      code: c.code,
      discountPercent: String(c.discountPercent),
      active: c.active,
      usageLimit: c.usageLimit == null ? '' : String(c.usageLimit),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      audience: c.audience,
    });
    setEditingId(c.id);
    setError('');
    setShowModal(true);
  }

  const visibleCoupons = coupons.filter((c) =>
    !search.trim() || c.code.toLowerCase().includes(search.trim().toLowerCase())
  );

  const isExpired = (c: Coupon) => c.expiresAt != null && new Date(c.expiresAt) < new Date();
  const isExhausted = (c: Coupon) => c.usageLimit != null && c.usedCount >= c.usageLimit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Coupons</h1>
          <p className="text-slate-500 text-sm">{coupons.length} percentage-off codes — usable by any runner, independent of the premium-company discount</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search codes..."
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none w-48"
          />
          <button
            onClick={() => { resetForm(); setEditingId(null); setError(''); setShowModal(true); }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm"
          >
            Add Coupon
          </button>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80 backdrop-blur-md">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Code</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Discount</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Audience</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Status</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Usage</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Expires</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCoupons.map((c) => {
              const expired = isExpired(c);
              const exhausted = isExhausted(c);
              return (
                <tr key={c.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 text-slate-950 font-mono font-bold">{c.code}</td>
                  <td className="px-5 py-4 text-emerald-700 font-semibold">{c.discountPercent}% off</td>
                  <td className="px-5 py-4">
                    {c.audience === 'PREMIUM_ONLY' ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">Premium only</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Anyone</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleActive(c)}
                      disabled={toggleBusyId === c.id}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full transition disabled:opacity-50 ${
                        c.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Click to toggle"
                    >
                      {c.active ? 'Active' : 'Inactive'}
                    </button>
                    {(expired || exhausted) && (
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        {expired ? 'Expired' : 'Limit reached'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openUsages(c)}
                      className="text-slate-600 hover:text-violet-700 hover:underline"
                      title="See who used this coupon"
                    >
                      {c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ' / ∞'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(c.expiresAt)}</td>
                  <td className="px-5 py-4 text-right space-x-3">
                    <button onClick={() => openEdit(c)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                  </td>
                </tr>
              );
            })}
            {visibleCoupons.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No coupons match</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-96 border border-white/20 shadow-lg">
            <h3 className="text-slate-950 font-semibold mb-4">{editingId ? 'Edit Coupon' : 'Add Coupon'}</h3>
            {error && (
              <div className="mb-4 rounded-3xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-sm mb-1">Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. ISA10"
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm font-mono focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  required
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Expires</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Who can use this?</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value as CouponAudience })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                >
                  <option value="ALL">Anyone</option>
                  <option value="PREMIUM_ONLY">ISA Premium members only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-white/70"
                />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm">
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 bg-white/80 text-slate-700 rounded-3xl border border-white/70 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {usagesCoupon && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-full max-w-lg border border-white/20 shadow-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-slate-950 font-semibold font-mono">{usagesCoupon.code}</h3>
              <button onClick={() => setUsagesCoupon(null)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Every payment attempt that carried this code — not just completed ones.</p>
            <div className="overflow-y-auto -mx-6 px-6 space-y-2">
              {usagesLoading ? (
                <p className="text-sm text-slate-500 py-6 text-center">Loading...</p>
              ) : usages.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nobody has used this coupon yet.</p>
              ) : (
                usages.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-white/40 bg-white/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.participant?.user?.name || 'Unknown'}</p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          u.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          u.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      #{u.participant?.bibNumber} &middot; {u.participant?.user?.email} &middot; ₹{u.amount}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
