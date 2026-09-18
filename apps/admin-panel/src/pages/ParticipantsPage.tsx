import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [tshirtSize, setTshirtSize] = useState('');
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
  const [paymentError, setPaymentError] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [editingDetails, setEditingDetails] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTshirtSize, setEditTshirtSize] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', email: '', phone: '', category: 'RUN_3K', gender: 'MALE', companyId: '',
    tshirtSize: '', bloodGroup: '', emergencyContact: '', emergencyPhone: '', paymentStatus: 'COMPLETED',
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    api.getEvents().then((res) => {
      if (res.success && res.data) setEvents(res.data);
    });
    api.getCompanies().then((res) => {
      if (res.success && res.data) setCompanies(res.data);
    });
  }, []);

  async function loadParticipants() {
    setLoading(true);
    const params: Record<string, string> = { page: page.toString(), limit: '20' };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category) params.category = category;
    if (status) params.status = status;
    if (tshirtSize) params.tshirtSize = tshirtSize;
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
  }, [page, category, status, tshirtSize, eventId, debouncedSearch]);

  function resetAddForm() {
    setAddForm({
      name: '', email: '', phone: '', category: 'RUN_3K', gender: 'MALE', companyId: '',
      tshirtSize: '', bloodGroup: '', emergencyContact: '', emergencyPhone: '', paymentStatus: 'COMPLETED',
    });
    setAddError('');
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.phone.trim()) {
      setAddError('Name, email, and phone are required.');
      return;
    }
    setAddSaving(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        category: addForm.category,
        gender: addForm.gender,
        companyId: addForm.companyId || undefined,
        tshirtSize: addForm.tshirtSize || undefined,
        bloodGroup: addForm.bloodGroup || undefined,
        emergencyContact: addForm.emergencyContact || undefined,
        emergencyPhone: addForm.emergencyPhone || undefined,
        paymentStatus: addForm.paymentStatus,
      };
      const res = await api.createParticipant(payload);
      if (!res.success) {
        setAddError(res.message || 'Failed to add participant');
        setAddSaving(false);
        return;
      }
      setShowAddModal(false);
      resetAddForm();
      loadParticipants();
    } catch (e: any) {
      setAddError(e.message || 'Failed to add participant');
    }
    setAddSaving(false);
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this participant?')) {
      try {
        await api.deleteParticipant(id);
        loadParticipants();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to delete participant');
      }
    }
  };

  const openView = (p: any) => {
    setViewParticipant(p);
    setPin(null);
    setPinError('');
    setDistError('');
    setPaymentError('');
    setReminderMessage('');
    setEditingDetails(false);
    setDetailsError('');
  };

  const closeView = () => {
    setViewParticipant(null);
    setPin(null);
    setPinError('');
    setDistError('');
    setPaymentError('');
    setReminderMessage('');
    setEditingDetails(false);
    setDetailsError('');
  };

  const startEditDetails = () => {
    if (!viewParticipant) return;
    setEditCategory(viewParticipant.category || 'RUN_3K');
    setEditPhone(viewParticipant.user?.phone || '');
    setEditTshirtSize(viewParticipant.tshirtSize || '');
    setEditEmergencyContact(viewParticipant.emergencyContact || '');
    setEditEmergencyPhone(viewParticipant.emergencyPhone || '');
    setDetailsError('');
    setEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    if (!viewParticipant) return;
    setDetailsError('');
    setDetailsSaving(true);
    try {
      const res = await api.updateParticipant(viewParticipant.id, {
        category: editCategory,
        phone: editPhone,
        tshirtSize: editTshirtSize || null,
        emergencyContact: editEmergencyContact || null,
        emergencyPhone: editEmergencyPhone || null,
      });
      if (res.success && res.data) {
        setViewParticipant(res.data);
        setEditingDetails(false);
        loadParticipants();
      } else {
        setDetailsError(res.message || 'Failed to save changes');
      }
    } catch (e: any) {
      setDetailsError(e.message || 'Failed to save changes');
    }
    setDetailsSaving(false);
  };

  const handleSendReminder = async () => {
    if (!viewParticipant) return;
    setReminderSending(true);
    setReminderMessage('');
    try {
      const res = await api.sendPaymentReminder(viewParticipant.id);
      setReminderMessage(res.success ? (res.message || 'Reminder sent') : (res.message || 'Failed to send reminder'));
    } catch (e: any) {
      setReminderMessage(e.message || 'Failed to send reminder');
    }
    setReminderSending(false);
  };

  const handleSetPaymentStatus = async (paymentStatus: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED') => {
    if (!viewParticipant) return;
    setPaymentError('');
    setPaymentSaving(true);
    try {
      const res = await api.updateParticipant(viewParticipant.id, { paymentStatus });
      if (res.success && res.data) {
        setViewParticipant(res.data);
        loadParticipants();
      } else {
        setPaymentError(res.message || 'Failed to update payment status');
      }
    } catch (e: any) {
      setPaymentError(e.message || 'Failed to update payment status');
    }
    setPaymentSaving(false);
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
        <div className="flex gap-3">
          <button
            onClick={() => { resetAddForm(); setShowAddModal(true); }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium transition-colors shadow-sm"
          >
            Add Participant
          </button>
          <button
            onClick={() => api.exportParticipantsCSV()}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm"
          >
            Export CSV
          </button>
        </div>
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
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="REGISTERED">Registered</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="FINISHED">Finished</option>
            <option value="DNF">DNF</option>
            <option value="DNS">DNS</option>
          </select>
          <select
            value={tshirtSize}
            onChange={(e) => { setTshirtSize(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All T-Shirt Sizes</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
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
              <div className="flex items-center gap-2">
                {!editingDetails && (
                  <button
                    onClick={startEditDetails}
                    className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={closeView}
                  className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            {editingDetails && (
              <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
                {detailsError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">{detailsError}</p>
                )}
                <p className="text-xs text-slate-400">BIB number can't be changed here.</p>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  >
                    <option value="RUN_3K">3K</option>
                    <option value="RUN_5K">5K</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">T-Shirt Size</label>
                  <select
                    value={editTshirtSize}
                    onChange={(e) => setEditTshirtSize(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  >
                    <option value="">Not set</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Emergency Contact</label>
                  <input
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Emergency Phone</label>
                  <input
                    value={editEmergencyPhone}
                    onChange={(e) => setEditEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveDetails}
                    disabled={detailsSaving}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-xs font-semibold disabled:opacity-50"
                  >
                    {detailsSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingDetails(false); setDetailsError(''); }}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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
                <p className="text-xs text-slate-400 uppercase tracking-wide">T-Shirt Size</p>
                <p className="text-slate-800">{viewParticipant.tshirtSize || '—'}</p>
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Payment</p>
              <p className="text-xs text-slate-400 mb-3">
                Manual override — for cash-at-venue or fixing a mismatch. Online payments verify through the Payments tab instead.
              </p>
              {paymentError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 mb-3">{paymentError}</p>
              )}
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    viewParticipant.paymentStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    viewParticipant.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                    viewParticipant.paymentStatus === 'REFUNDED' ? 'bg-slate-200 text-slate-600' :
                    'bg-amber-100 text-amber-700'
                  }`}
                >
                  {viewParticipant.paymentStatus || 'PENDING'}
                </span>
                {viewParticipant.paymentStatus !== 'COMPLETED' ? (
                  <button
                    onClick={() => handleSetPaymentStatus('COMPLETED')}
                    disabled={paymentSaving}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                  >
                    Mark as Paid
                  </button>
                ) : (
                  <button
                    onClick={() => handleSetPaymentStatus('PENDING')}
                    disabled={paymentSaving}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    Revert to Pending
                  </button>
                )}
              </div>
              {viewParticipant.paymentStatus !== 'COMPLETED' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {reminderMessage && (
                    <p className="text-xs text-slate-500 mb-2">{reminderMessage}</p>
                  )}
                  <button
                    onClick={handleSendReminder}
                    disabled={reminderSending}
                    className="text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-50"
                  >
                    {reminderSending ? 'Sending...' : 'Send Payment Reminder Email'}
                  </button>
                </div>
              )}
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

      {showAddModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-[2rem] shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-950">Add Participant</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              For walk-ins, cash payments, or VIP entries — bypasses the public checkout. A BIB is allocated automatically and login details are emailed.
            </p>

            {addError && (
              <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">{addError}</div>
            )}

            <form onSubmit={handleAddParticipant} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Name</label>
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                <input
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  >
                    <option value="RUN_3K">3K</option>
                    <option value="RUN_5K">5K</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Gender</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-Binary</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Company</label>
                <select
                  value={addForm.companyId}
                  onChange={(e) => setAddForm({ ...addForm, companyId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                >
                  <option value="">None</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">T-Shirt Size</label>
                  <select
                    value={addForm.tshirtSize}
                    onChange={(e) => setAddForm({ ...addForm, tshirtSize: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  >
                    <option value="">Not set</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Blood Group</label>
                  <input
                    value={addForm.bloodGroup}
                    onChange={(e) => setAddForm({ ...addForm, bloodGroup: e.target.value })}
                    placeholder="e.g. O+"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Emergency Contact</label>
                  <input
                    value={addForm.emergencyContact}
                    onChange={(e) => setAddForm({ ...addForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Emergency Phone</label>
                  <input
                    value={addForm.emergencyPhone}
                    onChange={(e) => setAddForm({ ...addForm, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Payment</label>
                <select
                  value={addForm.paymentStatus}
                  onChange={(e) => setAddForm({ ...addForm, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                >
                  <option value="COMPLETED">Mark as paid (e.g. cash at venue)</option>
                  <option value="PENDING">Leave pending (runner pays online later)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm disabled:opacity-50"
                >
                  {addSaving ? 'Adding...' : 'Add Participant'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-3xl text-sm"
                >
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