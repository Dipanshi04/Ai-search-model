import route3km from './route-3km.jpeg';
import route5km from './route-5km.jpeg';

// Same map image for both distances for now — a distinct 5K route hasn't
// been provided yet, so route-5km.jpeg is a copy of route-3km.jpeg until
// the real one is swapped in.
const ROUTES = [
  { label: '3K Route', src: route3km },
  { label: '5K Route', src: route5km },
];

export default function RaceRouteSection() {
  return (
    <div className="hero-anim px-4 sm:px-8 pb-6 sm:pb-8 relative z-10 max-w-[1400px] mx-auto w-full" style={{ animationDelay: '620ms' }}>
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6" style={{ borderColor: 'rgba(27,42,91,0.1)' }}>
        <h2 className="hero-title text-xl sm:text-2xl font-extrabold mb-4" style={{ color: '#1B2A5B' }}>
          The Race Route
        </h2>

        <div className="space-y-6">
          {ROUTES.map((route) => (
            <div key={route.label}>
              <p className="hero-body text-sm font-bold uppercase tracking-wide mb-2" style={{ color: '#1B2A5B', opacity: 0.6 }}>
                {route.label}
              </p>
              <img
                src={route.src}
                alt={`${route.label} map`}
                className="w-full h-auto rounded-xl border"
                style={{ borderColor: 'rgba(27,42,91,0.1)' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
