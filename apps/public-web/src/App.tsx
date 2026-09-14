import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import HRPortalPage from './pages/HRPortalPage';
import { HRForgotPasswordPage, HRResetPasswordPage } from './pages/HRForgotPasswordPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import TreeCounterPage from './pages/TreeCounterPage';
import PaymentDetailsPage from './pages/PaymentDetailsPage';
import HowItWorksPage from './pages/HowItWorksPage';
import Footer from './components/Footer';
import SponsorInquiryModal from './components/SponsorInquiryModal';
import BulkInquiryModal from './components/BulkInquiryModal';
import SponsorStrip from './components/SponsorStrip';
import AssociateSponsorRow from './components/AssociateSponsorRow';
import RaceRouteSection from './components/RaceRouteSection';
import FAQSection from './components/FAQSection';
import logoDark from './components/logo-dark.png';
import heroRunner from './components/hero-runner.webp';
import nrcGroupLogo from './components/nrc-group-logo.png';
import imcLogo from './components/imc-logo.png';
import mpPoliceLogo from './components/mp-police-logo.png';
import solugenixLogo from './components/solugenix-logo.png';
import { useEffect, useState } from "react";

// The runner app is a separate SPA (apps/runner-app) served under the same
// domain in production (marathon.theisa.in/runner) but a different local
// dev port — VITE_RUNNER_APP_URL overrides the relative default for dev.
const RUNNER_APP_URL = import.meta.env.VITE_RUNNER_APP_URL || '/runner/';


const Logo = ({ size = 'h-16' }: { size?: string }) => (
  <img src={logoDark} alt="ISA Marathon" className={`${size} w-auto max-w-full object-contain shrink-0`} />
);

