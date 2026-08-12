import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Company {
  id: string;
  name: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  _count?: { participants: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchCompanies(); }, []);

  async function fetchCompanies() {
    const res = await api.getCompanies();
    if (res.success && res.data) setCompanies(res.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await api.updateCompany(editingId, { name: form.name });
    } else {
      await api.createCompany(form);
    }
    setShowModal(false);
    setForm({ name: '', contactEmail: '', contactPhone: '' });
    setEditingId(null);
    fetchCompanies();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this company?')) return;
    await api.deleteCompany(id);
    fetchCompanies();
  }

  function openEdit(c: Company) {
    setForm({ name: c.name, contactEmail: c.contactEmail || '', contactPhone: c.contactPhone || '' });
    setEditingId(c.id);
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <button
          onClick={() => { setForm({ name: '', contactEmail: '', contactPhone: '' }); setEditingId(null); setShowModal(true); }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
        >
          Add Company
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Company</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Contact Email</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Phone</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Runners</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-700/50">
                <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-300">{c.contactEmail || '-'}</td>
                <td className="px-4 py-3 text-slate-300">{c.contactPhone || '-'}</td>
                <td className="px-4 py-3 text-blue-400">{c._count?.participants || 0}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(c)} className="text-amber-400 hover:text-amber-300 text-xs">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No companies</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Company' : 'Add Company'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Company Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Phone</label>
                <input
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm">
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
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
