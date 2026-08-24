import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface HrProfile {
  id: string;
  companyName: string;
  hrName: string;
  hrEmail: string;
  numberOfRegistrations: number;
  usedRegistrations: number;
  remainingRegistrations: number;
  paymentCompleted: boolean;
}

interface Participant {
  id: string;
  bibNumber: string;
  category: string;
  gender: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: { name: string; email: string; phone: string };
}

const emptyForm = {
  name: '', email: '', phone: '', category: 'RUN_3K', gender: 'MALE',
  emergencyContact: '', emergencyPhone: '', bloodGroup: '', tshirtSize: 'M',
};

type Tab = 'dashboard' | 'add' | 'csv';

interface CurrentEvent {
  id: string;
  name: string;
  status: string;
  date: string;
  registrationOpen: boolean;
}

export default function HRPortalPage() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('hr_token'));
  const [profile, setProfile] = useState<HrProfile | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      loadProfile();
      loadParticipants();
      loadEvent();
    }
  }, [token]);

  async function loadProfile() {
    try {
      const res = await api.hrGetMe();
      if (res.success) setProfile(res.data);
      else { setToken(null); localStorage.removeItem('hr_token'); }
    } catch { setToken(null); localStorage.removeItem('hr_token'); }
  }

  async function loadEvent() {
    try {
      const res = await api.hrGetCurrentEvent();
      if (res.success) setCurrentEvent(res.data);
    } catch {}
  }

  async function loadParticipants() {
    try {
      const res = await api.hrGetParticipants();
      if (res.success && res.data) setParticipants(res.data);
    } catch (e) { console.error(e); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.hrLogin(loginEmail, loginPassword);
      if (res.success && res.data?.token) {
        localStorage.setItem('hr_token', res.data.token);
        setToken(res.data.token);
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) { setError(err.message || 'Login failed'); }
    setLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem('hr_token');
    setToken(null);
    setProfile(null);
    setParticipants([]);
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await api.hrAddParticipant({ ...form, eventId: currentEvent?.id });
      if (res.success) {
        setSuccess('Registered! BIB: ' + res.data.bibNumber);
        setForm(emptyForm);
        loadProfile();
        loadParticipants();
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err: any) { setError(err.message || 'Registration failed'); }
    setLoading(false);
  }

  async function handleCSVUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) { setError('Please select a CSV file'); return; }
    setLoading(true); setError(''); setCsvResult(null);
    try {
      const res = await api.hrUploadCSV(csvFile);
      if (res.success) {
        setCsvResult(res.data);
        loadProfile();
        loadParticipants();
      } else {
        setError(res.message || 'Upload failed');
      }
    } catch (err: any) { setError(err.message || 'Upload failed'); }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="bg-marathon min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-3xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-black text-slate-800 text-center mb-1">HR Portal</h1>
          <p className="text-center text-slate-600 text-sm mb-6">Bulk Registration Login</p>
          {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none"
                placeholder="hr@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none"
                placeholder="Password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 white-btn rounded-xl text-base font-medium disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-marathon min-h-screen">
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">{profile?.companyName || 'HR Portal'}</h1>
            <p className="text-white/60 text-xs">{profile?.hrName} ({profile?.hrEmail})</p>
            {currentEvent && (
              <p className="text-emerald-400 text-xs font-medium mt-0.5">Registering for: {currentEvent.name}</p>
            )}
          </div>
          <button onClick={handleLogout} className="text-white/60 hover:text-white text-sm font-medium">Logout</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {profile && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-strong rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-slate-800">{profile.numberOfRegistrations}</p>
              <p className="text-xs text-slate-600">Total Slots</p>
            </div>
            <div className="glass-strong rounded-2xl p-4 text-center">
              <p className="text-3xl font-black oklch(0 0 0)">{profile.usedRegistrations}</p>
              <p className="text-xs text-slate-600">Used</p>
            </div>
            <div className="glass-strong rounded-2xl p-4 text-center">
              <p className="text-3xl font-black oklch(0 0 0)">{profile.remainingRegistrations}</p>
              <p className="text-xs text-slate-600">Remaining</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {([['dashboard', 'Participants'], ['add', 'Add Single'], ['csv', 'CSV Upload']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(''); setSuccess(''); setCsvResult(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === key ? 'bg-slate-800 text-white' : 'glass-dark text-slate-700 hover:bg-white/60'}`}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
        {success && <div className="bg-emerald-100 border border-emerald-300 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>}

        {tab === 'dashboard' && (
          <div className="glass-strong rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/80">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">BIB</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Phone</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-semibold">Category</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id} className="border-t border-slate-200/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.bibNumber}</td>
                    <td className="px-4 py-3 text-slate-800">{p.user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{p.user.phone}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {p.category === 'RUN_5K' ? '5K' : '3K'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No participants registered yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'add' && (
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Register Participant</h2>
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none" placeholder="Name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none" placeholder="Email" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone *</label>
                  <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none" placeholder="Phone" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gender *</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-Binary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Distance *</label>
                  <div className="flex gap-2">
                    {(['RUN_3K', 'RUN_5K'] as const).map(cat => (
                      <button key={cat} type="button" onClick={() => setForm({...form, category: cat})}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition ${form.category === cat ? 'border-slate-800 bg-slate-800/10' : 'border-slate-300 bg-white/50'}`}>
                        {cat === 'RUN_3K' ? '3K' : '5K'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">T-Shirt Size</label>
                  <select value={form.tshirtSize} onChange={e => setForm({...form, tshirtSize: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none">
                    {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none">
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Emergency Contact</label>
                  <input value={form.emergencyContact} onChange={e => setForm({...form, emergencyContact: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Emergency Phone</label>
                  <input value={form.emergencyPhone} onChange={e => setForm({...form, emergencyPhone: e.target.value})}
                    className="w-full px-4 py-2.5 glass-dark rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-slate-800 outline-none" placeholder="Optional" />
                </div>
              </div>
              <button type="submit" disabled={loading || (profile?.remainingRegistrations ?? 0) <= 0}
                className="w-full py-3 white-btn rounded-xl text-base font-medium disabled:opacity-50">
                {loading ? 'Registering...' : 'Register Participant'}
              </button>
            </form>
          </div>
        )}

        {tab === 'csv' && (
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-bold oklch(0 0 0) mb-2">Bulk Upload via CSV</h2>
            <p className="text-sm oklch(0 0 0) mb-2">
              CSV must have columns: name, email, phone, category, gender.
              Optional: emergencyContact, emergencyPhone, bloodGroup, tshirtSize.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Accepted categories: <strong>RUN_3K</strong>, <strong>RUN_5K</strong>, STUDENT, PROFESSIONAL, GENERAL, 3K, 5K, FUN, CHALLENGE
            </p>
            <button type="button" onClick={() => api.hrDownloadSampleCSV()}
              className="mb-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-medium transition">
              Download Sample CSV
            </button>
            <form onSubmit={handleCSVUpload} className="space-y-4">
              <div>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-700" />
              </div>
              {csvFile && (
                <p className="text-sm oklch(0 0 0)">Selected: <strong>{csvFile.name}</strong></p>
              )}
              <button type="submit" disabled={loading || !csvFile}
                className="w-full py-3 white-btn rounded-xl text-base font-medium disabled:opacity-50">
                {loading ? 'Uploading...' : 'Upload & Register'}
              </button>
            </form>

            {csvResult && (
              <div className="mt-6 space-y-3">
                <div className="flex gap-4 text-sm">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    Created: {csvResult.created}
                  </span>
                  {csvResult.failed > 0 && (
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                      Failed: {csvResult.failed}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                    Total: {csvResult.total}
                  </span>
                </div>
                {csvResult.results && (
                  <div className="glass-dark rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white/80 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">Name</th>
                          <th className="text-left px-3 py-2">Email</th>
                          <th className="text-left px-3 py-2">BIB</th>
                          <th className="text-left px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvResult.results.map((r: any, i: number) => (
                          <tr key={i} className="border-t border-slate-200/50">
                            <td className="px-3 py-2 text-slate-800">{r.name}</td>
                            <td className="px-3 py-2 text-slate-600">{r.email}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">{r.bibNumber || '-'}</td>
                            <td className="px-3 py-2">
                              {r.success ? (
                                <span className="text-emerald-700 font-medium">Success</span>
                              ) : (
                                <span className="text-red-600">{r.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
