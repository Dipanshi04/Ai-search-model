import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

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
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedEvent, _setSelectedEvent] = useState<Event | null>(null);
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

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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
    if (editingId) {
      await api.updateEvent(editingId, payload);
    } else {
      await api.createEvent(payload);
    }
    setSaving(false);
    setShowCreateModal(false);
    resetForm();
    fetchEvents();
  }

  async function handleAddDistance() {
    if (!editingId || !distanceForm.name || !distanceForm.distanceKm) return;
    setSaving(true);
    await api.createDistance(editingId, {
      name: distanceForm.name,
      distanceKm: parseFloat(distanceForm.distanceKm),
    });
    setDistanceForm({ name: '', distanceKm: '' });
    setSaving(false);
    fetchEvents();
  }

  async function handleDeleteDistance(eventId: string, distanceId: string) {
    if (!confirm('Delete this distance? This cannot be undone.')) return;
    await api.deleteDistance(eventId, distanceId);
    fetchEvents();
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
    await api.deleteEvent(id);
    fetchEvents();
  }

  useEffect(() => {
    if (!showRouteModal || !selectedEvent || !mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [75.8577, 22.7196],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      const points = selectedEvent.routePoints || [];
      if (points.length < 2) return;

      const coords = points.map((p) => [p.lng, p.lat] as [number, number]);

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#9C27B0', 'line-width': 4 },
      });

      const startEl = document.createElement('div');
      startEl.innerHTML = `<div style="background:#10b981;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">START</div>`;
      new mapboxgl.Marker({ element: startEl })
        .setLngLat([points[0]!.lng, points[0]!.lat])
        .addTo(map);

      if (coords.length > 2) {
        const endEl = document.createElement('div');
        endEl.innerHTML = `<div style="background:#ef4444;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">FINISH</div>`;
        new mapboxgl.Marker({ element: endEl })
          .setLngLat([coords[coords.length - 1]![0], coords[coords.length - 1]![1]])
          .addTo(map);
      }

      for (let i = 1; i < points.length - 1; i++) {
        const el = document.createElement('div');
        el.innerHTML = `<div style="background:#3b82f6;color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">${i}</div>`;
        new mapboxgl.Marker({ element: el })
          .setLngLat([points[i]!.lng, points[i]!.lat])
          .addTo(map);
      }

      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c: [number, number]) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60 });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [showRouteModal, selectedEvent]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-xs text-white/50 mt-0.5">Create and manage marathon events</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-white hover:bg-white/90 text-black rounded-xl text-sm font-medium"
        >
          Create Event
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-white/50 font-medium">Event</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Date</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Runners</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Distances</th>
              <th className="text-right px-4 py-3 text-white/50 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{ev.name}</p>
                  <p className="text-xs text-white/30 truncate max-w-[200px]">{ev.description}</p>
                </td>
                <td className="px-4 py-3 text-white/70">
                  {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ev.status] || 'bg-white/10 text-white/50'}`}>
                    {ev.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-blue-400">{ev._count?.participants || 0}</td>
                <td className="px-4 py-3">
                  {eventDistances(ev).length > 0 ? (
                    <div className="space-y-1">
                      {eventDistances(ev).map((d) => (
                        <button
                          key={d.id}
                          onClick={() => navigate(`/route-builder?eventId=${ev.id}`)}
                          className="block text-xs text-purple-400 hover:text-purple-300"
                        >
                          {d.name} ({d.distanceKm}km)
                          {d._count?.routePoints > 0 && <span className="text-white/30"> — {d.totalDistance.toFixed(1)}km</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-white/20 text-xs">No distances</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => navigate(`/route-builder?eventId=${ev.id}`)}
                    className="text-purple-400 hover:text-purple-300 text-xs"
                  >
                    Build Route
                  </button>
                  <button onClick={() => openEdit(ev)} className="text-amber-400 hover:text-amber-300 text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(ev.id)} className="text-red-400 hover:text-red-300 text-xs">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No events yet. Create your first marathon!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-[480px]">
            <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Event' : 'Create New Event'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/50 text-sm mb-1">Event Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. ISA Marathon 2026"
                  className="w-full px-3 py-2 glass rounded-xl text-white text-sm focus:ring-2 focus:ring-[#9C27B0] outline-none"
                />
              </div>
              <div>
                <label className="block text-white/50 text-sm mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Short description"
                  className="w-full px-3 py-2 glass rounded-xl text-white text-sm resize-none focus:ring-2 focus:ring-[#9C27B0] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-sm mb-1">Event Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 glass rounded-xl text-white text-sm focus:ring-2 focus:ring-[#9C27B0] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-sm mb-1">Max Participants</label>
                  <input
                    type="number"
                    value={form.maxParticipants}
                    onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 glass rounded-xl text-white text-sm focus:ring-2 focus:ring-[#9C27B0] outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.registrationOpen}
                  onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })}
                  className="rounded"
                />
                <label className="text-white/50 text-sm">Open for registration</label>
              </div>
              {editingId && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-white/50 text-sm mb-2">Add Distance</label>
                  <div className="flex gap-2">
                    <input
                      value={distanceForm.name}
                      onChange={(e) => setDistanceForm({ ...distanceForm, name: e.target.value })}
                      placeholder="e.g. 10K Run"
                      className="flex-1 px-3 py-2 glass rounded-xl text-white text-sm focus:ring-2 focus:ring-[#9C27B0] outline-none"
                    />
                    <input
                      type="number"
                      value={distanceForm.distanceKm}
                      onChange={(e) => setDistanceForm({ ...distanceForm, distanceKm: e.target.value })}
                      placeholder="km"
                      className="w-20 px-3 py-2 glass rounded-xl text-white text-sm focus:ring-2 focus:ring-[#9C27B0] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDistance}
                      disabled={saving || !distanceForm.name || !distanceForm.distanceKm}
                      className="px-4 py-2 bg-[#9C27B0] hover:bg-[#7B1FA2] disabled:opacity-40 text-white rounded-xl text-sm font-medium shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  {editingEvent && eventDistances(editingEvent).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {eventDistances(editingEvent).map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs bg-white/5 p-2 rounded-lg">
                          <span className="text-white/70">{d.name} ({d.distanceKm}km)</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDistance(editingId, d.id)}
                            className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-white hover:bg-white/90 text-black rounded-xl text-sm font-medium">
                  {editingId ? 'Update Event' : 'Create Event'}
                </button>
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 glass hover:bg-white/10 text-white rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRouteModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl w-[900px] max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-semibold">{selectedEvent.name} — Route</h3>
                <p className="text-xs text-white/30 mt-0.5">
                  {selectedEvent.routePoints?.length || 0} points &middot; {selectedEvent.totalDistance?.toFixed(2) || 0} km loop
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowRouteModal(false); navigate(`/route-builder?eventId=${selectedEvent.id}`); }}
                  className="px-4 py-2 bg-white hover:bg-white/90 text-black rounded-xl text-sm font-medium"
                >
                  Edit Route
                </button>
                <button
                  onClick={() => setShowRouteModal(false)}
                  className="px-4 py-2 glass hover:bg-white/10 text-white rounded-xl text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0">
              <div className="col-span-3 h-[500px]">
                {MAPBOX_TOKEN ? (
                  <div ref={mapContainer} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <p className="text-white/30">No Mapbox token</p>
                  </div>
                )}
              </div>

              <div className="col-span-2 border-l border-white/10 p-4 max-h-[500px] overflow-auto">
                <h4 className="text-sm font-bold text-white/70 mb-3">Route Points</h4>
                <div className="space-y-1">
                  {(selectedEvent.routePoints || []).map((p: { lat: number; lng: number; cumDistance?: number }, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-white/5 p-2 rounded-lg">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-emerald-500 text-white'
                        : i === (selectedEvent.routePoints?.length || 0) - 1 ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                      }`}>
                        {i}
                      </span>
                      <span className="text-white/50 font-mono">
                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </span>
                      <span className="text-white/30 ml-auto">{p.cumDistance?.toFixed(2)} km</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 text-center">
                  <p className="text-xl font-bold text-white">{selectedEvent.totalDistance?.toFixed(2) || 0} km</p>
                  <p className="text-xs text-white/30">Total distance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
