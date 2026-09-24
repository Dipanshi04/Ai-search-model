import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || '';
const EVENT_ID = import.meta.env.VITE_EVENT_ID || '';

export function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return `${API_URL}/${url}`;
}

// Runner dots on the map are colored by gender — blue for male, pink for
// female — rather than an arbitrary per-runner palette, so the map itself
// communicates the male/female split at a glance.
export const MALE_COLOR = '#3b82f6';
export const FEMALE_COLOR = '#ec4899';
export const UNKNOWN_COLOR = '#94a3b8';

export function colorForGender(gender: string | undefined): string {
  if (gender === 'MALE') return MALE_COLOR;
  if (gender === 'FEMALE') return FEMALE_COLOR;
  return UNKNOWN_COLOR;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  bibNumber: string;
  companyName?: string;
  distance: number;
  pace: number | null;
  category?: string;
  participantId?: string;
  status?: string;
  gender?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string;
  tier?: string;
  category?: { name: string } | null;
}

// All the data-fetching, socket wiring, and map-marker plumbing shared by
// both the dark (LED wall) and light (runner-app-styled) dashboard variants
// — everything here is layout/color agnostic, so a visual restyle never
// needs to touch this file.
export function useLedDashboardData(mapStyle: string) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalRunners, setTotalRunners] = useState(0);
  const [totalFinished, setTotalFinished] = useState(0);
  const [treeCount, setTreeCount] = useState(0);
  const [co2Offset, setCo2Offset] = useState(0);
  const [currentCategory, setCurrentCategory] = useState('overall');
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [leaderboard3k, setLeaderboard3k] = useState<LeaderboardEntry[]>([]);
  const [leaderboard5k, setLeaderboard5k] = useState<LeaderboardEntry[]>([]);
  const [sidebarView, setSidebarView] = useState<'leaderboard' | 'sponsors'>('leaderboard');
  const [fadeSidebar, setFadeSidebar] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [routePointCount, setRoutePointCount] = useState(0);
  const [trackedCount, setTrackedCount] = useState(0);
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
  // Last time each runner's GPS actually reached the server — lets the
  // leaderboard show a live/delayed/stopped signal per runner instead of
  // silently going stale with no indication anything's wrong.
  const lastSeenRef = useRef<Map<string, number>>(new Map());
  const [nowTick, setNowTick] = useState(Date.now());

  // Cached per runner so a marker's color doesn't flicker between blue and
  // pink if a later update ever arrives without a gender field.
  const getColorForRunner = (participantId: string, gender?: string): string => {
    if (gender) {
      const color = colorForGender(gender);
      markerColorsRef.current.set(participantId, color);
      return color;
    }
    return markerColorsRef.current.get(participantId) || UNKNOWN_COLOR;
  };

  const drawRoute = (map: mapboxgl.Map, points: { lat: number; lng: number }[]) => {
    if (!map || !map.isStyleLoaded() || points.length < 2) return;

    try {
      if (map.getLayer('route-glow')) map.removeLayer('route-glow');
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getLayer('route-outline')) map.removeLayer('route-outline');
      if (map.getLayer('start-marker')) map.removeLayer('start-marker');
      if (map.getLayer('finish-marker')) map.removeLayer('finish-marker');
      if (map.getSource('route')) map.removeSource('route');
      if (map.getSource('route-points')) map.removeSource('route-points');
    } catch {}

    startFinishMarkersRef.current.forEach((m) => m.remove());
    startFinishMarkersRef.current = [];

    const coords = points.map((p) => [p.lng, p.lat] as [number, number]);

    map.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    });

    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#10b981', 'line-width': 16, 'line-opacity': 0.15, 'line-blur': 8 },
    });

    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.9 },
    });

    map.addLayer({
      id: 'route-outline',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#34d399', 'line-width': 2, 'line-opacity': 0.6 },
    });

    map.addSource('route-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { label: 'START', color: '#10b981' }, geometry: { type: 'Point', coordinates: coords[0] } },
          { type: 'Feature', properties: { label: 'FINISH', color: '#ef4444' }, geometry: { type: 'Point', coordinates: coords[coords.length - 1] } },
        ],
      },
    });

    const startEl = document.createElement('div');
    startEl.innerHTML = `<div style="background:#10b981;color:white;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:1px;white-space:nowrap;box-shadow:0 0 20px rgba(16,185,129,0.6);">START</div>`;
    const startMarker = new mapboxgl.Marker({ element: startEl, offset: [0, -20] }).setLngLat(coords[0] as [number, number]).addTo(map);

    const finishEl = document.createElement('div');
    finishEl.innerHTML = `<div style="background:#ef4444;color:white;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:1px;white-space:nowrap;box-shadow:0 0 20px rgba(239,68,68,0.6);">FINISH</div>`;
    const finishMarker = new mapboxgl.Marker({ element: finishEl, offset: [0, -20] }).setLngLat(coords[coords.length - 1] as [number, number]).addTo(map);

    startFinishMarkersRef.current = [startMarker, finishMarker];

    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 80, duration: 2000 });

    setRoutePointCount(points.length);
    setMapLoaded(true);
  };

  function applyRaceStatus(status: string, elapsedMs: number, startedAt?: string) {
    if (status === 'ACTIVE') {
      if (elapsedMs > 0) raceStartRef.current = new Date(Date.now() - elapsedMs);
      else if (startedAt) raceStartRef.current = new Date(startedAt);
      else raceStartRef.current = new Date();
      accumulatedElapsedRef.current = 0;
    } else if (status === 'COMPLETED') {
      raceStartRef.current = null;
      accumulatedElapsedRef.current = 0;
    } else {
      raceStartRef.current = null;
      accumulatedElapsedRef.current = elapsedMs || 0;
    }
  }

  function addRunnerMarker(map: mapboxgl.Map, data: any) {
    const color = getColorForRunner(data.participantId, data.gender);
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
      style.textContent = `@keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }`;
      document.head.appendChild(style);
    }

    const marker = new mapboxgl.Marker({ element: el, offset: [-7, -7] }).setLngLat([data.lng, data.lat]).addTo(map);
    markersRef.current.set(data.participantId, marker);
    setTrackedCount(markersRef.current.size);
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
                  const nameUpper = (d.name || '').toUpperCase();
                  if (nameUpper.includes('3')) {
                    routesByCategoryRef.current.set('RUN_3K', points);
                    routesByCategoryRef.current.set('3K', points);
                  }
                  if (nameUpper.includes('5')) {
                    routesByCategoryRef.current.set('RUN_5K', points);
                    routesByCategoryRef.current.set('5K', points);
                  }
                  if (routePointsRef.current.length === 0) routePointsRef.current = points;
                }
              } catch (e) {
                console.error('Failed to fetch route for distance:', d.id, e);
              }
            }
          }
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
        if (sponsorData.success) setSponsors(sponsorData.data);

        // Actual registration total, not the leaderboard — the leaderboard
        // fetch used to double as this count via its length, but it's capped
        // by its own `limit` param, so once registrations passed that cap
        // this silently froze at the cap instead of the real number.
        const statsRes = await fetch(`${API_URL}/api/v1/participants/stats/summary?eventId=${eventId}`);
        const statsData = await statsRes.json();
        if (statsData.success) {
          setTotalRunners(statsData.data.total);
          setTotalFinished(statsData.data.finished);
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
    const center: [number, number] = firstRoutePoint ? [firstRoutePoint.lng, firstRoutePoint.lat] : [75.8577, 22.7196];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center,
      zoom: 14,
      interactive: true,
      attributionControl: false,
    });

    // No NavigationControl — this is an unattended LED/signage display, not
    // something a viewer zooms or pans by hand, and the default dark widget
    // looked out of place floating over the light theme's map.

    // Mapbox GL measures its container once at creation and never again on
    // its own — without this, the canvas stays frozen at whatever size the
    // container happened to be at that instant.
    const resizeObserver = new ResizeObserver(() => map.resize());
    if (mapContainer.current) resizeObserver.observe(mapContainer.current);

    map.on('load', () => {
      mapRef.current = map;
      if (routePointsRef.current.length >= 2) drawRoute(map, routePointsRef.current);
      for (const data of pendingRunnersRef.current) {
        if (!markersRef.current.has(data.participantId)) addRunnerMarker(map, data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    socket.on('stats:update', (data: any) => {
      if (typeof data.total === 'number') setTotalRunners(data.total);
    });

    socket.on('runner:update', (data: any) => {
      if (data.participantId) lastSeenRef.current.set(data.participantId, Date.now());
      const map = mapRef.current;
      if (!map || !data.lat || !data.lng) {
        if (data.lat && data.lng) pendingRunnersRef.current.push(data);
        return;
      }
      const existing = markersRef.current.get(data.participantId);
      if (existing) {
        existing.setLngLat([data.lng, data.lat]);
      } else {
        addRunnerMarker(map, data);
      }
      if (data.status === 'FINISHED') setTotalFinished((prev) => prev + 1);
    });

    socket.on('leaderboard:update', (data: any) => {
      if (data.category === 'RUN_3K') setLeaderboard3k(mapLeaderboard(data.top10));
      else if (data.category === 'RUN_5K') setLeaderboard5k(mapLeaderboard(data.top10));
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
    const interval = setInterval(() => setNowTick(Date.now()), 5000);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      participantId: p.participantId || p.id,
      status: p.status,
      gender: p.gender,
    }));

  // Heartbeat status from the last GPS ping actually received for this
  // runner — null when they haven't started tracking yet or have already
  // finished, so the dot only appears for runners who should be actively
  // sending points right now.
  const trackingStatus = (entry: LeaderboardEntry): 'live' | 'delayed' | 'stopped' | null => {
    if (!entry.participantId || entry.status === 'FINISHED' || entry.status === 'REGISTERED') return null;
    const lastSeen = lastSeenRef.current.get(entry.participantId);
    if (!lastSeen) return null;
    const ageSec = (nowTick - lastSeen) / 1000;
    if (ageSec < 30) return 'live';
    if (ageSec < 60) return 'delayed';
    return 'stopped';
  };

  useEffect(() => {
    const eventId = resolvedEventIdRef.current || EVENT_ID;
    if (!eventId) return;
    fetch(`${API_URL}/api/v1/participants/leaderboard?eventId=${eventId}&category=RUN_3K&limit=10`)
      .then(r => r.json())
      .then(res => { if (res.success) setLeaderboard3k(mapLeaderboard(res.data)); })
      .catch(() => {});
    fetch(`${API_URL}/api/v1/participants/leaderboard?eventId=${eventId}&category=RUN_5K&limit=10`)
      .then(r => r.json())
      .then(res => { if (res.success) setLeaderboard5k(mapLeaderboard(res.data)); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsors, socketReady]);

  return {
    elapsedTime, totalRunners, totalFinished, treeCount, co2Offset,
    announcement, sponsors, leaderboard3k, leaderboard5k, mapLoaded,
    routePointCount, trackedCount, mapContainer, trackingStatus,
    sidebarView, fadeSidebar,
    MAPBOX_TOKEN,
  };
}
