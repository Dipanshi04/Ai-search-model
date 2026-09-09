import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';
import BrandHeader from '../components/BrandHeader';

declare global {
  interface Window {
    Cashfree: (opts: { mode: 'sandbox' | 'production' }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget: '_self' }) => void;
    };
  }
}

const CATEGORY_FEES: Record<string, { label: string; amount: number }> = {
  RUN_3K: { label: '3K Fun Run', amount: 299 },
  RUN_5K: { label: '5K Challenge', amount: 499 },
};

interface Props {
  participantId: string;
  bibNumber: string;
  category: string;
  isPremiumCompany: boolean;
  onPaid: () => void;
  onLogout: () => void;
}

// Gates the rest of the runner app behind a completed payment — a runner
// who registered but never finished (or abandoned) checkout could log in
// with their PIN and reach the full app, including starting live GPS
// tracking, without ever having paid. This is the only screen they see
// until paymentStatus flips to COMPLETED.
export default function PaymentPendingPage({ participantId, bibNumber, category, isPremiumCompany, onPaid, onLogout }: Props) {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const categoryFee = CATEGORY_FEES[category] || CATEGORY_FEES.RUN_3K!;
  const baseAmount = categoryFee.amount;
  const displayAmount = isPremiumCompany ? Math.round(baseAmount * 0.5) : baseAmount;

  useEffect(() => {
    if (!document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Cashfree redirects back here (same URL, ?cf_order_id=... appended) once
  // the runner returns from checkout — pick that up and poll until the
  // webhook has actually marked the payment COMPLETED, rather than trusting
  // the redirect alone (it fires on cancel/failure too).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('cf_order_id');
    if (!orderId) return;

    setConfirming(true);
    let cancelled = false;
    let attempts = 0;

    function poll() {
      api.getCashfreePaymentStatus(orderId!).then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.status === 'COMPLETED') {
          window.history.replaceState({}, '', window.location.pathname);
          onPaid();
          return;
        }
        if (res.success && res.data?.status === 'FAILED') {
          setConfirming(false);
          setError('That payment did not complete. Please try again.');
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
        attempts += 1;
        if (attempts < 30) {
          setTimeout(poll, 4000);
        } else {
          setConfirming(false);
          setError('Still waiting on confirmation — check back in a few minutes, or try paying again.');
        }
      }).catch(() => {
        if (!cancelled) setTimeout(poll, 4000);
      });
    }
    poll();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async () => {
    setPaymentLoading(true);
    setError('');

    const res = await api.startCashfreePayment(participantId);
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

    const cashfree = window.Cashfree({ mode: res.data.environment });
    cashfree.checkout({ paymentSessionId: res.data.paymentSessionId, redirectTarget: '_self' });
  };

  if (confirming) {
    return (
      <div style={{ minHeight: '100dvh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>
        <BrandHeader />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(16,185,129,0.15)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'ppSpin 0.8s linear infinite', marginBottom: '20px' }} />
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>Confirming your payment…</p>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>This usually takes a few seconds.</p>
        </div>
        <style>{`@keyframes ppSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={logoDark} alt="ISA Marathon" style={{ height: '56px', width: 'auto', maxWidth: '220px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '999px', padding: '6px 14px', display: 'inline-block' }}>
              Payment Pending
            </span>
          </div>

          <p style={{ fontSize: '14px', color: '#475569', textAlign: 'center', lineHeight: 1.5, marginBottom: '24px' }}>
            Your registration (BIB <strong>{bibNumber}</strong>) is saved, but payment hasn't gone through yet.
            Complete payment to unlock the Runner App.
          </p>

          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Category</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{categoryFee.label}</span>
            </div>
            {isPremiumCompany && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#059669' }}>Premium Member Discount</span>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>50% off</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>Amount Due</span>
              <span style={{ fontSize: '20px', color: '#F5821F', fontWeight: 800 }}>Rs. {displayAmount}</span>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paymentLoading}
            style={{
              width: '100%', padding: '16px', color: '#fff', fontSize: '16px', fontWeight: 700,
              borderRadius: '14px', border: 'none',
              background: paymentLoading ? '#94d8b3' : '#10b981',
              cursor: paymentLoading ? 'not-allowed' : 'pointer',
              boxShadow: paymentLoading ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
            }}
          >
            {paymentLoading ? 'Redirecting…' : 'Pay Now'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'block', width: '100%', textAlign: 'center', fontSize: '12px', color: '#94a3b8',
              background: 'none', border: 'none', margin: '18px 0 0', cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
