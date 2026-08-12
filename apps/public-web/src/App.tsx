import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';

function HomePage() {
  return (
    <div className="bg-marathon min-h-screen flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 md:p-16 text-center">
          <div className="glass-dark inline-block px-5 py-2 rounded-full mb-6 sm:mb-8">
            <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-800">INDORE SOFTWARE ASSOCIATION</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 tracking-tight text-slate-800 drop-shadow-lg">
            THE ISA
            <br />
            <span className="gradient-text">MARATHON</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-slate-700 mb-8 sm:mb-10 font-light">
            Run for a <span className="font-semibold text-pink-600">Greener</span> Tomorrow
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/register" 
              className="white-btn px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg shadow-xl"
            >
              Register Now
            </a>
            <a 
              href="/leaderboard" 
              className="glass-dark px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-slate-800 font-semibold text-base sm:text-lg hover:bg-white/60 transition-all"
            >
              View Leaderboard
            </a>
          </div>
          
          <div className="mt-8 sm:mt-10 glass-dark inline-block px-5 sm:px-6 py-2 sm:py-3 rounded-full">
            <span className="text-sm sm:text-base text-slate-800 font-medium">August 24, 2026 - Indore, India</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}
