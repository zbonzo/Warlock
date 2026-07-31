/**
 * @fileoverview Custom hook for Socket.io connection management
 * Provides a consistent interface for socket operations
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, SocketConnectionOptions } from '../services/socketConnection';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/shared';

interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  socketId: string | null;
  error: string | null;
  emit: <T>(eventName: string, data: T, callback?: (response: any) => void) => boolean;
  on: <T>(eventName: string, callback: (data: T) => void) => () => void;
  isConnected: () => boolean;
  reconnect: () => void;
}

/**
 * Custom hook for managing Socket.io connections.
 *
 * The underlying connection is a module-level singleton (see
 * services/socketConnection.ts) — this hook only subscribes to its
 * connect/disconnect/error state and never creates or tears down the
 * connection itself, so mounting it from multiple components is safe.
 */
export default function useSocket(
  url: string,
  options: SocketConnectionOptions = {}
): UseSocketReturn {
  // options is only read on first creation of the singleton for this url;
  // changing it on a later render intentionally has no effect, matching
  // the previous hook's behavior.
  const socket = useMemo(() => getSocket(url, options), [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [socketId, setSocketId] = useState<string | null>(socket.id || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sync in case the socket connected before this instance subscribed.
    setConnected(socket.connected);
    setSocketId(socket.id || null);

    const handleConnect = () => {
      setConnected(true);
      setSocketId(socket.id || null);
      setError(null);
    };
    const handleDisconnect = () => {
      setConnected(false);
      // Don't nullify socketId here - keep last known ID
    };
    const handleConnectError = (err: Error) => {
      setError(`Connection error: ${err.message}`);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // This subscriber is going away, not the shared connection — only
    // remove the listeners this instance added.
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  /**
   * Emit an event to the server
   */
  const emit = useCallback(<T>(
    eventName: string,
    data: T,
    callback?: (response: any) => void
  ): boolean => {
    try {
      if (callback) {
        socket.emit(eventName as any, data, callback);
      } else {
        socket.emit(eventName as any, data);
      }
      return true;
    } catch (error) {
      console.error(`Error emitting ${eventName}:`, error);
      return false;
    }
  }, [socket]);

  /**
   * Register an event listener
   */
  const on = useCallback(<T>(
    eventName: string,
    callback: (data: T) => void
  ): (() => void) => {
    socket.on(eventName as any, callback);

    // Return unsubscribe function
    return () => {
      socket.off(eventName as any, callback);
    };
  }, [socket]);

  /**
   * Check if socket is currently connected
   */
  const isConnected = useCallback((): boolean => {
    return socket.connected;
  }, [socket]);

  /**
   * Force reconnection if needed
   */
  const reconnect = useCallback((): void => {
    if (!socket.connected) {
      console.log("Manually attempting to reconnect socket");
      socket.connect();
    }
  }, [socket]);

  return {
    socket,
    connected,
    socketId,
    error,
    emit,
    on,
    isConnected,
    reconnect
  };
}
