import { getImageUrl, Sponsor } from '../useLedDashboardData';

interface Props {
  sponsors: Sponsor[];
  theme: 'dark' | 'light';
}

// Ticker (bottom strip) and grid (sponsor sidebar tab) share the same data
// shape and tier-color logic — only the surrounding text/border colors
// change between the dark LED theme and the light runner-app theme.
export function SponsorTicker({ sponsors, theme }: Props) {
  const validSponsors = sponsors.filter(s => (s.name && s.name !== 'null' && s.name !== 'undefined') || s.logoUrl);
  if (validSponsors.length === 0) return null;
  // Associate Sponsors stay put in a fixed strip instead of scrolling with
  // everyone else — they're lower-tier by design, but still deserve to be
  // visible at all times rather than only when the ticker happens to loop
  // past them.
  const associateSponsors = validSponsors.filter(s => s.category?.name === 'Associate Sponsor');
  const scrollingSponsors = validSponsors.filter(s => s.category?.name !== 'Associate Sponsor');
  const labelClass = theme === 'dark' ? 'text-slate-500' : 'text-[#1B2A5B]/50';
  const borderClass = theme === 'dark' ? 'border-slate-800/40' : 'border-[#1B2A5B]/10';
  const renderItem = (s: Sponsor, i: number) => {
    const imgUrl = getImageUrl(s.logoUrl);
    const label = (s.name && s.name !== 'null' && s.name !== 'undefined') ? s.name : 'Sponsor';
    return (
      <div key={`${s.id}-${i}`} className="flex items-center shrink-0">
        {imgUrl ? (
          <div className="bg-white rounded-md px-3 py-1.5 flex items-center justify-center">
            <img src={imgUrl} alt={label} className="h-6 w-auto max-w-[120px] object-contain" />
          </div>
        ) : (
          <div className="h-9 px-5 rounded-lg flex items-center justify-center text-white font-bold text-base tracking-wide" style={{ background: s.tier === 'Platinum' ? '#E5E7EB' : s.tier === 'Gold' ? '#FDE047' : s.tier === 'Silver' ? '#94A3B8' : s.tier === 'Bronze' ? '#CD7F32' : '#6B7280' }}>
            {label}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="overflow-hidden flex-1 min-w-0 flex items-center">
      <span className={`text-sm font-extrabold uppercase tracking-[0.3em] shrink-0 pr-6 ${labelClass}`}>SPONSORS</span>
      {scrollingSponsors.length > 0 ? (
        <div className="overflow-hidden flex-1 min-w-0">
          <div className="sponsor-ticker" style={{ display: 'flex', width: 'max-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', paddingRight: '4rem', flexShrink: 0 }}>
              {scrollingSponsors.map((s, i) => renderItem(s, i))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexShrink: 0 }}>
              {scrollingSponsors.map((s, i) => renderItem(s, i + scrollingSponsors.length))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0" />
      )}
      {associateSponsors.length > 0 && (
        <div className={`flex items-center gap-6 shrink-0 pl-6 ml-6 border-l ${borderClass}`}>
          {associateSponsors.map((s, i) => renderItem(s, i))}
        </div>
      )}
    </div>
  );
}

export function SponsorGrid({ sponsors, theme }: Props) {
  const valid = sponsors.filter(s => s.name || s.logoUrl);
  const count = valid.length;
  const gap = count <= 4 ? 'gap-4' : count <= 9 ? 'gap-3' : 'gap-2';
  const cardBorder = theme === 'dark' ? 'border-slate-700/50' : 'border-[#1B2A5B]/10';

  return (
    <div className={`grid ${gap} h-full items-center justify-items-center`} style={{ gridTemplateColumns: `repeat(${count <= 4 ? 2 : 3}, 1fr)` }}>
      {valid.map((s) => {
        const imgUrl = getImageUrl(s.logoUrl);
        const tierKey = (s.tier || '').toUpperCase();
        const tierBg: Record<string, string> = {
          PLATINUM: 'linear-gradient(135deg, #e2e8f0, #f8fafc)',
          GOLD: 'linear-gradient(135deg, #fbbf24, #fde68a)',
          SILVER: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
          BRONZE: 'linear-gradient(135deg, #f97316, #fed7aa)',
        };
        const bg = tierBg[tierKey] || (theme === 'dark' ? 'linear-gradient(135deg, #1e293b, #334155)' : 'linear-gradient(135deg, #ffffff, #f5f1ea)');

        return (
          <div key={s.id} className={`relative rounded-xl overflow-hidden border ${cardBorder} flex items-center justify-center aspect-square w-full hover:scale-[1.03] transition-transform`} style={{ background: bg }}>
            {imgUrl ? (
              <img src={imgUrl} alt={s.name || 'Sponsor'} className="w-3/4 h-3/4 object-contain drop-shadow-lg" />
            ) : (
              <div className="w-3/5 h-3/5 rounded-xl flex items-center justify-center font-black text-white text-2xl" style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>
                {(s.name || 'S')[0]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
