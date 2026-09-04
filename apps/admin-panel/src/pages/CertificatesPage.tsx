import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';
import nrcGroupLogo from '../components/nrc-group-logo.png';

interface Participant {
  id: string;
  bibNumber: string;
  category: string;
  status: string;
  user: { name: string; email: string };
  company?: { name: string } | null;
  raceDistance?: { name: string; distanceKm: number } | null;
}

// Participants only ever carry a category enum (RUN_3K/RUN_5K), never a
// raceDistance relation — the field on Participant above is aspirational
// for a shape the API doesn't actually send. This is the real source of
// truth for "how many km is this category", and what the km figure on the
// certificate used to show as "?" before this map existed.
const CATEGORY_KM: Record<string, number> = { RUN_3K: 3, RUN_5K: 5 };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

  async function generateCertificate(p: Participant) {
    setGenerating(p.id);

    const W = 1400, H = 990;
    const NAVY = '#1B2A5B';
    const ORANGE = '#F5821F';
    const CREAM = '#F5F1EA';

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.textAlign = 'center';

    // Background
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);

    // Outer + inner frame
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, W - 104, H - 104);

    // Corner accents
    const cornerSize = 34;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 4;
    [[52, 52, 1, 1], [W - 52, 52, -1, 1], [52, H - 52, 1, -1], [W - 52, H - 52, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x!, y! + cornerSize * dy!);
      ctx.lineTo(x!, y!);
      ctx.lineTo(x! + cornerSize * dx!, y!);
      ctx.stroke();
    });

    // Logo lockups — ISA + NRC Group, loaded async before drawing the rest
    try {
      const [isaLogo, nrcLogo] = await Promise.all([loadImage(logoDark), loadImage(nrcGroupLogo)]);
      const logoH = 64;
      const isaW = (isaLogo.width / isaLogo.height) * logoH;
      const nrcW = (nrcLogo.width / nrcLogo.height) * logoH;
      const gap = 28;
      const totalW = isaW + nrcW + gap;
      const startX = W / 2 - totalW / 2;
      const logoY = 78;
      ctx.drawImage(nrcLogo, startX, logoY, nrcW, logoH);
      ctx.drawImage(isaLogo, startX + nrcW + gap, logoY, isaW, logoH);
    } catch {
      // Logos are a nice-to-have — a failed image load shouldn't block the
      // certificate itself from generating.
    }

    // Title
    ctx.fillStyle = NAVY;
    ctx.font = '800 46px Georgia, serif';
    ctx.fillText('Certificate of Completion', W / 2, 250);

    ctx.fillStyle = ORANGE;
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('ISA TECH MARATHON 2026', W / 2, 288);

    // Divider
    ctx.strokeStyle = 'rgba(27,42,91,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 220, 316);
    ctx.lineTo(W / 2 + 220, 316);
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = 'rgba(27,42,91,0.6)';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('This is to certify that', W / 2, 366);

    // Name
    const name = p.user?.name || 'Participant';
    ctx.fillStyle = NAVY;
    ctx.font = '800 48px Georgia, serif';
    ctx.fillText(name, W / 2, 432);

    const nameWidth = ctx.measureText(name).width;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameWidth / 2 - 16, 448);
    ctx.lineTo(W / 2 + nameWidth / 2 + 16, 448);
    ctx.stroke();

    if (p.company?.name) {
      ctx.fillStyle = 'rgba(27,42,91,0.5)';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText(`Representing ${p.company.name}`, W / 2, 476);
    }

    // "has successfully completed"
    ctx.fillStyle = 'rgba(27,42,91,0.6)';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('has successfully completed the', W / 2, 526);

    const km = p.raceDistance?.distanceKm ?? CATEGORY_KM[p.category] ?? null;
    const raceLabel = p.raceDistance?.name || `${km ?? ''}K Run`.replace('K Run', 'K').trim() || p.category?.replace('RUN_', '') || 'Marathon';

    ctx.fillStyle = ORANGE;
    ctx.font = '800 34px Georgia, serif';
    ctx.fillText(raceLabel, W / 2, 574);

    ctx.fillStyle = 'rgba(27,42,91,0.55)';
    ctx.font = '22px Inter, sans-serif';
    ctx.fillText(`${km !== null ? km.toFixed(0) : '—'} km  ·  BIB #${p.bibNumber}`, W / 2, 610);

    // Date pill
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = 'rgba(27,42,91,0.45)';
    ctx.font = '17px Inter, sans-serif';
    ctx.fillText(date, W / 2, 664);

    // Footer
    ctx.strokeStyle = 'rgba(27,42,91,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 320, 838);
    ctx.lineTo(W / 2 + 320, 838);
    ctx.stroke();

    ctx.fillStyle = NAVY;
    ctx.font = '700 15px Inter, sans-serif';
    ctx.fillText('INDORE SOFTWARE ASSOCIATION', W / 2, 872);
    ctx.fillStyle = 'rgba(27,42,91,0.5)';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Run for a Greener Tomorrow — 3 km = 1 tree', W / 2, 896);

    // Download
    const link = document.createElement('a');
    link.download = `certificate-${p.bibNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setGenerating(null);
  }

  async function generateBulk() {
    const finished = participants.filter((p) => p.status === 'FINISHED');
    for (const p of finished) {
      await generateCertificate(p);
      await new Promise((r) => setTimeout(r, 400));
    }
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
