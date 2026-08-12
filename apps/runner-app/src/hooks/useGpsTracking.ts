import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface GpsTrackingState {
  isTracking: boolean;
  distance: number;
  pace: number | null;
  rank: number | null;
  status: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  speed: number | null;
  error: string | null;
  pointCount: number;
}

export function useGpsTracking(participantId: string, token: string) {
  const [state, setState] = useState<GpsTrackingState>({
    isTracking: false,
    distance: 0,
    pace: null,
    rank: null,
    status: 'REGISTERED',
    lat: null,
    lng: null,
    accuracy: null,
    speed: null,
    error: null,
    pointCount: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation not supported' }));
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join:runner', participantId);
      socket.emit('runner:start', { participantId });
    });

    socket.on('runner:update', (data: any) => {
      setState((s) => ({
        ...s,
        distance: data.distance,
        pace: data.pace,
        rank: data.rank,
        status: data.status,
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
          ...s,
          lat: gpsData.lat,
          lng: gpsData.lng,
          accuracy: gpsData.accuracy,
          speed: gpsData.speed,
          isTracking: true,
          pointCount: s.pointCount + 1,
        }));

        socket.emit('gps:update', gpsData);
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  }, [participantId, token]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (socketRef.current) {
      socketRef.current.emit('runner:pause', { participantId });
      socketRef.current.disconnect();
    }
    setState((s) => ({ ...s, isTracking: false }));
  }, [participantId]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return { ...state, startTracking, stopTracking };
}