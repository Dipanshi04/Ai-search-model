import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return `${API_URL}/${url}`;
}

interface SponsorCategory {
  id: string;
  name: string;
  displayOrder: number;
  alwaysSeparate: boolean;
  _count?: { sponsors: number };
}

interface Sponsor {
  id: string;
  eventId: string;
  name: string;
  logoUrl?: string;
  displayOrder: number;
  categoryId?: string | null;
  category?: SponsorCategory | null;
}

interface Event {
  id: string;
  name: string;
}

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [categories, setCategories] = useState<SponsorCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [form, setForm] = useState({ eventId: '', name: '', logoUrl: '', displayOrder: 0, categoryId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category management modal's own local form state
  const [catForm, setCatForm] = useState({ name: '', displayOrder: 0, alwaysSeparate: false });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catError, setCatError] = useState('');

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
    fetchCategories();
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

  async function fetchCategories() {
    try {
      const res = await api.getSponsorCategories();
      if (res.success && res.data) setCategories(res.data);
    } catch (e) {
      console.error('Failed to fetch sponsor categories:', e);
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
    setForm({ eventId: s.eventId, name: s.name, logoUrl: s.logoUrl || '', displayOrder: s.displayOrder, categoryId: s.categoryId || '' });
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
      // Always sent, even empty — empty means "uncategorize", vs the field
      // being absent entirely (which the API treats as "leave unchanged").
      formData.append('categoryId', form.categoryId);

      if (editingId) {
        await api.updateSponsor(editingId, formData);
      } else {
        await api.createSponsor(formData);
      }
      setShowModal(false);
      setForm({ eventId: '', name: '', logoUrl: '', displayOrder: 0, categoryId: '' });
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

  function resetCatForm() {
    setCatForm({ name: '', displayOrder: 0, alwaysSeparate: false });
    setEditingCatId(null);
    setCatError('');
  }

  function openEditCategory(c: SponsorCategory) {
    setCatForm({ name: c.name, displayOrder: c.displayOrder, alwaysSeparate: c.alwaysSeparate });
    setEditingCatId(c.id);
    setCatError('');
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCatError('');
    try {
      const res = editingCatId
        ? await api.updateSponsorCategory(editingCatId, catForm)
        : await api.createSponsorCategory(catForm);
      if (!res.success) {
        setCatError(res.message || 'Failed to save category');
        return;
      }
      resetCatForm();
      fetchCategories();
    } catch (e: any) {
      setCatError(e.message || 'Failed to save category');
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Delete this category? Sponsors in it become uncategorized, not deleted.')) return;
    try {
      await api.deleteSponsorCategory(id);
      if (editingCatId === id) resetCatForm();
      fetchCategories();
      fetchSponsors();
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  }

  const visibleSponsors = sponsors.filter((s) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'NONE') return !s.categoryId;
    return s.categoryId === categoryFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Sponsors</h1>
          <p className="text-slate-500 text-sm">{sponsors.length} sponsors</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="NONE">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => { resetCatForm(); setShowCategoryModal(true); }}
            className="px-4 py-2 bg-white/80 text-slate-700 rounded-3xl border border-white/70 text-sm font-medium"
          >
            Manage Categories
          </button>
          <button
            onClick={() => { setForm({ eventId: eventId || '', name: '', logoUrl: '', displayOrder: 0, categoryId: '' }); setLogoPreview(null); setEditingId(null); setShowModal(true); }}
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
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Category</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Order</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleSponsors.map((s) => (
              <tr key={s.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  {s.logoUrl ? (
                    <div className="inline-flex bg-white rounded-lg border border-slate-200 p-1.5">
                      <img src={getImageUrl(s.logoUrl)} alt={s.name || 'Sponsor'} className="h-8 w-auto object-contain" />
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">No logo</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-950 font-medium">{s.name}</td>
                <td className="px-5 py-4">
                  {s.category ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">{s.category.name}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Uncategorized</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500">{s.displayOrder}</td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button onClick={() => openEdit(s)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {visibleSponsors.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No sponsors match</td></tr>
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
                <label className="block text-slate-600 text-sm mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Don't see the right one? Use "Manage Categories" from the Sponsors list first.
                </p>
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
                      <div className="bg-white rounded-lg border border-slate-200 p-2">
                        <img src={logoPreview || getImageUrl(form.logoUrl)} alt="Logo preview" className="h-14 w-auto object-contain" />
                      </div>
                      <button type="button" onClick={clearLogo}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition">
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Upload PNG, JPG, WebP, or SVG. Max 2MB. Shown on a white card on every display, so transparent-background logos work fine.</p>
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

      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-[2rem] p-6 w-full max-w-lg max-h-[90vh] border border-white/20 shadow-lg overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-950 font-semibold">Sponsor Categories</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>

            <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-white/70 rounded-2xl border border-white/60">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c._count?.sponsors ?? 0} sponsor{c._count?.sponsors === 1 ? '' : 's'}
                      {c.alwaysSeparate ? ' · always its own section' : ' · folds into "Supported By" if small'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEditCategory(c)} className="text-violet-700 hover:text-violet-900 text-xs">Edit</button>
                    <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No categories yet — add one below.</p>
              )}
            </div>

            {catError && (
              <div className="mb-4 rounded-3xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">{catError}</div>
            )}

            <form onSubmit={handleCategorySubmit} className="space-y-3 border-t border-white/40 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{editingCatId ? 'Edit Category' : 'Add Category'}</p>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Name</label>
                <input
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  required
                  placeholder="e.g. Hydration Partner"
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm mb-1">Display Order</label>
                <input
                  type="number"
                  value={catForm.displayOrder}
                  onChange={(e) => setCatForm({ ...catForm, displayOrder: Number(e.target.value) })}
                  min="0"
                  className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={catForm.alwaysSeparate}
                  onChange={(e) => setCatForm({ ...catForm, alwaysSeparate: e.target.checked })}
                  className="rounded border-white/70"
                />
                Always its own section (never folds into "Supported By", even with 1 sponsor)
              </label>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm">
                  {editingCatId ? 'Update' : 'Add'}
                </button>
                {editingCatId && (
                  <button type="button" onClick={resetCatForm}
                    className="px-4 py-2 bg-white/80 text-slate-700 rounded-3xl border border-white/70 text-sm">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
