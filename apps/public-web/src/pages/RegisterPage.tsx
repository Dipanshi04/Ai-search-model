import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';
import { convertHeicIfNeeded } from '@isa/shared';

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
  const [photoConverting, setPhotoConverting] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const galleryPhotoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [tacAccepted, setTacAccepted] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyFieldRef = useRef<HTMLDivElement>(null);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

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

  const handlePhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0] || null;
    e.target.value = '';
    if (!rawFile) return;
    setPhotoConverting(true);
    const file = await convertHeicIfNeeded(rawFile);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoConverting(false);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacAccepted) {
      setError('Please agree to the Terms & Conditions before registering.');
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

  // One continuous action: register, then immediately start the Cashfree
  // checkout redirect — no separate "review & pay" screen in between. If
  // registration succeeds but starting payment fails, the participant
  // already exists, so we stay on this page and offer a "Retry Payment"
  // button (handleRetryPayment) instead of resubmitting the whole form.
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
    if (!res.success) {
      setError(res.message || 'Registration failed');
      setLoading(false);
      return;
    }

    // Registration itself, not payment — fired here so it's counted even
    // for the rare case where the payment step below still fails.
    (window as any).fbq?.('track', 'CompleteRegistration');
    setResult(res.data);
    // Only ever available in this one response — the PIN is bcrypt-hashed
    // server-side immediately after this and the plaintext is discarded.
    if (res.data?.pin) {
      sessionStorage.setItem('isa_runner_pin', res.data.pin);
    }
    // Best-effort — a failed photo upload shouldn't block registration
    // itself, since a photo can always be added later from the Runner App.
    const userId = res.data?.participant?.userId;
    if (photo && userId) {
      api.uploadRegistrationPhoto(userId, form.email, photo).catch(() => {});
    }

    setLoading(false);
    await startCashfreeCheckout(res.data?.participant?.id);
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const res = await api.validateCoupon(code, result?.participant?.id);
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
  const startCashfreeCheckout = async (participantId?: string) => {
    setPaymentLoading(true);
    setError('');

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

  // Re-runs the full submit, not just startCashfreeCheckout — the runner may
  // have corrected a field (e.g. an invalid phone Cashfree rejected) since
  // the first attempt, and register.ts resumes/updates the existing
  // participant by userId+eventId rather than creating a duplicate, so this
  // is safe to call again with the current form values.
  const handleRetryPayment = () => handleFormSubmit();

  // Live pricing preview shown on the form itself, before submitting —
  // mirrors the discount rule cashfree.ts enforces server-side (max of
  // premium-company % and coupon %, never both stacked).
  const previewCategory: CategoryKey = form.category === 'RUN_5K' ? 'RUN_5K' : 'RUN_3K';
  const previewFee = CATEGORY_FEES[previewCategory];
  const previewBaseAmount = previewFee.amount;
  const pickedCompanyForPreview = companies.find((c) => c.id === form.companyId);
  const isPremiumCompanyPreview = pickedCompanyForPreview?.status === 'PREMIUM';
  const premiumPercentPreview = isPremiumCompanyPreview ? 50 : 0;
  const effectivePercentPreview = couponApplied ? Math.max(couponApplied.discountPercent, premiumPercentPreview) : premiumPercentPreview;
  const discountLabelPreview = couponApplied && couponApplied.discountPercent >= premiumPercentPreview
    ? `Coupon ${couponApplied.code} (${couponApplied.discountPercent}% off)`
    : isPremiumCompanyPreview
      ? 'Premium Member Discount (50% off)'
      : null;
  const isSubmitting = loading || paymentLoading;

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

          <div className="mb-4 rounded-xl px-4 py-3 text-center bg-red-50 border border-red-200">
            <p className="hero-body text-sm font-bold text-red-600">
              ⏰ Registrations close 25th September — register now!
            </p>
          </div>

          <div className="mb-4 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(245,130,32,0.1)', border: '1px solid rgba(245,130,32,0.3)' }}>
            <p className="hero-body text-sm font-bold" style={{ color: '#F5821F' }}>
              🎉 Use code <span className="font-mono tracking-wide">ISA25</span> for 25% off!
            </p>
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
                <button
                  type="button"
                  disabled={photoConverting}
                  onClick={() => setShowPhotoMenu(true)}
                  className="cursor-pointer px-3 py-2 rounded-lg border border-brand-navy/15 text-xs font-semibold text-brand-navy hover:bg-brand-cream transition focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-orange inline-flex items-center gap-1.5"
                >
                  {photoConverting && (
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-brand-orange/30 border-t-brand-orange animate-spin" />
                  )}
                  {photoConverting ? 'Converting…' : photo ? 'Change photo' : 'Add photo'}
                </button>
                {/* Two separate inputs instead of one plain file input:
                    relying on the OS file-chooser sheet to surface a
                    "Camera" shortcut on its own is inconsistent — some
                    Android/Samsung Chrome versions only show Gallery/Files
                    with no camera option at all. capture="user" on this one
                    guarantees a camera launch; the other (no capture)
                    guarantees gallery access, which a bare capture
                    attribute would have blocked entirely on iOS. accept
                    includes heic/heif since iPhone photos are HEIC by
                    default — convertHeicIfNeeded turns those into a JPEG
                    the server will actually accept. */}
                <input
                  ref={cameraPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handlePhotoInputChange}
                />
                <input
                  ref={galleryPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoInputChange}
                />
              </div>
              <p className="hero-body text-[11px] text-brand-navy/40 mt-1">You can also add or change this later from the Runner App.</p>
              {showPhotoMenu && (
                <div
                  onClick={() => setShowPhotoMenu(false)}
                  className="fixed inset-0 z-50 flex items-end"
                  style={{ background: 'rgba(15,23,42,0.4)' }}
                >
                  <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl w-full px-4 pt-2" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
                    <div className="w-9 h-1 bg-brand-navy/10 rounded-full mx-auto my-3" />
                    <button
                      type="button"
                      onClick={() => { setShowPhotoMenu(false); cameraPhotoInputRef.current?.click(); }}
                      className="flex items-center gap-3 w-full px-2 py-3.5 border-b border-brand-navy/5 text-left text-[15px] font-semibold text-brand-navy"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5821F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" />
                      </svg>
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowPhotoMenu(false); galleryPhotoInputRef.current?.click(); }}
                      className="flex items-center gap-3 w-full px-2 py-3.5 text-left text-[15px] font-semibold text-brand-navy"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5821F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      Choose from Gallery
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPhotoMenu(false)}
                      className="block w-full px-2 py-3.5 mt-1 bg-brand-cream rounded-xl text-center text-[15px] font-semibold text-brand-navy/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
          </div>

          <button
            type="button"
            onClick={() => setShowOptionalDetails((v) => !v)}
            className="hero-body flex items-center gap-1.5 text-xs font-semibold text-brand-navy/60 hover:text-brand-navy mb-4"
          >
            {showOptionalDetails ? '− Hide' : '+ Add'} emergency contact &amp; blood group (optional)
          </button>

          {showOptionalDetails && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                    placeholder="e.g. spouse, parent, friend"
                  />
                </div>
                <div>
                  <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={form.emergencyPhone}
                    onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
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
            </>
          )}

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
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
          </div>

          {/* Pricing — always visible, updates live as category/company/coupon
              change, so there's no surprise before checkout. */}
          <div className="hero-body bg-brand-cream border border-brand-navy/10 rounded-2xl p-4 sm:p-5 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-brand-navy/60">{previewFee.label}</span>
              <span className="text-brand-navy">Rs. {previewBaseAmount}</span>
            </div>
            {effectivePercentPreview > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">{discountLabelPreview}</span>
                <span className="text-emerald-600">− Rs. {Math.round(previewBaseAmount * effectivePercentPreview / 100)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-brand-navy/10 pt-2">
              <span className="text-brand-navy font-medium text-sm">Total</span>
              <span className="hero-title text-xl sm:text-2xl font-bold text-brand-orange">
                Rs. {Math.round(previewBaseAmount * (1 - effectivePercentPreview / 100))}
              </span>
            </div>

            <div className="pt-2">
              {couponApplied ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-600">Coupon <strong>{couponApplied.code}</strong> applied — {couponApplied.discountPercent}% off.</p>
                  <button
                    type="button"
                    onClick={() => { setCouponApplied(null); setCouponInput(''); }}
                    className="text-xs font-semibold text-brand-navy/60 hover:text-brand-navy underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="Coupon code (optional)"
                    className="flex-1 px-3 py-2 bg-white border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponChecking || !couponInput.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {couponChecking ? 'Checking...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-600 mt-1.5">{couponError}</p>}
            </div>
          </div>

          <label className="hero-body flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tacAccepted}
              onChange={(e) => setTacAccepted(e.target.checked)}
              className="w-4 h-4 rounded border-brand-navy/30 text-brand-orange focus:ring-brand-orange"
            />
            <span className="text-xs text-brand-navy/70">
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-orange font-semibold underline">
                Terms & Conditions
              </a>
            </span>
          </label>

          {result && error ? (
            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={isSubmitting || !tacAccepted}
              className="w-full py-3 bg-brand-orange text-white hover:opacity-90 font-bold rounded-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading ? 'Redirecting...' : loading ? 'Retrying...' : 'Retry Payment'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !tacAccepted}
              className="w-full py-3 bg-brand-orange text-white hover:opacity-90 font-bold rounded-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading ? 'Redirecting to payment...' : loading ? 'Registering...' : 'Register & Pay'}
            </button>
          )}
          <p className="hero-body text-xs text-brand-navy/50 text-center mt-3">
            You'll be taken to our secure checkout partner, Cashfree, to complete payment.
          </p>
        </form>
      </div>
    </div>
      <Footer />
    </div>
  );
}
