import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function RaceControlPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [raceStatus, setRaceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [createEventName, setCreateEventName] = useState('');
  const [createEventDate, setCreateEventDate] = useState('');
  const [createEventDescription, setCreateEventDescription] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStatus(selectedEventId);
      const interval = setInterval(() => loadStatus(selectedEventId), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedEventId]);

  async function loadEvents() {
    try {
      const res = await api.request<any[]>('/api/v1/race/events');
      if (res.success && res.data) {
        setEvents(res.data);
        if (res.data.length > 0 && !selectedEventId) {
          const active = res.data.find((e: any) => e.status === 'ACTIVE');
          const upcoming = res.data.find((e: any) => e.status === 'UPCOMING');
          setSelectedEventId(active?.id || upcoming?.id || res.data[0].id);
        }
      }
    } catch {}
  }

  async function loadStatus(eventId: string) {
    try {
      const res = await api.request<any>(`/api/v1/race/status?eventId=${eventId}`);
      if (res.success) setRaceStatus(res.data);
    } catch {}
  }

async function createEvent() {
    setLoading(true);
    try {
      const res = await api.createEvent({
        name: createEventName,
        description: createEventDescription,
        date: createEventDate,
        maxParticipants: 2000,
        registrationOpen: true,
      });
      if (res.success) {
        setShowCreateEventModal(false);
        setCreateEventName('');
        setCreateEventDate('');
        setCreateEventDescription('');
        setEvents((prev) => [{ ...res.data, _count: { participants: 0, routePoints: 0 } }, ...prev]);
        setSelectedEventId(res.data.id);
        navigate(`/route-builder?eventId=${res.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!confirm(`Start "${raceStatus?.event?.name}"?`)) return;
    setLoading(true);
    await api.startRace(selectedEventId);
    await loadStatus(selectedEventId);
    await loadEvents();
    setLoading(false);
  }

  async function handlePause() {
    if (!confirm('Pause the race?')) return;
    setLoading(true);
    await api.pauseRace(selectedEventId);
    await loadStatus(selectedEventId);
    await loadEvents();
    setLoading(false);
  }

  async function handleEnd() {
    if (!confirm('End the race? This cannot be undone!')) return;
    setLoading(true);
    await api.endRace(selectedEventId);
    await loadStatus(selectedEventId);
    await loadEvents();
    setLoading(false);
  }

  const status = raceStatus?.event?.status || 'NO_ACTIVE_RACE';
  const isActive = status === 'ACTIVE';
  const isPaused = status === 'PAUSED';
  const isUpcoming = status === 'UPCOMING';

  const statusColor: Record<string, string> = {
    UPCOMING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    COMPLETED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    
<div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Race Control</h1>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
          <span className={`text-sm font-medium ${
            isActive ? 'text-emerald-400' : isPaused ? 'text-amber-400' : 'text-slate-400'
          }`}>
            {status}
          </span>
          <button
            onClick={() => setShowCreateEventModal(true)}
            className="ml-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            title="Add New Marathon"
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M17 8l-4-4m0 0l-4 4m4-4l4 4m-4 0l4-4"/>
            </svg>
            Add Marathon
          </button>
          <button
            onClick={() => setShowCreateEventModal(true)}
            className="ml-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + 
          </button>
        </div>
        {showCreateEventModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur z-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 p-6 rounded-xl w-80 max-w-full border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Create New Marathon</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">Marathon Name *</label>
                  <input
                    type="text"
                    value={createEventName}
                    onChange={(e) => setCreateEventName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="e.g. ISA Tech Marathon 2026"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Date *</label>
                  <input
                    type="date"
                    value={createEventDate}
                    onChange={(e) => setCreateEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Description</label>
                  <input
                    type="text"
                    value={createEventDescription}
                    onChange={(e) => setCreateEventDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Description</label>
                  <input
                    type="text"
                    value={createEventName}
                    onChange={(e) => setCreateEventName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateEventModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createEvent()}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    disabled={!createEventName || !createEventDate}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {events.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">All Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedEventId === event.id
                    ? 'bg-slate-700 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white truncate">{event.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[event.status] || 'bg-slate-700 text-slate-400'}`}>
                    {event.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString()}</p>
                <p className="text-xs text-slate-500 mt-1">{event._count?.participants || 0} participants</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {raceStatus?.event && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
          <h2 className="text-lg font-semibold text-white">{raceStatus.event.name}</h2>
          <p className="text-slate-400 text-sm">{new Date(raceStatus.event.date).toLocaleString()}</p>
        </div>
      )}

      {raceStatus?.stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
            <p className="text-2xl font-bold text-white">{raceStatus.stats.participants}</p>
            <p className="text-xs text-slate-400">Registered</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
            <p className="text-2xl font-bold text-emerald-400">{raceStatus.stats.checkedIn}</p>
            <p className="text-xs text-slate-400">Checked In</p>
          </div>
          <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-center">
            <p className="text-2xl font-bold text-amber-400">{raceStatus.stats.running}</p>
            <p className="text-xs text-slate-400">Running</p>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 text-center">
            <p className="text-2xl font-bold text-purple-400">{raceStatus.stats.finished}</p>
            <p className="text-xs text-slate-400">Finished</p>
          </div>
        </div>
      )}

      {selectedEvent?.raceDistances && selectedEvent.raceDistances.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Race Distances</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedEvent.raceDistances.map((d: any) => {
              const hasRoute = d._count?.routePoints > 0;
              return (
                <div key={d.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{d.name}</h3>
                    <span className="text-lg font-bold text-emerald-400">{d.distanceKm} km</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {d._count?.routePoints || 0} route points{hasRoute ? ` · ${d.totalDistance?.toFixed(2) || '?'} km` : ' · No route'}
                  </p>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({
                        distance: String(d.distanceKm),
                        eventName: d.name,
                        marathonName: selectedEvent.name,
                      });
                      if (hasRoute) {
                        params.set('raceDistanceId', d.id);
                      } else {
                        params.set('new', '1');
                      }
                      navigate(`/route-builder?${params.toString()}`);
                    }}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      hasRoute
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {hasRoute ? 'Edit Route' : 'Add Route'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {(isUpcoming || isPaused) && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            {isPaused ? 'Resume Race' : 'Start Race'}
          </button>
        )}

        {isActive && (
          <button
            onClick={handlePause}
            disabled={loading}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Pause Race
          </button>
        )}

        {(isActive || isPaused) && (
          <button
            onClick={handleEnd}
            disabled={loading}
            className="px-8 py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            End Race
          </button>
        )}
      </div>
    </div>
  );
}
