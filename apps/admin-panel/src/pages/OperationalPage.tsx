import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Company {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  bibNumber: string;
  name: string | null;
  category: string;
  gender: string;
  tshirtSize: string | null;
  status: string;
  user: { name: string; email: string; phone: string };
}

const TSHIRT_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function OperationalPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getCompanies().then((res) => {
      if (res.success && res.data) setCompanies(res.data);
    });
  }, []);

  useEffect(() => {
    if (!companyId) {
      setParticipants([]);
      return;
    }
    async function loadAll() {
      setLoading(true);
      try {
        // Companies can have more participants than fit on one page — keep
        // pulling pages until we actually have all of them, rather than
        // silently truncating a large company's runner list.
        let page = 1;
        let all: Participant[] = [];
        while (true) {
          const res = await api.getParticipants({ companyId, page: page.toString(), limit: '100' });
          if (!res.success || !res.data) break;
          all = all.concat(res.data as Participant[]);
          if (!res.pagination || page >= res.pagination.totalPages) break;
          page += 1;
        }
        setParticipants(all);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [companyId]);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const runners3k = participants.filter((p) => p.category === 'RUN_3K');
  const runners5k = participants.filter((p) => p.category === 'RUN_5K');

  const tshirtCounts: Record<string, number> = {};
  for (const p of participants) {
    const size = p.tshirtSize || 'Missing';
    tshirtCounts[size] = (tshirtCounts[size] || 0) + 1;
  }
  const tshirtRows = Object.entries(tshirtCounts).sort(([a], [b]) => {
    const ai = TSHIRT_SIZE_ORDER.indexOf(a);
    const bi = TSHIRT_SIZE_ORDER.indexOf(b);
    if (a === 'Missing') return 1;
    if (b === 'Missing') return -1;
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  async function handleExport() {
    if (!companyId) return;
    setExporting(true);
    try {
      await api.exportParticipantsCSV({ companyId });
    } finally {
      setExporting(false);
    }
  }

  function RunnerTable({ title, rows }: { title: string; rows: Participant[] }) {
    return (
      <div className="glass rounded-[2rem] border border-white/20 shadow-sm">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <span className="text-xs text-slate-400">{rows.length} runner{rows.length !== 1 ? 's' : ''}</span>
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/60">
                  <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase">BIB</th>
                  <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase">Gender</th>
                  <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase">T-Shirt</th>
                  <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-white/30">
                    <td className="px-6 py-2.5 hero-tabular font-semibold text-slate-900">{p.bibNumber}</td>
                    <td className="px-6 py-2.5 text-slate-700">{p.name || p.user?.name}</td>
                    <td className="px-6 py-2.5 text-slate-500">{p.gender}</td>
                    <td className="px-6 py-2.5 text-slate-700">{p.tshirtSize || '—'}</td>
                    <td className="px-6 py-2.5 text-slate-500">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 pb-6 text-sm text-slate-400">No runners in this category</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Operational</h1>
        <p className="text-sm text-slate-500 mt-1">Pick a company to see its 3K/5K runner lists and t-shirt size breakdown</p>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="px-4 py-3 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none max-w-xs truncate"
        >
          <option value="">Select a company...</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {companyId && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-3xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      {!companyId ? (
        <div className="glass rounded-[2rem] border border-white/20 shadow-sm p-10 text-center text-slate-400 text-sm">
          Select a company above to see its runner lists
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* T-Shirt Size Summary */}
          <div className="glass rounded-[2rem] border border-white/20 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">T-Shirt Sizes — {selectedCompany?.name}</h3>
              <span className="text-xs text-slate-400">{participants.length} total</span>
            </div>
            {tshirtRows.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                {tshirtRows.map(([size, count]) => (
                  <div key={size} className={`rounded-2xl px-4 py-3 text-center border ${size === 'Missing' ? 'bg-amber-50 border-amber-200' : 'bg-white/60 border-white/40'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${size === 'Missing' ? 'text-amber-700' : 'text-slate-500'}`}>{size}</p>
                    <p className={`text-2xl font-bold mt-1 ${size === 'Missing' ? 'text-amber-700' : 'text-slate-950'}`}>{count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-slate-400 text-sm">No runners for this company yet</div>
            )}
          </div>

          <RunnerTable title="3K Runners" rows={runners3k} />
          <RunnerTable title="5K Runners" rows={runners5k} />
        </>
      )}
    </div>
  );
}
