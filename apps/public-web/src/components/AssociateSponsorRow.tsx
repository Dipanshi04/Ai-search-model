import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

function getImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface Sponsor {
  id: string;
  name?: string;
  logoUrl?: string;
  category?: { name: string } | null;
}

// A small row in the page header, below the Co-Sponsored By lockup — kept
// separate from SponsorStrip's full "OUR PARTNERS" grid further down the
// page, since this is meant to stay compact (3-4 logos) and sit with the
// other header badges (Safety/Green City Partner) rather than the full list.
export default function AssociateSponsorRow() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    api.getSponsors().then((res) => {
      if (res.success && res.data) {
        const associates = res.data.filter(
          (s: Sponsor) => s.category?.name === 'Associate Sponsor' && s.logoUrl
        );
        setSponsors(associates);
      }
    }).catch(() => {});
  }, []);

  if (sponsors.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1 mt-1 mb-2 sm:mb-3">
      <span className="hero-kicker text-[8px] sm:text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#1B2A5B', opacity: 0.45 }}>
        Associate Sponsor
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {sponsors.map((s) => (
          <div
            key={s.id}
            title={s.name}
            className="bg-white rounded-xl shadow-sm px-2.5 py-1.5 border h-8 sm:h-9 flex items-center"
            style={{ borderColor: 'rgba(27,42,91,0.08)' }}
          >
            <img
              src={getImageUrl(s.logoUrl)}
              alt={s.name || 'Associate Sponsor'}
              className="h-full w-auto object-contain max-w-[70px] sm:max-w-[90px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
