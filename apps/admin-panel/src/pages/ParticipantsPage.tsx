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
      await api.deleteParticipant(id);
      loadParticipants();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Participants</h1>
          <p className="text-slate-400 text-sm">{total} registered</p>
        </div>
        <button
          onClick={() => api.exportParticipantsCSV()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, BIB, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadParticipants()}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm outline-none"
        >
          <option value="">All Categories</option>
          <option value="RUN_3K">3K</option>
          <option value="RUN_5K">5K</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">BIB</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Company</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-6 py-4 text-sm font-mono text-emerald-400">{p.bibNumber}</td>
                <td className="px-6 py-4 text-sm text-white">{p.user?.name}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{p.user?.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                    {p.category?.replace('RUN_', '').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{p.company?.name || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    p.status === 'REGISTERED' ? 'bg-slate-500/10 text-slate-400' :
                    p.status === 'CHECKED_IN' ? 'bg-emerald-500/10 text-emerald-400' :
                    p.status === 'RUNNING' ? 'bg-amber-500/10 text-amber-400' :
                    p.status === 'FINISHED' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-white text-xs">View</button>
                    <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-400 text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}