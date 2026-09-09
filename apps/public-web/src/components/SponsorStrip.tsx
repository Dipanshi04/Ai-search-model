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
  alwaysSeparate: boolean;
}

interface Sponsor {
  id: string;
  name?: string;
  logoUrl?: string;
  category?: SponsorCategory | null;
}

interface DisplayGroup {
  label: string;
  sponsors: Sponsor[];
}

// Categories with only a sponsor or two fold into one shared "Supported By"
// group instead of each getting a lonely section of their own; a category
// marked alwaysSeparate (e.g. Community Partner) keeps its own section no
// matter how few sponsors are in it.
function groupSponsors(sponsors: Sponsor[]): DisplayGroup[] {
  const byCategory = new Map<string, { name: string; alwaysSeparate: boolean; items: Sponsor[] }>();
  const uncategorized: Sponsor[] = [];

  for (const s of sponsors) {
    if (!s.category) { uncategorized.push(s); continue; }
    const key = s.category.id;
    if (!byCategory.has(key)) byCategory.set(key, { name: s.category.name, alwaysSeparate: s.category.alwaysSeparate, items: [] });
    byCategory.get(key)!.items.push(s);
  }

  const groups: DisplayGroup[] = [];
  const supportedBy: Sponsor[] = [...uncategorized];

  for (const { name, alwaysSeparate, items } of byCategory.values()) {
    if (alwaysSeparate || items.length > 2) {
      groups.push({ label: name, sponsors: items });
    } else {
      supportedBy.push(...items);
    }
  }

  if (supportedBy.length > 0) groups.push({ label: 'Supported By', sponsors: supportedBy });
  return groups;
}

function LogoTile({ label, sponsors }: DisplayGroup) {
  return (
    <div className="text-center">
      <p className="hero-kicker text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1B2A5B', opacity: 0.5 }}>
        {label}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {sponsors.map((s) => (
          <div key={s.id} title={s.name} className="bg-white rounded-lg border border-slate-200 p-2 h-10 sm:h-12 flex items-center" style={{ borderColor: 'rgba(27,42,91,0.12)' }}>
            {s.logoUrl ? (
              // The bundled ISA logo (imported asset, already a usable src)
              // is passed in as-is; real sponsor logos are server-uploaded
              // paths that need the API origin prefixed.
              <img src={s.logoUrl.startsWith('/uploads') ? getImageUrl(s.logoUrl) : s.logoUrl} alt={s.name || 'Sponsor'} className="h-full w-auto object-contain" />
            ) : (
              <span className="text-sm font-bold px-2" style={{ color: '#1B2A5B', opacity: 0.6 }}>{s.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SponsorStrip() {
  const [groups, setGroups] = useState<DisplayGroup[]>([]);

  useEffect(() => {
    api.getSponsors().then((res) => {
      if (res.success && res.data) {
        const withContent = res.data.filter((s: Sponsor) => s.logoUrl || (s.name && s.name.trim()));
        setGroups(groupSponsors(withContent));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="hero-anim px-4 sm:px-8 pb-6 sm:pb-8 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '600ms' }}>
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6" style={{ borderColor: 'rgba(27,42,91,0.1)' }}>
        <div className="flex flex-wrap justify-center sm:justify-between gap-6 sm:gap-8">
          <LogoTile label="Event By" sponsors={[{ id: 'isa', name: 'Indore Software Association', logoUrl: logoDark }]} />
          {groups.map((g) => (
            <LogoTile key={g.label} label={g.label} sponsors={g.sponsors} />
          ))}
        </div>
      </div>
    </div>
  );
}
