import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Sponsor {
  id: string;
  name: string;
  logoUrl: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || '';

// A slow, continuous marquee of sponsor logos — the list is duplicated once
// so the CSS animation can loop from -50% back to 0% with no visible seam.
export default function SponsorStrip() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    api.getSponsors().then((res) => {
      if (res.success && res.data) {
        setSponsors(res.data.filter((s: Sponsor) => !!s.logoUrl));
      }
    }).catch(() => {});
  }, []);

  if (sponsors.length === 0) return null;

  const track = [...sponsors, ...sponsors];

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '14px 0', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center', margin: '0 0 10px' }}>
        Our Sponsors
      </p>
      <div style={{ display: 'flex', width: 'max-content', animation: `sponsorScroll ${sponsors.length * 4}s linear infinite` }}>
        {track.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            style={{
              flexShrink: 0,
              width: '96px',
              height: '52px',
              margin: '0 10px',
              background: '#f8fafc',
              border: '1px solid #eef2f6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
            }}
          >
            <img
              src={`${API_URL}${s.logoUrl}`}
              alt={s.name}
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>
      <style>{`@keyframes sponsorScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
