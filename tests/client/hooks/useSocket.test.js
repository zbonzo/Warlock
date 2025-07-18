/**
 * @fileoverview Tests for useSocket hook
 * Tests socket connection, events, and cleanup
 */

import { renderHook, act } from '@testing-library/react';
import useSocket from '@client/hooks/useSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn()
}));

describe('useSocket', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-id',
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn(),
      connected: false
    };

    io.mockReturnValue(mockSocket);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize socket connection', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    expect(io).toHaveBeenCalledWith('http://localhost:3001', {
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false
    });

    expect(result.current.socket).toBe(mockSocket);
    expect(result.current.connected).toBe(false);
    expect(result.current.socketId).toBe(null);
  });

  it('should handle socket connection', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    // Simulate connection
    const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    mockSocket.connected = true;
    mockSocket.id = 'connected-socket-id';
    
    act(() => {
      connectCallback();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.socketId).toBe('connected-socket-id');
    expect(result.current.error).toBe(null);
  });

  it('should handle socket disconnection', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    // First connect
    const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    mockSocket.connected = true;
    mockSocket.id = 'connected-socket-id';
    
    act(() => {
      connectCallback();
    });

    // Then disconnect
    const disconnectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    mockSocket.connected = false;
    
    act(() => {
      disconnectCallback('client namespace disconnect');
    });

    expect(result.current.connected).toBe(false);
    // Socket ID should be preserved for reconnection
    expect(result.current.socketId).toBe('connected-socket-id');
  });

  it('should handle connection errors', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    const connectErrorCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
    const error = new Error('Connection failed');
    
    act(() => {
      connectErrorCallback(error);
    });

    expect(result.current.error).toBe('Connection error: Connection failed');
  });

  it('should handle reconnection attempts', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    const reconnectAttemptCallback = mockSocket.on.mock.calls.find(call => call[0] === 'reconnect_attempt')[1];
    
    act(() => {
      reconnectAttemptCallback(3);
    });

    // Should not change state, but should log (we don't test console.log here)
    expect(result.current.connected).toBe(false);
  });

  it('should handle successful reconnection', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    const reconnectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'reconnect')[1];
    
    act(() => {
      reconnectCallback(2);
    });

    // Should not change state directly, but should log
    expect(result.current.connected).toBe(false);
  });

  it('should emit events correctly', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    const callback = jest.fn();
    const success = result.current.emit('test-event', { data: 'test' }, callback);

    expect(success).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' }, callback);
  });

  it('should handle emit when socket is not connected', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    // Mock socket as null
    mockSocket = null;
    io.mockReturnValue(null);

    const success = result.current.emit('test-event', { data: 'test' });

    expect(success).toBe(false);
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    const callback = jest.fn();
    const unsubscribe = result.current.on('test-event', callback);

    expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should unregister event listeners', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    const callback = jest.fn();
    const unsubscribe = result.current.on('test-event', callback);

    unsubscribe();

    expect(mockSocket.off).toHaveBeenCalledWith('test-event', callback);
  });

  it('should handle listener registration when socket is not available', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    // Mock socket as null
    mockSocket = null;
    io.mockReturnValue(null);

    const callback = jest.fn();
    const unsubscribe = result.current.on('test-event', callback);

    expect(typeof unsubscribe).toBe('function');
    // Should return a no-op function
    expect(() => unsubscribe()).not.toThrow();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSocket('http://localhost:3001'));

    unmount();

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should not create multiple sockets on re-renders', () => {
    const { rerender } = renderHook(() => useSocket('http://localhost:3001'));

    rerender();
    rerender();

    expect(io).toHaveBeenCalledTimes(1);
  });

  it('should accept custom socket options', () => {
    const customOptions = {
      timeout: 10000,
      reconnectionAttempts: 5
    };

    renderHook(() => useSocket('http://localhost:3001', customOptions));

    expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.objectContaining(customOptions));
  });

  it('should handle socket being null during emit', () => {
    const { result } = renderHook(() => useSocket('http://localhost:3001'));

    // Simulate socket being null
    result.current.socket = null;

    const success = result.current.emit('test-event', { data: 'test' });

    expect(success).toBe(false);
  });

  it('should maintain socket reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useSocket('http://localhost:3001'));

    const initialSocket = result.current.socket;
    rerender();
    const afterRerenderSocket = result.current.socket;

    expect(initialSocket).toBe(afterRerenderSocket);
  });
});