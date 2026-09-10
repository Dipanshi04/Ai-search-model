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

interface DisplayGroup {
  label: string;
  sponsors: Sponsor[];
}

// iSHEros' logo is white text on a solid black background — designed to sit
// on a dark surface, not a light card. Wrapping it in the same white tile as
// everything else makes the black background look like a rendering glitch,
// and flattening it to white would erase the (also white) text entirely, so
// it gets a dark tile instead of the shared white one.
const DARK_TILE_SPONSORS = new Set(['iSHEros']);

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const isDark = !!sponsor.name && DARK_TILE_SPONSORS.has(sponsor.name);
  return (
    <div
      title={sponsor.name}
      className="rounded-lg border p-2 h-12 sm:h-14 flex items-center justify-center"
      style={{
        background: isDark ? '#111318' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(27,42,91,0.12)',
      }}
    >
      {sponsor.logoUrl ? (
        // The bundled ISA logo (imported asset, already a usable src) is
        // passed in as-is; real sponsor logos are server-uploaded paths
        // that need the API origin prefixed.
        <img
          src={sponsor.logoUrl.startsWith('/uploads') ? getImageUrl(sponsor.logoUrl) : sponsor.logoUrl}
          alt={sponsor.name || 'Sponsor'}
          className="h-full w-auto object-contain max-w-[100px] sm:max-w-[120px]"
        />
      ) : (
        <span className="text-sm font-bold px-2" style={{ color: isDark ? '#fff' : '#1B2A5B', opacity: isDark ? 0.9 : 0.6 }}>{sponsor.name}</span>
      )}
    </div>
  );
}

// One heading per category — shared by every sponsor in it, so "Community
// Partner" appears once above all of its logos instead of repeating per
// sponsor (matches the print poster's single-category-per-column layout,
// just collapsing duplicate headings when a category has multiple sponsors).
function SponsorGroup({ label, sponsors }: DisplayGroup) {
  return (
    <div className="text-center">
      <p className="hero-kicker text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1B2A5B', opacity: 0.5 }}>
        {label}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {sponsors.map((s) => <SponsorLogo key={s.id} sponsor={s} />)}
      </div>
    </div>
  );
}

function groupByCategory(sponsors: Sponsor[]): DisplayGroup[] {
  const groups: DisplayGroup[] = [];
  const byLabel = new Map<string, DisplayGroup>();

  for (const s of sponsors) {
    const label = s.category?.name || 'Supported By';
    let group = byLabel.get(label);
    if (!group) {
      group = { label, sponsors: [] };
      byLabel.set(label, group);
      groups.push(group);
    }
    group.sponsors.push(s);
  }

  return groups;
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

  const groups = groupByCategory(sponsors);

  return (
    <div className="hero-anim px-4 sm:px-8 pb-6 sm:pb-8 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '600ms' }}>
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6" style={{ borderColor: 'rgba(27,42,91,0.1)' }}>
        <div className="flex flex-wrap justify-center sm:justify-between gap-6 sm:gap-8">
          <SponsorGroup label="Event By" sponsors={[{ id: 'isa', name: 'Indore Software Association', logoUrl: logoDark }]} />
          {groups.map((g) => <SponsorGroup key={g.label} label={g.label} sponsors={g.sponsors} />)}
        </div>
      </div>
    </div>
  );
}
