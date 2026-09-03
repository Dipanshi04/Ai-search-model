import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || '';

const CATEGORY_LABELS: Record<string, string> = {
  RUN_3K: '3K',
  RUN_5K: '5K',

};

// GPS points captured while offline (no signal, or the socket just hasn't
// reconnected yet) are queued to localStorage instead of dropped — the
// queue survives a page reload or the app getting killed mid-run, and
// drains in order the moment the socket reconnects.
const GPS_QUEUE_PREFIX = 'gps_queue_';
const GPS_QUEUE_MAX = 5000;

// Sending every single watchPosition fix (which can be sub-second on some
// devices) burns battery and network for no real accuracy gain at running
// pace — gate sends to whichever comes first: a minimum time gap or a
// minimum distance moved. The map marker/point counter still update on
// every fix for a smooth-looking live view; only what gets queued/sent
// to the server is throttled.
const MIN_SEND_INTERVAL_MS = 5000;
const MIN_SEND_DISTANCE_M = 20;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadGpsQueue(participantId: string): any[] {
  try {
    const raw = localStorage.getItem(GPS_QUEUE_PREFIX + participantId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGpsQueue(participantId: string, queue: any[]) {
  try {
    localStorage.setItem(GPS_QUEUE_PREFIX + participantId, JSON.stringify(queue));
  } catch {}
}

interface RunnerState {
  isTracking: boolean;
  distance: number;
  pace: number | null;
  rank: number | null;
  status: string;
  accuracy: number | null;
  speed: number | null;
  pointCount: number;
  queuedCount: number;
  resumedGapSec: number | null;
  offRoute: boolean;
}

// How far (meters) a runner can stray from the nearest point of their
// drawn route before we flag it — loose enough that normal GPS jitter and
// running on either side of a road don't trigger it, tight enough to catch
// a genuine wrong turn.
const OFF_ROUTE_METERS = 100;

interface Props {
  participantId: string;
  token: string;
  bibNumber?: string;
  category: string;
  eventId: string;
  onHome: () => void;
}

export default function RunnerDashboard({ participantId, token, category, eventId, onHome }: Props) {
  const [state, setState] = useState<RunnerState>({
    isTracking: false, distance: 0, pace: null, rank: null,
    status: 'REGISTERED', accuracy: null, speed: null, pointCount: 0, queuedCount: 0, resumedGapSec: null, offRoute: false,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [raceStatus, setRaceStatus] = useState<string>('UPCOMING');

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const positionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDistanceKmRef = useRef(5);
  const gpsQueueRef = useRef<any[]>(loadGpsQueue(participantId));
  const wakeLockRef = useRef<any>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const routeCoordsRef = useRef<{ lat: number; lng: number }[]>([]);

  const flushGpsQueue = () => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const queue = gpsQueueRef.current;
    while (queue.length > 0) {
      socket.emit('gps:update', queue.shift());
    }
    saveGpsQueue(participantId, queue);
    setState((s) => ({ ...s, queuedCount: 0 }));
  };

  const progressPercent = Math.min((state.distance / totalDistanceKmRef.current) * 100, 100);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [75.8577, 22.7196],
      zoom: 14,
      attributionControl: false,
    });
    map.on('load', () => { mapRef.current = map; setMapReady(true); });
    return () => { mapRef.current = null; map.remove(); };
  }, []);

  const clearTicking = () => {
    if (timerIvRef.current !== null) { clearInterval(timerIvRef.current); timerIvRef.current = null; }
  };

  const startTicking = (initialSec: number) => {
    clearTicking();
    const sec = isNaN(initialSec) ? 0 : initialSec;
    setElapsedTime(sec);
    timerIvRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  useEffect(() => {
    if (!eventId) return;

    let resyncIv: ReturnType<typeof setInterval> | null = null;

    const fetchAndDisplay = () => {
      fetch(`${API_URL}/api/v1/race/status?eventId=${eventId}`)
        .then((r) => r.json())
        .then((res) => {
          if (!res.success || !res.data?.event) return;
          const ev = res.data.event;
          setRaceStatus(ev.status);
        })
        .catch(() => {});
    };

    fetchAndDisplay();

    // A reload (common when iOS backgrounds and kills the tab) resets local
    // React state, including the Duration ticker, back to 0 — even though
    // distance/pace/rank correctly resync from the server a moment later.
    // Pull the participant's real startedAt once on mount so Duration shows
    // the actual elapsed time instead of misleadingly restarting near zero.
    fetch(`${API_URL}/api/v1/participants/${participantId}`)
      .then((r) => r.json())
      .then((res) => {
        const p = res?.data;
        if (!res.success || !p?.startedAt) return;
        const realElapsedSec = Math.max(0, Math.floor((Date.now() - new Date(p.startedAt).getTime()) / 1000));
        if (p.status === 'RUNNING' || p.status === 'PAUSED') {
          setElapsedTime(realElapsedSec);
        }
        // Server already has this runner RUNNING — a reload shouldn't force
        // them to tap Start again and re-grant nothing (geolocation
        // permission is already granted from their first tap, so this can
        // reacquire watchPosition silently). PAUSED is left alone — that
        // was an explicit choice, not something to override automatically.
        // Pass the real elapsed time explicitly — see startTracking's note
        // on why reading the elapsedTime state here would be stale.
        if (p.status === 'RUNNING') {
          startTracking(realElapsedSec);
        }
      })
      .catch(() => {});

    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join:runner', participantId);
      socket.emit('join:event', eventId);
      socket.emit('runner:start', { participantId });
      flushGpsQueue();
    });

    socket.on('runner:update', (data: any) => {
      setState((s) => ({ ...s, distance: data.distance, pace: data.pace, rank: data.rank, status: data.status }));
    });

    socket.on('race:status', (data: any) => {
      setRaceStatus(data.status);
    });

    socketRef.current = socket;
    resyncIv = setInterval(fetchAndDisplay, 30000);

    // Backgrounding a tab suspends JS on most mobile browsers (iOS Safari
    // especially) — watchPosition stops firing and the Wake Lock is
    // force-released by the OS. Nothing in JS can prevent that; the best
    // recovery is to catch the moment the runner comes back to this tab and
    // immediately reconnect, resync, and re-arm the wake lock rather than
    // silently sitting stale until the next 30s poll.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      fetchAndDisplay();
      if (!socket.connected) socket.connect();
      else flushGpsQueue();
      if (watchIdRef.current !== null) {
        requestWakeLock();
        // Don't wait for watchPosition's next tick to fire — grab one fresh
        // fix immediately so the gap shown is as short as possible, and
        // surface how long tracking was actually dark for.
        navigator.geolocation.getCurrentPosition((pos) => capturePoint(pos, true), () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
        if (hiddenAt) {
          const gapSec = Math.round((Date.now() - hiddenAt) / 1000);
          if (gapSec >= 10) {
            setState((s) => ({ ...s, resumedGapSec: gapSec }));
            setTimeout(() => setState((s) => ({ ...s, resumedGapSec: null })), 6000);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTicking();
      if (resyncIv !== null) clearInterval(resyncIv);
      document.removeEventListener('visibilitychange', onVisible);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId, token, participantId]);

  useEffect(() => {
    if (!mapReady || !eventId) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/api/v1/events/${eventId}`, { headers })
      .then((r) => r.json())
      .then(async (res) => {
        if (!res.success || !res.data?.raceDistances?.length) return;
        const distances: any[] = res.data.raceDistances;
        const categoryLabel = CATEGORY_LABELS[category];
        let matched: any = null;

        if (categoryLabel) {
          matched = distances.find((d: any) => {
            const nameUpper = (d.name || '').toUpperCase();
            return nameUpper.includes(categoryLabel);
          });
        }

        if (!matched) {
          const catNum = parseInt(category.replace(/\D/g, ''), 10);
          if (!isNaN(catNum)) {
            matched = distances.find((d: any) => Math.abs(d.distanceKm - catNum) < 0.5);
          }
        }

        if (!matched) {
          matched = distances.find((d: any) => d._count?.routePoints > 0);
        }

        if (matched) {
          totalDistanceKmRef.current = matched.distanceKm || 5;
          if (matched._count?.routePoints <= 0) return;
          try {
            const routeRes = await fetch(`${API_URL}/api/v1/routes/${matched.id}`, { headers });
            const routeData = await routeRes.json();
            if (routeData.success && routeData.data?.routePoints?.length > 0) {
              const sorted = [...routeData.data.routePoints].sort((a: any, b: any) => a.sequence - b.sequence);
              routeCoordsRef.current = sorted.map((p: any) => ({ lat: p.lat, lng: p.lng }));
              drawRoute(sorted.map((p: any) => [p.lng, p.lat] as [number, number]));
            }
          } catch {}
        }
      })
      .catch(() => {});

    function drawRoute(coords: [number, number][]) {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) { setTimeout(() => drawRoute(coords), 300); return; }
      try {
        if (map.getLayer('route-glow')) map.removeLayer('route-glow');
        if (map.getLayer('route-line')) map.removeLayer('route-line');
        if (map.getSource('route')) map.removeSource('route');
      } catch {}
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } } });
      map.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#f97316', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#f97316', 'line-width': 5, 'line-opacity': 1 } });
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:16px;height:16px;background:#f97316;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.2);"></div>`;
      new mapboxgl.Marker({ element: el, offset: [-8, -8] }).setLngLat(coords[0]!).addTo(map);
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 24, right: 24 }, duration: 1000 });
    }
  }, [mapReady, category, eventId, token]);

  const requestWakeLock = async () => {
    try {
      // Keeps the screen from auto-locking while tracking — the most common
      // reason GPS silently stops mid-run. It does NOT survive switching to
      // another app or the OS backgrounding the tab; the browser releases it
      // automatically on that, and the visibilitychange handler below
      // re-acquires it the moment the runner comes back to this tab.
      wakeLockRef.current = await (navigator as any).wakeLock?.request?.('screen');
    } catch {
      wakeLockRef.current = null;
    }
  };

  const capturePoint = (pos: GeolocationPosition, force = false) => {
    const g = { participantId, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, altitude: pos.coords.altitude, timestamp: new Date().toISOString() };

    // Nearest-point-on-route check, run on every fix (not just the
    // throttled ones sent to the server) so the warning reacts quickly.
    let offRoute = false;
    if (routeCoordsRef.current.length > 0) {
      let minDist = Infinity;
      for (const rp of routeCoordsRef.current) {
        const d = haversineMeters(g.lat, g.lng, rp.lat, rp.lng);
        if (d < minDist) minDist = d;
      }
      offRoute = minDist > OFF_ROUTE_METERS;
    }

    setState((s) => ({ ...s, isTracking: true, accuracy: pos.coords.accuracy, speed: pos.coords.speed, pointCount: s.pointCount + 1, offRoute }));
    const map = mapRef.current;
    if (map) {
      if (positionMarkerRef.current) { positionMarkerRef.current.setLngLat([g.lng, g.lat]); }
      else {
        const d = document.createElement('div'); d.style.cssText = 'position:relative;width:24px;height:24px;';
        const p = document.createElement('div'); p.style.cssText = 'position:absolute;top:-4px;left:-4px;width:32px;height:32px;border-radius:50%;border:2px solid rgba(249,115,22,.3);animation:pr 2s ease-out infinite;'; d.appendChild(p);
        const c = document.createElement('div'); c.style.cssText = 'position:absolute;top:2px;left:2px;width:20px;height:20px;background:#f97316;border-radius:50%;border:3px solid #fff;animation:rg 2s ease-in-out infinite;box-shadow:0 1px 4px rgba(0,0,0,.2);'; d.appendChild(c);
        positionMarkerRef.current = new mapboxgl.Marker({ element: d, offset: [-12, -12] }).setLngLat([g.lng, g.lat]).addTo(map);
      }
      map.panTo([g.lng, g.lat], { duration: 1000 });
    }

    const last = lastSentRef.current;
    const elapsedMs = last ? Date.now() - last.t : Infinity;
    const movedM = last ? haversineMeters(last.lat, last.lng, g.lat, g.lng) : Infinity;
    if (!force && elapsedMs < MIN_SEND_INTERVAL_MS && movedM < MIN_SEND_DISTANCE_M) return;

    lastSentRef.current = { lat: g.lat, lng: g.lng, t: Date.now() };
    gpsQueueRef.current.push(g);
    if (gpsQueueRef.current.length > GPS_QUEUE_MAX) gpsQueueRef.current.shift();
    saveGpsQueue(participantId, gpsQueueRef.current);
    setState((s) => ({ ...s, queuedCount: gpsQueueRef.current.length }));
    flushGpsQueue();
  };

  const startTracking = async (initialElapsedSec?: number) => {
    if (!navigator.geolocation) return;
    setState((s) => ({ ...s, isTracking: true }));
    requestWakeLock();

    if (!document.getElementById('pulse-kf')) {
      const s = document.createElement('style'); s.id = 'pulse-kf';
      s.textContent = `@keyframes pr{0%{transform:scale(.8);opacity:1}100%{transform:scale(2.5);opacity:0}}@keyframes rg{0%,100%{box-shadow:0 0 8px rgba(249,115,22,.6)}50%{box-shadow:0 0 16px rgba(249,115,22,.9)}}`;
      document.head.appendChild(s);
    }

    // A caller resuming after a reload passes the real elapsed time
    // explicitly — reading the elapsedTime state here would see whatever
    // it was before this same tick's setElapsedTime call finishes
    // (React batches state updates, so it isn't visible yet via closure).
    startTicking(initialElapsedSec ?? elapsedTime);

    const watchId = navigator.geolocation.watchPosition(
      capturePoint,
      (err) => { setState((s) => ({ ...s, status: `GPS Error: ${err.message}` })); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    watchIdRef.current = watchId;
  };

  const pauseTracking = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
    if (socketRef.current) {
      flushGpsQueue();
      socketRef.current.emit('runner:pause', { participantId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    clearTicking();
    setState((s) => ({ ...s, isTracking: false }));
  };

  // Stops tracking without telling the server to pause — used when the
  // server already marked this runner FINISHED (reached the finish line).
  // Reusing pauseTracking() here would emit runner:pause, which overwrites
  // FINISHED back to PAUSED on the very update that just set it.
  const stopTrackingOnFinish = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
    if (socketRef.current) {
      flushGpsQueue();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    clearTicking();
    setState((s) => ({ ...s, isTracking: false }));
  };

  // Reacts to the server auto-finishing this runner (GPS proximity to the
  // finish point) — the manual Finish button already stops tracking itself,
  // this covers the case where the race ends without the runner tapping it.
  useEffect(() => {
    if (state.status === 'FINISHED' && state.isTracking) {
      stopTrackingOnFinish();
      setRaceStatus('COMPLETED');
    }
  }, [state.status]);

  const finishRace = () => {
    if (socketRef.current) {
      socketRef.current.emit('runner:finish', { participantId });
    }
    // stopTrackingOnFinish, not pauseTracking — pauseTracking emits
    // runner:pause right after, which the server processes immediately
    // after runner:finish and overwrites FINISHED back to PAUSED. This is
    // the same landmine documented on stopTrackingOnFinish's auto-finish
    // path; the manual Finish button needs the same guard.
    stopTrackingOnFinish();
    setRaceStatus('COMPLETED');
    setElapsedTime(0);
  };

  useEffect(() => () => {
    clearTicking();
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    wakeLockRef.current?.release?.().catch(() => {});
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
  }, []);

  const fmtPace = (p: number | null) => {
    if (!p) return "--'--\"";
    const t = Math.round(p * 60);
    return `${Math.floor(t / 60)}'${String(t % 60).padStart(2, '0')}"`;
  };

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
  };

  const getButtonLabel = () => {
    if (raceStatus === 'COMPLETED') return 'Finished';
    if (state.isTracking) return 'Pause';
    return 'Start';
  };

  const getPrimaryButtonBg = () => {
    if (raceStatus === 'COMPLETED') return '#64748b';
    if (state.isTracking) return 'rgba(255,255,255,0.15)';
    return '#f97316';
  };

  const isButtonDisabled = raceStatus === 'COMPLETED';

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>

      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* Home button */}
      <button
        onClick={() => { pauseTracking(); onHome(); }}
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top))',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(10,15,26,0.85)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          transition: 'transform 0.15s ease, background 0.2s',
          touchAction: 'manipulation',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.85)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10,15,26,0.85)'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
        Home
      </button>

      {/* Fixed to the viewport, not the content — the Start/Finish row at
          the bottom is a separate, un-scrollable flex child so it can never
          get pushed off-screen by however tall the stuff above it grows
          (banners, offline queue notice, etc.). Only the content above it
          scrolls if it doesn't fit within maxHeight. */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxHeight: '60vh',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(50,50,50,0.75) 25%, rgba(40,40,40,0.92) 100%)',
        backdropFilter: 'blur(2px)',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '60px 24px 0' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>
              {state.isTracking ? 'Running' : raceStatus === 'ACTIVE' ? 'Ready' : raceStatus === 'PAUSED' ? 'Paused' : 'Waiting'}
            </span>
          </div>
          {state.resumedGapSec !== null ? (
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fca5a5', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '999px', padding: '4px 10px' }}>
              Tracking paused {state.resumedGapSec}s — resumed
            </span>
          ) : state.queuedCount > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '999px', padding: '4px 10px' }}>
              Offline · {state.queuedCount} pt{state.queuedCount === 1 ? '' : 's'} queued
            </span>
          )}
        </div>

        {state.isTracking && state.offRoute && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5', lineHeight: 1.4 }}>
              You appear to be off the race route — head back toward the marked path.
            </span>
          </div>
        )}

        {state.isTracking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 2.5" />
            </svg>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
              Keep this tab open and your screen unlocked — switching apps or locking your phone pauses GPS tracking.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '18px', columnGap: '24px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Distance</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {state.distance.toFixed(2)} <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>km</span>
            </p>
          </div>

          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Duration</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>{fmtDuration(elapsedTime)}</p>
          </div>

          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Pace</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {fmtPace(state.pace)} <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>/km</span>
            </p>
          </div>

          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Rank</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>#{state.rank || '--'}</p>
          </div>
        </div>

        <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', marginTop: '18px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#f97316', width: `${progressPercent}%`, transition: 'width 1s ease-out', borderRadius: '2px' }} />
        </div>
        </div>

        <div style={{ flex: '0 0 auto', display: 'flex', gap: '12px', padding: '16px 24px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => (state.isTracking ? pauseTracking() : startTracking())}
            disabled={isButtonDisabled}
            style={{
              flex: 1, padding: '15px', borderRadius: '12px', border: 'none',
              cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '15px', color: '#fff', backdropFilter: 'blur(8px)', transition: 'all 0.2s',
              background: getPrimaryButtonBg(),
              opacity: isButtonDisabled ? 0.5 : 1,
            }}
          >
            {getButtonLabel()}
          </button>
          {state.isTracking && (
            <button onClick={finishRace} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', background: '#ef4444', color: '#fff', transition: 'all 0.2s' }}>
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
