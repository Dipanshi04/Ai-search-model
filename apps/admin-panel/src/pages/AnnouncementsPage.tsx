import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  target: 'all' | 'participants' | 'companies';
  createdAt: string;
  sent: boolean;
}

const STORAGE_KEY = 'isa_announcements';

function loadAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAnnouncements(list: Announcement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-red-50 text-red-700 border border-red-200',
};

const TARGET_LABELS: Record<string, string> = {
  all: 'Everyone',
  participants: 'Participants',
  companies: 'Companies',
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'medium' as const, target: 'all' as const });

  useEffect(() => {
    setAnnouncements(loadAnnouncements());
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: form.title,
      body: form.body,
      priority: form.priority,
      target: form.target,
      createdAt: new Date().toISOString(),
      sent: false,
    };
    const updated = [newAnnouncement, ...announcements];
    setAnnouncements(updated);
    saveAnnouncements(updated);
    setForm({ title: '', body: '', priority: 'medium', target: 'all' });
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const updated = announcements.filter((a) => a.id !== id);
    setAnnouncements(updated);
    saveAnnouncements(updated);
  }

  function handleToggleSent(id: string) {
    const updated = announcements.map((a) => a.id === id ? { ...a, sent: !a.sent } : a);
    setAnnouncements(updated);
    saveAnnouncements(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Announcements</h1>
          <p className="text-sm text-slate-500">{announcements.length} announcements created</p>
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
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Create Announcement</h3>
          <form onSubmit={handleCreate} className="space-y-4">
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
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
                rows={3}
                placeholder="Write your announcement..."
                className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm resize-none focus:ring-2 focus:ring-violet-200 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Target Audience</label>
                <select
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm outline-none"
                >
                  <option value="all">Everyone</option>
                  <option value="participants">Participants</option>
                  <option value="companies">Companies</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium">
                Create
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
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[a.priority]}`}>
                    {a.priority}
                  </span>
                  <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-50">
                    {TARGET_LABELS[a.target]}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.body}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleSent(a.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    a.sent
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {a.sent ? 'Sent' : 'Mark Sent'}
                </button>
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
