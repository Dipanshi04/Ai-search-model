import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { api } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
}

interface RaceDistance {
  id: string;
  name: string;
  distanceKm: number;
  status: string;
  totalDistance: number;
  routePoints: { lat: number; lng: number; sequence: number; cumDistance: number }[];
  _count: { routePoints: number };
}

type Step = 'select-distance' | 'start' | 'waypoints' | 'review';

export default function RouteBuilderPage() {
  const [searchParams] = useSearchParams();
  const [eventId, setEventId] = useState(searchParams.get('eventId') || '');
  const [step, setStep] = useState<Step>('select-distance');
  const [distances, setDistances] = useState<RaceDistance[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<RaceDistance | null>(null);
  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null);
  const [finishPoint, setFinishPoint] = useState<RoutePoint | null>(null);
  const [waypoints, setWaypoints] = useState<RoutePoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [eventName, setEventName] = useState(searchParams.get('eventName') || '');
  const [marathonName] = useState(searchParams.get('marathonName') || '');
  const [raceStatus, setRaceStatus] = useState<any>(null);
  const [raceLoading, setRaceLoading] = useState(false);

  const [startLatStr, setStartLatStr] = useState('');
  const [startLngStr, setStartLngStr] = useState('');
  const [finishLatStr, setFinishLatStr] = useState('');
  const [finishLngStr, setFinishLngStr] = useState('');

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (startPoint) {
      setStartLatStr(String(startPoint.lat));
      setStartLngStr(String(startPoint.lng));
    }
  }, [startPoint]);

  useEffect(() => {
    if (finishPoint) {
      setFinishLatStr(String(finishPoint.lat));
      setFinishLngStr(String(finishPoint.lng));
    }
  }, [finishPoint]);

  const handleStartCoordBlur = (axis: 'lat' | 'lng') => {
    const str = axis === 'lat' ? startLatStr : startLngStr;
    const val = parseFloat(str);
    if (!isNaN(val) && startPoint) {
      setStartPoint(prev => prev ? { ...prev, [axis]: val } : null);
    }
  };

  const handleFinishCoordBlur = (axis: 'lat' | 'lng') => {
    const str = axis === 'lat' ? finishLatStr : finishLngStr;
    const val = parseFloat(str);
    if (!isNaN(val) && finishPoint) {
      setFinishPoint(prev => prev ? { ...prev, [axis]: val } : null);
    }
  };

  const paramDistance = searchParams.get('distance');
  const paramRaceDistanceId = searchParams.get('raceDistanceId');

  useEffect(() => {
    if (!eventId) return;
    loadRaceStatus();
    const interval = setInterval(loadRaceStatus, 10000);
    return () => clearInterval(interval);
  }, [eventId]);

  async function loadRaceStatus() {
    try {
      const res = await api.getRaceStatus(eventId);
      if (res.success) setRaceStatus(res.data);
    } catch (e) {
      console.error('Failed to load race status:', e);
    }
  }

  async function handleStartRace() {
    if (!confirm(`Start "${eventName || 'this event'}"?`)) return;
    setRaceLoading(true);
    try {
      await api.startRace(eventId);
      await loadRaceStatus();
    } catch (e) {
      console.error('Failed to start race:', e);
    } finally {
      setRaceLoading(false);
    }
  }

  async function handlePauseRace() {
    if (!confirm('Pause the race?')) return;
    setRaceLoading(true);
    try {
      await api.pauseRace(eventId);
      await loadRaceStatus();
    } catch (e) {
      console.error('Failed to pause race:', e);
    } finally {
      setRaceLoading(false);
    }
  }

  async function handleEndRace() {
    if (!confirm('End the race? This cannot be undone!')) return;
    setRaceLoading(true);
    try {
      await api.endRace(eventId);
      await loadRaceStatus();
    } catch (e) {
      console.error('Failed to end race:', e);
    } finally {
      setRaceLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) return;
    api.getRaceStatus().then((res) => {
      if (res.success && res.data?.event) {
        setEventId(res.data.event.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    api.getEvent(eventId).then((res) => {
      if (res.success && res.data) {
        if (!eventName) setEventName(res.data.name);
        setDistances(res.data.raceDistances || res.data.distances || []);
      }
    });
  }, [eventId]);

  useEffect(() => {
    if (!paramDistance || distances.length === 0) return;
    const target = distances.find(
      (d) => String(d.distanceKm) === paramDistance || d.id === paramRaceDistanceId
    );
    if (target) handleSelectDistance(target);
  }, [distances, paramDistance, paramRaceDistanceId]);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [75.8577, 22.7196],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('load', () => { mapInstance.current = map; setMapReady(true); });
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstance.current || !MAPBOX_TOKEN || (step !== 'start' && step !== 'waypoints')) return;
    const map = mapInstance.current;
    const makeGeocoder = (id: string, placeholder: string, onResult: (p: RoutePoint) => void) => {
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder,
        countries: 'in',
        types: 'country,region,place,district,locality,neighborhood,address,poi',
      });
      geocoder.on('result', (e: any) => {
        const [lng, lat] = e.result.center;
        onResult({ lat, lng, label: e.result.place_name || 'Selected location' });
      });
      const el = document.getElementById(id);
      if (el && !el.hasChildNodes()) el.appendChild(geocoder.onAdd(map));
      return () => { try { geocoder.onRemove(map); } catch {} };
    };
    const cleanStart = makeGeocoder('start-geocoder', 'Search start location...', (p) => setStartPoint(p));
    const cleanFinish = makeGeocoder('finish-geocoder', 'Search finish location...', (p) => setFinishPoint(p));
    return () => { cleanStart(); cleanFinish(); };
  }, [mapReady, step]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !clickMode) return;
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      setWaypoints((prev) => [...prev, { lat, lng, label: `Waypoint ${prev.length + 1}` }]);
      setClickMode(false);
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [clickMode]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getSource('route')) map.removeSource('route');

    const allPoints: RoutePoint[] = [];
    if (startPoint) allPoints.push(startPoint);
    allPoints.push(...waypoints);
    if (finishPoint) allPoints.push(finishPoint);

    allPoints.forEach((p, i) => {
      const isStart = startPoint === p;
      const isFinish = finishPoint === p;
      const el = document.createElement('div');
      if (isStart) {
        el.innerHTML = `<div style="background:#10b981;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;">START</div>`;
      } else if (isFinish) {
        el.innerHTML = `<div style="background:#ef4444;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;">FINISH</div>`;
      } else {
        el.innerHTML = `<div style="background:#6366f1;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;">${i}</div>`;
      }
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        const updated = { ...p, lat: ll.lat, lng: ll.lng };
        if (isStart) setStartPoint(updated);
        else if (isFinish) setFinishPoint(updated);
        else setWaypoints((prev) => prev.map((wp) => wp === p ? updated : wp));
      });
      markersRef.current.push(marker);
    });

    if (routeCoords.length >= 2) {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } },
      });
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 4, 'line-opacity': 0.9 },
      });
      const bounds = new mapboxgl.LngLatBounds();
      routeCoords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60 });
    } else if (allPoints.length >= 2) {
      const coords = allPoints.map((p) => [p.lng, p.lat] as [number, number]);
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f59e0b', 'line-width': 3, 'line-dasharray': [2, 2] },
      });
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60 });
    } else if (allPoints.length === 1) {
      map.flyTo({ center: [allPoints[0]!.lng, allPoints[0]!.lat], zoom: 15 });
    }
  }, [startPoint, waypoints, routeCoords, mapReady]);

  const fetchRoute = async () => {
    if (!startPoint || !finishPoint) return;
    setFetchingRoute(true);
    setRouteCoords([]);
    setTotalDistance(0);
    try {
      const allPts = [startPoint, ...waypoints, finishPoint];
      const coords = allPts.map((p) => `${p.lng},${p.lat}`).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteCoords(route.geometry.coordinates as [number, number][]);
        setTotalDistance(Math.round(route.distance) / 1000);
      } else {
        setRouteCoords(allPts.map((p) => [p.lng, p.lat] as [number, number]));
      }
    } catch (err) {
      console.error('Route fetch failed:', err);
    }
    setFetchingRoute(false);
  };

  const handleSelectDistance = async (dist: RaceDistance) => {
    setSelectedDistance(dist);
    setStep('start');
    if (dist._count.routePoints > 0) {
      try {
        const res = await api.getRoute(dist.id);
        if (res.success && res.data?.routePoints?.length > 0) {
          const sorted = [...res.data.routePoints].sort((a: any, b: any) => a.sequence - b.sequence);
          const start = sorted[0]!;
          setStartPoint({ lat: start.lat, lng: start.lng, label: 'Start' });
          const end = sorted[sorted.length - 1]!;
          setFinishPoint({ lat: end.lat, lng: end.lng, label: 'Finish' });
          if (sorted.length > 2) {
            setWaypoints(sorted.slice(1, -1).map((p: any, i: number) => ({ lat: p.lat, lng: p.lng, label: `Waypoint ${i + 1}` })));
          }
          setTotalDistance(dist.totalDistance);
          setRouteCoords(sorted.map((p: any) => [p.lng, p.lat] as [number, number]));
          setStep('review');
        }
      } catch (err) {
        console.error('Failed to load existing route:', err);
      }
    }
  };

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
    setRouteCoords([]);
    setTotalDistance(0);
  };

  const handleSave = async () => {
    if (!selectedDistance || !startPoint || !finishPoint) return;
    setSaving(true);
    setSaved(false);
    const pointsToSave = routeCoords.length > 0
      ? routeCoords.map(([lng, lat]) => ({ lat, lng }))
      : [startPoint, ...waypoints, finishPoint].map((p) => ({ lat: p.lat, lng: p.lng }));
    const res = await api.saveRoute(selectedDistance.id, pointsToSave);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      if (eventId) {
        api.getEvent(eventId).then((r) => {
          if (r.success && r.data) setDistances(r.data.raceDistances || r.data.distances || []);
        });
      }
    }
    setSaving(false);
  };

  const handleReset = () => {
    setStartPoint(null);
    setFinishPoint(null);
    setWaypoints([]);
    setRouteCoords([]);
    setTotalDistance(0);
    setSaved(false);
    setClickMode(false);
    setStartLatStr('');
    setStartLngStr('');
    setFinishLatStr('');
    setFinishLngStr('');
  };

  const allPoints: RoutePoint[] = [];
  if (startPoint) allPoints.push(startPoint);
  allPoints.push(...waypoints);
  if (finishPoint) allPoints.push(finishPoint);

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'start', label: 'Start Location', num: 1 },
    { key: 'waypoints', label: 'Waypoints', num: 2 },
    { key: 'review', label: 'Review & Save', num: 3 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Route Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {marathonName && <span className="text-slate-400">{marathonName} · </span>}
            {step === 'select-distance'
              ? (eventName ? `Select a distance for ${eventName}` : 'Select a distance category')
              : <>{eventName} · <span className="text-emerald-600 font-medium">{selectedDistance?.name} ({selectedDistance?.distanceKm} km)</span></>
            }
          </p>
        </div>
        {step !== 'select-distance' && (
          <div className="flex gap-2">
            <button onClick={() => { setStep('select-distance'); handleReset(); }} className="px-4 py-2 bg-white/80 border border-white/70 hover:bg-white text-slate-700 rounded-3xl text-sm">
              Change Distance
            </button>
            <button onClick={handleReset} className="px-4 py-2 bg-white/80 border border-white/70 hover:bg-white text-slate-700 rounded-3xl text-sm">
              Reset
            </button>
          </div>
        )}
      </div>

      {eventId && (
        <div className="flex items-center justify-between bg-white/80 border border-white/70 rounded-3xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Race status:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              raceStatus?.event?.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : raceStatus?.event?.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : raceStatus?.event?.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {raceStatus?.event?.status || 'UPCOMING'}
            </span>
          </div>
          <div className="flex gap-2">
            {raceStatus?.event?.status !== 'ACTIVE' && raceStatus?.event?.status !== 'COMPLETED' && (
              <button onClick={handleStartRace} disabled={raceLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl text-sm font-semibold disabled:opacity-50">
                {raceStatus?.event?.status === 'PAUSED' ? 'Resume Race' : 'Start Race'}
              </button>
            )}
            {raceStatus?.event?.status === 'ACTIVE' && (
              <button onClick={handlePauseRace} disabled={raceLoading} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-3xl text-sm font-semibold disabled:opacity-50">
                Pause Race
              </button>
            )}
            {(raceStatus?.event?.status === 'ACTIVE' || raceStatus?.event?.status === 'PAUSED') && (
              <button onClick={handleEndRace} disabled={raceLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-3xl text-sm font-semibold disabled:opacity-50">
                End Race
              </button>
            )}
          </div>
        </div>
      )}

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-3xl text-sm font-medium">
          Route saved for {selectedDistance?.name}! {allPoints.length} points, {totalDistance.toFixed(2)} km
        </div>
      )}

      {step !== 'select-distance' && (
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => {
                  if (s.key === 'start') setStep('start');
                  if (s.key === 'waypoints' && startPoint) setStep('waypoints');
                  if (s.key === 'review' && startPoint && finishPoint) {
                    if (routeCoords.length === 0) fetchRoute();
                    setStep('review');
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  step === s.key
                    ? 'bg-violet-50 text-violet-700'
                    : s.key === 'waypoints' && startPoint
                      ? 'text-slate-600 hover:text-slate-900 cursor-pointer'
                      : s.key === 'review' && startPoint && finishPoint
                        ? 'text-slate-600 hover:text-slate-900 cursor-pointer'
                        : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s.key ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>{s.num}</span>
                {s.label}
              </button>
              {i < steps.length - 1 && <div className="w-8 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 h-[600px] rounded-3xl overflow-hidden border border-white/20 shadow-sm relative">
          {MAPBOX_TOKEN ? (
            <div ref={mapContainer} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <p className="text-slate-500">Set VITE_MAPBOX_TOKEN to enable map</p>
            </div>
          )}

          {fetchingRoute && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 text-emerald-700 px-4 py-2 rounded-3xl text-sm font-medium shadow-lg border border-emerald-200 z-10">
              Calculating road route...
            </div>
          )}

          {clickMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 text-amber-700 px-4 py-2 rounded-3xl text-sm font-medium shadow-lg border border-amber-200 z-10">
              Click on the map to add a waypoint
            </div>
          )}
        </div>

        <div className="glass rounded-3xl border border-white/20 shadow-sm p-4 max-h-[600px] overflow-auto space-y-4">
          {step === 'select-distance' && (
            <div className="grid grid-cols-1 gap-3">
              <h3 className="text-sm font-semibold text-slate-500">Select Distance</h3>
              {distances.map((dist) => (
                <button
                  key={dist.id}
                  onClick={() => handleSelectDistance(dist)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    dist._count.routePoints > 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white/50 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-slate-950">{dist.name}</h4>
                    {dist._count.routePoints > 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">Route set</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">No route</span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-emerald-600">{dist.distanceKm} km</p>
                  {dist._count.routePoints > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {dist._count.routePoints} points · {dist.totalDistance.toFixed(2)} km actual
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 'start' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">Start Location</h3>
                <p className="text-xs text-slate-400 mb-2">Where runners begin the {selectedDistance?.name}</p>
                <div id="start-geocoder" className="geocoder-wrapper" />
              {startPoint && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  {startPoint.label}
                </div>
              )}
              {finishPoint && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  Finish: {finishPoint.label}
                </div>
              )}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Enter Coordinates</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Lat</label>
                      <input
                        type="text" inputMode="decimal"
                        onChange={(e) => setStartLatStr(e.target.value)}
                        onBlur={() => handleStartCoordBlur('lat')}
                        value={startLatStr}
                        className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-xl text-slate-950 focus:ring-2 focus:ring-violet-200 outline-none text-sm"
                        placeholder="22.7196"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Lng</label>
                      <input
                        type="text" inputMode="decimal"
                        onChange={(e) => setStartLngStr(e.target.value)}
                        onBlur={() => handleStartCoordBlur('lng')}
                        value={startLngStr}
                        className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-xl text-slate-950 focus:ring-2 focus:ring-violet-200 outline-none text-sm"
                        placeholder="75.8577"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const lat = parseFloat(startLatStr);
                      const lng = parseFloat(startLngStr);
                      if (isNaN(lat) || isNaN(lng)) return;
                      setStartPoint((prev) => prev ? { ...prev, lat, lng } : null);
                    }}
                    className="mt-2 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Set Start Point
                  </button>
                </div>
              </div>
              {startPoint && (
                <button onClick={() => setStep('waypoints')} className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium">
                  Next: Add Waypoints
                </button>
              )}
            </>
          )}

          {step === 'waypoints' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">Waypoints</h3>
                <p className="text-xs text-slate-400 mb-3">Add stops along the route, or skip</p>
                <button
                  onClick={() => setClickMode(!clickMode)}
                  className={`w-full px-4 py-2 rounded-xl text-sm font-medium mb-3 transition-colors ${
                    clickMode ? 'bg-amber-500 text-white' : 'bg-white/80 border border-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  {clickMode ? 'Click map to place...' : 'Add waypoint on map'}
                </button>
                <div className="space-y-1.5">
                  {waypoints.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">No waypoints — direct start to finish</p>
                  )}
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-white/60 p-2 rounded-xl border border-slate-100">
                      <span className="text-violet-600 font-bold w-4">{i + 1}</span>
                      <span className="text-slate-600 truncate flex-1">{wp.label}</span>
                      <button onClick={() => handleRemoveWaypoint(i)} className="text-red-500 hover:text-red-600 text-xs shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
                <div id="finish-geocoder" className="geocoder-wrapper mt-3" />
                {finishPoint && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    {finishPoint.label}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setStep('start')} className="flex-1 px-4 py-2 bg-white/80 border border-white/70 hover:bg-white text-slate-700 rounded-xl text-sm">Back</button>
                  <button onClick={() => { fetchRoute(); setStep('review'); }} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium">Review Route</button>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Finish Coordinates</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Lat</label>
                      <input
                        type="text" inputMode="decimal"
                        onChange={(e) => setFinishLatStr(e.target.value)}
                        onBlur={() => handleFinishCoordBlur('lat')}
                        value={finishLatStr}
                        className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-xl text-slate-950 focus:ring-2 focus:ring-violet-200 outline-none text-sm"
                        placeholder="22.7196"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Lng</label>
                      <input
                        type="text" inputMode="decimal"
                        onChange={(e) => setFinishLngStr(e.target.value)}
                        onBlur={() => handleFinishCoordBlur('lng')}
                        value={finishLngStr}
                        className="w-full px-3 py-2 bg-white/80 border border-white/70 rounded-xl text-slate-950 focus:ring-2 focus:ring-violet-200 outline-none text-sm"
                        placeholder="75.8577"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-3">{selectedDistance?.name} Route</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-400">Start:</span>
                    <span className="text-slate-950 truncate">{startPoint?.label}</span>
                  </div>
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full bg-violet-500 shrink-0" />
                      <span className="text-slate-400">Via:</span>
                      <span className="text-slate-950 truncate">{wp.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                    <span className="text-slate-400">Finish:</span>
                    <span className="text-slate-950 truncate">{finishPoint?.label}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-violet-50 rounded-2xl p-3 text-center border border-violet-100">
                  <p className="text-2xl font-bold text-violet-700">{totalDistance > 0 ? totalDistance.toFixed(2) : '—'}</p>
                  <p className="text-xs text-slate-500">km total</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-200">
                  <p className="text-2xl font-bold text-slate-700">{waypoints.length}</p>
                  <p className="text-xs text-slate-500">waypoints</p>
                </div>
              </div>

              {routeCoords.length === 0 && (
                <button onClick={fetchRoute} disabled={fetchingRoute}
                  className="w-full px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-medium disabled:opacity-50">
                  {fetchingRoute ? 'Calculating...' : 'Calculate Road Route'}
                </button>
              )}

              {routeCoords.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                  Track follows main roads from start to finish.
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep('waypoints')} className="flex-1 px-4 py-2 bg-white/80 border border-white/70 hover:bg-white text-slate-700 rounded-xl text-sm">Back</button>
                <button onClick={handleSave} disabled={saving || !startPoint || !finishPoint}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold">
                  {saving ? 'Saving...' : 'Finalize Route'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .geocoder-wrapper { position: relative; }
        .geocoder-wrapper .mapboxgl-ctrl-geocoder { min-width: 100%; background: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.7); border-radius: 0.75rem; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .geocoder-wrapper .mapboxgl-ctrl-geocoder--input { color: #0f172a; background: transparent; font-size: 13px; }
        .geocoder-wrapper .mapboxgl-ctrl-geocoder--input::placeholder { color: #94a3b8; }
        .geocoder-wrapper .suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; color: #0f172a; width: 100%; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .geocoder-wrapper .suggestions li { color: #0f172a; font-size: 12px; padding: 8px 12px; cursor: pointer; }
        .geocoder-wrapper .suggestions li.active, .geocoder-wrapper .suggestions li:hover { background: #f5f3ff; color: #7c3aed; }
      `}</style>
    </div>
  );
}
