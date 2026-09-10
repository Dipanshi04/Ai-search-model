import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

function toAbsolute(url: string) {
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

interface Sponsor {
  id: string;
  name?: string;
  logoUrl?: string;
}

// A slow, continuous horizontal scroll of every sponsor logo — the list is
// duplicated once so the loop wraps seamlessly instead of snapping back.
export default function SponsorTicker() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    api.getSponsors().then((res) => {
      if (res.success && res.data) {
        setSponsors(res.data.filter((s: Sponsor) => s.logoUrl));
      }
    }).catch(() => {});
  }, []);

  if (sponsors.length === 0) return null;

  const track = [...sponsors, ...sponsors];

  return (
    <div style={{ overflow: 'hidden', width: '100%', padding: '8px 0 4px', maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: 'max-content',
          animation: 'isa-sponsor-ticker 22s linear infinite',
        }}
      >
        {track.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            style={{ background: '#fff', borderRadius: '10px', padding: '5px 10px', border: '1px solid #e2e8f0', flexShrink: 0 }}
          >
            <img src={toAbsolute(s.logoUrl!)} alt={s.name || 'Sponsor'} style={{ height: '22px', width: 'auto', maxWidth: '90px', objectFit: 'contain', display: 'block' }} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes isa-sponsor-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
