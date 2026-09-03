import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Company {
  id: string;
  name: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: 'PREMIUM' | 'NON_PREMIUM';
  _count?: { participants: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ name: string; contactEmail: string; contactPhone: string; status: 'PREMIUM' | 'NON_PREMIUM' }>({ name: '', contactEmail: '', contactPhone: '', status: 'NON_PREMIUM' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.getEvents().then((res) => {
      if (res.success && res.data) setEvents(res.data);
    });
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const params: Record<string, string> = {};
      if (eventId) params.eventId = eventId;
      const res = await api.getCompanies(params);
      if (res.success && res.data) setCompanies(res.data);
    } catch (e) {
      console.error('Failed to fetch companies:', e);
    }
  }

  useEffect(() => { fetchCompanies(); }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = editingId
        ? await api.updateCompany(editingId, form)
        : await api.createCompany(form);
      if (!res.success) {
        setError(res.message || 'Failed to save company');
        return;
      }
      setShowModal(false);
      setForm({ name: '', contactEmail: '', contactPhone: '', status: 'NON_PREMIUM' });
      setEditingId(null);
      fetchCompanies();
    } catch (e: any) {
      setError(e.message || 'Failed to save company');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this company?')) return;
    try {
      await api.deleteCompany(id);
      fetchCompanies();
    } catch (e) {
      console.error('Failed to delete company:', e);
    }
  }

  async function handleToggleStatus(c: Company) {
    setToggleBusyId(c.id);
    try {
      const next = c.status === 'PREMIUM' ? 'NON_PREMIUM' : 'PREMIUM';
      await api.updateCompany(c.id, { status: next });
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    } catch (e) {
      console.error('Failed to update status:', e);
    }
    setToggleBusyId(null);
  }

  function openEdit(c: Company) {
    setForm({ name: c.name, contactEmail: c.contactEmail || '', contactPhone: c.contactPhone || '', status: c.status || 'NON_PREMIUM' });
    setEditingId(c.id);
    setError('');
    setShowModal(true);
  }

  const visibleCompanies = companies.filter((c) => {
    if (statusFilter !== 'ALL' && (c.status || 'NON_PREMIUM') !== statusFilter) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Companies</h1>
          <p className="text-slate-500 text-sm">{companies.length} sponsors and partners</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="PREMIUM">Premium</option>
            <option value="NON_PREMIUM">Non-Premium</option>
          </select>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setForm({ name: '', contactEmail: '', contactPhone: '', status: 'NON_PREMIUM' }); setEditingId(null); setError(''); setShowModal(true); }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm"
          >
            Add Company
          </button>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80 backdrop-blur-md">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Company</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Status</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Contact Email</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Phone</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Runners</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCompanies.map((c) => (
              <tr key={c.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4 text-slate-950 font-medium">{c.name}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleToggleStatus(c)}
                    disabled={toggleBusyId === c.id}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full transition disabled:opacity-50 ${
                      c.status === 'PREMIUM' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Click to toggle"
                  >
                    {c.status === 'PREMIUM' ? 'Premium' : 'Non-Premium'}
                  </button>
                </td>
                <td className="px-5 py-4 text-slate-600">{c.contactEmail || '-'}</td>
                <td className="px-5 py-4 text-slate-600">{c.contactPhone || '-'}</td>
                <td className="px-5 py-4 text-violet-700 font-semibold">{c._count?.participants || 0}</td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button onClick={() => openEdit(c)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {visibleCompanies.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No companies match</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-96 border border-white/20 shadow-lg">
            <h3 className="text-slate-950 font-semibold mb-4">{editingId ? 'Edit Company' : 'Add Company'}</h3>
            {error && (
              <div className="mb-4 rounded-3xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-sm mb-1">Company Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Phone</label>
                <input
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'PREMIUM' | 'NON_PREMIUM' })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                >
                  <option value="NON_PREMIUM">Non-Premium</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
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
