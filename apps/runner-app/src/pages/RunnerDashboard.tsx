import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CATEGORY_TO_DISTANCE_KM: Record<string, number> = { RUN_3K: 3, RUN_5K: 5 };

interface RunnerState {
  isTracking: boolean;
  distance: number;
  pace: number | null;
  rank: number | null;
  status: string;
  accuracy: number | null;
  speed: number | null;
  pointCount: number;
}

interface Props {
  participantId: string;
  token: string;
  bibNumber?: string;
  category: string;
  eventId: string;
}

export default function RunnerDashboard({ participantId, token, category, eventId }: Props) {
  const [state, setState] = useState<RunnerState>({
    isTracking: false, distance: 0, pace: null, rank: null,
    status: 'REGISTERED', accuracy: null, speed: null, pointCount: 0,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [, setTrackingStarted] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const positionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const elapsedSecRef = useRef(0);
  const isActiveRef = useRef(false);
  const timerIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resyncIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDistanceKm = CATEGORY_TO_DISTANCE_KM[category] || 5;
  const progressPercent = Math.min((state.distance / totalDistanceKm) * 100, 100);

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

  useEffect(() => {
    if (!mapReady || !eventId) return;
    const targetKm = CATEGORY_TO_DISTANCE_KM[category];
    if (!targetKm) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/api/v1/events/${eventId}`, { headers })
      .then((r) => r.json())
      .then(async (res) => {
        if (!res.success || !res.data?.raceDistances) return;
        const matched = res.data.raceDistances.find((d: any) => Math.abs(d.distanceKm - targetKm) < 0.1);
        if (!matched || matched._count?.routePoints <= 0) return;
        try {
          const routeRes = await fetch(`${API_URL}/api/v1/routes/${matched.id}`, { headers });
          const routeData = await routeRes.json();
          if (routeData.success && routeData.data?.routePoints?.length > 0) {
            const sorted = [...routeData.data.routePoints].sort((a: any, b: any) => a.sequence - b.sequence);
            drawRoute(sorted.map((p: any) => [p.lng, p.lat] as [number, number]));
          }
        } catch {}
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

  const applyServerTime = useCallback((serverElapsedMs: number, active: boolean) => {
    const sec = Math.floor((serverElapsedMs || 0) / 1000);
    elapsedSecRef.current = sec;
    isActiveRef.current = active;
    setElapsedTime(sec);
  }, []);

  const fetchRaceStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/v1/race/status?eventId=${eventId}`);
      const res = await r.json();
      if (res.success && res.data?.event) {
        const ev = res.data.event;
        if (ev.status === 'ACTIVE') {
          applyServerTime(ev.elapsedMs, true);
        } else if (ev.status === 'PAUSED') {
          applyServerTime(ev.accumulatedElapsedMs, false);
        } else {
          isActiveRef.current = false;
        }
      }
    } catch {}
  }, [eventId, applyServerTime]);

  const startTimer = useCallback((initialSec: number, active: boolean) => {
    if (timerIvRef.current) clearInterval(timerIvRef.current);
    elapsedSecRef.current = initialSec;
    isActiveRef.current = active;
    setElapsedTime(initialSec);
    timerIvRef.current = setInterval(() => {
      if (isActiveRef.current) {
        elapsedSecRef.current += 1;
        setElapsedTime(elapsedSecRef.current);
      }
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIvRef.current) { clearInterval(timerIvRef.current); timerIvRef.current = null; }
    if (resyncIvRef.current) { clearInterval(resyncIvRef.current); resyncIvRef.current = null; }
    isActiveRef.current = false;
  }, []);

  const startTracking = async () => {
    if (!navigator.geolocation) return;
    setTrackingStarted(true);

    try {
      const r = await fetch(`${API_URL}/api/v1/race/status?eventId=${eventId}`);
      const res = await r.json();
      if (res.success && res.data?.event) {
        const ev = res.data.event;
        if (ev.status === 'ACTIVE') {
          startTimer(Math.floor((ev.elapsedMs || 0) / 1000), true);
        } else if (ev.status === 'PAUSED') {
          startTimer(Math.floor((ev.accumulatedElapsedMs || 0) / 1000), false);
        } else {
          startTimer(0, false);
        }
      } else {
        startTimer(0, false);
      }
    } catch {
      startTimer(0, false);
    }

    resyncIvRef.current = setInterval(fetchRaceStatus, 30000);

    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => { 
      socket.emit('join:runner', participantId); 
      socket.emit('join:event', eventId);
      socket.emit('runner:start', { participantId }); 
    });
    socket.on('runner:update', (data: any) => { setState((s) => ({ ...s, distance: data.distance, pace: data.pace, rank: data.rank, status: data.status })); });
    socket.on('race:status', (data: any) => {
      if (data.status === 'ACTIVE') {
        startTimer(Math.floor((data.elapsedMs || 0) / 1000), true);
      } else if (data.status === 'PAUSED') {
        startTimer(Math.floor((data.elapsedMs || 0) / 1000), false);
      } else if (data.status === 'COMPLETED') {
        stopTimer();
      }
    });
    socketRef.current = socket;
    if (!document.getElementById('pulse-kf')) {
      const s = document.createElement('style'); s.id = 'pulse-kf';
      s.textContent = `@keyframes pr{0%{transform:scale(.8);opacity:1}100%{transform:scale(2.5);opacity:0}}@keyframes rg{0%,100%{box-shadow:0 0 8px rgba(249,115,22,.6)}50%{box-shadow:0 0 16px rgba(249,115,22,.9)}}`;
      document.head.appendChild(s);
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const g = { participantId, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, altitude: pos.coords.altitude, timestamp: new Date().toISOString() };
        setState((s) => ({ ...s, isTracking: true, accuracy: pos.coords.accuracy, speed: pos.coords.speed, pointCount: s.pointCount + 1 }));
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
        socket.emit('gps:update', g);
      },
      (err) => { setState((s) => ({ ...s, status: `GPS Error: ${err.message}` })); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    watchIdRef.current = watchId;
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (socketRef.current) { socketRef.current.emit('runner:pause', { participantId }); socketRef.current.disconnect(); socketRef.current = null; }
    stopTimer();
    setTrackingStarted(false);
    setState((s) => ({ ...s, isTracking: false }));
  };

  useEffect(() => () => { stopTimer(); if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); if (socketRef.current) socketRef.current.disconnect(); }, [stopTimer]);

  const fmtPace = (p: number | null) => { if (!p) return "--'--\""; const t = Math.round(p * 60); return `${Math.floor(t / 60)}'${String(t % 60).padStart(2, '0')}\"`; };
  const fmtDuration = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(sec).padStart(2, '0')}s`; };

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>

      {/* FULL SCREEN MAP */}
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* TRANSLUCENT OVERLAY — bottom 45% */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '45%',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(50,50,50,0.75) 25%, rgba(40,40,40,0.92) 100%)',
        backdropFilter: 'blur(2px)',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 24px 0',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Running</span>
          </div>
          
        </div>

        {/* Stats grid — matching reference layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '18px', columnGap: '24px' }}>
          {/* Distance */}
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Distance</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {state.distance.toFixed(2)} <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>km</span>
            </p>
          </div>

          {/* Duration */}
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Duration</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>{fmtDuration(elapsedTime)}</p>
          </div>

          {/* Pace */}
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Pace</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {fmtPace(state.pace)} <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>/km</span>
            </p>
          </div>

          {/* Rank */}
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>Rank</p>
            <p style={{ fontSize: '34px', fontWeight: 800, margin: '2px 0 0', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>#{state.rank || '--'}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', marginTop: '18px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#f97316', width: `${progressPercent}%`, transition: 'width 1s ease-out', borderRadius: '2px' }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={state.isTracking ? stopTracking : startTracking} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', background: state.isTracking ? 'rgba(255,255,255,0.15)' : '#f97316', color: '#fff', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}>
            {state.isTracking ? 'Pause' : 'Resume'}
          </button>
          {state.isTracking && (
            <button onClick={stopTracking} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', background: '#ef4444', color: '#fff', transition: 'all 0.2s' }}>
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
