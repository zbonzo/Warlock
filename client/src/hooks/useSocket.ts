/**
 * @fileoverview Custom hook for Socket.io connection management
 * Provides a consistent interface for socket operations
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';

// Global socket instance cache to prevent multiple connections
const globalSocketCache = new Map<string, Socket>();

interface UseSocketOptions {
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
 * Custom hook for managing Socket.io connections
 */
export default function useSocket(
  url: string, 
  options: UseSocketOptions = {}
): UseSocketReturn {
  // Connection state
  const [connected, setConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Keep socket instance in a ref to prevent recreation on renders
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  
  // Flag to track if this hook has initialized a connection
  const hasInitialized = useRef<boolean>(false);
  
  // Stabilize URL and options to prevent unnecessary re-renders
  const stableUrl = useRef<string>(url);
  const stableOptions = useRef<UseSocketOptions>(options);
  
  // Set up socket connection only once on mount
  useEffect(() => {
    // Prevent multiple socket creation attempts
    if (hasInitialized.current || socketRef.current) {
      return;
    }

    // Check if we already have a socket for this URL
    const cacheKey = stableUrl.current;
    const existingSocket = globalSocketCache.get(cacheKey);
    
    if (existingSocket && existingSocket.connected) {
      console.log("Reusing existing socket connection to:", stableUrl.current);
      socketRef.current = existingSocket;
      setConnected(true);
      setSocketId(existingSocket.id || null);
      hasInitialized.current = true;
      return;
    }

    console.log("Creating new socket connection to:", stableUrl.current);
    hasInitialized.current = true;
    
    // Create socket connection with more robust options
    const socketOptions: UseSocketOptions = {
      // Connection settings
      autoConnect: true,
      forceNew: false, // Don't force a new connection
      
      // Transport settings - start with polling, allow upgrades
      transports: ['polling', 'websocket'],
      upgrade: true,
      
      // Timeout settings
      timeout: 45000,
      
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      
      // Additional stability options
      closeOnBeforeunload: true,
      ...stableOptions.current
    };
    
    const socket = io(stableUrl.current, socketOptions) as Socket<ServerToClientEvents, ClientToServerEvents>;
    
    socketRef.current = socket;
    // Cache the socket globally
    globalSocketCache.set(cacheKey, socket);
    
    // Set up connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', socket.id);
      setConnected(true);
      setSocketId(socket.id || null);
      setError(null);
    });
    
    socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected, reason:', reason);
      setConnected(false);
      
      // Don't nullify socketId here - keep last known ID
      // This helps prevent unnecessary re-renders and reconnection attempts
    });
    
    socket.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err.message);
      setError(`Connection error: ${err.message}`);
    });

    socket.io.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`Socket reconnection attempt #${attemptNumber}`);
    });

    socket.io.on('reconnect', (attemptNumber: number) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
    });

    // Handle transport errors specifically
    socket.io.on('reconnect_error', (error: Error) => {
      console.warn('Socket reconnection failed:', error.message);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
      setError('Unable to connect to server after multiple attempts');
    });
    
    // Cleanup on unmount - IMPORTANT: only execute on actual component unmount
    return () => {
      console.log("Socket hook unmounting, cleaning up connection");
      if (socketRef.current) {
        // Remove from global cache if it's the same instance
        const cacheKey = stableUrl.current;
        if (globalSocketCache.get(cacheKey) === socketRef.current) {
          globalSocketCache.delete(cacheKey);
        }
        
        // Remove all listeners first to prevent any callbacks during disconnect
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      hasInitialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this only runs once on mount - intentional
  
  /**
   * Emit an event to the server
   */
  const emit = useCallback(<T>(
    eventName: string, 
    data: T, 
    callback?: (response: any) => void
  ): boolean => {
    if (!socketRef.current) {
      console.error('Socket not connected, cannot emit:', eventName);
      return false;
    }
    
    try {
      if (callback) {
        socketRef.current.emit(eventName as any, data, callback);
      } else {
        socketRef.current.emit(eventName as any, data);
      }
      return true;
    } catch (error) {
      console.error(`Error emitting ${eventName}:`, error);
      return false;
    }
  }, []);
  
  /**
   * Register an event listener
   */
  const on = useCallback(<T>(
    eventName: string, 
    callback: (data: T) => void
  ): (() => void) => {
    if (!socketRef.current) {
      console.warn(`Attempted to listen for ${eventName} but socket not initialized`);
      return () => {};
    }
    
    socketRef.current.on(eventName as any, callback);
    
    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(eventName as any, callback);
      }
    };
  }, []);
  
  /**
   * Check if socket is currently connected
   */
  const isConnected = useCallback((): boolean => {
    return connected && !!socketRef.current?.connected;
  }, [connected]);

  /**
   * Force reconnection if needed
   */
  const reconnect = useCallback((): void => {
    if (socketRef.current && !connected) {
      console.log("Manually attempting to reconnect socket");
      socketRef.current.connect();
    }
  }, [connected]);

  return {
    socket: socketRef.current,
    connected,
    socketId,
    error,
    emit,
    on,
    isConnected,
    reconnect
  };
}
