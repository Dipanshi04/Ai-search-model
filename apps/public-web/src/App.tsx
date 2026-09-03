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
import Footer from './components/Footer';
import SponsorInquiryModal from './components/SponsorInquiryModal';
import logoDark from './components/logo-dark.png';
import heroRunner from './components/hero-runner.webp';
import nrcGroupLogo from './components/nrc-group-logo.png';
import { useEffect, useState } from "react";


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

      <div className="flex justify-center gap-2 sm:gap-3">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hrs" },
          { value: timeLeft.minutes, label: "Min" },
          { value: timeLeft.seconds, label: "Sec" },
        ].map((item) => (
          <div
            key={item.label}
            className="relative rounded-xl px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[62px] sm:min-w-[84px]"
            style={{ background: '#1B2A5B' }}
          >
            <div className="hero-tabular text-xl sm:text-3xl font-extrabold text-white leading-none">
              {String(item.value).padStart(2, "0")}
            </div>
            <div className="hero-kicker text-[8px] sm:text-[10px] font-bold text-[#F5821F] uppercase tracking-[0.2em] mt-1.5">
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
  return (
    <div className="hero-root min-h-screen overflow-hidden flex flex-col">
      {/* Decorative background layers */}
      <div className="hero-grain" />

      {/* Top bar: logo lockups, matching the poster's two-corner layout.
          Stacked and centered on narrow phones — side-by-side at full size
          plus the wordmark text left no room and clipped off-screen; from
          sm: up it's the original two-corner row. */}
      <div className="hero-anim flex flex-col-reverse sm:flex-row items-center sm:items-center justify-center sm:justify-between gap-2 sm:gap-0 px-4 sm:px-8 pt-4 sm:pt-6 relative z-10 shrink-0" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm px-2.5 py-1.5 sm:px-4 sm:py-3 border shrink-0" style={{ borderColor: 'rgba(27,42,91,0.08)' }}>
            <img src={nrcGroupLogo} alt="NRC Group" className="h-14 sm:h-24 xl:h-32 w-auto object-contain shrink-0" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm px-2.5 py-1.5 sm:px-4 sm:py-3 border shrink-0" style={{ borderColor: 'rgba(27,42,91,0.08)' }}>
            <Logo size="h-14 sm:h-24 xl:h-32" />
          </div>
        </div>
        <div className="hero-kicker text-center sm:text-right leading-tight shrink-0">
          <div className="text-sm sm:text-2xl xl:text-3xl font-extrabold tracking-[0.1em] uppercase" style={{ color: '#1B2A5B' }}>Indore Software</div>
          <div className="text-sm sm:text-2xl xl:text-3xl font-extrabold tracking-[0.1em] uppercase" style={{ color: '#1B2A5B' }}>Association</div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex items-center xl:justify-between gap-6 px-4 sm:px-8 min-h-0 relative z-10 max-w-[1400px] mx-auto w-full">
        <div className="relative z-10 w-full max-w-2xl mx-auto xl:mx-0 xl:shrink-0">
          <h1 className="hero-anim hero-title hero-h1 text-5xl sm:text-6xl md:text-7xl font-extrabold mb-3 sm:mb-4 xl:mb-6 leading-[0.9]" style={{ animationDelay: '80ms', color: '#1B2A5B' }}>
            CODE.<br />
            CONNECT.<br />
            CONSERVE.<br />
            <span style={{ color: '#F5821F' }}>RUN FOR<br />INDORE.</span>
          </h1>

          <p className="hero-anim hero-body text-sm sm:text-base xl:text-lg mb-1.5" style={{ animationDelay: '200ms', color: '#1B2A5B', opacity: 0.75, maxWidth: '32rem' }}>
            Where central India's biggest IT community unites for technology, fitness and responsibility.
          </p>
          <p className="hero-anim hero-body text-sm sm:text-base xl:text-lg mb-5 sm:mb-6" style={{ animationDelay: '250ms', color: '#1B2A5B', opacity: 0.75 }}>
            Run for a <span className="font-bold" style={{ color: '#10b981' }}>Greener</span> Tomorrow  every 5km plant a tree.
          </p>

          <div className="hero-anim flex flex-wrap items-center gap-3 mb-6 sm:mb-7" style={{ animationDelay: '320ms' }}>
            <span className="hero-body inline-flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm sm:text-base font-bold text-white" style={{ background: '#F5821F' }}>
              <span className="hero-live-dot w-1.5 h-1.5 rounded-full bg-white" />
              Coming Soon
            </span>
            <span className="hero-kicker text-xs sm:text-sm font-bold" style={{ color: '#1B2A5B' }}>
              280+ IT Companies. One Run.
            </span>
          </div>

          <div className="hero-anim" style={{ animationDelay: '400ms' }}>
            <CountdownTimer />
          </div>

          <div className="hero-anim mt-6 sm:mt-7" style={{ animationDelay: '480ms' }}>
            <button
              onClick={() => setShowSponsorModal(true)}
              className="hero-body inline-block px-4 py-1.5 rounded-full border text-[11px] sm:text-xs font-semibold hover:opacity-100 transition cursor-pointer"
              style={{ borderColor: 'rgba(27,42,91,0.2)', color: '#1B2A5B', opacity: 0.7 }}
            >
              Open For Sponsors
            </button>
          </div>
        </div>

        <img src={heroRunner} alt="" aria-hidden="true" className="hero-runner" />
      </div>

      {showSponsorModal && <SponsorInquiryModal onClose={() => setShowSponsorModal(false)} />}

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
    </Routes>
  );
}
