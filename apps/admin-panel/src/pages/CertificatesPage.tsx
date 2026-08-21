import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Participant {
  id: string;
  bibNumber: string;
  category: string;
  status: string;
  user: { name: string; email: string };
  raceDistance: { name: string; distanceKm: number };
}

export default function CertificatesPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [filter] = useState<'all' | 'FINISHED'>('FINISHED');

  useEffect(() => {
    loadParticipants();
  }, []);

  async function loadParticipants() {
    try {
      const res = await api.getParticipants({ status: 'FINISHED', limit: '100' });
      if (res.success && res.data) setParticipants(res.data);
    } finally {
      setLoading(false);
    }
  }

  function generateCertificate(p: Participant) {
    setGenerating(p.id);

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1200, 850);

    // Border
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 790);

    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1120, 770);

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 42px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Completion', 600, 140);

    // Subtitle
    ctx.fillStyle = '#7c3aed';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText('ISA Tech Marathon 2026', 600, 185);

    // Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(300, 210);
    ctx.lineTo(900, 210);
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = '#64748b';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('This is to certify that', 600, 265);

    // Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText(p.user?.name || 'Participant', 600, 320);

    // Underline under name
    const nameWidth = ctx.measureText(p.user?.name || 'Participant').width;
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(600 - nameWidth / 2 - 10, 330);
    ctx.lineTo(600 + nameWidth / 2 + 10, 330);
    ctx.stroke();

    // "has successfully completed"
    ctx.fillStyle = '#64748b';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('has successfully completed the', 600, 375);

    // Race name
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(`${p.raceDistance?.name || p.category?.replace('RUN_', '') || 'Marathon'}`, 600, 420);

    // Distance
    ctx.fillStyle = '#475569';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText(
      `${p.raceDistance?.distanceKm || '?'} km — BIB #${p.bibNumber}`,
      600, 465
    );

    // Date
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, sans-serif';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(date, 600, 520);

    // Footer
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(200, 680);
    ctx.lineTo(1000, 680);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('ISA Tech Marathon 2026 — Certificate of Completion', 600, 720);

    // Download
    const link = document.createElement('a');
    link.download = `certificate-${p.bibNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setTimeout(() => setGenerating(null), 1000);
  }

  function generateBulk() {
    const finished = participants.filter((p) => p.status === 'FINISHED');
    finished.forEach((p, i) => {
      setTimeout(() => generateCertificate(p), i * 500);
    });
  }

  const displayParticipants = filter === 'all' ? participants : participants.filter((p) => p.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Certificates</h1>
          <p className="text-sm text-slate-500">{participants.length} finishers eligible for certificates</p>
        </div>
        <button
          onClick={generateBulk}
          disabled={participants.length === 0}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium shadow-sm disabled:opacity-50"
        >
          Download All
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/80">
            <tr>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">BIB</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Name</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Category</th>
              <th className="text-left px-5 py-4 text-slate-500 font-semibold">Status</th>
              <th className="text-right px-5 py-4 text-slate-500 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayParticipants.map((p) => (
              <tr key={p.id} className="border-t border-white/10 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4 text-violet-700 font-mono font-semibold">{p.bibNumber}</td>
                <td className="px-5 py-4 text-slate-950 font-medium">{p.user?.name}</td>
                <td className="px-5 py-4">
                  <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs">
                    {p.raceDistance?.name || p.category?.replace('RUN_', '')}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.status === 'FINISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => generateCertificate(p)}
                    disabled={generating === p.id}
                    className="text-violet-700 hover:text-violet-900 text-xs font-medium disabled:opacity-50"
                  >
                    {generating === p.id ? 'Generating...' : 'Download'}
                  </button>
                </td>
              </tr>
            ))}
            {displayParticipants.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No finishers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
