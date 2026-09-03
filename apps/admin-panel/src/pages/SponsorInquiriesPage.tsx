import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string;
  message: string | null;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-slate-200 text-slate-600',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SponsorInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getSponsorInquiries(statusFilter);
      if (res.success) setInquiries(res.data || []);
    } catch (e) {
      console.error('Failed to load sponsor inquiries:', e);
    }
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: string) {
    setBusyId(id);
    try {
      await api.updateSponsorInquiryStatus(id, status);
      await load();
    } catch (e) {
      console.error('Failed to update inquiry:', e);
    }
    setBusyId(null);
  }

  const newCount = inquiries.filter((i) => i.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Sponsor Inquiries</h1>
        <p className="text-sm text-slate-500 mt-1">Leads from the "Open For Sponsors" button on the homepage.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm"
        >
          {['ALL', 'NEW', 'CONTACTED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
          ))}
        </select>
        {newCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            {newCount} new
          </span>
        )}
      </div>

      <div className="glass rounded-[2rem] border border-white/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No sponsor inquiries yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inquiries.map((inq) => (
              <div key={inq.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">{inq.companyName}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[inq.status]}`}>
                      {inq.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {inq.name} &middot; {inq.email}{inq.phone ? ` · ${inq.phone}` : ''} &middot; {timeAgo(inq.createdAt)}
                  </p>
                  {inq.message && (
                    <p className="text-xs text-slate-600 mt-1.5 italic">"{inq.message}"</p>
                  )}
                </div>
                <select
                  value={inq.status}
                  disabled={busyId === inq.id}
                  onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
