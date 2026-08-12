import { useState, useEffect } from 'react';

interface CertificateData {
  participantId: string;
  name: string;
  bibNumber: string;
  companyName?: string;
  finishTime?: string;
  distance?: number;
  treesPlanted: number;
  co2Saved: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CertificatePage() {
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchCertificate(); }, []);

  async function fetchCertificate() {
    const token = localStorage.getItem('runner_token');
    if (!token) return setLoading(false);

    const res = await fetch(`${API_URL}/api/v1/participants/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.data) {
      setCertificate({
        participantId: data.data.id,
        name: data.data.name,
        bibNumber: data.data.bibNumber,
        companyName: data.data.company?.name,
        finishTime: data.data.finishTime,
        distance: data.data.distance,
        treesPlanted: data.data.treesPlanted || 0,
        co2Saved: (data.data.treesPlanted || 0) * 21,
      });
    }
    setLoading(false);
  }

  async function handleDownload() {
    if (!certificate) return;
    setGenerating(true);
    const token = localStorage.getItem('runner_token');
    const res = await fetch(`${API_URL}/api/v1/certificates/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ participantId: certificate.participantId }),
    });
    const data = await res.json();
    if (data.success && data.data?.pdfUrl) {
      window.open(`${API_URL}${data.data.pdfUrl}`, '_blank');
    }
    setGenerating(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Loading...</div>;

  if (!certificate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">No Certificate Available</h2>
        <p className="text-slate-400">Complete the marathon to earn your certificate.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Your Certificate</h1>

        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center space-y-4">
          <p className="text-slate-400 text-sm uppercase tracking-wider">Certificate of Completion</p>
          <h2 className="text-3xl font-bold text-emerald-400">{certificate.name}</h2>
          <p className="text-slate-300">BIB #{certificate.bibNumber}</p>
          {certificate.companyName && <p className="text-slate-400">{certificate.companyName}</p>}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-xs">Finish Time</p>
              <p className="text-white font-bold text-lg">
                {certificate.finishTime ? new Date(certificate.finishTime).toLocaleTimeString() : 'In Progress'}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-xs">Distance</p>
              <p className="text-white font-bold text-lg">{certificate.distance ? `${(certificate.distance / 1000).toFixed(2)} km` : '-'}</p>
            </div>
          </div>

          <div className="bg-green-900/30 rounded-lg p-4 border border-green-700/50">
            <p className="text-green-400 text-sm font-medium">Green Impact</p>
            <p className="text-white text-lg font-bold">{certificate.treesPlanted} trees planted</p>
            <p className="text-green-300 text-sm">{certificate.co2Saved} kg CO2 saved</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={generating}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          {generating ? 'Generating PDF...' : 'Download PDF Certificate'}
        </button>
      </div>
    </div>
  );
}
