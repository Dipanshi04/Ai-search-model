import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import Footer from '../components/Footer';

type ViewState = 'checking' | 'waiting' | 'verified' | 'failed' | 'no-reference';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 90; // ~7.5 minutes, then stop and let email do the rest

export default function PaymentDetailsPage() {
  const [view, setView] = useState<ViewState>('checking');
  const [bibNumber, setBibNumber] = useState<string | null>(null);
  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnParams: Record<string, string> = Object.fromEntries(params.entries());

    function handlePollResult(res: { success: boolean; data?: { status?: string; bibNumber?: string } }) {
      // A 404 body still comes back as a resolved response here, not a
      // thrown error — check `success` explicitly, or an unrecognized
      // reference would sit in "Confirming..." forever instead of ever
      // telling the runner something's wrong.
      if (!res.success) {
        setView('no-reference');
        return;
      }
      const status = res.data?.status;
      if (status === 'COMPLETED') {
        setBibNumber(res.data?.bibNumber || null);
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

    // Cashfree carries our own order id straight through on its return_url —
    // a real webhook already drives the status, so this is a plain poll,
    // no claim/reconcile step needed. See routes/cashfree.ts.
    const cashfreeOrderId = returnParams.cf_order_id;
    if (cashfreeOrderId) {
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
    }

    // Our own reference (set right before we sent the runner to ShowtimeBro)
    // is the reliable correlator. A `ref` query param is a best-effort
    // fallback only — we never know for certain ShowtimeBro preserves it.
    const reference = sessionStorage.getItem('isa_payment_reference') || returnParams.ref || '';

    if (!reference) {
      setView('no-reference');
      return;
    }

    async function claimThenPoll(ref: string) {
      // Records that the redirect came back and what it carried. This never
      // marks anyone paid by itself — see routes/payment.ts.
      await api.claimShowtimeBroPayment(ref, returnParams).catch(() => {});
      poll(ref);
    }

    function poll(ref: string) {
      api.getShowtimeBroPaymentStatus(ref).then((res) => {
        const done = handlePollResult(res);
        if (!done) {
          pollCount.current += 1;
          if (pollCount.current < MAX_POLLS) {
            pollTimer.current = setTimeout(() => poll(ref), POLL_INTERVAL_MS);
          }
        }
      }).catch(() => {
        // A network hiccup, not a definitive answer — keep retrying rather
        // than giving up on the runner's confirmation.
        setView('waiting');
        pollCount.current += 1;
        if (pollCount.current < MAX_POLLS) {
          pollTimer.current = setTimeout(() => poll(ref), POLL_INTERVAL_MS);
        }
      });
    }

    claimThenPoll(reference);

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

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
            <p className="hero-body text-xs text-brand-navy/50 mb-6">
              Your login PIN was emailed to you when you registered. Use it with your email to log
              into the Runner App.
            </p>
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
