import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewParticipant, setViewParticipant] = useState<any | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [distError, setDistError] = useState('');

  useEffect(() => {
    api.getEvents().then((res) => {
      if (res.success && res.data) setEvents(res.data);
    });
  }, []);

  async function loadParticipants() {
    setLoading(true);
    const params: Record<string, string> = { page: page.toString(), limit: '20' };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category) params.category = category;
    if (eventId) params.eventId = eventId;

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
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadParticipants();
  }, [page, category, eventId, debouncedSearch]);

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

  const openView = (p: any) => {
    setViewParticipant(p);
    setPin(null);
    setPinError('');
    setDistError('');
  };

  const closeView = () => {
    setViewParticipant(null);
    setPin(null);
    setPinError('');
    setDistError('');
  };

  const handleToggleDistribution = async (field: 'kitDistributed' | 'foodDistributed') => {
    if (!viewParticipant) return;
    const next = !viewParticipant[field];
    setDistError('');
    try {
      const res = await api.updateParticipant(viewParticipant.id, { [field]: next });
      if (res.success && res.data) {
        setViewParticipant(res.data);
        loadParticipants();
      } else {
        setDistError(res.message || 'Failed to update. Please try again.');
      }
    } catch (e: any) {
      setDistError(e.message || 'Failed to update. Please try again.');
    }
  };

  const handleRevealPin = async () => {
    if (!viewParticipant) return;
    setPinLoading(true);
    setPinError('');
    try {
      const res = await api.resetParticipantPin(viewParticipant.id);
      if (res.success && res.data) {
        setPin(res.data.pin);
      } else {
        setPinError(res.message || 'Failed to generate PIN');
      }
    } catch (e: any) {
      setPinError(e.message || 'Failed to generate PIN');
    }
    setPinLoading(false);
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
            placeholder="Search by name, email, phone, BIB, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setDebouncedSearch(search);
                setPage(1);
              }
            }}
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
          <select
            value={eventId}
            onChange={(e) => { setEventId(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-white/20 bg-white/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/85">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">BIB</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
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
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{p.user?.phone || '—'}</td>
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
                      <button onClick={() => openView(p)} className="text-violet-700 hover:text-violet-900 text-xs">View</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No participants yet.</td></tr>
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

      {viewParticipant && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeView}
        >
          <div
            className="bg-white rounded-[2rem] shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-mono text-violet-700">{viewParticipant.bibNumber}</p>
                <h2 className="text-lg font-bold text-slate-950">{viewParticipant.user?.name}</h2>
              </div>
              <button
                onClick={closeView}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                <p className="text-slate-800 break-all">{viewParticipant.user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Phone</p>
                <p className="text-slate-800">{viewParticipant.user?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Category</p>
                <p className="text-slate-800">{viewParticipant.category?.replace('RUN_', '').replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Gender</p>
                <p className="text-slate-800">{viewParticipant.gender || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Company</p>
                <p className="text-slate-800">{viewParticipant.company?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                <p className="text-slate-800">{viewParticipant.status}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Checked In</p>
                <p className="text-slate-800">{viewParticipant.checkedIn ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Blood Group</p>
                <p className="text-slate-800">{viewParticipant.bloodGroup || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Emergency Contact</p>
                <p className="text-slate-800">{viewParticipant.emergencyContact || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Emergency Phone</p>
                <p className="text-slate-800">{viewParticipant.emergencyPhone || '—'}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 pb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Distribution Status</p>
              {distError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 mb-3">{distError}</p>
              )}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Kit Distributed</span>
                  <button
                    onClick={() => handleToggleDistribution('kitDistributed')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      viewParticipant.kitDistributed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {viewParticipant.kitDistributed ? 'Yes' : 'No'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Food Distributed</span>
                  <button
                    onClick={() => handleToggleDistribution('foodDistributed')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      viewParticipant.foodDistributed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {viewParticipant.foodDistributed ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Login PIN</p>
              <p className="text-xs text-slate-400 mb-3">
                PINs are stored securely and can't be read back directly. Generate a new one to read it out to the runner — useful if email delivery fails on race day. Their previous PIN stops working immediately.
              </p>

              {pin ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-mono font-bold tracking-[0.3em] text-emerald-700">{pin}</p>
                  <p className="text-xs text-emerald-600 mt-2">
                    Also emailed to {viewParticipant.user?.email} (if email delivery is working).
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRevealPin}
                  disabled={pinLoading}
                  className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-3xl text-sm font-medium transition-colors"
                >
                  {pinLoading ? 'Generating...' : 'Generate & Show PIN'}
                </button>
              )}
              {pinError && <p className="text-xs text-red-500 mt-2">{pinError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}