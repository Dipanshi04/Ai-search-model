// ──────────────────────────────────────────────
//  ISA MARATHON - SHARED SOCKET.IO CLIENT
// ──────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '@isa/types';
import { SOCKET_CONFIG } from '@isa/config';

export type TypedSocket = Socket;

export function createSocketClient(
  url: string,
  token: string,
  options?: {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (error: Error) => void;
  }
): Socket {
  const socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    pingInterval: SOCKET_CONFIG.PING_INTERVAL,
    pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
    reconnection: true,
    reconnectionAttempts: SOCKET_CONFIG.RECONNECT_ATTEMPTS,
    reconnectionDelay: SOCKET_CONFIG.RECONNECT_DELAY_MS,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    options?.onConnect?.();
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    options?.onDisconnect?.(reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    options?.onError?.(error);
  });

  return socket;
}

export function emitEvent<K extends keyof SocketEvents>(
  socket: Socket,
  event: K,
  data: SocketEvents[K]
): void {
  socket.emit(event as string, data);
}

export function onEvent<K extends keyof SocketEvents>(
  socket: Socket,
  event: K,
  callback: (data: SocketEvents[K]) => void
): void {
  socket.on(event as string, callback);
}
