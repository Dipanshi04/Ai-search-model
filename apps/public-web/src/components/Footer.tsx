import logoDark from './logo-dark.png';

export default function Footer() {
  return (
    <footer className="border-t py-3 px-4 sm:px-6 shrink-0 relative z-10" style={{ borderColor: 'rgba(27,42,91,0.1)' }}>
      <div className="hero-body max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start text-xs sm:text-sm" style={{ color: '#1B2A5B', opacity: 0.55 }}>
          <img src={logoDark} alt="ISA Marathon" className="h-5 sm:h-7 w-auto object-contain" />
          <span>&copy; 2026 ISA Marathon. All rights reserved.</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm" style={{ color: '#1B2A5B' }}>
          <a href="/about" className="opacity-60 hover:opacity-100 transition-opacity">About</a>
          <a href="/contact" className="opacity-60 hover:opacity-100 transition-opacity">Contact</a>
          <a href="/privacy" className="opacity-60 hover:opacity-100 transition-opacity">Privacy</a>
          <a href="/terms" className="opacity-60 hover:opacity-100 transition-opacity">Terms</a>
        </nav>
      </div>
      <p className="hero-body text-center text-[11px] mt-2 sm:mt-3" style={{ color: '#1B2A5B', opacity: 0.4 }}>
        Crafted by ISA team &middot; Developed by{' '}
        <a
          href="https://www.liseinfotech.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted hover:opacity-100 transition-opacity"
          style={{ opacity: 0.8 }}
        >
          Lise Infotech
        </a>
      </p>
    </footer>
  );
}
