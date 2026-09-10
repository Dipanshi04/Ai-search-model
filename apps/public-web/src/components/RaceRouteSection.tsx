import { useState } from 'react';
import route3km from './route-3km.jpeg';

// Same map for both distances for now — a distinct 5K route image hasn't
// been provided yet, so this reuses the 3K one until it is.
const ROUTES: Record<'3K' | '5K', string | null> = {
  '3K': route3km,
  '5K': route3km,
};

export default function RaceRouteSection() {
  const [active, setActive] = useState<'3K' | '5K'>('3K');
  const mapSrc = ROUTES[active];

  return (
    <div className="hero-anim px-4 sm:px-8 pb-6 sm:pb-8 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '620ms' }}>
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6" style={{ borderColor: 'rgba(27,42,91,0.1)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="hero-title text-xl sm:text-2xl font-extrabold" style={{ color: '#1B2A5B' }}>
            The Race Route
          </h2>
          <div className="inline-flex rounded-full p-1 self-start" style={{ background: 'rgba(27,42,91,0.06)' }}>
            {(['3K', '5K'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className="hero-body px-5 py-2 rounded-full text-sm font-bold transition"
                style={
                  active === key
                    ? { background: '#1B2A5B', color: '#fff' }
                    : { color: '#1B2A5B', opacity: 0.55 }
                }
              >
                {key} Route
              </button>
            ))}
          </div>
        </div>

        {mapSrc ? (
          <img
            src={mapSrc}
            alt={`${active} race route map`}
            className="w-full h-auto rounded-xl border"
            style={{ borderColor: 'rgba(27,42,91,0.1)' }}
          />
        ) : (
          <div
            className="w-full aspect-video rounded-xl border border-dashed flex items-center justify-center"
            style={{ borderColor: 'rgba(27,42,91,0.2)' }}
          >
            <p className="hero-body text-sm font-semibold" style={{ color: '#1B2A5B', opacity: 0.4 }}>
              {active} route map coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