function CountdownTimer() {
  const targetDate = new Date("2026-09-27T00:00:00+05:30").getTime();

  const calculateTimeLeft = () => {
    const difference = targetDate - Date.now();

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <p className="hero-kicker text-[#1B2A5B]/50 text-[10px] sm:text-xs font-bold mb-3 tracking-[0.25em] uppercase">
        Countdown to Marathon Day
      </p>

      <div className="flex justify-center gap-1.5 sm:gap-2">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hrs" },
          { value: timeLeft.minutes, label: "Min" },
          { value: timeLeft.seconds, label: "Sec" },
        ].map((item) => (
          <div
            key={item.label}
            className="relative rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 min-w-[46px] sm:min-w-[58px]"
            style={{ background: '#1B2A5B' }}
          >
            <div className="hero-tabular text-base sm:text-xl font-extrabold text-white leading-none">
              {String(item.value).padStart(2, "0")}
            </div>
            <div className="hero-kicker text-[7px] sm:text-[9px] font-bold text-[#F5821F] uppercase tracking-[0.2em] mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function HomePage() {
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  return (
    <div className="hero-root min-h-screen overflow-hidden flex flex-col">
      {/* Decorative background layers */}
      <div className="hero-grain" />

      {/* Top bar: "presented by" lockup — sponsor logo, then the marathon's
          own logo below it, mirroring how it reads on the print poster.
          Green City Partner badge sits top-right, Safety Partner top-left,
          matching the poster. */}
      <div className="hero-anim relative pt-4 sm:pt-6 px-4 z-10 shrink-0" style={{ animationDelay: '0ms' }}>
        <div
          className="absolute top-4 sm:top-6 left-4 flex flex-col items-center gap-1 bg-white rounded-xl shadow-sm px-2.5 py-1.5 sm:px-3 sm:py-2 border"
          style={{ borderColor: 'rgba(27,42,91,0.08)' }}
        >
          <span className="hero-kicker text-[6px] sm:text-[7px] font-bold uppercase tracking-wide text-center leading-tight" style={{ color: '#1B2A5B', opacity: 0.55 }}>
            Safety<br />Partner
          </span>
          <img src={mpPoliceLogo} alt="Madhya Pradesh Police" className="h-6 sm:h-8 w-auto object-contain" />
        </div>

        <div
          className="absolute top-4 sm:top-6 right-4 flex flex-col items-center gap-1 bg-white rounded-xl shadow-sm px-2.5 py-1.5 sm:px-3 sm:py-2 border"
          style={{ borderColor: 'rgba(27,42,91,0.08)' }}
        >
          <span className="hero-kicker text-[6px] sm:text-[7px] font-bold uppercase tracking-wide text-center leading-tight" style={{ color: '#1B2A5B', opacity: 0.55 }}>
            Green City<br />Partner
          </span>
          <img src={imcLogo} alt="Indore Municipal Corporation" className="h-6 sm:h-8 w-auto object-contain" />
        </div>

        <div className="flex flex-col items-center gap-1 sm:gap-1.5 text-center">
          <img src={nrcGroupLogo} alt="NRC Group" className="h-14 sm:h-20 w-auto object-contain" />
          <p className="hero-kicker text-[9px] sm:text-[11px] font-bold tracking-[0.35em] uppercase" style={{ color: '#1B2A5B', opacity: 0.45 }}>
            Presents
          </p>
          <Logo size="h-9 sm:h-12" />
          <p className="hero-kicker text-[10px] sm:text-sm font-extrabold tracking-[0.15em] uppercase mt-1" style={{ color: '#1B2A5B', opacity: 0.6 }}>
            Indore Software Association
          </p>
          <div className="flex flex-col items-center gap-1 mt-1 mb-2 sm:mb-3">
            <span className="hero-kicker text-[8px] sm:text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#1B2A5B', opacity: 0.45 }}>
              Co-Sponsored By
            </span>
            <div className="bg-white rounded-xl shadow-sm px-3 py-1.5 border" style={{ borderColor: 'rgba(27,42,91,0.08)' }}>
              <img src={solugenixLogo} alt="Solugenix" className="h-4 sm:h-5 w-auto object-contain" />
            </div>
          </div>
          <AssociateSponsorRow />
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex items-center xl:justify-between gap-6 px-4 sm:px-8 min-h-0 relative z-10 max-w-[1400px] mx-auto w-full">
        <div className="relative z-10 w-full max-w-2xl mx-auto xl:mx-0 xl:shrink-0">
          <h1 className="hero-anim hero-title hero-h1 text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-4 xl:mb-6 leading-[0.9]" style={{ animationDelay: '80ms', color: '#1B2A5B' }}>
            {/* Visually hidden — search engines and screen readers get the
                actual event name/date here, while the styled line below
                stays purely the brand tagline. */}
            <span className="sr-only">ISA Tech Marathon 2026 — </span>
            CODE.<br />
            CONNECT.<br />
            CONSERVE.<br />
            <span style={{ color: '#F5821F' }}>RUN FOR<br />INDORE.</span>
            <span className="sr-only"> — 3K &amp; 5K run, 27th September 2026, Indore</span>
          </h1>

          <p className="hero-anim hero-body text-sm sm:text-base xl:text-lg mb-1.5" style={{ animationDelay: '200ms', color: '#1B2A5B', opacity: 0.75, maxWidth: '32rem' }}>
            Where central India's biggest IT community unites for technology, fitness and responsibility.
          </p>
          <p className="hero-anim hero-body text-sm sm:text-base xl:text-lg mb-3 sm:mb-4" style={{ animationDelay: '250ms', color: '#1B2A5B', opacity: 0.75 }}>
            Every step counts. Every 5km <span className="font-bold" style={{ color: '#10b981' }}>plants a tree</span>.
          </p>

          <p className="hero-anim hero-title text-2xl sm:text-3xl xl:text-4xl font-extrabold mb-3 sm:mb-4" style={{ animationDelay: '260ms', color: '#1B2A5B' }}>
            27<sup>th</sup> September 2026
          </p>

          <div className="hero-anim flex flex-col gap-1.5 mb-5 sm:mb-6 text-xs sm:text-sm font-semibold" style={{ animationDelay: '280ms', color: '#1B2A5B', opacity: 0.85 }}>
            <span className="inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              Start Point: BBC Basketball Club, Indore
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z" /></svg>
              Kit Collection: 26th September 2026
            </span>
          </div>

          <div className="hero-anim flex flex-wrap items-center gap-3 mb-6 sm:mb-7" style={{ animationDelay: '320ms' }}>
            <span className="hero-body inline-flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm sm:text-base font-bold text-white" style={{ background: '#F5821F' }}>
              <span className="hero-live-dot w-1.5 h-1.5 rounded-full bg-white" />
              Registration Open
            </span>
            <span className="hero-kicker text-xs sm:text-sm font-bold" style={{ color: '#1B2A5B' }}>
              280+ IT Companies. One Run.
            </span>
          </div>

          <div className="hero-anim" style={{ animationDelay: '400ms' }}>
            <CountdownTimer />
          </div>

          <div className="hero-anim flex flex-wrap items-center gap-3 mt-6 sm:mt-7" style={{ animationDelay: '480ms' }}>
            <a
              href="/register"
              className="hero-body inline-flex items-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full text-sm sm:text-base font-bold text-white hover:opacity-90 transition"
              style={{ background: '#1B2A5B' }}
            >
              Register Now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <button
              onClick={() => setShowSponsorModal(true)}
              className="hero-body inline-block px-5 py-2.5 sm:px-6 sm:py-3 rounded-full border-2 text-sm sm:text-base font-bold hover:bg-brand-navy/5 transition cursor-pointer"
              style={{ borderColor: 'rgba(27,42,91,0.25)', color: '#1B2A5B' }}
            >
              Contact for Sponsorship
            </button>
            <a
              href={RUNNER_APP_URL}
              className="hero-body inline-flex items-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold hover:opacity-70 transition"
              style={{ color: '#1B2A5B' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
              Already Registered? Login
            </a>
            <a
              href="/how-it-works"
              className="hero-body inline-flex items-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold hover:opacity-70 transition"
              style={{ color: '#1B2A5B' }}
            >
              How It Works
            </a>
          </div>
        </div>

        <img src={heroRunner} alt="" aria-hidden="true" className="hero-runner" />
      </div>

      {/* Pricing */}
      <div className="hero-anim px-4 sm:px-8 pb-6 sm:pb-8 pt-2 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '560ms' }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1B2A5B' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            <div className="p-5 sm:p-6 text-center sm:text-left" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              <p className="hero-kicker text-xs sm:text-sm font-bold uppercase tracking-wide text-white mb-2">Retail Price</p>
              <p className="hero-body text-sm sm:text-base text-white/80">3 KM — <span className="font-bold text-white">₹299</span></p>
              <p className="hero-body text-sm sm:text-base text-white/80">5 KM — <span className="font-bold text-white">₹499</span></p>
            </div>
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="p-5 sm:p-6 text-center sm:text-left hover:bg-white/5 transition cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.15)' }}
            >
              <p className="hero-kicker text-xs sm:text-sm font-bold uppercase tracking-wide text-white mb-2">Bulk Offer</p>
              <p className="hero-body text-sm sm:text-base text-white/80">
                Buy 25 passes and get <span className="font-bold" style={{ color: '#F5821F' }}>50% OFF</span>
              </p>
              <p className="hero-body text-xs font-bold mt-2 underline" style={{ color: '#F5821F' }}>Enquire now →</p>
            </button>
            <div className="p-5 sm:p-6 text-center sm:text-left">
              <p className="hero-kicker text-xs sm:text-sm font-bold uppercase tracking-wide text-white mb-2">ISA Premium Member Companies</p>
              <p className="hero-body text-sm sm:text-base text-white/80">
                <span className="font-bold" style={{ color: '#F5821F' }}>50% off</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="hero-anim px-4 sm:px-8 pb-8 sm:pb-10 pt-2 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '620ms' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { emoji: '🥤', label: 'Snack Included' },
            { emoji: '👕', label: 'Official T-Shirt Included' },
            { emoji: '🏅', label: 'Finisher Medal Included' },
            { emoji: '📜', label: 'Digital Certificate Included' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center text-center gap-2 rounded-2xl bg-white border p-4 sm:p-5"
              style={{ borderColor: 'rgba(27,42,91,0.1)' }}
            >
              <span className="text-2xl sm:text-3xl" aria-hidden="true">{item.emoji}</span>
              <p className="hero-body text-xs sm:text-sm font-bold" style={{ color: '#1B2A5B' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <RaceRouteSection />

      <SponsorStrip />

      <FAQSection />

      {showSponsorModal && <SponsorInquiryModal onClose={() => setShowSponsorModal(false)} />}
      {showBulkModal && <BulkInquiryModal onClose={() => setShowBulkModal(false)} />}

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/hr-portal" element={<HRPortalPage />} />
      <Route path="/hr-forgot-password" element={<HRForgotPasswordPage />} />
      <Route path="/hr-reset-password" element={<HRResetPasswordPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/green" element={<TreeCounterPage />} />
      <Route path="/details" element={<PaymentDetailsPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
    </Routes>
  );
}
