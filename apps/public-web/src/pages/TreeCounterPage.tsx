import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function TreeCounterPage() {
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreeCounter();
  }, []);

  async function loadTreeCounter() {
    const res = await api.getTreeCounter();
    if (res.success) setTreeData(res.data);
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-4">Green Mission</h1>
      <p className="text-slate-400 mb-12">
        Every kilometer run during the ISA Tech Marathon contributes to planting trees.
        Together, we're making a real impact on the environment.
      </p>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-green-500/10 p-8 rounded-2xl border border-green-500/20 text-center">
            <p className="text-6xl font-bold text-green-400 mb-2">{treeData?.totalTrees || 0}</p>
            <p className="text-slate-300">Trees Planted</p>
          </div>
          <div className="bg-emerald-500/10 p-8 rounded-2xl border border-emerald-500/20 text-center">
            <p className="text-6xl font-bold text-emerald-400 mb-2">{treeData?.totalKm?.toFixed(0) || 0}</p>
            <p className="text-slate-300">Kilometers Run</p>
          </div>
          <div className="bg-teal-500/10 p-8 rounded-2xl border border-teal-500/20 text-center">
            <p className="text-6xl font-bold text-teal-400 mb-2">{treeData?.totalCO2?.toFixed(0) || 0}</p>
            <p className="text-slate-300">kg CO2 Offset</p>
          </div>
        </div>
      )}

      <div className="mt-12 bg-slate-800 p-8 rounded-2xl border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
        <div className="space-y-4 text-slate-300">
          <p>For every kilometer run by participants, our partners plant a tree in your name.</p>
          <p>The tree counter updates in real-time as runners complete their journey.</p>
          <p>After the marathon, you'll receive a certificate with the number of trees planted on your behalf.</p>
        </div>
      </div>
    </div>
  );
}