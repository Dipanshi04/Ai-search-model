import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatDuration } from '@isa/utils';
import logoDark from './components/logo-dark.png';
import logoLight from './components/logo-light.png';
import liseInfoTechLogo from './components/Lise Logo 2.png';
import nrcGroupLogo from './components/nrc-group-logo.png';

const Logo = ({ size = 'h-18', theme = 'dark' }: { size?: string; theme?: 'light' | 'dark' }) => (
  <img src={theme === 'dark' ? logoLight : logoDark} alt="ISA Marathon" className={`${size} w-auto max-w-full object-contain drop-shadow-md`} />
);

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || '';
const EVENT_ID = import.meta.env.VITE_EVENT_ID || '';

function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return `${API_URL}/${url}`;
}

const RUNNER_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
];

interface LeaderboardEntry {
  rank: number;
  name: string;
  bibNumber: string;
  companyName?: string;
  distance: number;
  pace: number | null;
  category?: string;
}

function SponsorTicker({ sponsors }: { sponsors: { id: string; name: string; logoUrl?: string; tier?: string }[] }) {
  const validSponsors = sponsors.filter(s => (s.name && s.name !== 'null' && s.name !== 'undefined') || s.logoUrl);
  if (validSponsors.length === 0) return null;
  const renderItem = (s: { id: string; name: string; logoUrl?: string; tier?: string }, i: number) => {
    const imgUrl = getImageUrl(s.logoUrl);
    const label = (s.name && s.name !== 'null' && s.name !== 'undefined') ? s.name : 'Sponsor';
    return (
      <div key={`${s.id}-${i}`} className="flex items-center shrink-0">
        {imgUrl ? (
          <img src={imgUrl} alt={label} className="h-14 w-auto max-w-[160px] object-contain" />
        ) : (
          <div className="h-12 px-6 rounded-lg flex items-center justify-center text-white font-bold text-lg tracking-wide" style={{ background: s.tier === 'Platinum' ? '#E5E7EB' : s.tier === 'Gold' ? '#FDE047' : s.tier === 'Silver' ? '#94A3B8' : s.tier === 'Bronze' ? '#CD7F32' : '#6B7280' }}>
            {label}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="overflow-hidden flex-1 min-w-0 flex items-center">
      <span className="text-sm font-extrabold text-slate-500 uppercase tracking-[0.3em] shrink-0 pr-6">SPONSORS</span>
      <div className="overflow-hidden flex-1 min-w-0">
        <div className="sponsor-ticker" style={{ display: 'flex', width: 'max-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', paddingRight: '4rem', flexShrink: 0 }}>
            {validSponsors.map((s, i) => renderItem(s, i))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexShrink: 0 }}>
            {validSponsors.map((s, i) => renderItem(s, i + validSponsors.length))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SponsorGrid({ sponsors }: { sponsors: { id: string; name: string; logoUrl?: string; tier?: string }[] }) {
  const valid = sponsors.filter(s => s.name || s.logoUrl);
  const count = valid.length;
  const cols = count <= 4 ? 2 : count <= 9 ? 3 : 3;
  const gap = count <= 4 ? 'gap-4' : count <= 9 ? 'gap-3' : 'gap-2';

  return (
    <div className={`grid ${gap} h-full items-center justify-items-center`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {valid.map((s) => {
        const imgUrl = getImageUrl(s.logoUrl);
        const tierKey = (s.tier || '').toUpperCase();
        const tierBg: Record<string, string> = {
          PLATINUM: 'linear-gradient(135deg, #e2e8f0, #f8fafc)',
          GOLD: 'linear-gradient(135deg, #fbbf24, #fde68a)',
          SILVER: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
          BRONZE: 'linear-gradient(135deg, #f97316, #fed7aa)',
        };
        const bg = tierBg[tierKey] || 'linear-gradient(135deg, #1e293b, #334155)';

        return (
          <div key={s.id} className="relative rounded-xl overflow-hidden border border-slate-700/50 flex items-center justify-center aspect-square w-full hover:scale-[1.03] transition-transform" style={{ background: bg }}>
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

export default function LEDScreen() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalRunners, setTotalRunners] = useState(0);
  const [totalFinished, setTotalFinished] = useState(0);
  const [treeCount, setTreeCount] = useState(0);
  const [co2Offset, setCo2Offset] = useState(0);
  const [currentCategory, setCurrentCategory] = useState('overall');
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [sponsors, setSponsors] = useState<{ id: string; name: string; logoUrl?: string; tier?: string }[]>([]);
  const [sidebarView, setSidebarView] = useState<'leaderboard' | 'sponsors'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [fadeSidebar, setFadeSidebar] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const markerColorsRef = useRef<Map<string, string>>(new Map());
  const startFinishMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const raceStartRef = useRef<Date | null>(null);
  const accumulatedElapsedRef = useRef(0);
  const routePointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const pendingRunnersRef = useRef<any[]>([]);
  const routesByCategoryRef = useRef<Map<string, { lat: number; lng: number }[]>>(new Map());
  const resolvedEventIdRef = useRef<string>(EVENT_ID);

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

    // Clean up existing layers
    try {
      if (map.getLayer('route-glow')) map.removeLayer('route-glow');
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getLayer('route-outline')) map.removeLayer('route-outline');
      if (map.getLayer('start-marker')) map.removeLayer('start-marker');
      if (map.getLayer('finish-marker')) map.removeLayer('finish-marker');
      if (map.getSource('route')) map.removeSource('route');
      if (map.getSource('route-points')) map.removeSource('route-points');
    } catch {}

    // Clean up existing START/FINISH HTML markers
    startFinishMarkersRef.current.forEach((m) => m.remove());
    startFinishMarkersRef.current = [];

    const coords = points.map((p) => [p.lng, p.lat] as [number, number]);

    // Route source
    map.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    });

    // Outer glow layer
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#10b981',
        'line-width': 16,
        'line-opacity': 0.15,
        'line-blur': 8,
      },
    });

    // Main route line
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#10b981',
        'line-width': 5,
        'line-opacity': 0.9,
      },
    });

    // Inner bright line
    map.addLayer({
      id: 'route-outline',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#34d399',
        'line-width': 2,
        'line-opacity': 0.6,
      },
    });

    // Start/Finish markers as symbol layers
    map.addSource('route-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { label: 'START', color: '#10b981' },
            geometry: { type: 'Point', coordinates: coords[0] },
          },
          {
            type: 'Feature',
            properties: { label: 'FINISH', color: '#ef4444' },
            geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
          },
        ],
      },
    });

    // Create custom HTML markers for start/finish
    const startEl = document.createElement('div');
    startEl.innerHTML = `<div style="background:#10b981;color:white;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:1px;white-space:nowrap;box-shadow:0 0 20px rgba(16,185,129,0.6);">START</div>`;
    const startMarker = new mapboxgl.Marker({ element: startEl, offset: [0, -20] })
      .setLngLat(coords[0] as [number, number])
      .addTo(map);

    const finishEl = document.createElement('div');
    finishEl.innerHTML = `<div style="background:#ef4444;color:white;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:1px;white-space:nowrap;box-shadow:0 0 20px rgba(239,68,68,0.6);">FINISH</div>`;
    const finishMarker = new mapboxgl.Marker({ element: finishEl, offset: [0, -20] })
      .setLngLat(coords[coords.length - 1] as [number, number])
      .addTo(map);

    startFinishMarkersRef.current = [startMarker, finishMarker];

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 80, duration: 2000 });

    setMapLoaded(true);
  };

  // Single source of truth for the elapsed-time refs, used on first load,
  // on every race:status broadcast, and re-run on every socket (re)connect
  // — a missed one-time broadcast (tab was asleep, brief disconnect) used
  // to leave the clock frozen forever with no way to catch up.
  function applyRaceStatus(status: string, elapsedMs: number, startedAt?: string) {
    if (status === 'ACTIVE') {
      if (elapsedMs > 0) {
        raceStartRef.current = new Date(Date.now() - elapsedMs);
      } else if (startedAt) {
        raceStartRef.current = new Date(startedAt);
      } else {
        raceStartRef.current = new Date();
      }
      accumulatedElapsedRef.current = 0;
    } else if (status === 'COMPLETED') {
      raceStartRef.current = null;
      accumulatedElapsedRef.current = 0;
    } else {
      // PAUSED, UPCOMING, or anything else — frozen, not ticking.
      raceStartRef.current = null;
      accumulatedElapsedRef.current = elapsedMs || 0;
    }
  }

  useEffect(() => {
    async function loadInitial() {
      try {
        let eventId = EVENT_ID;
        const statusRes = await fetch(`${API_URL}/api/v1/race/status`);
        const statusData = await statusRes.json();
        if (statusData.success && statusData.data?.event) {
          const ev = statusData.data.event;
          eventId = ev.id;
          applyRaceStatus(ev.status, ev.elapsedMs || 0, ev.startedAt);
        }

        if (!eventId) return;
        resolvedEventIdRef.current = eventId;
        setSocketReady(true);

        const eventRes = await fetch(`${API_URL}/api/v1/events/${eventId}`);
        const eventData = await eventRes.json();
          if (eventData.success && eventData.data?.raceDistances) {
            for (const d of eventData.data.raceDistances) {
              if (d._count?.routePoints > 0) {
                try {
                  const routeRes = await fetch(`${API_URL}/api/v1/routes/${d.id}`);
                  const routeData = await routeRes.json();
                  if (routeData.success && routeData.data?.routePoints) {
                    const points = routeData.data.routePoints
                      .sort((a: any, b: any) => a.sequence - b.sequence)
                      .map((p: any) => ({ lat: p.lat, lng: p.lng }));
                    // Store by category name (e.g., "3K", "5K") and also by enum (RUN_3K, RUN_5K)
                    const nameUpper = (d.name || '').toUpperCase();
                    if (nameUpper.includes('3')) {
                      routesByCategoryRef.current.set('RUN_3K', points);
                      routesByCategoryRef.current.set('3K', points);
                    }
                    if (nameUpper.includes('5')) {
                      routesByCategoryRef.current.set('RUN_5K', points);
                      routesByCategoryRef.current.set('5K', points);
                    }
                    // First route with points becomes the default
                    if (routePointsRef.current.length === 0) {
                      routePointsRef.current = points;
                    }
                  }
                } catch (e) {
                  console.error('Failed to fetch route for distance:', d.id, e);
                }
              }
            }
            // Draw default route on existing map if already loaded
            const map = mapRef.current;
            if (map && map.isStyleLoaded() && routePointsRef.current.length >= 2) {
              drawRoute(map, routePointsRef.current);
            }
          }

          const greenRes = await fetch(`${API_URL}/api/v1/trees?eventId=${eventId}`);
          const greenData = await greenRes.json();
          if (greenData.success) {
            setTreeCount(greenData.data.totalTrees);
            setCo2Offset(greenData.data.totalCO2);
          }

          const sponsorRes = await fetch(`${API_URL}/api/v1/sponsors?eventId=${eventId}`);
          const sponsorData = await sponsorRes.json();
          if (sponsorData.success) {
            setSponsors(sponsorData.data);
          }

        const allLbRes = await fetch(`${API_URL}/api/v1/participants/leaderboard?limit=500&eventId=${eventId}`);
        const allLbData = await allLbRes.json();
        if (allLbData.success) {
          setTotalRunners(allLbData.data.length);
          setTotalFinished(allLbData.data.filter((p: any) => p.status === 'FINISHED').length);
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
    const center: [number, number] = firstRoutePoint
      ? [firstRoutePoint.lng, firstRoutePoint.lat]
      : [75.8577, 22.7196];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 14,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Mapbox GL measures its container once at creation and never again on
    // its own — without this, the canvas stays frozen at whatever size the
    // container happened to be at that instant (e.g. mid layout-settle, or
    // before a devtools/display resolution change), leaving it rendering
    // into a fraction of a much larger container.
    const resizeObserver = new ResizeObserver(() => map.resize());
    if (mapContainer.current) resizeObserver.observe(mapContainer.current);

    map.on('load', () => {
      mapRef.current = map;
      if (routePointsRef.current.length >= 2) {
        drawRoute(map, routePointsRef.current);
      }
      // Replay queued runner updates
      for (const data of pendingRunnersRef.current) {
        const color = getColorForRunner(data.participantId);
        if (!markersRef.current.has(data.participantId)) {
          const el = document.createElement('div');
          el.style.cssText = `
            width: 14px; height: 14px;
            background: ${color};
            border-radius: 50%;
            border: 2.5px solid white;
            box-shadow: 0 0 12px ${color}90, 0 0 24px ${color}40;
            position: relative;
          `;
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position: absolute; top: -6px; left: -6px;
            width: 26px; height: 26px;
            border-radius: 50%;
            border: 2px solid ${color}60;
            animation: pulse-ring 2s ease-out infinite;
          `;
          el.appendChild(pulse);
          const marker = new mapboxgl.Marker({ element: el, offset: [-7, -7] })
            .setLngLat([data.lng, data.lat])
            .addTo(map);
          markersRef.current.set(data.participantId, marker);
        }
      }
      pendingRunnersRef.current = [];
      setMapLoaded(true);
    });

    return () => {
      startFinishMarkersRef.current.forEach((m) => m.remove());
      startFinishMarkersRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!socketReady) return;
    const eventId = resolvedEventIdRef.current;
    if (!eventId) return;

    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join:tracking', eventId);
      socket.emit('join:leaderboard', eventId);
      socket.emit('join:event', eventId);

      // Re-fetch rather than trust that no race:status broadcast was missed
      // while this connection was down (or hadn't opened yet).
      fetch(`${API_URL}/api/v1/race/status?eventId=${eventId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.event) {
            applyRaceStatus(res.data.event.status, res.data.event.elapsedMs || 0, res.data.event.startedAt);
          }
        })
        .catch(() => {});
    });

    socket.on('race:start', (data: any) => {
      raceStartRef.current = new Date(data.startedAt);
      setTotalRunners(data.totalParticipants);
    });

    socket.on('runner:update', (data: any) => {
      const map = mapRef.current;
      if (!map || !data.lat || !data.lng) {
        // Queue if map not ready
        if (data.lat && data.lng) pendingRunnersRef.current.push(data);
        return;
      }
      const color = getColorForRunner(data.participantId);
      const existing = markersRef.current.get(data.participantId);
      if (existing) {
        existing.setLngLat([data.lng, data.lat]);
      } else {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 14px; height: 14px;
          background: ${color};
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 0 12px ${color}90, 0 0 24px ${color}40;
          position: relative;
        `;
        const pulse = document.createElement('div');
        pulse.style.cssText = `
          position: absolute; top: -6px; left: -6px;
          width: 26px; height: 26px;
          border-radius: 50%;
          border: 2px solid ${color}60;
          animation: pulse-ring 2s ease-out infinite;
        `;
        el.appendChild(pulse);

        if (!document.getElementById('pulse-keyframes')) {
          const style = document.createElement('style');
          style.id = 'pulse-keyframes';
          style.textContent = `
            @keyframes pulse-ring {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(2); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }

        const marker = new mapboxgl.Marker({ element: el, offset: [-7, -7] })
          .setLngLat([data.lng, data.lat])
          .addTo(map);

        markersRef.current.set(data.participantId, marker);
      }
      if (data.status === 'FINISHED') {
        setTotalFinished((prev) => prev + 1);
      }
    });

    socket.on('leaderboard:update', (data: any) => {
      if (data.category === 'overall') setLeaderboard(mapLeaderboard(data.top10));
    });

    socket.on('trees:update', (data: any) => {
      setTreeCount(data.totalTrees);
      setCo2Offset(data.totalCO2);
    });

    socket.on('announcement', (data: any) => {
      setAnnouncement({ title: data.title, message: data.message });
      setTimeout(() => setAnnouncement(null), 15000);
    });

    socket.on('race:status', (data: any) => {
      applyRaceStatus(data.status, data.elapsedMs || 0, data.startedAt);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [socketReady]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (raceStartRef.current) {
        const liveMs = Date.now() - raceStartRef.current.getTime();
        setElapsedTime(Math.floor((liveMs + accumulatedElapsedRef.current) / 1000));
      } else if (accumulatedElapsedRef.current > 0) {
        setElapsedTime(Math.floor(accumulatedElapsedRef.current / 1000));
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const routeForCategory = routesByCategoryRef.current.get(currentCategory);
    if (routeForCategory && routeForCategory.length >= 2) {
      routePointsRef.current = routeForCategory;
      drawRoute(map, routeForCategory);
    } else if (routePointsRef.current.length >= 2) {
      drawRoute(map, routePointsRef.current);
    }
  }, [currentCategory]);

  useEffect(() => {
    if (sponsors.length === 0) return;
    const interval = setInterval(() => {
      setFadeSidebar(true);
      setTimeout(() => {
        setSidebarView(v => (v === 'leaderboard' ? 'sponsors' : 'leaderboard'));
        setFadeSidebar(false);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, [sponsors.length]);

  // Normalizes two different shapes into one row: raw Prisma rows from the
  // REST /leaderboard endpoint (nested user/company), and the flattened
  // payload the server broadcasts over the leaderboard:update socket event.
  const mapLeaderboard = (data: any[]): LeaderboardEntry[] =>
    data.map((p, i) => ({
      rank: i + 1,
      name: p.user?.name || p.name || p.user?.email || 'Unknown',
      bibNumber: p.bibNumber || '',
      companyName: p.company?.name || p.companyName,
      distance: p.totalDistance ?? p.distance ?? 0,
      pace: null,
      category: p.category,
    }));

  useEffect(() => {
    const eventId = resolvedEventIdRef.current || EVENT_ID;
    if (!eventId) return;
    fetch(`${API_URL}/api/v1/participants/leaderboard?eventId=${eventId}&limit=10`)
      .then(r => r.json())
      .then(res => { if (res.success) setLeaderboard(mapLeaderboard(res.data)); })
      .catch(() => {});
  }, [sponsors, socketReady]);

  return (
    <div className="w-screen h-screen bg-[#0a0f1a] text-white flex flex-col overflow-hidden select-none font-sans">
      {/* Header */}
      <header className="h-[120px] bg-[#0d1320] border-b border-slate-800/60 flex items-center justify-between px-12 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <Logo size="h-18" />
          <div className="w-px h-14 bg-slate-700/60" />
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-2.5 py-1.5">
              <img src={nrcGroupLogo} alt="NRC Group" className="h-11 w-auto object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Main Sponsor</p>
              <p className="text-lg font-extrabold text-white uppercase tracking-wide">NRC Group</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-16">
          <div className="text-center">
            <p className="text-6xl font-mono font-black text-emerald-400 leading-none">{formatDuration(elapsedTime)}</p>
            <p className="text-base text-slate-400 uppercase tracking-widest mt-2">Elapsed</p>
          </div>
          <div className="text-center">
            <p className="text-6xl font-black text-white leading-none">{totalRunners}</p>
            <p className="text-base text-slate-400 uppercase tracking-widest mt-2">Runners</p>
          </div>
          <div className="text-center">
            <p className="text-6xl font-black text-violet-400 leading-none">{totalFinished}</p>
            <p className="text-base text-slate-400 uppercase tracking-widest mt-2">Finished</p>
          </div>
          <div className="text-center">
            <p className="text-6xl font-black text-green-400 leading-none">{treeCount}</p>
            <p className="text-base text-green-400/80 uppercase tracking-widest mt-2">Trees</p>
          </div>
          <div className="text-center">
            <p className="text-6xl font-black text-emerald-300 leading-none">{Math.round(co2Offset)}</p>
            <p className="text-base text-slate-400 uppercase tracking-widest mt-2">kg CO2</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <main className="flex-1 relative min-w-0">
          {MAPBOX_TOKEN ? (
            <div ref={mapContainer} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
              <div className="text-center text-slate-700">
                <p className="text-6xl mb-4">MAP</p>
                <p className="text-lg">Set VITE_MAPBOX_TOKEN to enable map</p>
              </div>
            </div>
          )}

          {/* Map overlay - Route info */}
          {mapLoaded && routePointsRef.current.length > 0 && (
            <div className="absolute bottom-8 left-8 bg-[#0d1320]/90 backdrop-blur-md border border-slate-700/50 rounded-xl px-6 py-4 z-10 pointer-events-none">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                  <span className="text-sm text-slate-300">Route Active</span>
                </div>
                <div className="w-px h-6 bg-slate-700" />
                <span className="text-sm text-slate-400">{routePointsRef.current.length} points mapped</span>
                <div className="w-px h-6 bg-slate-700" />
                <span className="text-sm text-emerald-400 font-bold">{markersRef.current.size} runners tracked</span>
              </div>
            </div>
          )}

          {/* Announcement overlay */}
          {announcement && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-10 py-4 rounded-xl shadow-2xl z-20 animate-fade-in-up">
              <p className="font-black text-lg">{announcement.title}</p>
              <p className="text-base font-medium">{announcement.message}</p>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-[480px] xl:w-[520px] bg-[#0d1320] border-l border-slate-800/60 flex flex-col shrink-0">
          <div className="flex-1 min-h-0 relative">
            {/* Combined Leaderboard (3K + 5K) */}
            <div className={`absolute inset-0 transition-all duration-400 ${sidebarView === 'leaderboard' && !fadeSidebar ? 'opacity-100 translate-x-0' : sidebarView === 'leaderboard' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4 pointer-events-none'}`} style={{ transitionDuration: '400ms' }}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-5 shrink-0">
                  <h2 className="text-lg font-extrabold text-amber-400 uppercase tracking-widest">Leaderboard</h2>
                  <span className="text-sm bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider">3K + 5K</span>
                </div>
                <div className="space-y-2.5 flex-1 min-h-0 overflow-hidden">
                  {leaderboard.map((entry) => (
                    <div key={entry.rank} className={`flex items-center gap-4 px-5 py-3.5 rounded-lg ${entry.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : entry.rank <= 3 ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-slate-900/40'}`}>
                      <span className={`text-lg font-bold w-8 text-center shrink-0 ${entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-orange-400' : 'text-slate-400'}`}>{entry.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold truncate leading-tight text-white">{entry.name}</p>
                        <p className="text-base text-slate-400 truncate">#{entry.bibNumber}{entry.companyName ? ` · ${entry.companyName}` : ''}</p>
                      </div>
                      {entry.category && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 uppercase tracking-wider ${entry.category === 'RUN_5K' ? 'bg-orange-500/15 text-orange-400' : 'bg-sky-500/15 text-sky-400'}`}>
                          {entry.category === 'RUN_5K' ? '5K' : '3K'}
                        </span>
                      )}
                      <span className="text-lg font-mono font-bold text-emerald-400 shrink-0">{entry.distance.toFixed(2)} km</span>
                    </div>
                  ))}
                  {leaderboard.length === 0 && <div className="h-32 flex items-center justify-center"><p className="text-slate-500 text-xl">Waiting for race...</p></div>}
                </div>
              </div>
            </div>

            {/* Sponsors */}
            <div className={`absolute inset-0 transition-all duration-400 ${sidebarView === 'sponsors' && !fadeSidebar ? 'opacity-100 translate-x-0' : sidebarView === 'sponsors' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4 pointer-events-none'}`} style={{ transitionDuration: '400ms' }}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h2 className="text-lg font-extrabold text-emerald-400 uppercase tracking-widest">Our Sponsors</h2>
                  <span className="text-sm bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider">{sponsors.length} Partners</span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SponsorGrid sponsors={sponsors} />
                </div>
              </div>
            </div>
          </div>
          {/* Developer Credit */}
          <div className="mt-auto p-5 shrink-0">
            <div className="flex items-center justify-center gap-3 px-5 py-3 rounded-lg border border-slate-700/60 bg-[#0a0f1a]/80">
              <span className="text-sm sm:text-base text-slate-400 whitespace-nowrap">
                Technology Partner
              </span>
              <img
                src={liseInfoTechLogo}
                alt="Lise InfoTech"
                className="h-8 sm:h-10 w-auto max-w-[120px] object-contain"
              />
            </div>
          </div>
          </aside>
          
        </div>

      {/* Announcement Banner */}
      {announcement && (
        <div className="h-16 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-t border-amber-500/30 flex items-center justify-center px-12 shrink-0">
          <span className="text-amber-400 font-bold mr-4 text-xl">{announcement.title}:</span>
          <span className="text-amber-200/80 text-lg">{announcement.message}</span>
        </div>
      )}

      {/* Sponsors Ticker */}
      <div className="h-24 bg-[#0d1320] border-t border-slate-800/40 flex items-center px-12 shrink-0">
        {/* <span className="text-sm font-extrabold text-slate-500 uppercase tracking-widest mr-8 shrink-0">Sponsors</span> */}
        <SponsorTicker sponsors={sponsors} />
      </div>
    </div>
  );
}
