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
      const res = await api.getEvents();
      if (res.success && res.data) {
        setEvents(res.data);
        if (res.data.length > 0 && !selectedEventId) {
          const active = res.data.find((e: any) => e.status === 'ACTIVE');
          const upcoming = res.data.find((e: any) => e.status === 'UPCOMING');
          setSelectedEventId(active?.id || upcoming?.id || res.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  async function loadStatus(eventId: string) {
    try {
      const res = await api.getRaceStatus(eventId);
      if (res.success) setRaceStatus(res.data);
    } catch (error) {
      console.error('Failed to load race status:', error);
    }
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
    try {
      await api.startRace(selectedEventId);
      await loadStatus(selectedEventId);
      await loadEvents();
    } catch (e) {
      console.error('Failed to start race:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handlePause() {
    if (!confirm('Pause the race?')) return;
    setLoading(true);
    try {
      await api.pauseRace(selectedEventId);
      await loadStatus(selectedEventId);
      await loadEvents();
    } catch (e) {
      console.error('Failed to pause race:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd() {
    if (!confirm('End the race? This cannot be undone!')) return;
    setLoading(true);
    try {
      await api.endRace(selectedEventId);
      await loadStatus(selectedEventId);
      await loadEvents();
    } catch (e) {
      console.error('Failed to end race:', e);
    } finally {
      setLoading(false);
    }
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const status = raceStatus?.event?.status ?? (raceStatus ? 'NO_ACTIVE_RACE' : (selectedEvent?.status ?? 'NO_ACTIVE_RACE'));
  const isActive = status === 'ACTIVE';
  const isPaused = status === 'PAUSED';
  const isUpcoming = status === 'UPCOMING';

  const statusColor: Record<string, string> = {
    UPCOMING: 'bg-blue-50 text-blue-700 border border-blue-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    PAUSED: 'bg-amber-50 text-amber-700 border border-amber-200',
    COMPLETED: 'bg-purple-50 text-purple-700 border border-purple-200',
    NO_ACTIVE_RACE: 'bg-slate-50 text-slate-500 border border-slate-200',
  };

  const eventCount = events.length;
  const participantCount = raceStatus?.stats?.participants || selectedEvent?._count?.participants || 0;
  const checkedInCount = raceStatus?.stats?.checkedIn || 0;
  const runningCount = raceStatus?.stats?.running || 0;
  const finishedCount = raceStatus?.stats?.finished || 0;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
              <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : isPaused ? 'bg-amber-400' : status === 'UPCOMING' ? 'bg-blue-400' : 'bg-slate-300'}`} />
              {status}
            </div>
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold text-slate-900">Race Control</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Manage your events, control race status, and monitor participant progress from a polished command center.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              Add Marathon
            </button>
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
            >
              New Event
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
            <div className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Selected event</p>
                  <h2 className="text-2xl font-semibold text-slate-900">{raceStatus?.event?.name || selectedEvent?.name || 'No event selected'}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {raceStatus?.event?.date
                      ? new Date(raceStatus.event.date).toLocaleString()
                      : selectedEvent?.date
                      ? new Date(selectedEvent.date).toLocaleDateString()
                      : 'Choose an event from the list below.'}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[status] || 'bg-slate-100 text-slate-600'}`}>
                  {status}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Participants</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{participantCount}</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Checked In</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{checkedInCount}</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Running</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{runningCount}</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Finished</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{finishedCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Live metrics</h2>
            <p className="mt-2 text-sm text-slate-500">Track the race in real time and review the latest available statistics.</p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl bg-violet-50 p-5">
                <p className="text-sm text-violet-700">Current event</p>
                <p className="mt-3 text-xl font-semibold text-slate-900">{selectedEvent?.name || 'No selected event'}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Total events</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{eventCount}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Last refresh</p>
                <p className="mt-3 text-base font-semibold text-slate-900">Every 10 seconds</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">All Events</h2>
                <p className="mt-1 text-sm text-slate-500">Tap any card to switch the active marathon.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{eventCount} events</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`group rounded-[1.75rem] border p-5 text-left transition shadow-sm ${
                    selectedEventId === event.id
                      ? 'border-violet-300 bg-violet-50 shadow-md'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{event.name}</h3>
                      <p className="mt-2 text-sm text-slate-500">{event._count?.participants || 0} runners</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[event.status] || 'bg-slate-100 text-slate-600'}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    <span>{event._count?.routePoints || 0} routes</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedEvent && (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Selected event</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedEvent.name}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColor[selectedEvent.status] || 'bg-slate-100 text-slate-600'}`}>
                  {selectedEvent.status}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-sm text-slate-500">Max runners</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{selectedEvent.maxParticipants || '—'}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-sm text-slate-500">Distances</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{selectedEvent.raceDistances?.length || selectedEvent.distances?.length || 0}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedEvent.description && (
                  <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                    <p className="text-sm text-slate-500">Description</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedEvent.description}</p>
                  </div>
                )}
                <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-sm text-slate-500">Route points</p>
                  <p className="mt-2 text-sm text-slate-700">{selectedEvent._count?.routePoints || 0} mapped path points</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Quick stats</h2>
            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                <p className="text-sm text-slate-500">Participants</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{participantCount}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                <p className="text-sm text-slate-500">Checked in</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{checkedInCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Race actions</h2>
            <div className="mt-5 grid gap-3">
              {(isUpcoming || isPaused) && (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isPaused ? 'Resume Race' : 'Start Race'}
                </button>
              )}

              {isActive && (
                <button
                  onClick={handlePause}
                  disabled={loading}
                  className="w-full rounded-3xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  Pause Race
                </button>
              )}

              {(isActive || isPaused) && (
                <button
                  onClick={handleEnd}
                  disabled={loading}
                  className="w-full rounded-3xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  End Race
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm">
          <div className="mx-auto my-16 max-w-xl rounded-[2rem] bg-white p-8 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Create New Marathon</h2>
                <p className="mt-2 text-sm text-slate-500">Add a new event and start planning the route immediately.</p>
              </div>
              <button
                onClick={() => setShowCreateEventModal(false)}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); createEvent(); }}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Marathon Name *</label>
                <input
                  type="text"
                  value={createEventName}
                  onChange={(e) => setCreateEventName(e.target.value)}
                  placeholder="e.g. ISA Tech Marathon 2026"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={createEventDate}
                  onChange={(e) => setCreateEventDate(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <input
                  type="text"
                  value={createEventDescription}
                  onChange={(e) => setCreateEventDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="flex-1 rounded-3xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!createEventName || !createEventDate || loading}
                  className="flex-1 rounded-3xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create Marathon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
