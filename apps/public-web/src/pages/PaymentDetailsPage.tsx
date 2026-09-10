import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import Footer from '../components/Footer';
import { drawShareCard } from '@isa/shared';
import nrcGroupLogo from '../components/nrc-group-logo.png';
import logoDark from '../components/logo-dark.png';
import solugenixLogo from '../components/solugenix-logo.png';
import imcLogo from '../components/imc-logo.png';

type ViewState = 'checking' | 'waiting' | 'verified' | 'failed' | 'no-reference';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 90; // ~7.5 minutes, then stop and let email do the rest
const API_URL = import.meta.env.VITE_API_URL || '';

export default function PaymentDetailsPage() {
  const [view, setView] = useState<ViewState>('checking');
  const [bibNumber, setBibNumber] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [runnerName, setRunnerName] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cashfreeOrderId = params.get('cf_order_id');

    function handlePollResult(res: { success: boolean; data?: { status?: string; bibNumber?: string; category?: string; name?: string; avatarUrl?: string | null } }) {
      // A 404 body still comes back as a resolved response here, not a
      // thrown error — check `success` explicitly, or an unrecognized
      // order id would sit in "Confirming..." forever instead of ever
      // telling the runner something's wrong.
      if (!res.success) {
        setView('no-reference');
        return;
      }
      const status = res.data?.status;
      if (status === 'COMPLETED') {
        setBibNumber(res.data?.bibNumber || null);
        setRunnerName(res.data?.name || null);
        setCategory(res.data?.category || null);
        setAvatarUrl(res.data?.avatarUrl || null);
        setPin(sessionStorage.getItem('isa_runner_pin'));
        sessionStorage.removeItem('isa_runner_pin');
        setView('verified');
        return true;
      }
      if (status === 'FAILED') {
        setView('failed');
        return true;
      }
      setView('waiting');
      return false;
    }

    if (!cashfreeOrderId) {
      setView('no-reference');
      return;
    }

    // Cashfree carries our own order id straight through on its return_url —
    // a real webhook already drives the status, so this is a plain poll,
    // no claim/reconcile step needed. See routes/cashfree.ts.
    function pollCashfree() {
      api.getCashfreePaymentStatus(cashfreeOrderId!).then((res) => {
        const done = handlePollResult(res);
        if (!done) {
          pollCount.current += 1;
          if (pollCount.current < MAX_POLLS) {
            pollTimer.current = setTimeout(pollCashfree, POLL_INTERVAL_MS);
          }
        }
      }).catch(() => {
        setView('waiting');
        pollCount.current += 1;
        if (pollCount.current < MAX_POLLS) {
          pollTimer.current = setTimeout(pollCashfree, POLL_INTERVAL_MS);
        }
      });
    }
    pollCashfree();

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const handleShareCard = async () => {
    setSharing(true);
    try {
      const toAbsolute = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);
      const sponsorsRes = await api.getSponsors().catch(() => null);
      const sponsors = (sponsorsRes?.success && sponsorsRes.data ? sponsorsRes.data : [])
        .filter((s: any) => s.logoUrl)
        .map((s: any) => ({ name: s.name, logoUrl: toAbsolute(s.logoUrl) }));

      const canvas = await drawShareCard(document.createElement('canvas'), {
        name: runnerName || 'Runner',
        bibNumber: bibNumber || '',
        category: category || 'RUN_3K',
        avatarSrc: avatarUrl ? toAbsolute(avatarUrl) : null,
        sponsors,
        nrcLogoSrc: nrcGroupLogo,
        isaLogoSrc: logoDark,
        solugenixLogoSrc: solugenixLogo,
        imcLogoSrc: imcLogo,
      });
      const link = document.createElement('a');
      link.download = `im-running-${bibNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Best-effort — nothing to show the runner if canvas generation
      // itself fails, so just don't leave them stuck on a spinner.
    }
    setSharing(false);
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-brand-navy/10 shadow-sm rounded-3xl max-w-md w-full p-8 sm:p-10 text-center">

        {(view === 'checking' || view === 'waiting') && (
          <>
            <div className="mx-auto mb-6 w-12 h-12 rounded-full border-4 border-brand-navy/15 border-t-brand-orange animate-spin" />
            <h1 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
              Confirming your payment
            </h1>
            <p className="hero-body text-brand-navy/70 text-sm mb-6">
              We've received you back from checkout. Every payment is checked against our sales
              records before a registration is confirmed &mdash; this page will update automatically,
              usually within a few hours.
            </p>
            <div className="bg-brand-cream border border-brand-navy/10 rounded-xl p-4 text-left">
              <p className="hero-body text-xs text-brand-navy/60">
                Don't close this tab if you can help it &mdash; but if you do, you don't need to come
                back. We'll email your BIB number and login PIN to the address you registered with
                as soon as it's confirmed.
              </p>
            </div>
          </>
        )}

        {view === 'verified' && (
          <>
            <h1 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
              Payment confirmed!
            </h1>
            <p className="hero-body text-brand-navy/70 text-sm mb-6">You're all set for race day.</p>
            {bibNumber && (
              <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: '#1B2A5B' }}>
                <p className="hero-body text-xs uppercase tracking-wide font-bold mb-2" style={{ color: '#F5821F' }}>
                  Your BIB Number
                </p>
                <p className="hero-tabular text-3xl sm:text-4xl font-black text-white tracking-wider">{bibNumber}</p>
              </div>
            )}
            {pin ? (
              <div className="rounded-2xl p-5 sm:p-6 mb-6 border-2 border-dashed" style={{ borderColor: '#F5821F' }}>
                <p className="hero-body text-xs uppercase tracking-wide font-bold mb-2 text-brand-navy/60">
                  Your Login PIN
                </p>
                <p className="hero-tabular text-3xl sm:text-4xl font-black tracking-wider" style={{ color: '#1B2A5B' }}>{pin}</p>
                <p className="hero-body text-xs text-brand-navy/50 mt-3">
                  Also emailed to you. Use it with your email to log into the Runner App.
                </p>
              </div>
            ) : (
              <p className="hero-body text-xs text-brand-navy/50 mb-6">
                Your login PIN was emailed to you when you registered. Use it with your email to log
                into the Runner App.
              </p>
            )}
            <div className="mb-6">
              <p className="hero-body text-xs text-brand-navy/50 mb-2">Race starts <strong>6:30 AM, 27th September 2026</strong></p>
              <a
                href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=ISA%20Tech%20Marathon%202026&dates=20260927T010000Z/20260927T043000Z&details=Race%20day!%20Check-in%20opens%20early%20%E2%80%94%20bring%20your%20BIB%20number%20and%20login%20PIN.&location=Indore%2C%20Madhya%20Pradesh%2C%20India"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-brand-navy/20 text-brand-navy hover:bg-brand-navy/5 transition px-5 py-2.5 rounded-xl text-sm font-bold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Add to Calendar
              </a>
            </div>
            <button
              type="button"
              onClick={handleShareCard}
              disabled={sharing}
              className="w-full mb-3 inline-flex items-center justify-center gap-2 border-2 text-brand-navy hover:bg-brand-navy/5 transition px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ borderColor: '#1B2A5B' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {sharing ? 'Preparing your card…' : 'Download "I\'m Running" Card'}
            </button>
            <a href="/" className="inline-block bg-brand-orange text-white hover:opacity-90 transition px-6 sm:px-8 py-3 rounded-xl text-base font-bold">
              Back to Home
            </a>
          </>
        )}

        {view === 'failed' && (
          <>
            <h1 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
              We couldn't confirm this payment
            </h1>
            <p className="hero-body text-brand-navy/70 text-sm mb-6">
              We didn't find a matching payment in our records. If money left your account, it will
              be refunded &mdash; please contact us with your registered email and we'll sort it out.
            </p>
            <a href="/contact" className="inline-block bg-brand-orange text-white hover:opacity-90 transition px-6 sm:px-8 py-3 rounded-xl text-base font-bold">
              Contact Support
            </a>
          </>
        )}

        {view === 'no-reference' && (
          <>
            <h1 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
              We lost track of your session
            </h1>
            <p className="hero-body text-brand-navy/70 text-sm mb-6">
              This can happen if you opened this page directly, or in a different browser than the
              one you registered in. If you already paid, don't worry &mdash; contact us with your
              registered email and BIB details and we'll confirm it manually.
            </p>
            <a href="/contact" className="inline-block bg-brand-orange text-white hover:opacity-90 transition px-6 sm:px-8 py-3 rounded-xl text-base font-bold">
              Contact Support
            </a>
          </>
        )}

      </div>
    </div>
      <Footer />
    </div>
  );
}
