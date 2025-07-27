/**
 * @fileoverview Custom hook for Socket.io connection management
 * Provides a consistent interface for socket operations
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Global socket instance cache to prevent multiple connections
const globalSocketCache = new Map();

/**
 * Custom hook for managing Socket.io connections
 * 
 * @param {string} url - Socket server URL
 * @param {Object} [options] - Socket.io options
 * @returns {Object} Socket state and methods
 */
export default function useSocket(url, options = {}) {
  // Connection state
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [error, setError] = useState(null);
  
  // Keep socket instance in a ref to prevent recreation on renders
  const socketRef = useRef(null);
  
  // Flag to track if this hook has initialized a connection
  const hasInitialized = useRef(false);
  
  // Stabilize URL and options to prevent unnecessary re-renders
  const stableUrl = useRef(url);
  const stableOptions = useRef(options);
  
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
      setSocketId(existingSocket.id);
      hasInitialized.current = true;
      return;
    }

    console.log("Creating new socket connection to:", stableUrl.current);
    hasInitialized.current = true;
    
    // Create socket connection with more robust options
    const socketOptions = {
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
    
    const socket = io(stableUrl.current, socketOptions);
    
    socketRef.current = socket;
    // Cache the socket globally
    globalSocketCache.set(cacheKey, socket);
    
    // Set up connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', socket.id);
      setConnected(true);
      setSocketId(socket.id);
      setError(null);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason);
      setConnected(false);
      
      // Don't nullify socketId here - keep last known ID
      // This helps prevent unnecessary re-renders and reconnection attempts
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(`Connection error: ${err.message}`);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt #${attemptNumber}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
    });

    // Handle transport errors specifically
    socket.on('reconnect_error', (error) => {
      console.warn('Socket reconnection failed:', error.message);
    });

    socket.on('reconnect_failed', () => {
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
   * 
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   * @param {Function} [callback] - Optional callback function
   * @returns {boolean} Success status
   */
  const emit = useCallback((eventName, data, callback) => {
    if (!socketRef.current) {
      console.error('Socket not connected, cannot emit:', eventName);
      return false;
    }
    
    try {
      if (callback) {
        socketRef.current.emit(eventName, data, callback);
      } else {
        socketRef.current.emit(eventName, data);
      }
      return true;
    } catch (error) {
      console.error(`Error emitting ${eventName}:`, error);
      return false;
    }
  }, []);
  
  /**
   * Register an event listener
   * 
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   * @returns {Function} Unsubscribe function
   */
  const on = useCallback((eventName, callback) => {
    if (!socketRef.current) {
      console.warn(`Attempted to listen for ${eventName} but socket not initialized`);
      return () => {};
    }
    
    socketRef.current.on(eventName, callback);
    
    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(eventName, callback);
      }
    };
  }, []);
  
  /**
   * Check if socket is currently connected
   * 
   * @returns {boolean} Connection status
   */
  const isConnected = useCallback(() => {
    return connected && !!socketRef.current?.connected;
  }, [connected]);

  /**
   * Force reconnection if needed
   */
  const reconnect = useCallback(() => {
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

