import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface EventDistance {
  id: string;
  name: string;
  distanceKm: number;
  totalDistance: number;
  status: string;
  _count: { routePoints: number };
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  date: string;
  status: string;
  registrationOpen: boolean;
  maxParticipants?: number;
  distances?: EventDistance[];
  raceDistances?: EventDistance[];
  routePoints?: { lat: number; lng: number; cumDistance?: number }[];
  totalDistance?: number;
  _count?: { participants: number };
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    maxParticipants: '',
    registrationOpen: true,
  });
  const [distanceForm, setDistanceForm] = useState({ name: '', distanceKm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    const res = await api.getEvents();
    if (res.success && res.data) setEvents(res.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      date: form.date,
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
      registrationOpen: form.registrationOpen,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.updateEvent(editingId, payload);
      } else {
        await api.createEvent(payload);
      }
      setShowCreateModal(false);
      resetForm();
      fetchEvents();
    } catch (e) {
      console.error('Failed to save event:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDistance() {
    if (!editingId || !distanceForm.name || !distanceForm.distanceKm) return;
    setSaving(true);
    try {
      await api.createDistance(editingId, {
        name: distanceForm.name,
        distanceKm: parseFloat(distanceForm.distanceKm),
      });
      setDistanceForm({ name: '', distanceKm: '' });
      fetchEvents();
    } catch (e) {
      console.error('Failed to add distance:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDistance(eventId: string, distanceId: string) {
    if (!confirm('Delete this distance? This cannot be undone.')) return;
    try {
      await api.deleteDistance(eventId, distanceId);
      fetchEvents();
    } catch (e) {
      console.error('Failed to delete distance:', e);
    }
  }

  function resetForm() {
    setForm({ name: '', description: '', date: '', maxParticipants: '', registrationOpen: true });
    setEditingId(null);
  }

  function openEdit(ev: Event) {
    setForm({
      name: ev.name,
      description: ev.description || '',
      date: ev.date?.split('T')[0] || '',
      maxParticipants: ev.maxParticipants?.toString() || '',
      registrationOpen: ev.registrationOpen,
    });
    setEditingId(ev.id);
    setShowCreateModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api.deleteEvent(id);
      fetchEvents();
    } catch (e) {
      console.error('Failed to delete event:', e);
    }
  }

  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-blue-500/20 text-blue-400',
    ACTIVE: 'bg-emerald-500/20 text-emerald-400',
    PAUSED: 'bg-amber-500/20 text-amber-400',
    COMPLETED: 'bg-slate-500/20 text-slate-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  };

  const eventDistances = (ev: Event): EventDistance[] => ev.raceDistances || ev.distances || [];
  const editingEvent = events.find((e) => e.id === editingId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Events</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage marathon events with route and distance details.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm"
        >
          Create Event
        </button>
      </div>

      <div className="glass rounded-[2rem] overflow-hidden border border-white/20 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80 backdrop-blur-md">
            <tr className="border-b border-white/20">
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Event</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Date</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Status</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Runners</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Distances</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-white/10 hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-4">
                  <p className="text-slate-950 font-semibold">{ev.name}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">{ev.description}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[ev.status] || 'bg-slate-100 text-slate-600'}`}>
                    {ev.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-violet-700 font-semibold">{ev._count?.participants || 0}</td>
                <td className="px-5 py-4 space-y-2">
                  {eventDistances(ev).length > 0 ? (
                    eventDistances(ev).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => navigate(`/route-builder?eventId=${ev.id}`)}
                        className="block text-xs text-violet-700 hover:text-violet-900"
                      >
                        {d.name} ({d.distanceKm}km)
                        {d._count?.routePoints > 0 && <span className="text-slate-400"> — {d.totalDistance.toFixed(1)}km</span>}
                      </button>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">No distances</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button
                    onClick={() => navigate(`/route-builder?eventId=${ev.id}`)}
                    className="text-violet-700 hover:text-violet-900 text-xs"
                  >
                    Build Route
                  </button>
                  <button onClick={() => openEdit(ev)} className="text-amber-600 hover:text-amber-700 text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(ev.id)} className="text-red-600 hover:text-red-700 text-xs">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No events yet. Create your first marathon!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-[480px] border border-white/20 shadow-lg">
            <h3 className="text-slate-950 font-semibold mb-4">{editingId ? 'Edit Event' : 'Create New Event'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-sm mb-1">Event Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. ISA Marathon 2026"
                  className="w-full px-3 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Short description"
                  className="w-full px-3 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm resize-none focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Event Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full px-3 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Max Participants</label>
                  <input
                    type="number"
                    value={form.maxParticipants}
                    onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.registrationOpen}
                  onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })}
                  className="rounded text-violet-700"
                />
                <label className="text-slate-600 text-sm">Open for registration</label>
              </div>
              {editingId && (
                <div className="pt-4 border-t border-white/10">
                  <label className="block text-slate-600 text-sm mb-2">Add Distance</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={distanceForm.name}
                      onChange={(e) => setDistanceForm({ ...distanceForm, name: e.target.value })}
                      placeholder="e.g. 10K Run"
                      className="flex-1 px-3 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                    />
                    <input
                      type="number"
                      value={distanceForm.distanceKm}
                      onChange={(e) => setDistanceForm({ ...distanceForm, distanceKm: e.target.value })}
                      placeholder="km"
                      className="w-full sm:w-28 px-3 py-3 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDistance}
                      disabled={saving || !distanceForm.name || !distanceForm.distanceKm}
                      className="px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-3xl text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  {editingEvent && eventDistances(editingEvent).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {eventDistances(editingEvent).map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-sm bg-slate-50/70 p-3 rounded-3xl border border-white/70">
                          <span className="text-slate-700">{d.name} ({d.distanceKm}km)</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDistance(editingId, d.id)}
                            className="ml-auto text-red-600 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
                <button type="submit" className="flex-1 sm:flex-none px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium">
                  {editingId ? 'Update Event' : 'Create Event'}
                </button>
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-3 bg-white/80 text-slate-700 rounded-3xl border border-white/70 text-sm">
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
