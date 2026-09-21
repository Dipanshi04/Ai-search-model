import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface BulkRegistration {
  id: string;
  companyName: string;
  hrName: string;
  hrEmail: string;
  numberOfRegistrations: number;
  registeredCount: number;
  paymentCompleted: boolean;
  notes: string | null;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  companyName: '',
  hrName: '',
  hrEmail: '',
  hrPassword: '',
  numberOfRegistrations: 1,
  notes: '',
  paymentCompleted: false,
};

export default function BulkRegistrationPage() {
  const [registrations, setRegistrations] = useState<BulkRegistration[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyFieldRef = useRef<HTMLDivElement>(null);
  const [resetResult, setResetResult] = useState<{ hrEmail: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [showTshirtReport, setShowTshirtReport] = useState(false);
  const [tshirtReport, setTshirtReport] = useState<{
    sizes: string[];
    rows: { companyName: string; counts: Record<string, number>; total: number }[];
    grandTotal: Record<string, number>;
  } | null>(null);
  const [tshirtReportLoading, setTshirtReportLoading] = useState(false);

  useEffect(() => { fetchRegistrations(); }, []);

  useEffect(() => {
    api.getCompanies().then((res) => {
      if (res.success && res.data) setCompanies(res.data);
    }).catch(() => {});
  }, []);

  // Client-side filter of the already-fetched list — no per-keystroke API calls.
  const filteredCompanies = form.companyName.trim()
    ? companies.filter((c) => c.name.toLowerCase().includes(form.companyName.trim().toLowerCase()))
    : companies;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (companyFieldRef.current && !companyFieldRef.current.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function fetchRegistrations() {
    try {
      const res = await api.getBulkRegistrations();
      if (res.success && res.data) setRegistrations(res.data);
    } catch (e) {
      console.error('Failed to fetch bulk registrations:', e);
    }
  }

  async function toggleTshirtReport() {
    if (showTshirtReport) {
      setShowTshirtReport(false);
      return;
    }
    setShowTshirtReport(true);
    if (tshirtReport) return; // already loaded once this session
    setTshirtReportLoading(true);
    try {
      const res = await api.getBulkTshirtReport();
      if (res.success && res.data) setTshirtReport(res.data);
    } catch (e) {
      console.error('Failed to fetch t-shirt report:', e);
    }
    setTshirtReportLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // companyId is only trusted if the visible text still exactly matches
    // the company it was picked from — editing the text after picking (or
    // never picking at all) means a new company name instead.
    const pickedCompany = companies.find((c) => c.id === companyId);
    const companyFields = pickedCompany && pickedCompany.name === form.companyName.trim()
      ? { companyId }
      : { companyName: form.companyName.trim() };
    try {
      if (editingId) {
        await api.updateBulkRegistration(editingId, {
          ...companyFields,
          hrName: form.hrName,
          hrEmail: form.hrEmail,
          numberOfRegistrations: form.numberOfRegistrations,
          notes: form.notes || null,
          paymentCompleted: form.paymentCompleted,
        });
      } else {
        await api.createBulkRegistration({
          companyName: form.companyName.trim(),
          ...companyFields,
          hrName: form.hrName,
          hrEmail: form.hrEmail,
          hrPassword: form.hrPassword,
          numberOfRegistrations: form.numberOfRegistrations,
          notes: form.notes || undefined,
        });
      }
      setShowModal(false);
      setForm(emptyForm);
      setCompanyId('');
      setEditingId(null);
      fetchRegistrations();
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(reg: BulkRegistration) {
    if (!confirm(`Generate a new password for ${reg.hrName} (${reg.hrEmail})? Their current password will stop working.`)) return;
    setResettingId(reg.id);
    try {
      const res = await api.resetBulkRegistrationPassword(reg.id);
      if (res.success && res.data) {
        setResetResult({ hrEmail: res.data.hrEmail, password: res.data.password });
      } else {
        alert(res.message || 'Failed to reset password');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to reset password');
    } finally {
      setResettingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bulk registration?')) return;
    try {
      await api.deleteBulkRegistration(id);
      fetchRegistrations();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }

  async function togglePayment(reg: BulkRegistration) {
    try {
      await api.updateBulkRegistration(reg.id, { paymentCompleted: !reg.paymentCompleted });
      fetchRegistrations();
    } catch (e) {
      console.error('Failed to update payment:', e);
    }
  }

  function openEdit(reg: BulkRegistration) {
    setForm({
      companyName: reg.companyName,
      hrName: reg.hrName,
      hrEmail: reg.hrEmail,
      hrPassword: '',
      numberOfRegistrations: reg.numberOfRegistrations,
      notes: reg.notes || '',
      paymentCompleted: reg.paymentCompleted,
    });
    setCompanyId(reg.companyId || '');
    setEditingId(reg.id);
    setShowModal(true);
  }

  function openCreate() {
    setForm(emptyForm);
    setCompanyId('');
    setEditingId(null);
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Bulk Registration</h1>
          <p className="text-slate-500 text-sm">
            Create HR credentials for companies to register participants in bulk
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleTshirtReport}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium shadow-sm"
          >
            {showTshirtReport ? 'Hide T-Shirt Report' : 'T-Shirt Report'}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm"
          >
            Add New
          </button>
        </div>
      </div>

      {showTshirtReport && (
        <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">T-Shirt Sizes by Company</h3>
            <p className="text-xs text-slate-500 mt-0.5">Bulk (HR-registered) participants only</p>
          </div>
          {tshirtReportLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : !tshirtReport || tshirtReport.rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No bulk-registered participants yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/80">
                  <tr>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Company</th>
                    {tshirtReport.sizes.map((size) => (
                      <th key={size} className="text-center px-4 py-3 text-slate-500 font-semibold">{size}</th>
                    ))}
                    <th className="text-center px-4 py-3 text-slate-700 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tshirtReport.rows.map((row) => (
                    <tr key={row.companyName} className="border-t border-white/10">
                      <td className="px-5 py-3 text-slate-950 font-medium">{row.companyName}</td>
                      {tshirtReport.sizes.map((size) => (
                        <td key={size} className="text-center px-4 py-3 text-slate-700">{row.counts[size] || 0}</td>
                      ))}
                      <td className="text-center px-4 py-3 font-bold text-violet-700">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-white/60">
                    <td className="px-5 py-3 text-slate-950 font-bold">Total</td>
                    {tshirtReport.sizes.map((size) => (
                      <td key={size} className="text-center px-4 py-3 font-bold text-slate-950">{tshirtReport.grandTotal[size] || 0}</td>
                    ))}
                    <td className="text-center px-4 py-3 font-bold text-violet-700">
                      {Object.values(tshirtReport.grandTotal).reduce((sum, n) => sum + n, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-2xl border border-white/20 px-5 py-4 flex items-center gap-3 bg-violet-50/50">
        <svg className="w-5 h-5 text-violet-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Share this link with HR to register participants</p>
          <p className="text-sm font-mono text-violet-700 truncate">https://marathon.theisa.in/hr-portal</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText('https://marathon.theisa.in/hr-portal')}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-medium shrink-0 transition"
        >
          Copy Link
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80 backdrop-blur-md">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Company</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">HR Name</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">HR Email</th>
              <th className="text-center px-5 py-4 text-slate-500 font-semibold">Progress</th>
              <th className="text-center px-5 py-4 text-slate-500 font-semibold">Payment</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg) => (
              <tr key={reg.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4 text-slate-950 font-medium">{reg.companyName}</td>
                <td className="px-5 py-4 text-slate-600">{reg.hrName}</td>
                <td className="px-5 py-4 text-slate-600">{reg.hrEmail}</td>
                <td className="px-5 py-4 text-center">
                  <div className="inline-flex flex-col items-center gap-1 w-24">
                    <span className="text-violet-700 font-semibold text-xs">
                      {reg.registeredCount}/{reg.numberOfRegistrations} done
                    </span>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${reg.registeredCount >= reg.numberOfRegistrations ? 'bg-emerald-500' : 'bg-violet-500'}`}
                        style={{ width: `${Math.min(100, (reg.registeredCount / reg.numberOfRegistrations) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <button
                    onClick={() => togglePayment(reg)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                      reg.paymentCompleted
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${reg.paymentCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {reg.paymentCompleted ? 'Paid' : 'Pending'}
                  </button>
                </td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button onClick={() => openEdit(reg)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                  <button
                    onClick={() => handleResetPassword(reg)}
                    disabled={resettingId === reg.id}
                    className="text-amber-600 hover:text-amber-700 text-xs disabled:opacity-50"
                  >
                    {resettingId === reg.id ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button onClick={() => handleDelete(reg.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No bulk registrations yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] w-[36rem] border border-white/20 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-6 pb-2">
              <h3 className="text-xl font-bold text-slate-950">
                {editingId ? 'Edit Bulk Registration' : 'Bulk Registration'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEditingId(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4">
              <div className="space-y-4">
                <div className="relative" ref={companyFieldRef}>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Company Name *</label>
                  <input
                    value={form.companyName}
                    onChange={(e) => {
                      setForm({ ...form, companyName: e.target.value });
                      setCompanyId('');
                      setCompanyDropdownOpen(true);
                    }}
                    onFocus={() => setCompanyDropdownOpen(true)}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                    placeholder="Search or type a company"
                  />
                  {companyDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.slice(0, 50).map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              setForm({ ...form, companyName: c.name });
                              setCompanyId(c.id);
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-800 hover:bg-violet-50 transition"
                          >
                            {c.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-xs text-slate-400">No match — this will be added as a new company.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">HR First Name *</label>
                    <input
                      value={form.hrName.split(' ')[0] || ''}
                      onChange={(e) => {
                        const last = form.hrName.split(' ').slice(1).join(' ');
                        setForm({ ...form, hrName: last ? `${e.target.value} ${last}` : e.target.value });
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">HR Last Name *</label>
                    <input
                      value={form.hrName.split(' ').slice(1).join(' ') || ''}
                      onChange={(e) => {
                        const first = form.hrName.split(' ')[0] || '';
                        setForm({ ...form, hrName: first ? `${first} ${e.target.value}` : e.target.value });
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">HR Email *</label>
                    <input
                      type="email"
                      value={form.hrEmail}
                      onChange={(e) => setForm({ ...form, hrEmail: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                      placeholder="hr@acme.com"
                    />
                  </div>
                  {!editingId && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Password *</label>
                      <input
                        type="password"
                        value={form.hrPassword}
                        onChange={(e) => setForm({ ...form, hrPassword: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                        placeholder="Min 6 characters"
                        minLength={6}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Number of Registrations *</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.numberOfRegistrations}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) setForm({ ...form, numberOfRegistrations: val });
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                    <input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-950">Payment Completed</p>
                    <p className="text-xs text-slate-500">Mark if the company has paid</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentCompleted: !form.paymentCompleted })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.paymentCompleted ? 'bg-violet-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        form.paymentCompleted ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition"
                >
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetResult && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] w-[28rem] border border-white/20 shadow-lg overflow-hidden">
            <div className="px-8 pt-6 pb-2">
              <h3 className="text-xl font-bold text-slate-950">Password Reset</h3>
              <p className="text-sm text-slate-500 mt-1">
                Share this with <strong className="text-slate-700">{resetResult.hrEmail}</strong> — it won't be shown again.
              </p>
            </div>
            <div className="px-8 py-6">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-mono text-lg font-bold text-slate-950 tracking-wide">{resetResult.password}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(resetResult.password)}
                  className="text-xs font-medium text-violet-700 hover:text-violet-900 shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="px-8 pb-8">
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
