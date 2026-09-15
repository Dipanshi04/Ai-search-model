import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type AdminRole = 'SUPER_ADMIN' | 'RACE_MANAGER' | 'CHECKIN_STAFF' | 'ANALYTICS_VIEWER';

interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  createdAt: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  RACE_MANAGER: 'Race Manager',
  CHECKIN_STAFF: 'Check-in Staff',
  ANALYTICS_VIEWER: 'Analytics Viewer',
};

const ROLE_STYLES: Record<AdminRole, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700',
  RACE_MANAGER: 'bg-blue-100 text-blue-700',
  CHECKIN_STAFF: 'bg-emerald-100 text-emerald-700',
  ANALYTICS_VIEWER: 'bg-slate-100 text-slate-600',
};

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminsPage() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; password: string; role: AdminRole }>({
    name: '', email: '', phone: '', password: '', role: 'RACE_MANAGER',
  });
  const [error, setError] = useState('');

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    try {
      const res = await api.getAdmins();
      if (res.success && res.data) setAdmins(res.data);
    } catch (e) {
      console.error('Failed to fetch admins:', e);
    }
  }

  function resetForm() {
    setForm({ name: '', email: '', phone: '', password: '', role: 'RACE_MANAGER' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = editingId
        ? await api.updateAdmin(editingId, { role: form.role, ...(form.password ? { password: form.password } : {}) })
        : await api.createAdmin(form);
      if (!res.success) {
        setError(res.message || 'Failed to save admin');
        return;
      }
      setShowModal(false);
      resetForm();
      setEditingId(null);
      fetchAdmins();
    } catch (e: any) {
      setError(e.message || 'Failed to save admin');
    }
  }

  async function handleDelete(a: Admin) {
    if (!confirm(`Remove ${a.name}'s admin access? They will no longer be able to log in.`)) return;
    try {
      const res = await api.deleteAdmin(a.id);
      if (!res.success) {
        alert(res.message || 'Failed to remove admin');
        return;
      }
      fetchAdmins();
    } catch (e: any) {
      alert(e.message || 'Failed to remove admin');
    }
  }

  function openEdit(a: Admin) {
    setForm({ name: a.name, email: a.email, phone: a.phone, password: '', role: a.role });
    setEditingId(a.id);
    setError('');
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Admins</h1>
          <p className="text-slate-500 text-sm">{admins.length} accounts with access to this dashboard</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setError(''); setShowModal(true); }}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm"
        >
          Add Admin
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80 backdrop-blur-md">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Name</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Email</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Phone</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Role</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Added</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4 text-slate-950 font-medium">
                  {a.name}
                  {a.id === currentUser?.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                </td>
                <td className="px-5 py-4 text-slate-600">{a.email}</td>
                <td className="px-5 py-4 text-slate-600">{a.phone}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_STYLES[a.role]}`}>
                    {ROLE_LABELS[a.role]}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">{fmtDate(a.createdAt)}</td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button onClick={() => openEdit(a)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                  {a.id !== currentUser?.id && (
                    <button onClick={() => handleDelete(a)} className="text-red-500 hover:text-red-600 text-xs">Remove</button>
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No admins yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-96 border border-white/20 shadow-lg">
            <h3 className="text-slate-950 font-semibold mb-4">{editingId ? 'Edit Admin' : 'Add Admin'}</h3>
            {error && (
              <div className="mb-4 rounded-3xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-sm mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                >
                  {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">
                  {editingId ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                  minLength={6}
                  placeholder={editingId ? '••••••••' : 'At least 6 characters'}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
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
