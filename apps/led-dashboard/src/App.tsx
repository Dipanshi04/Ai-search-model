import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatDuration } from '@isa/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const EVENT_ID = import.meta.env.VITE_EVENT_ID || 'default-event-id';

const RUNNER_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
];

const TIER_COLORS: Record<string, string> = {
  PLATINUM: '#e5e7eb',
  GOLD: '#f59e0b',
  SILVER: '#94a3b8',
  BRONZE: '#d97706',
};



interface LeaderboardEntry {
  rank: number;
  name: string;
  bibNumber: string;
  companyName?: string;
  distance: number;
  pace: number | null;
}

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logoUrl?: string;
  website?: string;
}

export default function LEDScreen() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalRunners, setTotalRunners] = useState(0);
  const [totalFinished, setTotalFinished] = useState(0);
  const [treeCount, setTreeCount] = useState(0);
  const [co2Offset, setCo2Offset] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentCategory, setCurrentCategory] = useState('overall');
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const markerColorsRef = useRef<Map<string, string>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const raceStartRef = useRef<Date | null>(null);

  const getColorForRunner = (participantId: string): string => {
    if (markerColorsRef.current.has(participantId)) {
      return markerColorsRef.current.get(participantId)!;
    }
    const colorIndex = markerColorsRef.current.size % RUNNER_COLORS.length;
    const color = RUNNER_COLORS[colorIndex] || '#3b82f6';
    markerColorsRef.current.set(participantId, color);
    return color;
  };

  const drawRoute = (map: mapboxgl.Map, points: { lat: number; lng: number }[]) => {
    if (!map || !map.isStyleLoaded() || points.length < 2) return;
    try {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');
    } catch {}
    const coords = points.map((p) => [p.lng, p.lat] as [number, number]);
    map.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    });
    map.addLayer({
      id: 'route-line', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.6 },
    });
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 80, duration: 2000 });
  };

  const routePointsRef = useRef<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const eventRes = await fetch(`${API_URL}/api/v1/events/${EVENT_ID}`);
        const eventData = await eventRes.json();
        if (eventData.success && eventData.data?.distances) {
          const allPoints: { lat: number; lng: number }[] = [];
          for (const d of eventData.data.distances) {
            if (d.routePoints && d.routePoints.length > 0) {
              allPoints.push(...d.routePoints.map((p: any) => ({ lat: p.lat, lng: p.lng })));
            }
          }
          if (allPoints.length > 0) {
            routePointsRef.current = allPoints;
          }
        }

        const lbRes = await fetch(`${API_URL}/api/v1/participants/leaderboard?limit=10`);
        const lbData = await lbRes.json();
        if (lbData.success) setLeaderboard(lbData.data);

        const allLbRes = await fetch(`${API_URL}/api/v1/participants/leaderboard?limit=500`);
        const allLbData = await allLbRes.json();
        if (allLbData.success) {
          setTotalRunners(allLbData.data.length);
          setTotalFinished(allLbData.data.filter((p: any) => p.status === 'FINISHED').length);
        }

        const sponsorRes = await fetch(`${API_URL}/api/v1/sponsors?eventId=${EVENT_ID}`);
        const sponsorData = await sponsorRes.json();
        if (sponsorData.success) setSponsors(sponsorData.data);

        const greenRes = await fetch(`${API_URL}/api/v1/green/trees?eventId=${EVENT_ID}`);
        const greenData = await greenRes.json();
        if (greenData.success) {
          setTreeCount(greenData.data.totalTrees);
          setCo2Offset(greenData.data.totalCO2);
        }
      } catch (error) {
        console.error('LED: Initial load error:', error);
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const firstRoutePoint = routePointsRef.current[0];
    const center = firstRoutePoint
      ? [firstRoutePoint.lng, firstRoutePoint.lat] as [number, number]
      : [75.8577, 22.7196] as [number, number];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 14,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      if (routePointsRef.current.length >= 2) {
        drawRoute(map, routePointsRef.current);
      }
    });

    return () => { mapRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join:tracking', EVENT_ID);
      socket.emit('join:leaderboard', EVENT_ID);
      socket.emit('join:event', EVENT_ID);
    });

    socket.on('race:start', (data: any) => {
      raceStartRef.current = new Date(data.startedAt);
      setTotalRunners(data.totalParticipants);
    });

    socket.on('runner:update', (data: any) => {
      const map = mapRef.current;
      if (!map || !data.lat || !data.lng) return;

      const color = getColorForRunner(data.participantId);
      const existing = markersRef.current.get(data.participantId);
      if (existing) {
        existing.setLngLat([data.lng, data.lat]);
      } else {
        const el = document.createElement('div');
        el.innerHTML = `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 8px ${color}90;"></div>`;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([data.lng, data.lat])
          .addTo(map);
        markersRef.current.set(data.participantId, marker);
      }

      if (data.status === 'FINISHED') {
        setTotalFinished((prev) => prev + 1);
      }
    });

    socket.on('leaderboard:update', (data: any) => {
      if (data.category === currentCategory) {
        setLeaderboard(data.top10);
      }
    });

    socket.on('trees:update', (data: any) => {
      setTreeCount(data.totalTrees);
      setCo2Offset(data.totalCO2);
    });

    socket.on('announcement', (data: any) => {
      setAnnouncement({ title: data.title, message: data.message });
      setTimeout(() => setAnnouncement(null), 15000);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [currentCategory]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (raceStartRef.current) {
        setElapsedTime(Math.floor((Date.now() - raceStartRef.current.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const categories = ['overall', 'RUN_3K', 'RUN_5K', 'company'];
    const interval = setInterval(() => {
      setCurrentCategory((prev) => {
        const idx = categories.indexOf(prev);
        return categories[(idx + 1) % categories.length] || prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getSponsorInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const categoryLabel: Record<string, string> = {
    overall: 'Overall',
    RUN_3K: '3K',
    RUN_5K: '5K',
    company: 'Company',
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-[70px] xl:h-[80px] bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 flex items-center justify-between px-6 xl:px-10 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-slate-900 text-lg xl:text-xl">ISA</div>
          <div>
            <h1 className="text-xl xl:text-3xl font-black text-white tracking-wider leading-tight">ISA TECH MARATHON</h1>
            <p className="text-[10px] xl:text-xs text-emerald-400 tracking-[0.2em]">RUN FOR A GREENER TOMORROW</p>
          </div>
        </div>

        <div className="flex items-center gap-8 xl:gap-14">
          <div className="text-center">
            <p className="text-2xl xl:text-4xl font-black font-mono text-emerald-400 tracking-wider leading-none">{formatDuration(elapsedTime)}</p>
            <p className="text-[9px] xl:text-[11px] text-slate-400 uppercase tracking-[0.15em] mt-1">Elapsed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl xl:text-4xl font-black text-white leading-none">{totalRunners.toLocaleString()}</p>
            <p className="text-[9px] xl:text-[11px] text-slate-400 uppercase tracking-[0.15em] mt-1">Runners</p>
          </div>
          <div className="text-center">
            <p className="text-2xl xl:text-4xl font-black text-purple-400 leading-none">{totalFinished.toLocaleString()}</p>
            <p className="text-[9px] xl:text-[11px] text-slate-400 uppercase tracking-[0.15em] mt-1">Finished</p>
          </div>
          <div className="text-center">
            <p className="text-2xl xl:text-4xl font-black text-green-400 leading-none">{treeCount.toLocaleString()}</p>
            <p className="text-[9px] xl:text-[11px] text-green-500 uppercase tracking-[0.15em] mt-1">Trees</p>
          </div>
          <div className="text-center">
            <p className="text-2xl xl:text-4xl font-black text-emerald-300 leading-none">{Math.round(co2Offset).toLocaleString()}</p>
            <p className="text-[9px] xl:text-[11px] text-slate-400 uppercase tracking-[0.15em] mt-1">kg CO2</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Green Impact */}
        <aside className="hidden lg:flex w-56 xl:w-64 bg-slate-900/60 border-r border-slate-800/50 p-5 xl:p-7 flex-col shrink-0">
          <h2 className="text-sm xl:text-base font-black text-green-400 mb-5 xl:mb-7 text-center uppercase tracking-[0.2em]">Green Impact</h2>
          <div className="space-y-5 xl:space-y-7 text-center flex-1 flex flex-col justify-center">
            <div>
              <p className="text-4xl xl:text-5xl font-black text-green-400 leading-none">{treeCount.toLocaleString()}</p>
              <p className="text-[10px] xl:text-xs text-slate-400 mt-2 uppercase tracking-wider">Trees Planted</p>
            </div>
            <div className="w-16 h-px bg-slate-700 mx-auto" />
            <div>
              <p className="text-2xl xl:text-3xl font-black text-emerald-400 leading-none">{Math.round(co2Offset).toLocaleString()}</p>
              <p className="text-[10px] xl:text-xs text-slate-400 mt-2 uppercase tracking-wider">kg CO2 Offset</p>
            </div>
            <div className="w-16 h-px bg-slate-700 mx-auto" />
            <div>
              <p className="text-xl xl:text-2xl font-black text-amber-400 leading-none">{Math.floor(co2Offset / 4600)}</p>
              <p className="text-[10px] xl:text-xs text-slate-400 mt-2 uppercase tracking-wider">Cars Off Road/Yr</p>
            </div>
          </div>

          {/* Sponsors Ticker at Bottom */}
          {sponsors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
              <p className="text-[9px] xl:text-[10px] text-slate-500 uppercase tracking-[0.2em] text-center mb-2 hidden lg:block">Our Sponsors</p>
              {[...sponsors, ...sponsors, ...sponsors, ...sponsors].map((sponsor, i) => (
                <div
                  key={`${sponsor.id}-${i}`}
                  className="border rounded-md p-2 bg-slate-800/50 transition-all hover:bg-slate-700/50 group cursor-pointer group-hover:bg-slate-700/80">
{sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} className="w-full h-24 object-contain transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div
                      className="h-24 rounded-md flex items-center justify-center bg-slate-700/50"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-black"
                        style={{ backgroundColor: `${TIER_COLORS[sponsor.tier] || '#475569'}20`, color: TIER_COLORS[sponsor.tier] || '#94a3b8' }}
                      >
                        {getSponsorInitials(sponsor.name)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Center - Map */}
        <main className="flex-1 relative min-w-0">
          {MAPBOX_TOKEN ? (
            <div ref={mapContainer} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/30">
              <div className="text-center text-slate-600">
                <p className="text-6xl mb-4">MAP</p>
                <p className="text-xl">Set VITE_MAPBOX_TOKEN to enable map</p>
              </div>
            </div>
          )}

          {/* Announcement Overlay */}
          {announcement && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-900 px-8 py-3 rounded-xl shadow-2xl z-10 animate-pulse">
              <p className="font-black text-lg">{announcement.title}</p>
              <p className="text-sm font-medium">{announcement.message}</p>
            </div>
          )}
        </main>

        {/* Right Sidebar - Leaderboard */}
        <aside className="w-64 xl:w-80 bg-slate-900/60 border-l border-slate-800/50 p-4 xl:p-5 flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-3 xl:mb-4">
            <h2 className="text-sm xl:text-base font-black text-amber-400 uppercase tracking-[0.15em]">
              {categoryLabel[currentCategory] || 'Leaderboard'}
            </h2>
            <span className="text-[9px] xl:text-[10px] text-slate-500 uppercase tracking-wider">Top 10</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`border rounded-lg p-3 bg-slate-800/50 transition-all hover:bg-slate-700/50 cursor-pointer ${entry.rank <= 3 ? 'border-emerald-500/30' : ''} ${entry.rank === 1 ? 'animate-pulse' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-bold w-6 text-center ${
                    entry.rank === 1 ? 'text-amber-400' :
                    entry.rank === 2 ? 'text-slate-300' :
                    entry.rank === 3 ? 'text-orange-500' :
                    'text-slate-400'
                  }`}>
                    {entry.rank}
                  </span>
                  <div>
                    <p className="text-xs font-bold truncate leading-tight">{entry.name}</p>
                    <p className="text-[8px] text-slate-400 truncate">
                      {entry.bibNumber}{entry.companyName ? ` · ${entry.companyName}` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-emerald-400 whitespace-nowrap">{entry.distance.toFixed(2)} km</p>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="col-span-full h-24 flex items-center justify-center">
                <p className="text-slate-600 text-sm text-center">Waiting for race...</p>
              </div>
            )}
          </div>

          {/* Mobile Sponsors Ticker */}
          {sponsors.length > 0 && (
<div className="grid grid-cols-2 gap-2 pt-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] text-center mb-2 hidden lg:block">Sponsors</p>
              {[...sponsors, ...sponsors].map((sponsor, i) => (
                <div
                  key={`m-${sponsor.id}-${i}`}
                  className="border rounded-md p-2 bg-slate-800/50 transition-all hover:bg-slate-700/50 group cursor-pointer group-hover:bg-slate-700/80">
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} className="w-full h-24 object-contain transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div
                      className="h-24 rounded-md flex items-center justify-center bg-slate-700/50"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-black"
                        style={{ backgroundColor: `${TIER_COLORS[sponsor.tier] || '#475569'}20`, color: TIER_COLORS[sponsor.tier] || '#94a3b8' }}
                      >
                        {getSponsorInitials(sponsor.name)}
                      </div>
                    </div>
                  }
                </div>
              ))}
            </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom Announcement Banner */}
      {announcement && (
        <div className="h-10 xl:h-12 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-t border-amber-500/40 flex items-center justify-center px-8 shrink-0">
          <span className="text-amber-400 font-black mr-3 text-sm xl:text-base">{announcement.title}:</span>
          <span className="text-amber-200 text-xs xl:text-sm">{announcement.message}</span>
        </div>
      )}
    </div>
  );
}
