import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';
import Footer from '../components/Footer';

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
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      loadProfile();
      loadParticipants();
      loadEvent();
    }
  }, [token, page]);

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
      const res = await api.hrGetParticipants({ page, limit: 15 });
      if (res.success && res.data) {
        setParticipants(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
        }
      }
    } catch (e) { console.error(e); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginState('loading'); setError('');
    try {
      const res = await api.hrLogin(loginEmail, loginPassword);
      if (res.success && res.data?.token) {
        setLoginState('success');
        await new Promise(r => setTimeout(r, 1200));
        localStorage.setItem('hr_token', res.data.token);
        setToken(res.data.token);
        setLoginState('idle');
      } else {
        setError(res.message || 'Login failed');
        setLoginState('idle');
      }
    } catch (err: any) { setError(err.message || 'Login failed'); setLoginState('idle'); }
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
        setPage(1);
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
        setPage(1);
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
      <div className="min-h-screen bg-brand-cream flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-sm border border-brand-navy/10">
          <div className="flex justify-center mb-6">
            <img src={logoDark} alt="ISA Marathon" className="h-40" />
          </div>
          <h1 className="hero-title text-2xl font-bold text-brand-navy text-center mb-1">HR Portal</h1>
          <p className="hero-body text-center text-brand-navy/60 text-sm mb-6">Bulk Registration Login</p>
          {error && <div className="hero-body bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-cream border border-brand-navy/15 rounded-xl text-brand-navy text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
                placeholder="hr@company.com" />
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Password</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-cream border border-brand-navy/15 rounded-xl text-brand-navy text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
                placeholder="Password" />
            </div>
            <button
              type="submit"
              disabled={loginState !== 'idle'}
              className={`w-full h-12 rounded-xl text-base font-bold text-white transition-all duration-300 ease-in-out overflow-hidden ${
                loginState === 'idle'
                  ? 'bg-brand-orange hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]'
                  : loginState === 'loading'
                  ? 'bg-brand-navy/70 w-12 rounded-full cursor-wait'
                  : 'bg-emerald-500 w-12 rounded-full'
              }`}
            >
              {loginState === 'idle' && <span>Sign In</span>}
              {loginState === 'loading' && (
                <svg className="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loginState === 'success' && (
                <svg className="h-5 w-5 mx-auto text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-check" />
                </svg>
              )}
            </button>
          </form>
          <p className="hero-body text-center text-sm text-brand-navy/60 mt-4">
            <a href="/hr-forgot-password" className="text-brand-navy hover:text-brand-orange underline transition">Forgot Password?</a>
          </p>
        </div>
      </div>
      <Footer />
      </div>
    );
  }

  return (
    <div className="h-screen bg-brand-cream flex flex-col lg:flex-row overflow-hidden">
      <aside className="w-full lg:w-72 bg-white flex flex-col border-b lg:border-b-0 lg:border-r border-brand-navy/10 shrink-0 lg:h-full lg:overflow-y-auto">
        <div className="px-4 lg:px-5 py-3 lg:py-5 border-b border-brand-navy/10 flex items-center justify-between">
          <a href="/" className="flex justify-center">
            <img src={logoDark} alt="ISA Marathon" className="h-10 lg:h-20 w-auto max-w-[140px] lg:max-w-[200px] object-contain" />
          </a>
          <button onClick={handleLogout} className="lg:hidden hero-body text-sm font-semibold text-brand-navy/50 hover:text-red-500 transition shrink-0">
            Logout
          </button>
        </div>
        <nav className="flex lg:flex-col lg:flex-1 gap-2 p-3 lg:p-4 overflow-x-auto lg:overflow-visible">
          {([['dashboard', 'Participants'], ['add', 'Add Single'], ['csv', 'CSV Upload']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key as Tab); setError(''); setSuccess(''); setCsvResult(null); }}
              className={`hero-body w-full lg:w-full flex items-center justify-center lg:justify-start gap-3 rounded-3xl px-4 py-2.5 lg:py-3 text-sm font-medium transition whitespace-nowrap shrink-0 ${tab === key ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-navy/60 hover:text-brand-navy hover:bg-brand-navy/5'}`}>
              {label}
            </button>
          ))}
        </nav>
        <div className="hidden lg:block p-4 border-t border-brand-navy/10 bg-brand-cream">
          <div className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 shadow-sm border border-brand-navy/10">
            <div className="w-10 h-10 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy text-sm font-bold shrink-0">
              {profile?.hrName?.charAt(0) || 'H'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="hero-body text-sm text-brand-navy truncate">{profile?.hrName}</p>
              <p className="hero-body text-xs text-brand-navy/50 truncate">{profile?.companyName}</p>
            </div>
            <button onClick={handleLogout} className="hero-body text-sm font-semibold text-brand-navy/50 hover:text-red-500 transition shrink-0">Logout</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mb-8">
            <h1 className="hero-title text-2xl font-bold text-brand-navy">
              {tab === 'dashboard' && 'Participants'}
              {tab === 'add' && 'Register Participant'}
              {tab === 'csv' && 'Bulk Upload'}
            </h1>
            <p className="hero-body text-brand-navy/60 text-sm mt-1">
              {tab === 'dashboard' && `${total} registered`}
              {tab === 'add' && 'Add a single participant'}
              {tab === 'csv' && 'Upload a CSV file to register multiple participants'}
            </p>
          </div>

          {profile && tab === 'dashboard' && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-navy/10">
                <p className="hero-title text-3xl font-bold text-brand-navy">{profile.numberOfRegistrations}</p>
                <p className="hero-body text-xs text-brand-navy/50 mt-1">Total Slots</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-navy/10">
                <p className="hero-title text-3xl font-bold text-brand-navy">{profile.usedRegistrations}</p>
                <p className="hero-body text-xs text-brand-navy/50 mt-1">Used</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-navy/10">
                <p className="hero-title text-3xl font-bold text-brand-orange">{profile.remainingRegistrations}</p>
                <p className="hero-body text-xs text-brand-navy/50 mt-1">Remaining</p>
              </div>
            </div>
          )}

          {currentEvent && (
            <div className="hero-body mb-6 px-4 py-3 bg-brand-orange/10 border border-brand-orange/30 rounded-xl text-sm text-brand-orange font-medium">
              Registering for: {currentEvent.name}
            </div>
          )}

          {error && <div className="hero-body bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
          {success && <div className="hero-body bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>}

          {tab === 'dashboard' && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-brand-navy/10">
              <div className="hero-body px-4 py-3 border-b border-brand-navy/10 flex items-center justify-between">
                <p className="text-sm text-brand-navy/50">{total} participants</p>
                <p className="text-sm text-brand-navy/50">Page {page} of {totalPages}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="hero-body w-full text-sm">
                  <thead className="bg-brand-cream">
                    <tr>
                      <th className="text-left px-4 py-3 text-brand-navy/50 font-semibold">BIB</th>
                      <th className="text-left px-4 py-3 text-brand-navy/50 font-semibold">Name</th>
                      <th className="text-left px-4 py-3 text-brand-navy/50 font-semibold">Email</th>
                      <th className="text-left px-4 py-3 text-brand-navy/50 font-semibold">Phone</th>
                      <th className="text-center px-4 py-3 text-brand-navy/50 font-semibold">Category</th>
                      <th className="text-center px-4 py-3 text-brand-navy/50 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map(p => (
                      <tr key={p.id} className="border-t border-brand-navy/5 hover:bg-brand-cream transition-colors">
                        <td className="hero-tabular px-4 py-3 font-bold text-brand-orange">{p.bibNumber}</td>
                        <td className="px-4 py-3 text-brand-navy">{p.user.name}</td>
                        <td className="px-4 py-3 text-brand-navy/70">{p.user.email}</td>
                        <td className="px-4 py-3 text-brand-navy/70">{p.user.phone}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-navy/10 text-brand-navy">
                            {p.category === 'RUN_5K' ? '5K' : '3K'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'REGISTERED' ? 'bg-brand-navy/10 text-brand-navy' :
                            p.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'RUNNING' ? 'bg-amber-100 text-amber-700' :
                            p.status === 'FINISHED' ? 'bg-brand-orange/10 text-brand-orange' :
                            'bg-brand-navy/10 text-brand-navy'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                    {participants.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-navy/50">No participants registered yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="hero-body px-4 py-3 border-t border-brand-navy/10 flex items-center justify-end gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="px-4 py-2 bg-brand-cream hover:bg-brand-navy/10 border border-brand-navy/15 rounded-xl text-sm text-brand-navy disabled:opacity-50 transition">Previous</button>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="px-4 py-2 bg-brand-cream hover:bg-brand-navy/10 border border-brand-navy/15 rounded-xl text-sm text-brand-navy disabled:opacity-50 transition">Next</button>
                </div>
              )}
            </div>
          )}

          {tab === 'add' && (
            <div className="w-full bg-white rounded-2xl shadow-sm border border-brand-navy/10 overflow-hidden">
              <form onSubmit={handleAddParticipant}>
                <div className="px-10 py-6 border-b border-brand-navy/10">
                  <h2 className="hero-title text-2xl font-bold text-brand-orange">Personal Info</h2>
                </div>
                <div className="hero-body px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-7">
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Name</span>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0" placeholder="Jonathan Webster" />
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Email</span>
                    <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0" placeholder="john@company.com" />
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Phone</span>
                    <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0" placeholder="+91 98765 43210" />
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Gender</span>
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0 bg-white">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Distance</span>
                    <div className="flex flex-1">
                      {(['RUN_3K', 'RUN_5K'] as const).map(cat => (
                        <button key={cat} type="button" onClick={() => setForm({...form, category: cat})}
                          className={`flex-1 px-6 text-base font-semibold transition ${form.category === cat ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-navy/50 hover:bg-brand-cream'}`}>
                          {cat === 'RUN_3K' ? '3K Fun Run' : '5K Challenge'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">T-Shirt</span>
                    <select value={form.tshirtSize} onChange={e => setForm({...form, tshirtSize: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0 bg-white">
                      {['S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="px-10 py-6 border-y border-brand-navy/10">
                  <h2 className="hero-title text-2xl font-bold text-brand-orange">Additional Info</h2>
                  <p className="hero-body text-sm text-brand-navy/40 mt-1">Optional — used for race day safety</p>
                </div>
                <div className="hero-body px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-7">
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Blood</span>
                    <select value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0 bg-white">
                      <option value="">Select blood group</option>
                      {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Contact</span>
                    <input value={form.emergencyContact} onChange={e => setForm({...form, emergencyContact: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0" placeholder="Emergency contact name" />
                  </div>
                  <div className="flex items-stretch border border-brand-navy/15 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange bg-white lg:col-span-2">
                    <span className="px-6 py-4 bg-brand-cream text-brand-navy/60 text-base border-r border-brand-navy/10 shrink-0 flex items-center">Phone</span>
                    <input value={form.emergencyPhone} onChange={e => setForm({...form, emergencyPhone: e.target.value})}
                      className="flex-1 px-5 py-4 text-brand-navy text-base outline-none min-w-0" placeholder="Emergency contact phone" />
                  </div>
                </div>

                <div className="px-10 py-6 bg-brand-cream border-t border-brand-navy/10 flex justify-end gap-3">
                  <button type="button" onClick={() => setForm(emptyForm)}
                    className="hero-body px-8 py-3.5 rounded-xl text-base font-semibold text-brand-navy bg-white border border-brand-navy/20 hover:bg-brand-navy/5 transition">
                    Reset
                  </button>
                  <button type="submit" disabled={loading || (profile?.remainingRegistrations ?? 0) <= 0}
                    className="px-10 py-3.5 rounded-xl text-base font-bold text-white bg-brand-orange hover:opacity-90 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? 'Registering...' : 'Register Participant'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'csv' && (
            <div className="bg-white rounded-2xl shadow-sm border border-brand-navy/10 w-full overflow-hidden">
              <div className="px-8 py-5 border-b border-brand-navy/10">
                <h2 className="hero-title text-lg font-bold text-brand-navy">Bulk Upload via CSV</h2>
              </div>
              <div className="hero-body px-8 py-7">
                <p className="text-sm text-brand-navy/70 mb-2">CSV must have columns: <strong>name, email, phone, category, gender, tshirtSize. Accepted categories: RUN_3K, RUN_5K</strong>.</p>

                <form onSubmit={handleCSVUpload} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-brand-navy/70 mb-2">Upload File</label>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-brand-navy/70 bg-brand-cream border border-brand-navy/15 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-brand-orange file:text-white file:cursor-pointer cursor-pointer file:rounded-md file:m-1.5" />
                  </div>
                  <button type="button" onClick={() => api.hrDownloadSampleCSV()}
                    className="text-sm font-semibold text-brand-orange hover:opacity-80 transition">
                    Download Sample CSV →
                  </button>
                  {csvFile && <p className="text-sm text-brand-navy/70">Selected: <strong className="text-brand-navy">{csvFile.name}</strong></p>}
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setCsvFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="px-6 py-3 rounded-lg text-sm font-semibold text-brand-navy bg-white border border-brand-navy/20 hover:bg-brand-navy/5 transition">
                      Clear
                    </button>
                    <button type="submit" disabled={loading || !csvFile}
                      className="px-8 py-3 rounded-lg text-sm font-bold text-white bg-brand-orange hover:opacity-90 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      {loading ? 'Uploading...' : 'Upload & Register'}
                    </button>
                  </div>
                </form>

                {csvResult && (
                  <div className="mt-8 space-y-3">
                    <div className="flex gap-3 text-sm">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">Created: {csvResult.created}</span>
                      {csvResult.failed > 0 && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">Failed: {csvResult.failed}</span>}
                      <span className="px-3 py-1 rounded-full bg-brand-navy/10 text-brand-navy font-medium">Total: {csvResult.total}</span>
                    </div>
                    {csvResult.results && (
                      <div className="bg-brand-cream rounded-xl overflow-hidden max-h-64 overflow-y-auto border border-brand-navy/10">
                        <table className="w-full text-xs">
                          <thead className="bg-white/80 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2">Name</th>
                              <th className="text-left px-3 py-2">Email</th>
                              <th className="text-left px-3 py-2">BIB</th>
                              <th className="text-left px-3 py-2">PIN</th>
                              <th className="text-left px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvResult.results.map((r: any, i: number) => (
                              <tr key={i} className="border-t border-brand-navy/5">
                                <td className="px-3 py-2 text-brand-navy">{r.name}</td>
                                <td className="px-3 py-2 text-brand-navy/70">{r.email}</td>
                                <td className="px-3 py-2 font-mono font-bold text-brand-navy">{r.bibNumber || '-'}</td>
                                <td className="px-3 py-2 font-mono font-bold text-brand-orange">
                                  {r.success ? (r.pin || 'Already set') : '-'}
                                </td>
                                <td className="px-3 py-2">
                                  {r.success ? <span className="text-emerald-700 font-medium">Success</span> : <span className="text-red-600">{r.error}</span>}
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
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
}
