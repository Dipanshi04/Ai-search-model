import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface RunnerPosition {
  participantId: string;
  name: string;
  bibNumber: string;
  companyName?: string;
  lat: number;
  lng: number;
  distance: number;
  pace: number | null;
  rank: number;
  status: string;
}

interface ETADisplayProps {
  runnerId: string;
  routeDistanceKm: number;
}

export function ETADisplay({ runnerId, routeDistanceKm }: ETADisplayProps) {
  const [runner, setRunner] = useState<RunnerPosition | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join:tracking', 'default-event-id');
    });

    socket.on('runner:update', (data: RunnerPosition) => {
      if (data.participantId === runnerId) {
        setRunner(data);
      }
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [runnerId]);

  if (!runner || !runner.pace || runner.pace <= 0) return null;

  const remainingKm = routeDistanceKm - runner.distance;
  if (remainingKm <= 0) return <span className="text-green-400 font-bold">FINISHED</span>;

  const etaSeconds = remainingKm * runner.pace * 60;
  const etaMins = Math.floor(etaSeconds / 60);
  const progress = routeDistanceKm > 0 ? (runner.distance / routeDistanceKm) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Progress</span>
        <span className="text-white font-bold">{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{runner.distance.toFixed(2)} / {routeDistanceKm} km</span>
        <span className="text-amber-400 font-bold">ETA: {etaMins} min</span>
      </div>
    </div>
  );
}
