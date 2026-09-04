import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ code: string; discountPercent: string; active: boolean; usageLimit: string; expiresAt: string }>({
    code: '', discountPercent: '', active: true, usageLimit: '', expiresAt: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

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
    setForm({ code: '', discountPercent: '', active: true, usageLimit: '', expiresAt: '' });
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

  function openEdit(c: Coupon) {
    setForm({
      code: c.code,
      discountPercent: String(c.discountPercent),
      active: c.active,
      usageLimit: c.usageLimit == null ? '' : String(c.usageLimit),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
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
                  <td className="px-5 py-4 text-slate-600">{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ' / ∞'}</td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(c.expiresAt)}</td>
                  <td className="px-5 py-4 text-right space-x-3">
                    <button onClick={() => openEdit(c)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                  </td>
                </tr>
              );
            })}
            {visibleCoupons.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No coupons match</td></tr>
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
                  placeholder="e.g. IHRC25"
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
    </div>
  );
}
