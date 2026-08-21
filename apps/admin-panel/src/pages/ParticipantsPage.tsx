import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadParticipants() {
    setLoading(true);
    const params: Record<string, string> = { page: page.toString(), limit: '20' };
    if (search) params.search = search;
    if (category) params.category = category;

    const res = await api.getParticipants(params);
    if (res.success && res.data) {
      setParticipants(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadParticipants();
  }, [page, category]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this participant?')) {
      try {
        await api.deleteParticipant(id);
        loadParticipants();
      } catch (e) {
        console.error('Failed to delete participant:', e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Participants</h1>
          <p className="text-slate-500 text-sm">{total} registered</p>
        </div>
        <button
          onClick={() => api.exportParticipantsCSV()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium transition-colors shadow-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <input
            type="text"
            placeholder="Search by name, email, BIB, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadParticipants()}
            className="w-full md:max-w-xl px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All Categories</option>
            <option value="RUN_3K">3K</option>
            <option value="RUN_5K">5K</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-white/20 bg-white/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/85">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">BIB</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-t border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-violet-700">{p.bibNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{p.user?.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.user?.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs">
                      {p.category?.replace('RUN_', '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.company?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      p.status === 'REGISTERED' ? 'bg-slate-100 text-slate-600' :
                      p.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'RUNNING' ? 'bg-amber-100 text-amber-700' :
                      p.status === 'FINISHED' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-violet-700 hover:text-violet-900 text-xs">View</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No participants yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-6">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/80 border border-white/70 rounded-3xl text-sm text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white/80 border border-white/70 rounded-3xl text-sm text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}