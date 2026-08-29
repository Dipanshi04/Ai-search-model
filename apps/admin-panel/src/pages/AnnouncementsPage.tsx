import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Announcement {
  id: string;
  title: string;
  message: string;
  eventId?: string;
  location?: string | null;
  url?: string | null;
  phone?: string | null;
  eventDate?: string | null;
  createdAt: string;
}

const emptyForm = { title: '', message: '', eventId: '', location: '', url: '', phone: '', eventDate: '' };

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadAnnouncements();
    loadEvents();
  }, []);

  async function loadAnnouncements() {
    try {
      const res = await api.getAnnouncements();
      if (res.success && res.data) {
        setAnnouncements(res.data);
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    }
  }

  async function loadEvents() {
    try {
      const res = await api.getEvents();
      if (res.success && res.data) {
        setEvents(res.data);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.sendAnnouncement({
        eventId: form.eventId,
        title: form.title,
        message: form.message,
        location: form.location || undefined,
        url: form.url || undefined,
        phone: form.phone || undefined,
        eventDate: form.eventDate || undefined,
      });
      if (res.success) {
        await loadAnnouncements();
        setForm(emptyForm);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Failed to send announcement:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Announcements</h1>
          <p className="text-sm text-slate-500">{announcements.length} announcements sent</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm"
        >
          New Announcement
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Send Announcement</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Event</label>
              <select
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm outline-none"
              >
                <option value="">Select an event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Announcement title"
                className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                rows={3}
                placeholder="Write your announcement..."
                className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm resize-none focus:ring-2 focus:ring-violet-200 outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 -mt-2">
              Optional details — shown in the runner app's message center when set. Leave any of these blank to skip them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. ISA Office, Vijay Nagar"
                  className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Link</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Now'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-white/80 text-slate-700 rounded-3xl border border-white/70 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="glass rounded-[2rem] p-5 border border-white/20 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-950">{a.title}</h3>
                  <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    Sent
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                {(a.location || a.eventDate || a.phone || a.url) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {a.eventDate && (
                      <span className="text-xs text-slate-500">📅 {new Date(a.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                    {a.location && <span className="text-xs text-slate-500">📍 {a.location}</span>}
                    {a.phone && <span className="text-xs text-slate-500">📞 {a.phone}</span>}
                    {a.url && <span className="text-xs text-slate-500">🔗 {a.url}</span>}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Sent {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-red-500 hover:text-red-600 text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && !showForm && (
          <div className="glass rounded-[2rem] p-12 border border-white/20 shadow-sm text-center">
            <p className="text-slate-500">No announcements yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
