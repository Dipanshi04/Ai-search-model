import { useState } from 'react';
import { api } from '../lib/api';

export default function RunnerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await api.searchRunner(query.trim());
    if (res.success && res.data) {
      setResults(res.data);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, BIB number, or company..."
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center text-slate-400 py-8">Searching...</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center text-slate-400 py-8">No runners found</div>
      )}

      <div className="space-y-3">
        {results.map((runner) => (
          <div
            key={runner.id}
            className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              {runner.user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{runner.user?.name}</p>
              <p className="text-xs text-slate-400">
                BIB: {runner.bibNumber} · {runner.category?.replace('RUN_', '').replace('_', ' ')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white">{runner.totalDistance?.toFixed(2) || '0.00'} km</p>
              <span className={`text-xs ${
                runner.status === 'RUNNING' ? 'text-amber-400' :
                runner.status === 'FINISHED' ? 'text-emerald-400' :
                'text-slate-400'
              }`}>
                {runner.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}