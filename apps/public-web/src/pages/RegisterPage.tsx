import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';

declare global {
  interface Window {
    Cashfree: (opts: { mode: 'sandbox' | 'production' }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget: '_self' }) => void;
    };
  }
}

const CATEGORY_FEES = {
  RUN_3K: { label: '3K Fun Run', amount: 299 },
  RUN_5K: { label: '5K Challenge', amount: 499 },
} as const;

type CategoryKey = keyof typeof CATEGORY_FEES;

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'RUN_3K',
    gender: 'MALE',
    companyId: '',
    emergencyContact: '',
    emergencyPhone: '',
    bloodGroup: '',
    bloodDonation: false,
    tshirtSize: 'M',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [showTACModal, setShowTACModal] = useState(false);
  const [tacAccepted, setTacAccepted] = useState(false);
  const [tacScrolledToBottom, setTacScrolledToBottom] = useState(false);
  const tacContentRef = useRef<HTMLDivElement>(null);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getCompanies().then((res) => {
      if (res.success && res.data) setCompanies(res.data);
    }).catch(() => {});
  }, []);

  // Client-side filter only — the full list is already fetched once above,
  // no per-keystroke API calls.
  const filteredCompanies = companySearch.trim()
    ? companies.filter((c) => c.name.toLowerCase().includes(companySearch.trim().toLowerCase()))
    : companies;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (companyFieldRef.current && !companyFieldRef.current.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleTacScroll = () => {
    const el = tacContentRef.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
      if (atBottom && !tacScrolledToBottom) {
        setTacScrolledToBottom(true);
      }
    }
  };

  const handleAcceptTAC = async () => {
    if (!tacScrolledToBottom) return;
    setTacAccepted(true);
    setShowTACModal(false);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacAccepted) {
      setError('Please read and agree to the Terms & Conditions before registering.');
      return;
    }
    await handleFormSubmit();
  };

  useEffect(() => {
    if (!document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleFormSubmit = async () => {
    setLoading(true);
    setError('');

    // companyId is only trusted if the visible search text still exactly
    // matches the company it was picked from — editing the text after
    // picking (or never picking at all) means they're naming a new company
    // instead, sent as companyName.
    const { companyId, ...rest } = form;
    const pickedCompany = companies.find((c) => c.id === companyId);
    const payload = pickedCompany && pickedCompany.name === companySearch.trim()
      ? { ...rest, companyId }
      : { ...rest, companyName: companySearch.trim() };

    const res = await api.register(payload);
    if (res.success) {
      setResult(res.data);
      // Only ever available in this one response — the PIN is bcrypt-hashed
      // server-side immediately after this and the plaintext is discarded.
      // Stashed here so the post-payment confirmation page can show it.
      if (res.data?.pin) {
        sessionStorage.setItem('isa_runner_pin', res.data.pin);
      }
      // Best-effort — a failed photo upload shouldn't block registration
      // itself, since a photo can always be added later from the Runner App.
      const userId = res.data?.participant?.userId;
      if (photo && userId) {
        api.uploadRegistrationPhoto(userId, form.email, photo).catch(() => {});
      }
      setStep('payment');
    } else {
      setError(res.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const res = await api.validateCoupon(code);
      if (res.success && res.data) {
        setCouponApplied(res.data);
      } else {
        setCouponApplied(null);
        setCouponError(res.message || 'Invalid or expired coupon code');
      }
    } catch {
      setCouponApplied(null);
      setCouponError('Network error. Please try again.');
    }
    setCouponChecking(false);
  };

  // Active payment path — Cashfree, a real gateway with a signed webhook,
  // so a payment completes automatically once it succeeds instead of
  // waiting on an admin to reconcile a sales report. See routes/cashfree.ts.
  const handlePayCashfree = async () => {
    setPaymentLoading(true);
    setError('');

    const participantId = result?.participant?.id;
    if (!participantId) {
      setError('Participant not found');
      setPaymentLoading(false);
      return;
    }

    const res = await api.startCashfreePayment(participantId, couponApplied?.code);
    if (!res.success || !res.data?.paymentSessionId) {
      setError(res.message || 'Failed to start payment. Please try again.');
      setPaymentLoading(false);
      return;
    }

    if (!window.Cashfree) {
      setError('Payment gateway is still loading. Please try again in a moment.');
      setPaymentLoading(false);
      return;
    }

    // /details finds its way back to this order via the cf_order_id query
    // param Cashfree appends to our return_url — nothing to stash here.
    const cashfree = window.Cashfree({ mode: res.data.environment });
    cashfree.checkout({ paymentSessionId: res.data.paymentSessionId, redirectTarget: '_self' });
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col relative">
      <div className="hero-grain" />
      <PageHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white border border-brand-navy/10 shadow-sm p-8 sm:p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h2 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-4">
            Registration Complete!
          </h2>
          <p className="hero-body text-brand-navy/70 mb-6 sm:mb-8 text-base sm:text-lg">Welcome, {result.participant?.user?.name}</p>

          <div className="rounded-2xl p-5 sm:p-6 mb-4" style={{ background: '#1B2A5B' }}>
            <p className="hero-body text-xs uppercase tracking-wide font-bold mb-2" style={{ color: '#F5821F' }}>Your BIB Number</p>
            <p className="hero-tabular text-3xl sm:text-4xl font-black text-white tracking-wider">{result.participant?.bibNumber || result.bibNumber}</p>
          </div>

          <div className="bg-brand-cream border border-brand-navy/10 rounded-2xl p-5 sm:p-6 mb-4">
            <p className="hero-body text-sm text-brand-navy/60 mb-2">Your 4-Digit Login PIN</p>
            <p className="hero-title text-2xl sm:text-3xl font-bold text-emerald-600 tracking-widest">Sent to Email</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <p className="hero-body text-emerald-700 text-sm">Payment confirmed! You're all set for race day.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-left">
            <p className="hero-body text-emerald-800 text-sm font-semibold mb-1">Check your email for your PIN</p>
            <p className="hero-body text-emerald-700 text-xs">Use your email and the 4-digit PIN sent to you to log into the Runner App at <strong>localhost:3001</strong>.</p>
          </div>

          <p className="hero-body text-xs text-brand-navy/50 mb-6">
            Save this BIB number. You will need it for check-in on race day.
          </p>
          <a href="/" className="inline-block bg-brand-orange text-white hover:opacity-90 transition px-6 sm:px-8 py-3 rounded-xl text-base font-bold">
            Back to Home
          </a>
        </div>
      </div>
      <Footer />
      </div>
    );
  }

  if (step === 'payment') {
    const payCategory: CategoryKey = result?.participant?.category === 'RUN_5K' ? 'RUN_5K' : 'RUN_3K';
    const categoryFee = CATEGORY_FEES[payCategory];
    const baseAmount = categoryFee?.amount || 299;
    // Premium-company discount shows here, on the payment step itself —
    // not on the registration form — matching what cashfree.ts actually
    // charges. If a coupon is also entered, the runner gets whichever
    // discount is bigger (never both stacked), same rule the server
    // re-enforces independently at checkout.
    const isPremiumCompany = result?.participant?.company?.status === 'PREMIUM';
    const premiumPercent = isPremiumCompany ? 50 : 0;
    const effectivePercent = couponApplied ? Math.max(couponApplied.discountPercent, premiumPercent) : premiumPercent;
    const discountLabel = couponApplied && couponApplied.discountPercent >= premiumPercent
      ? `Coupon ${couponApplied.code} (${couponApplied.discountPercent}% off)`
      : isPremiumCompany
        ? 'Premium Member Discount (50% off)'
        : null;
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col relative">
      <div className="hero-grain" />
      <PageHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white border border-brand-navy/10 shadow-sm p-8 sm:p-10 rounded-3xl max-w-md w-full relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy">Complete Payment</h2>
          </div>

          {error && (
            <div className="hero-body bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          <div className="hero-body bg-brand-cream border border-brand-navy/10 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 space-y-3">
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Name</span>
              <span className="text-brand-navy font-medium">{result.participant?.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-navy/60">BIB Number</span>
              <span className="hero-tabular text-brand-navy font-bold">{result.participant?.bibNumber || result.bibNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Category</span>
              <span className="text-brand-navy">{categoryFee?.label || result.participant?.category}</span>
            </div>
            {effectivePercent > 0 ? (
              <>
                <div className="flex justify-between border-t border-brand-navy/10 pt-3 mt-3">
                  <span className="text-brand-navy/60">Subtotal</span>
                  <span className="text-brand-navy">Rs. {baseAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">{discountLabel}</span>
                  <span className="text-emerald-600">
                    − Rs. {Math.round(baseAmount * effectivePercent / 100)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-brand-navy/10 pt-3">
                  <span className="text-brand-navy font-medium">Amount</span>
                  <span className="hero-title text-2xl sm:text-3xl font-bold text-brand-orange">
                    Rs. {Math.round(baseAmount * (1 - effectivePercent / 100))}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between border-t border-brand-navy/10 pt-3 mt-3">
                <span className="text-brand-navy font-medium">Amount</span>
                <span className="hero-title text-2xl sm:text-3xl font-bold text-brand-orange">Rs. {baseAmount}</span>
              </div>
            )}
          </div>

          <div className="mb-6 sm:mb-8">
            <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1.5">Have a coupon code?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                disabled={!!couponApplied}
                placeholder="e.g. ISA10"
                className="flex-1 px-3 py-2.5 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition disabled:opacity-60"
              />
              {couponApplied ? (
                <button
                  type="button"
                  onClick={() => { setCouponApplied(null); setCouponInput(''); }}
                  className="px-4 py-2.5 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-semibold hover:bg-brand-navy/5 transition"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponChecking || !couponInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {couponChecking ? 'Checking...' : 'Apply'}
                </button>
              )}
            </div>
            {couponError && <p className="text-xs text-red-600 mt-1.5">{couponError}</p>}
            {couponApplied && <p className="text-xs text-emerald-600 mt-1.5">Coupon applied — {couponApplied.discountPercent}% off.</p>}
          </div>

          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={handlePayCashfree}
              disabled={paymentLoading}
              className="w-full py-3 sm:py-4 bg-brand-orange text-white hover:opacity-90 disabled:opacity-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-base sm:text-lg"
            >
              {paymentLoading ? 'Redirecting...' : 'Pay Now'}
            </button>
            <button
              onClick={() => { setStep('form'); setError(''); }}
              disabled={paymentLoading}
              className="w-full py-3 sm:py-4 border border-brand-navy/20 hover:bg-brand-navy/5 disabled:opacity-50 text-brand-navy font-medium rounded-xl transition-all"
            >
              Back to Form
            </button>
          </div>

          <p className="hero-body text-xs text-brand-navy/50 text-center mt-5 sm:mt-6">
            You'll be taken to our secure checkout partner, Cashfree, to complete payment.
          </p>
        </div>
      </div>
      <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col relative">
    <div className="hero-grain" />
    <PageHeader />
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-3xl">
        <form onSubmit={handleSubmitForm} className="bg-white border border-brand-navy/10 shadow-sm rounded-3xl p-5 sm:p-6 sm:p-8">
          <div className="text-center mb-4">
            <h1 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-1">
              Register for ISA Marathon
            </h1>
            <p className="hero-body text-brand-navy/60 text-sm">Fill in your details to join the race</p>
          </div>

          {error && (
            <div className="hero-body bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                placeholder="Email"
              />
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                placeholder="Phone"
              />
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Your Photo (optional)</label>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-12 h-12 rounded-full object-cover border border-brand-navy/15 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-cream border border-brand-navy/15 flex items-center justify-center shrink-0 text-brand-navy/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
                  </div>
                )}
                <label className="cursor-pointer px-3 py-2 rounded-lg border border-brand-navy/15 text-xs font-semibold text-brand-navy hover:bg-brand-cream transition">
                  {photo ? 'Change photo' : 'Add photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPhoto(file);
                      setPhotoPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                </label>
              </div>
              <p className="hero-body text-[11px] text-brand-navy/40 mt-1">You can also add or change this later from the Runner App.</p>
            </div>
            <div className="relative" ref={companyFieldRef}>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Company</label>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setForm({ ...form, companyId: '' });
                  setCompanyDropdownOpen(true);
                }}
                onFocus={() => setCompanyDropdownOpen(true)}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                placeholder="Search or type your company"
                autoComplete="off"
              />
              {companyDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-brand-navy/15 rounded-lg shadow-lg">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.slice(0, 50).map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setForm({ ...form, companyId: c.id });
                          setCompanySearch(c.name);
                          setCompanyDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-brand-navy hover:bg-brand-orange/10 transition"
                      >
                        {c.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-brand-navy/50">No match — your typed name will be added as a new company.</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Emergency Contact Name</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                placeholder="Optional — e.g. spouse, parent, friend"
              />
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Emergency Contact Phone</label>
              <input
                type="tel"
                value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Blood Group</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="hero-body flex items-center gap-3 bg-brand-cream border border-brand-navy/10 rounded-lg px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.bloodDonation}
                onChange={(e) => setForm({ ...form, bloodDonation: e.target.checked })}
                className="w-4 h-4 rounded border-brand-navy/30 text-brand-orange focus:ring-brand-orange"
              />
              <span className="text-sm text-brand-navy/80">I am interested in blood donation</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Distance *</label>
              <div className="flex gap-2">
                <label
                  className={`flex-1 flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    form.category === 'RUN_3K'
                      ? 'border-brand-orange bg-brand-orange/10'
                      : 'border-brand-navy/15 bg-white hover:border-brand-navy/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value="RUN_3K"
                    checked={form.category === 'RUN_3K'}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="sr-only"
                  />
                  <span className="hero-body text-brand-navy font-medium text-sm">3K</span>
                </label>
                <label
                  className={`flex-1 flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    form.category === 'RUN_5K'
                      ? 'border-brand-orange bg-brand-orange/10'
                      : 'border-brand-navy/15 bg-white hover:border-brand-navy/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value="RUN_5K"
                    checked={form.category === 'RUN_5K'}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="sr-only"
                  />
                  <span className="hero-body text-brand-navy font-medium text-sm">5K</span>
                </label>
              </div>
            </div>
            <div>
              <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">T-Shirt Size</label>
              <select
                value={form.tshirtSize}
                onChange={(e) => setForm({ ...form, tshirtSize: e.target.value })}
                className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
          </div>

          <label className="hero-body flex items-center gap-2 mb-3 cursor-pointer"
            onClick={() => setShowTACModal(true)}
          >
            <input
              type="checkbox"
              checked={tacAccepted}
              readOnly
              className="w-4 h-4 rounded border-brand-navy/30 text-brand-orange focus:ring-brand-orange"
            />
            <span className="text-xs text-brand-navy/70">
              I have read and agree to the{' '}
              <span className="text-brand-orange font-semibold underline">Terms & Conditions</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !tacAccepted}
            className="w-full py-3 bg-brand-orange text-white hover:opacity-90 font-bold rounded-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Register & Pay'}
          </button>
        </form>
      </div>

      {/* Terms & Conditions Modal */}
      {showTACModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-brand-navy/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="p-6 border-b border-brand-navy/10">
              <h2 className="hero-title text-2xl font-bold text-brand-navy">Terms & Conditions</h2>
              <p className="hero-body text-sm text-brand-navy/60 mt-1">Please read carefully before proceeding</p>
            </div>

            <div
              ref={tacContentRef}
              onScroll={handleTacScroll}
              className="hero-body flex-1 overflow-y-auto p-6 space-y-5 text-sm text-brand-navy/80"
            >
              <div>
                <h3 className="font-bold text-brand-orange mb-2">Payment Details</h3>
                <div className="bg-brand-cream border border-brand-navy/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-brand-navy/60">3K Fun Run - Registration Fee</span>
                    <span className="font-bold text-brand-navy">Rs. 299</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-navy/60">5K Challenge - Registration Fee</span>
                    <span className="font-bold text-brand-navy">Rs. 499</span>
                  </div>
                  <div className="border-t border-brand-navy/10 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-brand-navy/60">Payment Method</span>
                      <span className="text-brand-navy/60">Cashfree (secure external checkout)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-brand-orange mb-2">Payment Rules</h3>
                <ul className="space-y-2 list-disc list-inside text-brand-navy/80">
                  <li>Registration fee is non-refundable and non-transferable once payment is confirmed.</li>
                  <li>Payment must be completed within 15 minutes of starting the registration process.</li>
                  <li>Failed or duplicate transactions will be auto-reversed within 5-7 business days.</li>
                  <li>Each participant can register only once per category.</li>
                  <li>Multiple registrations for the same person will be cancelled.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-brand-orange mb-2">Cancellation Policy</h3>
                <ul className="space-y-2 list-disc list-inside text-brand-navy/80">
                  <li>Registration fees are strictly non-refundable and non-transferable, including for cancellations, no-shows, or inability to attend.</li>
                  <li>This applies regardless of when a cancellation request is made.</li>
                  <li>If the organizers postpone or cancel the event, registered participants will be notified of the applicable arrangements.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-brand-orange mb-2">Race Day Rules</h3>
                <ul className="space-y-2 list-disc list-inside text-brand-navy/80">
                  <li>Valid photo ID is required for check-in on race day.</li>
                  <li>BIB number must be visible at all times during the race.</li>
                  <li>Organizers reserve the right to disqualify participants for unsportsmanlike conduct.</li>
                  <li>Medical assistance will be available at designated points.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-brand-orange mb-2">Liability Waiver</h3>
                <p className="text-brand-navy/80">
                  By registering, I confirm that I am physically fit to participate in the marathon event.
                  I understand that running involves inherent risks including but not limited to falls,
                  contact with other participants, effects of weather, traffic, and road conditions.
                  I hereby release ISA Marathon organizers, sponsors, and volunteers from any and all
                  claims, damages, or liabilities arising from my participation in this event.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-brand-orange mb-2">Privacy Policy</h3>
                <p className="text-brand-navy/80">
                  Your personal information will be used solely for event management purposes.
                  Your data may be shared with race timing services and medical teams for safety.
                  Photos and videos taken during the event may be used for promotional purposes.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-brand-orange mb-2">Registered Business Details</h3>
                <p className="text-brand-navy/80">
                  Business Name: INDOTECH SOFTWARE ASSOCIATION
                  <br />
                  Business Address: 4th Floor, B Zone Business Spaces, Nipania Main Road, Dewas Naka,
                  Pipliya Kumar, Indore, Madhya Pradesh, India
                  <br />
                  Registration Number: 03/27/01/25174/23
                </p>
              </div>

              {!tacScrolledToBottom && (
                <p className="text-center text-xs text-amber-600 animate-pulse">
                  Scroll down to read all terms...
                </p>
              )}
            </div>

            <div className="p-6 border-t border-brand-navy/10">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowTACModal(false)}
                  className="flex-1 py-3 border border-brand-navy/20 hover:bg-brand-navy/5 text-brand-navy rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptTAC}
                  disabled={!tacScrolledToBottom}
                  className="flex-1 py-3 bg-brand-orange text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
                >
                  {tacScrolledToBottom ? 'Accept & Proceed' : 'Scroll to read first'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      <Footer />
    </div>
  );
}
