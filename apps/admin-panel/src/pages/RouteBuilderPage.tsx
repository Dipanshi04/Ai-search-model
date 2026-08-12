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

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const paramDistance = searchParams.get('distance');
  const paramRaceDistanceId = searchParams.get('raceDistanceId');

  useEffect(() => {
    if (eventId) return;
    api.getRaceStatus().then((res) => {
      if (res.success && res.data?.event) {
        setEventId(res.data.event.id);
      }
    });
  }, []);

  // Fetch event and distances
  useEffect(() => {
    if (!eventId) return;
    api.getEvent(eventId).then((res) => {
      if (res.success && res.data) {
        if (!eventName) setEventName(res.data.name);
        setDistances(res.data.raceDistances || res.data.distances || []);
      }
    });
  }, [eventId]);

  // Auto-select distance from URL params
  useEffect(() => {
    if (!paramDistance || distances.length === 0) return;
    const target = distances.find(
      (d) => String(d.distanceKm) === paramDistance || d.id === paramRaceDistanceId
    );
    if (target) {
      handleSelectDistance(target);
    }
  }, [distances, paramDistance, paramRaceDistanceId]);

  // Initialize map
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

    map.on('load', () => {
      mapInstance.current = map;
      setMapReady(true);
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

// Geocoder
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
        // prioritize streets and POIs so main roads/landmarks resolve
        types: 'country,region,place,district,locality,neighborhood,address,poi',
      });

      geocoder.on('result', (e: any) => {
        const [lng, lat] = e.result.center;
        const label = e.result.place_name || 'Selected location';
        onResult({ lat, lng, label });
      });

      const el = document.getElementById(id);
      if (el && !el.hasChildNodes()) {
        el.appendChild(geocoder.onAdd(map));
      }

      return () => { try { geocoder.onRemove(map); } catch {} };
    };

    const cleanStart = makeGeocoder('start-geocoder', 'Search start location...', (p) => setStartPoint(p));
    const cleanFinish = makeGeocoder('finish-geocoder', 'Search finish location...', (p) => setFinishPoint(p));

    return () => { cleanStart(); cleanFinish(); };
  }, [mapReady, step]);

  // Click to add waypoint
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

  // Update markers and route
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
        el.innerHTML = `<div style="background:#3b82f6;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;">${i}</div>`;
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
      const via = waypoints.length > 0 ? `&via=${[startPoint, ...waypoints, finishPoint].slice(1, -1).map((p) => `${p.lng},${p.lat}`).join(';')}` : '';
      const coords = `${startPoint.lng},${startPoint.lat};${finishPoint.lng},${finishPoint.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}${via}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteCoords(route.geometry.coordinates as [number, number][]);
        setTotalDistance(Math.round(route.distance) / 1000);
      } else {
        setRouteCoords([startPoint, ...waypoints, finishPoint].map((p) => [p.lng, p.lat] as [number, number]));
        setTotalDistance(0);
      }
    } catch (err) {
      console.error('Route fetch failed:', err);
    }
    setFetchingRoute(false);
  };

  const handleSelectDistance = (dist: RaceDistance) => {
    setSelectedDistance(dist);
    setStep('start');

    // Load existing route if any
    if (dist.routePoints && dist.routePoints.length > 0) {
      const sorted = [...dist.routePoints].sort((a, b) => a.sequence - b.sequence);
      const start = sorted[0]!;
      setStartPoint({ lat: start.lat, lng: start.lng, label: `Start: Abhay Prashal, Indore` });

      const end = sorted[sorted.length - 1]!;
      setFinishPoint({ lat: end.lat, lng: end.lng, label: `Existing finish (${end.lat.toFixed(4)}, ${end.lng.toFixed(4)})` });

      if (sorted.length > 2) {
        const wps = sorted.slice(1, -1).map((p, i) => ({
          lat: p.lat, lng: p.lng, label: `Waypoint ${i + 1}`,
        }));
        setWaypoints(wps);
      }

      setTotalDistance(dist.totalDistance);
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

    // Use full road route if calculated, otherwise fall back to waypoints
    const pointsToSave = routeCoords.length > 0
      ? routeCoords.map(([lng, lat]) => ({ lat, lng }))
      : [startPoint, ...waypoints, finishPoint].map((p) => ({ lat: p.lat, lng: p.lng }));

    const res = await api.saveRoute(selectedDistance.id, pointsToSave);

    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      // Refresh distances list
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

  // Distance selection step
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {marathonName && <span className="text-slate-400">{marathonName} · </span>}
            {step === 'select-distance'
              ? (eventName ? `Select a distance for ${eventName}` : 'Select a distance category')
              : <>{eventName} &middot; <span className="text-emerald-400 font-medium">{selectedDistance?.name} ({selectedDistance?.distanceKm} km)</span></>
            }
          </p>
        </div>
        {step !== 'select-distance' && (
          <div className="flex gap-2">
            <button onClick={() => { setStep('select-distance'); handleReset(); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
              Change Distance
            </button>
            <button onClick={handleReset} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
              Reset
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm font-medium">
          Route saved for {selectedDistance?.name}! {allPoints.length} points, {totalDistance.toFixed(2)} km point-to-point
        </div>
      )}

      {step !== 'select-distance' && (
        <>
          {/* Step indicator */}
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
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : s.key === 'waypoints' && startPoint
                        ? 'text-slate-300 hover:text-white cursor-pointer'
                        : s.key === 'review' && startPoint && finishPoint
                          ? 'text-slate-300 hover:text-white cursor-pointer'
                          : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.key ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>{s.num}</span>
                  {s.label}
                </button>
                {i < steps.length - 1 && <div className="w-8 h-px bg-slate-700 mx-1" />}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 h-[600px] rounded-xl overflow-hidden border border-slate-700 relative">
          {MAPBOX_TOKEN ? (
            <div ref={mapContainer} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <p className="text-slate-500">Set VITE_MAPBOX_TOKEN to enable map</p>
            </div>
          )}

          {fetchingRoute && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 z-10">
              Calculating road route...
            </div>
          )}

          {clickMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium border border-amber-500/30 z-10">
              Click on the map to add a waypoint
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 max-h-[600px] overflow-auto space-y-4">
          {step === 'select-distance' && (
            <div className="grid grid-cols-1 gap-3">
              <h3 className="text-sm font-bold text-slate-300">Select Distance</h3>
              {distances.map((dist) => (
                <button
                  key={dist.id}
                  onClick={() => handleSelectDistance(dist)}
                  className={`text-left p-4 rounded-xl border transition-all hover:border-emerald-500/50 ${
                    dist._count.routePoints > 0
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white">{dist.name}</h4>
                    {dist._count.routePoints > 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
                        Route set
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-600 text-slate-400 text-xs rounded-full">
                        No route
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-emerald-400">{dist.distanceKm} km</p>
                  {dist._count.routePoints > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      {dist._count.routePoints} points &middot; {dist.totalDistance.toFixed(2)} km actual
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 'start' && (
            <>
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-1">Start Location</h3>
                <p className="text-xs text-slate-500 mb-2">Where runners begin the {selectedDistance?.name}</p>
                <div id="start-geocoder" className="geocoder-wrapper" />
                {startPoint && (
                  <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    {startPoint.label}
                  </div>
                )}
                {/* Manual coordinate input */}
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enter Coordinates</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Lat</label>
                      <input
                        type="number"
                        step="any"
                        onChange={(e) => setStartPoint(prev => prev ? { ...prev, lat: parseFloat(e.target.value) || prev.lat} : null)}
                        value={startPoint?.lat ?? ''}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. 22.7196"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Lng</label>
                      <input
                        type="number"
                        step="any"
                        onChange={(e) => setStartPoint(prev => prev ? { ...prev, lng: parseFloat(e.target.value) || prev.lng} : null)}
                        value={startPoint?.lng ?? ''}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. 75.8577"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (startPoint?.lat && startPoint?.lng) return;
                      setStartPoint({ lat: parseFloat((document.querySelector('input[placeholder="e.g. 22.7196"]') as HTMLInputElement)?.value || startPoint?.lat || 0), lng: parseFloat((document.querySelector('input[placeholder="e.g. 75.8577"]') as HTMLInputElement)?.value || startPoint?.lng || 0) });
                    }}
                    className="mt-2 w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    disabled={!startPoint?.lat || !startPoint?.lng}
                  >
                    Set Start Point from Coordinates
                  </button>
                </div>
              </div>
              {startPoint && (
                <button onClick={() => setStep('waypoints')} className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
                  Next: Add Waypoints
                </button>
              )}
            </>
          )}

          {step === 'waypoints' && (
            <>
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-1">Waypoints</h3>
                <p className="text-xs text-slate-500 mb-3">Add stops along the route, or skip</p>

                <button
                  onClick={() => setClickMode(!clickMode)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium mb-3 transition-colors ${
                    clickMode ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {clickMode ? 'Click map to place...' : 'Add waypoint on map'}
                </button>

                <div className="space-y-1.5">
                  {waypoints.length === 0 && (
                    <p className="text-xs text-slate-600 italic text-center py-2">No waypoints — direct start to finish</p>
                  )}
{waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-slate-700/50 p-2 rounded">
                      <span className="text-blue-400 font-bold w-4">{i + 1}</span>
                      <span className="text-slate-400 truncate flex-1">{wp.label}</span>
                      <button onClick={() => handleRemoveWaypoint(i)} className="text-red-400 hover:text-red-300 text-xs shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
                <div id="finish-geocoder" className="geocoder-wrapper" />
                {finishPoint && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    {finishPoint.label}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setStep('start')} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Back</button>
                  <button onClick={() => { fetchRoute(); setStep('review'); }} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Review Route</button>
                </div>
                {/* Manual coordinate input for finish */}
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enter Coordinates</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Lat</label>
                      <input
                        type="number"
                        step="any"
                        onChange={(e) => setFinishPoint(prev => prev ? { ...prev, lat: parseFloat(e.target.value) || prev.lat} : null)}
                        value={finishPoint?.lat ?? ''}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. 22.7196"
                        id="finish-lat"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Lng</label>
                      <input
                        type="number"
                        step="any"
                        onChange={(e) => setFinishPoint(prev => prev ? { ...prev, lng: parseFloat(e.target.value) || prev.lng} : null)}
                        value={finishPoint?.lng ?? ''}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. 75.8577"
                        id="finish-lng"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (finishPoint?.lat && finishPoint?.lng) return;
                      setFinishPoint({ lat: parseFloat((document.querySelector('#finish-lat') as HTMLInputElement)?.value || finishPoint?.lat || 0), lng: parseFloat((document.querySelector('#finish-lng') as HTMLInputElement)?.value || finishPoint?.lng || 0) });
                    }}
                    className="mt-2 w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    disabled={!finishPoint?.lat || !finishPoint?.lng}
                  >
                    Set Finish Point from Coordinates
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-3">{selectedDistance?.name} Route</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-400">Start:</span>
                    <span className="text-white truncate">{startPoint?.label}</span>
                  </div>
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-slate-400">Via:</span>
                      <span className="text-white truncate">{wp.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                    <span className="text-slate-400">Finish:</span>
                    <span className="text-white truncate">{finishPoint?.label}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400/70">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                  Single direction — start to finish
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{totalDistance > 0 ? totalDistance.toFixed(2) : '—'}</p>
                  <p className="text-xs text-slate-400">km total</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{waypoints.length}</p>
                  <p className="text-xs text-slate-400">waypoints</p>
                </div>
              </div>

              {routeCoords.length === 0 && (
                <button onClick={fetchRoute} disabled={fetchingRoute}
                  className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium border border-amber-500/30 disabled:opacity-50">
                  {fetchingRoute ? 'Calculating...' : 'Calculate Road Route'}
                </button>
              )}

              {routeCoords.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400">
                  Track follows main roads from start to finish.
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep('waypoints')} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Back</button>
                <button onClick={handleSave} disabled={saving || !startPoint || !finishPoint}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-semibold">
                  {saving ? 'Saving...' : 'Finalize Route'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .geocoder-wrapper { position: relative; }
        .geocoder-wrapper .mapboxgl-ctrl-geocoder { min-width: 100%; background: rgb(30 41 59); border: 1px solid rgb(51 65 85); border-radius: 0.5rem; color: white; }
        .geocoder-wrapper .mapboxgl-ctrl-geocoder--input { color: white; background: transparent; font-size: 13px; }
        .geocoder-wrapper .mapboxgl-ctrl-geocoder--input::placeholder { color: rgb(100 116 139); }
        .geocoder-wrapper .suggestions { position: absolute; top: 100%; left: 0; right: 0; background: rgb(30 41 59); border: 1px solid rgb(51 65 85); border-radius: 0.5rem; color: white; width: 100%; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 4px; }
        .geocoder-wrapper .suggestions li { color: white; font-size: 12px; padding: 8px 12px; cursor: pointer; }
        .geocoder-wrapper .suggestions li.active, .geocoder-wrapper .suggestions li:hover { background: rgb(16 185 129 / 0.2); color: rgb(52 211 153); }
      `}</style>
    </div>
  );
}
