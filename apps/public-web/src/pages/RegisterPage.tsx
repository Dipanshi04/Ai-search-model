import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const CATEGORY_FEES = {
  RUN_3K: { label: '3K Fun Run', amount: 500 },
  RUN_5K: { label: '5K Challenge', amount: 800 },
} as const;

type CategoryKey = keyof typeof CATEGORY_FEES;

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'RUN_3K',
    gender: 'MALE',
    companyName: '',
    emergencyContact: '',
    emergencyPhone: '',
    bloodGroup: '',
    tshirtSize: 'M',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [showTACModal, setShowTACModal] = useState(false);
  const [tacAccepted, setTacAccepted] = useState(false);
  const [tacScrolledToBottom, setTacScrolledToBottom] = useState(false);
  const tacContentRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    api.getPaymentConfig().then((res) => {
      if (res.success && res.data?.keyId) {
        setRazorpayKeyId(res.data.keyId);
      }
    });
  }, []);

  useEffect(() => {
    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacAccepted) {
      setError('Please read and agree to the Terms & Conditions before registering.');
      return;
    }
    await handleFormSubmit();
  };

  const handleFormSubmit = async () => {
    setLoading(true);
    setError('');

    const res = await api.register(form);
    if (res.success) {
      setResult(res.data);
      api.setToken(res.data.tokens.accessToken);
      setStep('payment');
    } else {
      setError(res.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!razorpayKeyId) {
      setError('Payment gateway not configured. Contact organizer.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    const participantId = result?.participant?.id;
    if (!participantId) {
      setError('Participant not found');
      setPaymentLoading(false);
      return;
    }

    const category: CategoryKey = result?.participant?.category === 'RUN_5K' ? 'RUN_5K' : 'RUN_3K';
    const categoryFee = CATEGORY_FEES[category];

    const orderRes = await api.createPaymentOrder(participantId, categoryFee.amount);
    if (!orderRes.success) {
      setError(orderRes.message || 'Failed to create payment order');
      setPaymentLoading(false);
      return;
    }

    const { orderId, amount, currency } = orderRes.data;
    const { name, email, phone } = result?.participant?.user || {};
    const bibNumber = result?.participant?.bibNumber || result?.bibNumber;

    const options = {
      key: razorpayKeyId,
      amount: amount.toString(),
      currency,
      name: 'ISA MARATHON 2026',
      description: `${categoryFee.label} - BIB #${bibNumber}`,
      order_id: orderId,
      handler: async function (response: any) {
        const verifyRes = await api.verifyPayment({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
          registrationId: participantId,
        });

        if (verifyRes.success) {
          setResult({ ...result, participant: verifyRes.data.participant });
          setStep('success');
        } else {
          setError('Payment verification failed. Please contact support.');
        }
        setPaymentLoading(false);
      },
      prefill: {
        name,
        email,
        contact: phone,
      },
      theme: {
        color: '#1e293b',
      },
      modal: {
        ondismiss: function () {
          setPaymentLoading(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', async function (response: any) {
      await api.reportPaymentFailure({
        razorpayOrderId: response.error.metadata.order_id,
        failureReason: response.error.description || 'Payment failed',
      });
      setError(`Payment failed: ${response.error.description || 'Please try again'}`);
      setPaymentLoading(false);
    });

    rzp.open();
  };

  if (step === 'success') {
    return (
      <div className="bg-marathon min-h-screen flex items-center justify-center px-4 py-8">
        <div className="glass-strong p-8 sm:p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-4">
            Registration Complete!
          </h2>
          <p className="text-slate-600 mb-6 sm:mb-8 text-base sm:text-lg">Welcome, {result.participant?.user?.name}</p>
          <div className="glass-dark rounded-2xl p-5 sm:p-6 mb-6">
            <p className="text-sm text-slate-500 mb-2">Your BIB Number</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-800 font-mono tracking-wider">{result.participant?.bibNumber || result.bibNumber}</p>
          </div>
          <div className="glass-dark rounded-2xl p-4 mb-6 border border-green-500/30">
            <p className="text-green-700 text-sm">Payment confirmed! You're all set for race day.</p>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Save this BIB number. You will need it for check-in on race day.
          </p>
          <a href="/" className="inline-block white-btn px-6 sm:px-8 py-3 rounded-xl text-base">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    const payCategory: CategoryKey = result?.participant?.category === 'RUN_5K' ? 'RUN_5K' : 'RUN_3K';
    const categoryFee = CATEGORY_FEES[payCategory];
    return (
      <div className="bg-marathon min-h-screen flex items-center justify-center px-4 py-8">
        <div className="glass-strong p-8 sm:p-10 rounded-3xl max-w-md w-full relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800">Complete Payment</h2>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          <div className="glass-dark rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="text-slate-800 font-medium">{result.participant?.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">BIB Number</span>
              <span className="text-slate-800 font-mono font-bold">{result.participant?.bibNumber || result.bibNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Category</span>
              <span className="text-slate-800">{categoryFee?.label || result.participant?.category}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 mt-3">
              <span className="text-slate-600 font-medium">Amount</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-800">Rs. {categoryFee?.amount || 500}</span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={handlePayment}
              disabled={paymentLoading || !razorpayKeyId}
              className="w-full py-3 sm:py-4 white-btn rounded-xl transition-all flex items-center justify-center gap-2 text-base sm:text-lg"
            >
              {paymentLoading ? 'Processing...' : !razorpayKeyId ? 'Payment gateway loading...' : 'Pay Now'}
            </button>
            <button
              onClick={() => { setStep('form'); setError(''); }}
              disabled={paymentLoading}
              className="w-full py-3 sm:py-4 glass-dark hover:bg-white/60 disabled:opacity-50 text-slate-700 font-medium rounded-xl transition-all"
            >
              Back to Form
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-5 sm:mt-6">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-marathon min-h-screen flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-3xl">
        <form onSubmit={handleSubmitForm} className="glass-strong rounded-3xl p-5 sm:p-6 sm:p-8">
          <div className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">
              Register for ISA Marathon
            </h1>
            <p className="text-slate-600 text-sm">Fill in your details to join the race</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
                placeholder="Phone"
              />
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="NON_BINARY">Non-Binary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Company</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
                placeholder="company"
              />
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Emergency Contact</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Emergency Phone</label>
              <input
                type="tel"
                value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Blood Group</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">Distance *</label>
              <div className="flex gap-2">
                <label
                  className={`flex-1 flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    form.category === 'RUN_3K'
                      ? 'border-slate-800 bg-slate-800/10'
                      : 'border-slate-300 bg-white/50 hover:border-slate-400'
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
                  <span className="text-slate-800 font-medium text-sm">3K</span>
                </label>
                <label
                  className={`flex-1 flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    form.category === 'RUN_5K'
                      ? 'border-slate-800 bg-slate-800/10'
                      : 'border-slate-300 bg-white/50 hover:border-slate-400'
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
                  <span className="text-slate-800 font-medium text-sm">5K</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium oklch(0 0 0) mb-1">T-Shirt Size</label>
              <select
                value={form.tshirtSize}
                onChange={(e) => setForm({ ...form, tshirtSize: e.target.value })}
                className="w-full px-3 py-2 glass-dark rounded-lg text-slate-800 focus:ring-2 focus:ring-slate-800 outline-none text-sm"
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

          <label className="flex items-center gap-2 mb-3 cursor-pointer"
            onClick={() => setShowTACModal(true)}
          >
            <input
              type="checkbox"
              checked={tacAccepted}
              readOnly
              className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
            />
            <span className="text-xs text-slate-700">
              I have read and agree to the{' '}
              <span className="text-slate-900 font-semibold underline">Terms & Conditions</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !tacAccepted}
            className="w-full py-3 white-btn rounded-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Register & Pay'}
          </button>
        </form>
      </div>

      {/* Terms & Conditions Modal */}
      {showTACModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="p-6 border-b border-slate-200/50">
              <h2 className="text-2xl font-black text-slate-800">Terms & Conditions</h2>
              <p className="text-sm oklch(0 0 0) mt-1">Please read carefully before proceeding</p>
            </div>

            <div
              ref={tacContentRef}
              onScroll={handleTacScroll}
              className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-slate-800"
            >
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Payment Details</h3>
                <div className="glass-dark rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="oklch(0 0 0)">3K Fun Run - Registration Fee</span>
                    <span className="font-bold text-slate-900">Rs. 500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="oklch(0 0 0)">5K Challenge - Registration Fee</span>
                    <span className="font-bold text-slate-900">Rs. 800</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="oklch(0 0 0)">Payment Method</span>
                      <span className="oklch(0 0 0)">Razorpay (UPI / Cards / Net Banking)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold oklch(0 0 0) mb-2">Payment Rules</h3>
                <ul className="space-y-2 list-disc list-inside oklch(0 0 0)">
                  <li>Registration fee is non-refundable once payment is confirmed.</li>
                  <li>Payment must be completed within 15 minutes of starting the registration process.</li>
                  <li>Failed transactions will be auto-reversed within 5-7 business days.</li>
                  <li>Each participant can register only once per category.</li>
                  <li>Multiple registrations for the same person will be cancelled.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold oklch(0 0 0) mb-2">Cancellation & Refund Policy</h3>
                <ul className="space-y-2 list-disc list-inside oklch(0 0 0)">
                  <li>Cancellations made 15+ days before the event: 50% refund.</li>
                  <li>Cancellations made less than 15 days before the event: No refund.</li>
                  <li>No-shows on race day: No refund.</li>
                  <li>Refunds will be processed within 10 business days to the original payment method.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold oklch(0 0 0) mb-2">Race Day Rules</h3>
                <ul className="space-y-2 list-disc list-inside oklch(0 0 0)">
                  <li>Valid photo ID is required for check-in on race day.</li>
                  <li>BIB number must be visible at all times during the race.</li>
                  <li>Organizers reserve the right to disqualify participants for unsportsmanlike conduct.</li>
                  <li>Medical assistance will be available at designated points.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold oklch(0 0 0) mb-2">Liability Waiver</h3>
                <p className="oklch(0 0 0)">
                  By registering, I confirm that I am physically fit to participate in the marathon event. 
                  I understand that running involves inherent risks including but not limited to falls, 
                  contact with other participants, effects of weather, traffic, and road conditions. 
                  I hereby release ISA Marathon organizers, sponsors, and volunteers from any and all 
                  claims, damages, or liabilities arising from my participation in this event.
                </p>
              </div>

              <div>
                <h3 className="font-bold oklch(0 0 0) mb-2">Privacy Policy</h3>
                <p className="oklch(0 0 0)">
                  Your personal information will be used solely for event management purposes. 
                  Your data may be shared with race timing services and medical teams for safety. 
                  Photos and videos taken during the event may be used for promotional purposes.
                </p>
              </div>

              {!tacScrolledToBottom && (
                <p className="text-center text-xs text-amber-600 animate-pulse">
                  Scroll down to read all terms...
                </p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200/50">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowTACModal(false)}
                  className="flex-1 py-3 glass-dark hover:bg-white/60 text-slate-700 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptTAC}
                  disabled={!tacScrolledToBottom}
                  className="flex-1 py-3 white-btn disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
                >
                  {tacScrolledToBottom ? 'Accept & Proceed' : 'Scroll to read first'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
