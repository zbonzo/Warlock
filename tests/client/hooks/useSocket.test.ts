/**
 * @fileoverview Tests for useSocket hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import useSocket from '../../../client/src/hooks/useSocket';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

const mockIo = io as jest.MockedFunction<typeof io>;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('useSocket', () => {
  let mockSocket: any;
  let mockSocketEventHandlers: Record<string, Function[]>;
  let mockIoEventHandlers: Record<string, Function[]>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset event handlers
    mockSocketEventHandlers = {};
    mockIoEventHandlers = {};
    
    // Create mock socket
    mockSocket = {
      id: 'socket-123',
      connected: true,
      io: {
        on: jest.fn((event: string, handler: Function) => {
          if (!mockIoEventHandlers[event]) {
            mockIoEventHandlers[event] = [];
          }
          mockIoEventHandlers[event].push(handler);
        })
      },
      on: jest.fn((event: string, handler: Function) => {
        if (!mockSocketEventHandlers[event]) {
          mockSocketEventHandlers[event] = [];
        }
        mockSocketEventHandlers[event].push(handler);
      }),
      off: jest.fn((event: string, handler?: Function) => {
        if (handler && mockSocketEventHandlers[event]) {
          mockSocketEventHandlers[event] = mockSocketEventHandlers[event].filter(h => h !== handler);
        }
      }),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn()
    };
    
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    // Clear global socket cache after each test
    const cache = (useSocket as any).globalSocketCache || new Map();
    cache.clear();
  });

  describe('connection management', () => {
    it('should create socket connection on mount', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000', expect.objectContaining({
        autoConnect: true,
        forceNew: false,
        transports: ['polling', 'websocket'],
        upgrade: true,
        timeout: 45000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        closeOnBeforeunload: true
      }));

      expect(result.current.socket).toBe(mockSocket);
      expect(result.current.connected).toBe(true);
      expect(result.current.socketId).toBe('socket-123');
    });

    it('should accept custom options', () => {
      const customOptions = {
        autoConnect: false,
        timeout: 60000,
        reconnectionAttempts: 5
      };

      renderHook(() => useSocket('http://localhost:3000', customOptions));

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000', expect.objectContaining({
        autoConnect: false,
        timeout: 60000,
        reconnectionAttempts: 5
      }));
    });

    it('should reuse existing socket connection from cache', () => {
      // First hook creates connection
      const { unmount: unmount1 } = renderHook(() => useSocket('http://localhost:3000'));
      expect(mockIo).toHaveBeenCalledTimes(1);
      
      // Don't unmount first hook yet
      // Second hook should reuse connection
      const { result: result2 } = renderHook(() => useSocket('http://localhost:3000'));
      
      expect(mockIo).toHaveBeenCalledTimes(1); // No new connection created
      expect(result2.current.socket).toBe(mockSocket);
      expect(console.log).toHaveBeenCalledWith('Reusing existing socket connection to:', 'http://localhost:3000');
      
      unmount1();
    });

    it('should create new socket for different URLs', () => {
      renderHook(() => useSocket('http://localhost:3000'));
      renderHook(() => useSocket('http://localhost:3001'));

      expect(mockIo).toHaveBeenCalledTimes(2);
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useSocket('http://localhost:3000'));

      unmount();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should not initialize multiple times on re-renders', () => {
      const { rerender } = renderHook(
        ({ url }) => useSocket(url),
        { initialProps: { url: 'http://localhost:3000' } }
      );

      expect(mockIo).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender({ url: 'http://localhost:3000' });
      
      expect(mockIo).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('event handling', () => {
    it('should handle connect event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      act(() => {
        // Simulate connect event
        const connectHandler = mockSocketEventHandlers['connect'][0];
        connectHandler();
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.error).toBe(null);
      expect(console.log).toHaveBeenCalledWith('Socket connected successfully with ID:', 'socket-123');
    });

    it('should handle disconnect event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      act(() => {
        // Simulate disconnect event
        const disconnectHandler = mockSocketEventHandlers['disconnect'][0];
        disconnectHandler('transport close');
      });

      expect(result.current.connected).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Socket disconnected, reason:', 'transport close');
    });

    it('should handle connect_error event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      act(() => {
        // Simulate connection error
        const errorHandler = mockSocketEventHandlers['connect_error'][0];
        errorHandler(new Error('Connection refused'));
      });

      expect(result.current.error).toBe('Connection error: Connection refused');
      expect(console.error).toHaveBeenCalledWith('Socket connection error:', 'Connection refused');
    });

    it('should handle reconnection events', () => {
      renderHook(() => useSocket('http://localhost:3000'));

      act(() => {
        // Simulate reconnect attempt
        const attemptHandler = mockIoEventHandlers['reconnect_attempt'][0];
        attemptHandler(2);
      });

      expect(console.log).toHaveBeenCalledWith('Socket reconnection attempt #2');

      act(() => {
        // Simulate successful reconnect
        const reconnectHandler = mockIoEventHandlers['reconnect'][0];
        reconnectHandler(3);
      });

      expect(console.log).toHaveBeenCalledWith('Socket reconnected after 3 attempts');
    });

    it('should handle reconnection failure', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      act(() => {
        // Simulate reconnection error
        const errorHandler = mockIoEventHandlers['reconnect_error'][0];
        errorHandler(new Error('Network error'));
      });

      expect(console.warn).toHaveBeenCalledWith('Socket reconnection failed:', 'Network error');

      act(() => {
        // Simulate total reconnection failure
        const failHandler = mockIoEventHandlers['reconnect_failed'][0];
        failHandler();
      });

      expect(result.current.error).toBe('Unable to connect to server after multiple attempts');
      expect(console.error).toHaveBeenCalledWith('Socket reconnection failed after all attempts');
    });
  });

  describe('emit function', () => {
    it('should emit events successfully', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      const success = result.current.emit('test-event', { data: 'test' });

      expect(success).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should emit events with callback', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      const callback = jest.fn();

      const success = result.current.emit('test-event', { data: 'test' }, callback);

      expect(success).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' }, callback);
    });

    it('should return false when socket not connected', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      
      // Disconnect socket
      act(() => {
        result.current.socket!.connected = false;
        (result.current as any).socketRef.current = null;
      });

      const success = result.current.emit('test-event', { data: 'test' });

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Socket not connected, cannot emit:', 'test-event');
    });

    it('should handle emit errors gracefully', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      
      mockSocket.emit.mockImplementation(() => {
        throw new Error('Emit error');
      });

      const success = result.current.emit('test-event', { data: 'test' });

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error emitting test-event:', expect.any(Error));
    });
  });

  describe('on function', () => {
    it('should register event listeners', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      const handler = jest.fn();

      const unsubscribe = result.current.on('custom-event', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('custom-event', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe event listeners', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      const handler = jest.fn();

      const unsubscribe = result.current.on('custom-event', handler);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('custom-event', handler);
    });

    it('should handle listener registration when socket not initialized', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      
      // Remove socket reference
      act(() => {
        (result.current as any).socketRef.current = null;
      });

      const handler = jest.fn();
      const unsubscribe = result.current.on('custom-event', handler);

      expect(console.warn).toHaveBeenCalledWith('Attempted to listen for custom-event but socket not initialized');
      expect(unsubscribe).toBeDefined();
      
      // Unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('utility functions', () => {
    describe('isConnected', () => {
      it('should return true when connected', () => {
        const { result } = renderHook(() => useSocket('http://localhost:3000'));

        expect(result.current.isConnected()).toBe(true);
      });

      it('should return false when disconnected', () => {
        const { result } = renderHook(() => useSocket('http://localhost:3000'));
        
        act(() => {
          // Simulate disconnect
          const disconnectHandler = mockSocketEventHandlers['disconnect'][0];
          disconnectHandler('transport close');
        });

        expect(result.current.isConnected()).toBe(false);
      });

      it('should return false when socket is null', () => {
        const { result } = renderHook(() => useSocket('http://localhost:3000'));
        
        act(() => {
          (result.current as any).socketRef.current = null;
        });

        expect(result.current.isConnected()).toBe(false);
      });
    });

    describe('reconnect', () => {
      it('should attempt reconnection when disconnected', () => {
        const { result } = renderHook(() => useSocket('http://localhost:3000'));
        
        act(() => {
          // Simulate disconnect
          const disconnectHandler = mockSocketEventHandlers['disconnect'][0];
          disconnectHandler('transport close');
        });

        act(() => {
          result.current.reconnect();
        });

        expect(mockSocket.connect).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Manually attempting to reconnect socket');
      });

      it('should not reconnect when already connected', () => {
        const { result } = renderHook(() => useSocket('http://localhost:3000'));

        mockSocket.connect.mockClear();

        act(() => {
          result.current.reconnect();
        });

        expect(mockSocket.connect).not.toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle socket without ID', () => {
      mockSocket.id = undefined;
      
      const { result } = renderHook(() => useSocket('http://localhost:3000'));

      expect(result.current.socketId).toBe(null);
    });

    it('should maintain socketId after disconnect', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3000'));
      
      const initialSocketId = result.current.socketId;

      act(() => {
        // Simulate disconnect
        const disconnectHandler = mockSocketEventHandlers['disconnect'][0];
        disconnectHandler('transport close');
      });

      // Socket ID should remain the same (not nullified)
      expect(result.current.socketId).toBe(initialSocketId);
    });

    it('should handle existing but disconnected socket in cache', () => {
      // Create a disconnected socket in cache
      mockSocket.connected = false;
      
      // First render creates disconnected socket
      const { unmount: unmount1 } = renderHook(() => useSocket('http://localhost:3000'));
      
      // Second render should create new socket since cached one is disconnected
      mockSocket.connected = true; // Reset for new socket
      const { result: result2 } = renderHook(() => useSocket('http://localhost:3000'));
      
      expect(mockIo).toHaveBeenCalledTimes(2); // New socket created
      expect(console.log).toHaveBeenCalledWith('Creating new socket connection to:', 'http://localhost:3000');
      
      unmount1();
    });
  });
});