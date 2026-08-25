import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import HRPortalPage from './pages/HRPortalPage';
import { HRForgotPasswordPage, HRResetPasswordPage } from './pages/HRForgotPasswordPage';
import logoDark from './components/logo-dark.png';
import { useEffect, useState } from "react";


const Logo = ({ size = 'h-16' }: { size?: string }) => (
  <img src={logoDark} alt="ISA Marathon" className={`${size} w-auto max-w-full object-contain drop-shadow-lg`} />
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
    <div className="mt-3 sm:mt-4">
      <p className="text-slate-700 text-xs sm:text-sm font-semibold mb-2">
        COUNTDOWN TO MARATHON DAY
      </p>

      <div className="flex justify-center gap-2 sm:gap-3">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hours" },
          { value: timeLeft.minutes, label: "Minutes" },
          { value: timeLeft.seconds, label: "Seconds" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 min-w-[60px] sm:min-w-[75px] shadow-lg"
          >
            <div className="text-lg sm:text-2xl font-black text-slate-800">
              {String(item.value).padStart(2, "0")}
            </div>

            <div className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function HomePage() {
  return (
    <div className="bg-marathon h-screen overflow-hidden flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 min-h-0">
        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <div className="glass-strong rounded-3xl p-4 sm:p-6 md:p-8 text-center">
            {/* Logo with text in hero */}
            <div className="flex justify-center mb-3 sm:mb-4">
              <Logo size="h-14 sm:h-18" />
            </div>
            
            
             <div className="inline-block px-4 py-1 sm:px-5 py-1.5 rounded-full mb-2 sm:mb-3 border-2 text-slate-800 border-white/60 backdrop-blur-sm">
              <span className="text-[10px] sm:text-xs text-slate-800 font-bold tracking-wider uppercase">INDORE SOFTWARE ASSOCIATION</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 sm:mb-3 tracking-tight text-slate-800 drop-shadow-lg leading-tight">
              THE ISA
              <br />
              <span className="gradient-text">MARATHON</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-slate-700 mb-3 sm:mb-4 font-light">
              Run for a <span className="font-semibold text-[oklch(0.53_0.16_147.15)]">Greener</span> Tomorrow
            </p>
            
            <div className="flex justify-center">
              <span className="white-btn px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-base sm:text-lg shadow-xl">
                Coming Soon
              </span>
            </div>
            <CountdownTimer />
            <div className="mt-3 sm:mt-4 inline-block px-4 py-1 sm:px-5 py-1.5 rounded-full border-2 text-slate-800 border-white/60 backdrop-blur-sm">
              <span className="text-[10px] sm:text-xs text-slate-800 font-medium">Open For Sponsors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 py-2.5 px-3 sm:px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start text-white/60 text-xs sm:text-sm">
            <Logo size="h-5 sm:h-11" />
            <span>&copy; 2026 ISA Marathon. All rights reserved.</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-3 sm:gap-6 text-white/60 text-xs sm:text-sm">
            <a href="#about" className="hover:text-white/90 transition">About</a>
            <a href="#contact" className="hover:text-white/90 transition">Contact</a>
            <a href="#privacy" className="hover:text-white/90 transition">Privacy</a>
          </nav>
        </div>
      </footer>
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
    </Routes>
  );
}
