import { useEffect, useState } from 'react';
import { api, type EmailCleanupReport } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatTshirtSize } from '../lib/tshirtSize';

const API_URL = import.meta.env.VITE_API_URL || '';

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the browser's local
// time, not the ISO string (UTC, with seconds/zone) the API returns —
// converting through Date keeps this in the viewer's own timezone.
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ParticipantsPage() {
  const { user: currentAdmin } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [tshirtSize, setTshirtSize] = useState('');
  const [boardOnly, setBoardOnly] = useState(false);
  const [eventId, setEventId] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [registrationType, setRegistrationType] = useState('');
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
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTshirtSize, setEditTshirtSize] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editBloodDonation, setEditBloodDonation] = useState(false);
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editStartedAt, setEditStartedAt] = useState('');
  const [editFinishedAt, setEditFinishedAt] = useState('');
  const [editTotalDistance, setEditTotalDistance] = useState('');
  const [editIsBoardMember, setEditIsBoardMember] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [bulkReminderSending, setBulkReminderSending] = useState(false);
  const [bulkReminderMessage, setBulkReminderMessage] = useState('');
  const [showSharedContacts, setShowSharedContacts] = useState(false);
  const [sharedContacts, setSharedContacts] = useState<Awaited<ReturnType<typeof api.getSharedContacts>>['data'] | null>(null);
  const [sharedContactsLoading, setSharedContactsLoading] = useState(false);
  const [showOrphanedAccounts, setShowOrphanedAccounts] = useState(false);
  const [orphanedAccounts, setOrphanedAccounts] = useState<Awaited<ReturnType<typeof api.getOrphanedAccounts>>['data'] | null>(null);
  const [orphanedAccountsLoading, setOrphanedAccountsLoading] = useState(false);
  const [deletingOrphanId, setDeletingOrphanId] = useState<string | null>(null);
  const [pinListRows, setPinListRows] = useState<{ bibNumber: string; name: string; pin: string }[] | null>(null);
  const [pinListGenerating, setPinListGenerating] = useState(false);
  const [bibFixUploading, setBibFixUploading] = useState(false);
  const [bibFixResult, setBibFixResult] = useState<{ total: number; updated: number; failed: number; results: { bibNumber: string; success: boolean; error?: string }[] } | null>(null);
  const [showEmailCleanup, setShowEmailCleanup] = useState(false);
  const [emailCleanup, setEmailCleanup] = useState<EmailCleanupReport | null>(null);
  const [emailCleanupLoading, setEmailCleanupLoading] = useState(false);
  const [emailCleanupMessage, setEmailCleanupMessage] = useState('');
  const [cleanupKeep, setCleanupKeep] = useState<Record<string, string>>({});
  const [cleanupNames, setCleanupNames] = useState<Record<string, string>>({});
  const [cleanupSelected, setCleanupSelected] = useState<Record<string, string[]>>({});
  const [addForm, setAddForm] = useState({
    name: '', email: '', phone: '', category: 'RUN_3K', gender: 'MALE', companyId: '',
    tshirtSize: '', bloodGroup: '', emergencyContact: '', emergencyPhone: '', paymentStatus: 'COMPLETED',
    isBoardMember: false,
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
    const params: Record<string, string> = { page: page.toString(), limit: '25' };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category) params.category = category;
    if (status) params.status = status;
    if (tshirtSize) params.tshirtSize = tshirtSize;
    if (eventId) params.eventId = eventId;
    if (boardOnly) params.isBoardMember = 'true';
    if (companyFilter) params.companyId = companyFilter;
    if (registrationType) params.registrationType = registrationType;

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
  }, [page, category, status, tshirtSize, eventId, boardOnly, companyFilter, registrationType, debouncedSearch]);

  function resetAddForm() {
    setAddForm({
      name: '', email: '', phone: '', category: 'RUN_3K', gender: 'MALE', companyId: '',
      tshirtSize: '', bloodGroup: '', emergencyContact: '', emergencyPhone: '', paymentStatus: 'COMPLETED',
      isBoardMember: false,
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
        isBoardMember: addForm.isBoardMember,
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

  async function handleBulkReminders() {
    const scope = eventId ? 'the selected event' : 'the current event';
    if (!confirm(`Send a payment reminder email to everyone with a pending payment in ${scope}?`)) return;
    setBulkReminderSending(true);
    setBulkReminderMessage('');
    try {
      const res = await api.sendBulkPaymentReminders({ eventId: eventId || undefined });
      setBulkReminderMessage(res.success ? (res.message || 'Reminders sent') : (res.message || 'Failed to send reminders'));
    } catch (e: any) {
      setBulkReminderMessage(e.message || 'Failed to send reminders');
    }
    setBulkReminderSending(false);
  }

  async function handleBibFixUpload(file: File) {
    setBibFixUploading(true);
    setBibFixResult(null);
    try {
      const res = await api.bulkUpdateByBib(file);
      if (res.success && res.data) {
        setBibFixResult(res.data);
        loadParticipants();
      } else {
        alert(res.message || 'Failed to process CSV');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to process CSV');
    }
    setBibFixUploading(false);
  }

  async function toggleSharedContacts() {
    if (showSharedContacts) {
      setShowSharedContacts(false);
      return;
    }
    setShowSharedContacts(true);
    if (sharedContacts) return; // already loaded once this session
    setSharedContactsLoading(true);
    try {
      const res = await api.getSharedContacts();
      if (res.success && res.data) setSharedContacts(res.data);
    } catch (e) {
      console.error('Failed to fetch shared contacts:', e);
    }
    setSharedContactsLoading(false);
  }

  async function handleGeneratePinList() {
    const scope = eventId
      ? events.find((e) => e.id === eventId)?.name || 'the selected event'
      : 'ALL events';
    const confirmed = confirm(
      `Generate fresh PINs for every participant in ${scope}? This REPLACES their current PIN — anyone who already knows their old PIN will need the new one instead. Each account also gets emailed its new PIN as a backup.`
    );
    if (!confirmed) return;
    setPinListGenerating(true);
    setPinListRows(null);
    try {
      const res = await api.bulkResetPins({ eventId: eventId || undefined });
      if (res.success && res.data) {
        setPinListRows(res.data.rows);
      } else {
        alert(res.message || 'Failed to generate PINs');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to generate PINs');
    }
    setPinListGenerating(false);
  }

  function downloadPinListCsv() {
    if (!pinListRows) return;
    const header = 'BIB Number,Name,PIN\n';
    const body = pinListRows.map((r) => `${r.bibNumber},"${r.name.replace(/"/g, '""')}",${r.pin}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pin-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleOrphanedAccounts() {
    if (showOrphanedAccounts) {
      setShowOrphanedAccounts(false);
      return;
    }
    setShowOrphanedAccounts(true);
    setOrphanedAccountsLoading(true);
    try {
      const res = await api.getOrphanedAccounts();
      if (res.success && res.data) setOrphanedAccounts(res.data);
    } catch (e) {
      console.error('Failed to fetch orphaned accounts:', e);
    }
    setOrphanedAccountsLoading(false);
  }

  async function handleDeleteOrphan(id: string, email: string) {
    if (!confirm(`Delete this unused account (${email})? This frees up its email/phone for reuse. Cannot be undone.`)) return;
    setDeletingOrphanId(id);
    try {
      const res = await api.deleteOrphanedAccount(id);
      if (res.success) {
        setOrphanedAccounts((prev) => prev?.filter((o) => o.id !== id) || null);
      } else {
        alert(res.message || 'Failed to delete account');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete account');
    }
    setDeletingOrphanId(null);
  }

  function cleanupGroupKey(group: EmailCleanupReport['duplicateRegistrationGroups'][number]) {
    return JSON.stringify([group.email, group.eventId]);
  }

  function installCleanupReport(report: EmailCleanupReport) {
    setEmailCleanup(report);
    const keeps: Record<string, string> = {};
    const names: Record<string, string> = {};
    for (const group of report.duplicateRegistrationGroups) {
      const key = cleanupGroupKey(group);
      keeps[key] = group.recommendedKeepId;
      names[key] = group.participants.find((p) => p.id === group.recommendedKeepId)?.name || '';
    }
    setCleanupKeep(keeps);
    setCleanupNames(names);
    setCleanupSelected({});
  }

  async function toggleEmailCleanup() {
    if (showEmailCleanup) {
      setShowEmailCleanup(false);
      return;
    }
    setShowEmailCleanup(true);
    setEmailCleanupLoading(true);
    setEmailCleanupMessage('');
    try {
      const res = await api.getEmailCleanupReport();
      if (res.success && res.data) installCleanupReport(res.data);
    } catch (e: any) {
      setEmailCleanupMessage(e.message || 'Failed to load email cleanup report');
    }
    setEmailCleanupLoading(false);
  }

  async function normalizeEmails() {
    if (!confirm('Convert every user email to lowercase? Case-colliding participant accounts will be combined, but their BIB registrations will only be listed for manual review.')) return;
    setEmailCleanupLoading(true);
    setEmailCleanupMessage('');
    try {
      const res = await api.normalizeParticipantEmails();
      if (res.success && res.data) {
        installCleanupReport(res.data.report);
        const skipped = res.data.skipped.length ? ` ${res.data.skipped.length} admin/HR conflict(s) were skipped.` : '';
        setEmailCleanupMessage(`${res.data.normalized} email(s) converted; ${res.data.mergedAccounts} case-duplicate account(s) combined.${skipped}`);
        setSharedContacts(null);
      }
    } catch (e: any) {
      setEmailCleanupMessage(e.message || 'Failed to normalize emails');
    }
    setEmailCleanupLoading(false);
  }

  async function mergeCleanupGroup(group: EmailCleanupReport['duplicateRegistrationGroups'][number]) {
    const key = cleanupGroupKey(group);
    const keepParticipantId = cleanupKeep[key];
    const duplicateParticipantIds = (cleanupSelected[key] || []).filter((id) => id !== keepParticipantId);
    const correctName = cleanupNames[key]?.trim();
    const keepBib = group.participants.find((p) => p.id === keepParticipantId)?.bibNumber;
    if (!keepParticipantId || duplicateParticipantIds.length === 0 || !correctName) {
      setEmailCleanupMessage('Choose the BIB to keep, select at least one duplicate BIB, and enter the correct name.');
      return;
    }
    const removedBibs = group.participants.filter((p) => duplicateParticipantIds.includes(p.id)).map((p) => p.bibNumber);
    if (!confirm(`Keep ${keepBib}, merge ${removedBibs.join(', ')} into it, and use the name "${correctName}"? Payments and GPS history will be moved before the duplicate registration records are removed.`)) return;

    setEmailCleanupLoading(true);
    setEmailCleanupMessage('');
    try {
      const res = await api.mergeDuplicateParticipants({ keepParticipantId, duplicateParticipantIds, correctName });
      if (res.success && res.data) {
        installCleanupReport(res.data.report);
        setEmailCleanupMessage(`Kept ${res.data.keptBibNumber}; merged ${res.data.removedBibNumbers.join(', ')} successfully.`);
        setSharedContacts(null);
        loadParticipants();
      }
    } catch (e: any) {
      setEmailCleanupMessage(e.message || 'Failed to merge duplicate BIB registrations');
    }
    setEmailCleanupLoading(false);
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
    setEditName(viewParticipant.name || viewParticipant.user?.name || '');
    setEditCategory(viewParticipant.category || 'RUN_3K');
    setEditGender(viewParticipant.gender || 'MALE');
    setEditPhone(viewParticipant.user?.phone || '');
    setEditTshirtSize(viewParticipant.tshirtSize || '');
    setEditBloodGroup(viewParticipant.bloodGroup || '');
    setEditBloodDonation(!!viewParticipant.bloodDonation);
    setEditEmergencyContact(viewParticipant.emergencyContact || '');
    setEditEmergencyPhone(viewParticipant.emergencyPhone || '');
    setEditStatus(viewParticipant.status || 'REGISTERED');
    setEditStartedAt(toDatetimeLocal(viewParticipant.startedAt));
    setEditFinishedAt(toDatetimeLocal(viewParticipant.finishedAt));
    setEditTotalDistance(viewParticipant.totalDistance != null ? String(viewParticipant.totalDistance) : '');
    setEditIsBoardMember(!!viewParticipant.isBoardMember);
    setDetailsError('');
    setEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    if (!viewParticipant) return;

    // A FINISHED status with no real distance, or a start-to-finish gap
    // too short for an actual 3K/5K, is almost always a slip while testing
    // this panel rather than an intended race result — require an explicit
    // confirmation instead of silently writing it (this is what produced
    // the ISA0892/ISA0784 0-distance, 15-second "finishes" in production).
    if (editStatus === 'FINISHED') {
      const distance = editTotalDistance === '' ? 0 : Number(editTotalDistance);
      const elapsedMin = editStartedAt && editFinishedAt
        ? (new Date(editFinishedAt).getTime() - new Date(editStartedAt).getTime()) / 60000
        : null;
      const looksReal = distance > 0.5 && (elapsedMin === null || elapsedMin >= 5);
      if (!looksReal) {
        const proceed = confirm(
          `This finish looks like a test entry (distance ${distance}km${elapsedMin !== null ? `, ${elapsedMin.toFixed(1)} min` : ''}) rather than a real run. Save anyway?`
        );
        if (!proceed) return;
      }
    }

    setDetailsError('');
    setDetailsSaving(true);
    try {
      const res = await api.updateParticipant(viewParticipant.id, {
        name: editName,
        category: editCategory,
        gender: editGender,
        phone: editPhone,
        tshirtSize: editTshirtSize || null,
        bloodGroup: editBloodGroup || null,
        bloodDonation: editBloodDonation,
        status: editStatus,
        startedAt: editStartedAt ? new Date(editStartedAt).toISOString() : null,
        finishedAt: editFinishedAt ? new Date(editFinishedAt).toISOString() : null,
        totalDistance: editTotalDistance === '' ? undefined : Number(editTotalDistance),
        isBoardMember: editIsBoardMember,
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
            onClick={() => {
              const params: Record<string, string> = {};
              if (debouncedSearch) params.search = debouncedSearch;
              if (category) params.category = category;
              if (status) params.status = status;
              if (tshirtSize) params.tshirtSize = tshirtSize;
              if (eventId) params.eventId = eventId;
              if (boardOnly) params.isBoardMember = 'true';
              if (companyFilter) params.companyId = companyFilter;
              if (registrationType) params.registrationType = registrationType;
              api.exportParticipantsCSV(params);
            }}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={handleBulkReminders}
            disabled={bulkReminderSending}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-3xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {bulkReminderSending ? 'Sending...' : 'Remind All Unpaid'}
          </button>
          <button
            onClick={toggleSharedContacts}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm"
          >
            {showSharedContacts ? 'Hide Shared Contacts' : 'Find Duplicate Contacts'}
          </button>
          {currentAdmin?.role === 'SUPER_ADMIN' && (
            <button
              onClick={toggleOrphanedAccounts}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm"
            >
              {showOrphanedAccounts ? 'Hide Orphaned Accounts' : 'Find Orphaned Accounts'}
            </button>
          )}
          {currentAdmin?.role === 'SUPER_ADMIN' && (
            <button
              onClick={handleGeneratePinList}
              disabled={pinListGenerating}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {pinListGenerating ? 'Generating...' : 'Generate PIN List'}
            </button>
          )}
          {currentAdmin?.role === 'SUPER_ADMIN' && (
            <button
              onClick={toggleEmailCleanup}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl text-sm font-medium transition-colors shadow-sm"
            >
              {showEmailCleanup ? 'Hide Email Cleanup' : 'Email & BIB Cleanup'}
            </button>
          )}
          {currentAdmin?.role === 'SUPER_ADMIN' && (
            <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm cursor-pointer">
              {bibFixUploading ? 'Uploading...' : 'Fix by BIB (CSV)'}
              <input
                type="file"
                accept=".csv"
                disabled={bibFixUploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBibFixUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>
      {bibFixResult && (
        <div className="glass rounded-2xl border border-white/20 shadow-sm px-4 py-3 text-sm">
          <p className="text-slate-700 font-medium">
            Fix by BIB: {bibFixResult.updated} of {bibFixResult.total} updated
            {bibFixResult.failed > 0 ? `, ${bibFixResult.failed} failed` : ''}.
          </p>
          {bibFixResult.results.some((r) => !r.success) && (
            <ul className="mt-2 space-y-0.5 text-xs text-red-600">
              {bibFixResult.results.filter((r) => !r.success).map((r, i) => (
                <li key={i}>{r.bibNumber}: {r.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {bulkReminderMessage && (
        <p className="text-xs text-slate-600 bg-white/70 border border-white/60 rounded-2xl px-4 py-2.5">{bulkReminderMessage}</p>
      )}

      {showSharedContacts && (
        <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Shared Contact Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Login accounts (email/phone) used by more than one participant — usually a shared HR/company contact.
              {sharedContacts && ` ${sharedContacts.totalSharedAccounts} account${sharedContacts.totalSharedAccounts !== 1 ? 's' : ''}, ${sharedContacts.totalAffectedParticipants} participants affected.`}
            </p>
          </div>
          {sharedContactsLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : !sharedContacts || sharedContacts.groups.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No shared-contact accounts found.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[36rem] overflow-y-auto">
              {sharedContacts.groups.map((g) => (
                <div key={g.accountEmail} className="px-6 py-4">
                  <p className="text-xs font-mono text-slate-500">{g.accountEmail} · {g.accountPhone}</p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {g.participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm bg-slate-50 rounded-xl px-3 py-2">
                        <span className="font-mono text-violet-700 text-xs">{p.bibNumber}</span>
                        <span className="text-slate-900 truncate">{p.name || '(no name set)'}</span>
                        <span className="text-slate-400 text-xs ml-auto shrink-0">{p.category.replace('RUN_', '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showOrphanedAccounts && (
        <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Orphaned Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Login accounts with zero participants attached — usually left behind by an interrupted account creation.
              They silently lock their email/phone so it can't be reused elsewhere until deleted.
            </p>
          </div>
          {orphanedAccountsLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : !orphanedAccounts || orphanedAccounts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No orphaned accounts found.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[36rem] overflow-y-auto">
              {orphanedAccounts.map((o) => (
                <div key={o.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{o.name}</p>
                    <p className="text-xs font-mono text-slate-500">{o.email} · {o.phone}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteOrphan(o.id, o.email)}
                    disabled={deletingOrphanId === o.id}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-xs font-semibold disabled:opacity-50 shrink-0"
                  >
                    {deletingOrphanId === o.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pinListRows && (
        <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">PIN List</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {pinListRows.length} participant{pinListRows.length !== 1 ? 's' : ''} — freshly generated, shown once. Also emailed to each account as a backup.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadPinListCsv}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-xs font-semibold shrink-0"
              >
                Download CSV
              </button>
              <button
                onClick={() => setPinListRows(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-semibold shrink-0"
              >
                Close
              </button>
            </div>
          </div>
          {pinListRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No participants in scope.</div>
          ) : (
            <div className="max-h-[36rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/80 sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">BIB</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Name</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {pinListRows.map((r) => (
                    <tr key={r.bibNumber} className="border-t border-slate-100">
                      <td className="px-5 py-2 font-mono text-violet-700">{r.bibNumber}</td>
                      <td className="px-5 py-2 text-slate-900">{r.name}</td>
                      <td className="px-5 py-2 font-mono font-bold text-slate-950">{r.pin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showEmailCleanup && (
        <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Email and duplicate BIB cleanup</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lowercase account emails first, then manually merge only registrations that are truly the same person.
              </p>
            </div>
            <button
              onClick={normalizeEmails}
              disabled={emailCleanupLoading || !emailCleanup || (emailCleanup.uppercaseEmailCount === 0 && emailCleanup.caseCollisionGroups.length === 0)}
              className="px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-40"
            >
              Normalize all emails
            </button>
          </div>

          {emailCleanupMessage && (
            <p className="mx-6 mt-4 rounded-xl bg-violet-50 border border-violet-100 px-4 py-2 text-xs text-violet-800">{emailCleanupMessage}</p>
          )}

          {emailCleanupLoading && !emailCleanup ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading cleanup report...</div>
          ) : emailCleanup && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-2xl font-bold text-slate-900">{emailCleanup.uppercaseEmailCount}</p>
                  <p className="text-xs text-slate-500">emails need lowercase conversion</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-2xl font-bold text-slate-900">{emailCleanup.caseCollisionGroups.length}</p>
                  <p className="text-xs text-slate-500">case-colliding account groups</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-2xl font-bold text-slate-900">{emailCleanup.duplicateRegistrationGroups.length}</p>
                  <p className="text-xs text-slate-500">email/event groups needing BIB review</p>
                </div>
              </div>

              {emailCleanup.caseCollisionGroups.some((group) => !group.canAutoMerge) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Some case collisions contain admin or HR credentials. They are reported but deliberately not auto-merged.
                </div>
              )}

              {emailCleanup.duplicateRegistrationGroups.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                  No email/event group has more than one BIB registration.
                </div>
              ) : (
                <div className="space-y-4">
                  {emailCleanup.duplicateRegistrationGroups.map((group) => {
                    const key = cleanupGroupKey(group);
                    const keepId = cleanupKeep[key] || group.recommendedKeepId;
                    const selected = cleanupSelected[key] || [];
                    return (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="font-mono text-xs text-slate-600">{group.email}</span>
                          <span className="text-xs text-slate-400">· {group.eventName}</span>
                          {group.likelySamePerson ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">same-name candidate</span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">shared email — review carefully</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {group.participants.map((participant) => {
                            const isKeep = participant.id === keepId;
                            const isSelected = selected.includes(participant.id);
                            return (
                              <div key={participant.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-3 py-2 ${isKeep ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50'}`}>
                                <input
                                  type="radio"
                                  name={`keep-${key}`}
                                  checked={isKeep}
                                  onChange={() => {
                                    setCleanupKeep((current) => ({ ...current, [key]: participant.id }));
                                    setCleanupNames((current) => ({ ...current, [key]: participant.name }));
                                    setCleanupSelected((current) => ({ ...current, [key]: (current[key] || []).filter((id) => id !== participant.id) }));
                                  }}
                                  title="Keep this BIB"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900"><span className="font-mono text-violet-700">{participant.bibNumber}</span> · {participant.name}</p>
                                  <p className="text-[11px] text-slate-500">{participant.status} · payment {participant.paymentStatus}</p>
                                </div>
                                {isKeep ? (
                                  <span className="text-[10px] font-semibold text-emerald-700">KEEP</span>
                                ) : (
                                  <label className="flex items-center gap-1.5 text-[11px] text-red-700">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => setCleanupSelected((current) => ({
                                        ...current,
                                        [key]: e.target.checked
                                          ? [...(current[key] || []), participant.id]
                                          : (current[key] || []).filter((id) => id !== participant.id),
                                      }))}
                                    />
                                    Merge
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                          <input
                            value={cleanupNames[key] || ''}
                            onChange={(e) => setCleanupNames((current) => ({ ...current, [key]: e.target.value }))}
                            placeholder="Correct participant name"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                          />
                          <button
                            onClick={() => mergeCleanupGroup(group)}
                            disabled={emailCleanupLoading || selected.filter((id) => id !== keepId).length === 0 || !cleanupNames[key]?.trim()}
                            className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            Merge selected BIBs
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-[2rem] border border-white/20 p-4 shadow-sm">
        <div className="mb-4">
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
            className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
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
            <option value="XS">{formatTshirtSize('XS')}</option>
            <option value="S">{formatTshirtSize('S')}</option>
            <option value="M">{formatTshirtSize('M')}</option>
            <option value="L">{formatTshirtSize('L')}</option>
            <option value="XL">{formatTshirtSize('XL')}</option>
            <option value="XXL">{formatTshirtSize('XXL')}</option>
            <option value="MISSING">Missing / Not Set</option>
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
          <select
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none max-w-[200px] truncate"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={registrationType}
            onChange={(e) => { setRegistrationType(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            <option value="">All Registration Types</option>
            <option value="RETAIL">Retail (direct) only</option>
            <option value="BULK">Bulk (HR) only</option>
          </select>
          <label className="flex items-center gap-2 px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={boardOnly}
              onChange={(e) => { setBoardOnly(e.target.checked); setPage(1); }}
              className="rounded border-slate-300"
            />
            Board Members Only
          </label>
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
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {p.name || p.user?.name}
                    {p.isBoardMember && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold uppercase tracking-wide align-middle">Board</span>
                    )}
                  </td>
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
              <div className="flex items-center gap-3">
                {viewParticipant.user?.avatarUrl ? (
                  <img
                    src={`${API_URL}${viewParticipant.user.avatarUrl}`}
                    alt={viewParticipant.name || viewParticipant.user?.name}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-lg font-bold shrink-0">
                    {(viewParticipant.name || viewParticipant.user?.name)?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="text-xs font-mono text-violet-700">{viewParticipant.bibNumber}</p>
                  <h2 className="text-lg font-bold text-slate-950">{viewParticipant.name || viewParticipant.user?.name}</h2>
                </div>
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
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                    <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Gender</label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="NON_BINARY">Non-Binary</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">T-Shirt Size</label>
                    <select
                      value={editTshirtSize}
                      onChange={(e) => setEditTshirtSize(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    >
                      <option value="">Not set</option>
                      <option value="S">{formatTshirtSize('S')}</option>
                      <option value="M">{formatTshirtSize('M')}</option>
                      <option value="L">{formatTshirtSize('L')}</option>
                      <option value="XL">{formatTshirtSize('XL')}</option>
                      <option value="XXL">{formatTshirtSize('XXL')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Blood Group</label>
                    <input
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value)}
                      placeholder="e.g. O+"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={editBloodDonation}
                    onChange={(e) => setEditBloodDonation(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Willing to donate blood
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={editIsBoardMember}
                    onChange={(e) => setEditIsBoardMember(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Board Member
                </label>
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

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2 border-t border-violet-200">Race Progress (manual override)</p>
                <p className="text-xs text-slate-400">For runners with no GPS tracking — no phone, app issue, etc. Start/end time and distance are otherwise set automatically.</p>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  >
                    <option value="REGISTERED">Registered</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="RUNNING">Running</option>
                    <option value="PAUSED">Paused</option>
                    <option value="FINISHED">Finished</option>
                    <option value="DNF">DNF</option>
                    <option value="DNS">DNS</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={editStartedAt}
                      onChange={(e) => setEditStartedAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Finish Time</label>
                    <input
                      type="datetime-local"
                      value={editFinishedAt}
                      onChange={(e) => setEditFinishedAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editTotalDistance}
                    onChange={(e) => setEditTotalDistance(e.target.value)}
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
                <p className="text-slate-800">{formatTshirtSize(viewParticipant.tshirtSize)}</p>
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
                    <option value="S">{formatTshirtSize('S')}</option>
                    <option value="M">{formatTshirtSize('M')}</option>
                    <option value="L">{formatTshirtSize('L')}</option>
                    <option value="XL">{formatTshirtSize('XL')}</option>
                    <option value="XXL">{formatTshirtSize('XXL')}</option>
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
              <label className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={addForm.isBoardMember}
                  onChange={(e) => setAddForm({ ...addForm, isBoardMember: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Board Member — free registration, tagged for tracking
              </label>
              {!addForm.isBoardMember && (
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
              )}
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
