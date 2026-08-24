import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import HRPortalPage from './pages/HRPortalPage';
import logoDark from './components/logo-dark.png';


const Logo = ({ size = 'h-16' }: { size?: string }) => (
  <img src={logoDark} alt="ISA Marathon" className={`${size} w-auto max-w-full object-contain drop-shadow-lg`} />
);

function HomePage() {
  return (
    <div className="bg-marathon min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <div className="glass-strong rounded-3xl p-5 sm:p-8 md:p-12 text-center">
            {/* Logo with text in hero */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <Logo size="h-20 sm:h-30" />
            </div>
            
            
             <div className="inline-block px-5 py-1.5 sm:px-6 py-2 sm:py-2.5 rounded-full mb-4 sm:mb-6 border-2 text-slate-800 border-white/60 backdrop-blur-sm">
              <span className="text-xs sm:text-sm text-slate-800 font-bold tracking-wider uppercase">INDORE SOFTWARE ASSOCIATION</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-3 sm:mb-4 tracking-tight text-slate-800 drop-shadow-lg leading-tight">
              THE ISA
              <br />
              <span className="gradient-text">MARATHON</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-700 mb-6 sm:mb-8 font-light">
              Run for a <span className="font-semibold text-[oklch(0.53_0.16_147.15)]">Greener</span> Tomorrow
            </p>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 sm:mb-8 tracking-tight leading-tight">
              <span className="text-white drop-shadow-xl">Coming Soon</span>
            </h2>
            
            <div className="mt-2 sm:mt-4 inline-block px-5 py-1.5 sm:px-6 py-2 sm:py-2.5 rounded-full mb-4 sm:mb-6 border-2 text-slate-800 border-white/60 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs sm:text-sm text-slate-800 font-bold tracking-wider uppercase">Open For Sponsors</span>
            </div>
            
            {/* <div className="mt-6 sm:mt-8 glass-dark inline-block px-4 sm:px-5 py-1.5 sm:py-2 rounded-full">
              <span className="text-xs sm:text-sm text-slate-800 font-medium">September 27, 2026 - Indore, India</span>
            </div> */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 py-4 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start text-white/60 text-xs sm:text-sm">
            <Logo size="h-6 sm:h-8" />
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
    </Routes>
  );
}
