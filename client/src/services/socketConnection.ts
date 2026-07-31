/**
 * @fileoverview Module-level Socket.io connection singleton.
 *
 * The socket is created exactly once per URL, at the time it's first
 * requested — not tied to any React component's mount/unmount lifecycle.
 * This is what makes it safe for multiple components (and React StrictMode's
 * dev-only double-invoke of effects) to call useSocket() independently
 * without ever opening a second real connection: getSocket() is a plain
 * synchronous function, so "check cache, else create" can't race the way it
 * could inside a useEffect that runs once per component instance.
 */
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketConnectionOptions {
  autoConnect?: boolean;
  forceNew?: boolean;
  transports?: string[];
  upgrade?: boolean;
  timeout?: number;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  closeOnBeforeunload?: boolean;
}

const sockets = new Map<string, AppSocket>();

export function getSocket(url: string, options: SocketConnectionOptions = {}): AppSocket {
  const existing = sockets.get(url);
  if (existing) {
    return existing;
  }

  const socketOptions: SocketConnectionOptions = {
    autoConnect: true,
    forceNew: false,
    transports: ['polling', 'websocket'],
    upgrade: true,
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    closeOnBeforeunload: true,
    ...options,
  };

  const socket = io(url, socketOptions) as AppSocket;
  sockets.set(url, socket);

  socket.io.on('reconnect_attempt', (attemptNumber: number) => {
    console.log(`Socket reconnection attempt #${attemptNumber}`);
  });
  socket.io.on('reconnect', (attemptNumber: number) => {
    console.log(`Socket reconnected after ${attemptNumber} attempts`);
  });
  socket.io.on('reconnect_error', (error: Error) => {
    console.warn('Socket reconnection failed:', error.message);
  });
  socket.io.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after all attempts');
  });

  return socket;
}
