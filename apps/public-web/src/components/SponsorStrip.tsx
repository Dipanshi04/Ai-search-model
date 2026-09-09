import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import logoDark from './logo-dark.png';

const API_URL = import.meta.env.VITE_API_URL || '';

function getImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface SponsorCategory {
  id: string;
  name: string;
}

interface Sponsor {
  id: string;
  name?: string;
  logoUrl?: string;
  category?: SponsorCategory | null;
}

// One tile per sponsor, its category name shown above the logo — matches
// the print poster, where each partner gets its own labeled column even
// when two sponsors share a category (e.g. two Community Partner tiles).
function SponsorTile({ label, sponsor }: { label: string; sponsor: Sponsor }) {
  return (
    <div className="text-center">
      <p className="hero-kicker text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1B2A5B', opacity: 0.5 }}>
        {label}
      </p>
      <div
        title={sponsor.name}
        className="bg-white rounded-lg border border-slate-200 p-2 h-10 sm:h-12 flex items-center justify-center"
        style={{ borderColor: 'rgba(27,42,91,0.12)' }}
      >
        {sponsor.logoUrl ? (
          // The bundled ISA logo (imported asset, already a usable src) is
          // passed in as-is; real sponsor logos are server-uploaded paths
          // that need the API origin prefixed.
          <img
            src={sponsor.logoUrl.startsWith('/uploads') ? getImageUrl(sponsor.logoUrl) : sponsor.logoUrl}
            alt={sponsor.name || 'Sponsor'}
            className="h-full w-auto object-contain"
          />
        ) : (
          <span className="text-sm font-bold px-2" style={{ color: '#1B2A5B', opacity: 0.6 }}>{sponsor.name}</span>
        )}
      </div>
    </div>
  );
}

export default function SponsorStrip() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    api.getSponsors().then((res) => {
      if (res.success && res.data) {
        const withContent = res.data.filter((s: Sponsor) => s.logoUrl || (s.name && s.name.trim()));
        setSponsors(withContent);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="hero-anim px-4 sm:px-8 pb-6 sm:pb-8 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '600ms' }}>
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6" style={{ borderColor: 'rgba(27,42,91,0.1)' }}>
        <div className="flex flex-wrap justify-center sm:justify-between gap-6 sm:gap-8">
          <SponsorTile label="Event By" sponsor={{ id: 'isa', name: 'Indore Software Association', logoUrl: logoDark }} />
          {sponsors.map((s) => (
            <SponsorTile key={s.id} label={s.category?.name || 'Supported By'} sponsor={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
