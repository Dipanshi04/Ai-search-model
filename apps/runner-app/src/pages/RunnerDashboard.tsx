import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatDistance, formatPace } from '@isa/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CATEGORY_TO_DISTANCE_KM: Record<string, number> = {
  RUN_3K: 3,
  RUN_5K: 5,
};

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

interface RunnerDashboardProps {
  participantId: string;
  token: string;
  bibNumber: string;
  category: string;
  eventId: string;
}

export default function RunnerDashboard({ participantId, token, bibNumber, category, eventId }: RunnerDashboardProps) {
  const [state, setState] = useState<RunnerState>({
    isTracking: false, distance: 0, pace: null, rank: null,
    status: 'REGISTERED', accuracy: null, speed: null, pointCount: 0,
  });
  const [routeInfo, setRouteInfo] = useState<{ name: string; totalDistance: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Initializing...');

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const positionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [75.8577, 22.7196],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => { mapRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const targetKm = CATEGORY_TO_DISTANCE_KM[category];
    if (!targetKm || !eventId) return;

    setStatusMsg('Loading route...');

    fetch(`/api/v1/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success || !res.data?.distances) {
          setStatusMsg('Event data not found');
          return;
        }
        const matched = res.data.distances.find((d: any) => Math.abs(d.distanceKm - targetKm) < 0.1);
        if (!matched) {
          setStatusMsg(`No ${targetKm}km distance found`);
          return;
        }

        setRouteInfo({ name: matched.name, totalDistance: matched.totalDistance });

        if (matched.routePoints && matched.routePoints.length > 0) {
          const coords: [number, number][] = matched.routePoints.map((p: any) => [p.lng, p.lat]);
          setStatusMsg(`Route loaded: ${coords.length} points`);
          drawRoute(coords);
        } else {
          setStatusMsg('No route points saved. Use Route Builder to save route.');
        }
      })
      .catch((err) => {
        console.error('[Runner] Route load error:', err);
        setStatusMsg('Failed to load route');
      });

    function drawRoute(coords: [number, number][]) {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) {
        setTimeout(() => drawRoute(coords), 200);
        return;
      }

      try {
        if (map.getLayer('route-line')) map.removeLayer('route-line');
        if (map.getSource('route')) map.removeSource('route');
      } catch {}

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });

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

      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#10b981',
          'line-width': 12,
          'line-opacity': 0.2,
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
      setStatusMsg('');
    }
  }, [mapReady, category, eventId, token]);

  const startTracking = async () => {
    if (!navigator.geolocation) return;

    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => {
      socket.emit('join:runner', participantId);
      socket.emit('runner:start', { participantId });
    });
    socket.on('runner:update', (data: any) => {
      setState((s) => ({
        ...s, distance: data.distance, pace: data.pace,
        rank: data.rank, status: data.status,
      }));
    });
    socketRef.current = socket;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsData = {
          participantId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          altitude: position.coords.altitude,
          timestamp: new Date().toISOString(),
        };

        setState((s) => ({
          ...s, isTracking: true,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          pointCount: s.pointCount + 1,
        }));

        const map = mapRef.current;
        if (map) {
          if (positionMarkerRef.current) {
            positionMarkerRef.current.setLngLat([gpsData.lng, gpsData.lat]);
          } else {
            const el = document.createElement('div');
            el.innerHTML = `<div style="width:20px;height:20px;background:#10b981;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(16,185,129,0.8);"></div>`;
            positionMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([gpsData.lng, gpsData.lat])
              .addTo(map);
          }
          map.panTo([gpsData.lng, gpsData.lat], { duration: 1000 });
        }

        socket.emit('gps:update', gpsData);
      },
      (err) => {
        setState((s) => ({ ...s, status: `GPS Error: ${err.message}` }));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    watchIdRef.current = watchId;
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('runner:pause', { participantId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState((s) => ({ ...s, isTracking: false }));
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const treesCount = Math.floor(state.distance);

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      <div className="flex-1 relative">
        {MAPBOX_TOKEN ? (
          <div ref={mapContainer} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <p className="text-slate-500">Set VITE_MAPBOX_TOKEN</p>
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg">
            <p className="text-2xl font-bold">{formatDistance(state.distance)}</p>
            <p className="text-[10px] text-slate-400">km</p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-400">#{state.rank || '--'}</p>
            <p className="text-[10px] text-slate-400">Rank</p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg text-right">
            <p className="text-2xl font-bold text-green-400">{treesCount}</p>
            <p className="text-[10px] text-slate-400">Trees</p>
          </div>
        </div>

        {routeInfo && (
          <div className="absolute bottom-14 left-4 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg pointer-events-none">
            <p className="text-xs text-slate-400">Race Route</p>
            <p className="text-sm font-bold text-emerald-400">{routeInfo.name} &middot; {routeInfo.totalDistance?.toFixed(1)} km</p>
          </div>
        )}

        {statusMsg && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg pointer-events-none">
            <p className="text-xs text-slate-400">{statusMsg}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-slate-400">BIB: </span>
            <span className="text-emerald-400 font-bold font-mono">{bibNumber}</span>
          </div>
          <div>
            <span className="text-slate-400">Pace: </span>
            <span className="text-white font-bold">
              {state.pace ? formatPace(state.pace * 60) : '--:--'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Accuracy: </span>
            <span className={state.accuracy && state.accuracy < 30 ? 'text-green-400' : 'text-red-400'}>
              {state.accuracy ? `${Math.round(state.accuracy)}m` : '--'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Points: </span>
            <span className="text-white">{state.pointCount}</span>
          </div>
          <div>
            <span className="text-slate-400">Status: </span>
            <span className="text-white">{state.status}</span>
          </div>
        </div>

        <button
          onClick={state.isTracking ? stopTracking : startTracking}
          className={`px-8 py-2 rounded-lg font-bold text-sm transition-colors ${
            state.isTracking
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {state.isTracking ? 'Pause Tracking' : 'Start GPS'}
        </button>
      </div>
    </div>
  );
}
