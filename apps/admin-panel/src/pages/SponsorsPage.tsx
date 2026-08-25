import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return `${API_URL}/${url}`;
}

interface Sponsor {
  id: string;
  eventId: string;
  name: string;
  logoUrl?: string;
  displayOrder: number;
}

interface Event {
  id: string;
  name: string;
}

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ eventId: '', name: '', logoUrl: '', displayOrder: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getEvents().then((res) => {
      if (res.success && res.data) {
        setEvents(res.data);
        if (res.data.length > 0 && !eventId) {
          setEventId(res.data[0].id);
        }
      }
    });
    fetchSponsors();
  }, []);

  async function fetchSponsors() {
    try {
      const params: Record<string, string> = {};
      if (eventId) params.eventId = eventId;
      const res = await api.getSponsors(params);
      if (res.success && res.data) setSponsors(res.data);
    } catch (e) {
      console.error('Failed to fetch sponsors:', e);
    }
  }

  useEffect(() => { fetchSponsors(); }, [eventId]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function openEdit(s: Sponsor) {
    setForm({ eventId: s.eventId, name: s.name, logoUrl: s.logoUrl || '', displayOrder: s.displayOrder });
    setLogoPreview(s.logoUrl ? getImageUrl(s.logoUrl) : null);
    setEditingId(s.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('eventId', form.eventId);
      formData.append('name', form.name);
      if (form.logoUrl) formData.append('logoUrl', form.logoUrl);
      if (logoFile) formData.append('logo', logoFile);
      formData.append('displayOrder', String(form.displayOrder));

      if (editingId) {
        await api.updateSponsor(editingId, formData);
      } else {
        await api.createSponsor(formData);
      }
      setShowModal(false);
      setForm({ eventId: '', name: '', logoUrl: '', displayOrder: 0 });
      setLogoFile(null);
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEditingId(null);
      fetchSponsors();
    } catch (e) {
      console.error('Failed to save sponsor:', e);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sponsor?')) return;
    try {
      await api.deleteSponsor(id);
      fetchSponsors();
    } catch (e) {
      console.error('Failed to delete sponsor:', e);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Sponsors</h1>
          <p className="text-slate-500 text-sm">{sponsors.length} sponsors</p>
        </div>
        <div className="flex gap-3">
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setForm({ eventId: eventId || '', name: '', logoUrl: '', displayOrder: 0 }); setLogoPreview(null); setEditingId(null); setShowModal(true); }}
            disabled={!eventId}
            className={`px-4 py-2 rounded-3xl text-sm font-medium shadow-sm ${eventId ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
          >
            {eventId ? 'Add Sponsor' : 'Select an event first'}
          </button>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80 backdrop-blur-md">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Logo</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Name</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Order</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.map((s) => (
              <tr key={s.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  {s.logoUrl ? (
                    <img src={getImageUrl(s.logoUrl)} alt={s.name || 'Sponsor'} className="h-10 w-auto rounded-lg object-contain" />
                  ) : (
                    <span className="text-slate-400 text-sm">No logo</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-950 font-medium">{s.name}</td>
                <td className="px-5 py-4 text-slate-500">{s.displayOrder}</td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button onClick={() => openEdit(s)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {sponsors.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No sponsors</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-full max-w-2xl max-h-[90vh] border border-white/20 shadow-lg overflow-y-auto">
            <h3 className="text-slate-950 font-semibold mb-4">{editingId ? 'Edit Sponsor' : 'Add Sponsor'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-slate-600 text-sm mb-1">Event *</label>
                <select
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Logo *</label>
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
                  />
                  {(logoPreview || form.logoUrl) && (
                    <div className="flex items-center gap-3">
                      <img src={logoPreview || form.logoUrl} alt="Logo preview" className="h-16 w-auto rounded-lg object-contain border border-slate-200" />
                      <button type="button" onClick={clearLogo}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition">
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Upload PNG, JPG, WebP, or SVG. Max 2MB.</p>
                </div>
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Display Order</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                  min="0"
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