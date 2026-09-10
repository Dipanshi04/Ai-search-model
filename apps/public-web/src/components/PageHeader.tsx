import logoDark from './logo-dark.png';
import nrcGroupLogo from './nrc-group-logo.png';
import solugenixLogo from './solugenix-logo.png';

// Same lockup as the homepage top bar — NRC + ISA logos, "Indore Software
// Association", plus the co-sponsor logo — reused wherever a page wants to
// look like part of the same site rather than a bare utility screen.
export default function PageHeader() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-4 sm:pt-6 relative z-10 shrink-0">
      <div className="hero-kicker text-center leading-tight">
        <span className="text-xs sm:text-sm font-extrabold tracking-[0.1em] uppercase" style={{ color: '#1B2A5B' }}>
          Indore Software Association
        </span>
      </div>
      <a href="/" className="flex items-center gap-3 sm:gap-5 shrink-0">
        <img src={nrcGroupLogo} alt="NRC Group" className="h-12 sm:h-14 w-auto object-contain shrink-0" />
        <img src={logoDark} alt="ISA Marathon" className="h-12 sm:h-14 w-auto object-contain shrink-0" />
      </a>
      <div className="flex flex-col items-center gap-1 mt-0.5">
        <span className="hero-kicker text-[8px] sm:text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#1B2A5B', opacity: 0.45 }}>
          Co-Sponsored By
        </span>
        <div className="bg-white rounded-xl shadow-sm px-2.5 py-1.5 border" style={{ borderColor: 'rgba(27,42,91,0.08)' }}>
          <img src={solugenixLogo} alt="Solugenix" className="h-4 sm:h-5 w-auto object-contain" />
        </div>
      </div>
    </div>
  );
}
