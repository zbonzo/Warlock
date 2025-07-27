/**
 * @fileoverview Tests for useSocket hook Phase 2 improvements
 * Tests the IPv4/IPv6 connectivity fixes and connection stability
 */
import { renderHook, act } from '@testing-library/react';
import useSocket from '@client/hooks/useSocket';

// Mock socket.io-client
const mockSocket = {
  id: 'test_socket_123',
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockIo = jest.fn(() => mockSocket);
mockIo.connect = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({
  io: mockIo
}));

describe('useSocket Hook Phase 2 Improvements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset socket state
    mockSocket.connected = false;
    mockSocket.id = 'test_socket_123';
    
    // Clear global socket cache
    const useSocketModule = require('@client/hooks/useSocket');
    if (useSocketModule.globalSocketCache) {
      useSocketModule.globalSocketCache.clear();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('IPv4/IPv6 Connectivity Fixes', () => {
    it('should force IPv4 connection for localhost URLs', () => {
      const { result } = renderHook(() => 
        useSocket('http://localhost:3001', { 
          transports: ['polling', 'websocket'] 
        })
      );

      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:3001',
        expect.objectContaining({
          transports: ['polling', 'websocket'],
          upgrade: true,
          timeout: 45000
        })
      );
    });

    it('should configure balanced timeout settings', () => {
      renderHook(() => useSocket('http://127.0.0.1:3001'));

      expect(mockIo).toHaveBeenCalledWith(
        'http://127.0.0.1:3001',
        expect.objectContaining({
          timeout: 45000,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 5000
        })
      );
    });
  });

  describe('Connection Stability Improvements', () => {
    it('should prevent multiple socket connections to same URL', () => {
      const url = 'http://127.0.0.1:3001';
      
      // Render hook twice with same URL
      const { result: result1 } = renderHook(() => useSocket(url));
      const { result: result2 } = renderHook(() => useSocket(url));

      // Should only create one socket connection
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing connected socket', () => {
      const url = 'http://127.0.0.1:3001';
      mockSocket.connected = true;
      
      // First hook creates socket
      const { result: result1 } = renderHook(() => useSocket(url));
      
      // Second hook should reuse existing socket
      const { result: result2 } = renderHook(() => useSocket(url));
      
      expect(result1.current.socket).toBe(result2.current.socket);
    });

    it('should handle connection state changes properly', () => {
      const { result } = renderHook(() => useSocket('http://127.0.0.1:3001'));

      expect(result.current.connected).toBe(false);

      // Simulate connection
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          mockSocket.connected = true;
          mockSocket.id = 'connected_socket_456';
          connectHandler();
        }
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.socketId).toBe('connected_socket_456');
    });

    it('should handle disconnection gracefully', () => {
      const { result } = renderHook(() => useSocket('http://127.0.0.1:3001'));

      // First establish connection
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          mockSocket.connected = true;
          connectHandler();
        }
      });

      expect(result.current.connected).toBe(true);

      // Simulate disconnection
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];
        if (disconnectHandler) {
          mockSocket.connected = false;
          disconnectHandler('transport error');
        }
      });

      expect(result.current.connected).toBe(false);
      // Socket ID should be preserved for reconnection
      expect(result.current.socketId).toBeTruthy();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle connection errors properly', () => {
      const { result } = renderHook(() => useSocket('http://127.0.0.1:3001'));

      expect(result.current.error).toBeNull();

      // Simulate connection error
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect_error'
        )?.[1];
        if (errorHandler) {
          errorHandler(new Error('Connection failed'));
        }
      });

      expect(result.current.error).toContain('Connection error: Connection failed');
    });

    it('should handle reconnection attempts', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      renderHook(() => useSocket('http://127.0.0.1:3001'));

      // Simulate reconnection attempt
      act(() => {
        const reconnectAttemptHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnect_attempt'
        )?.[1];
        if (reconnectAttemptHandler) {
          reconnectAttemptHandler(2);
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith('Socket reconnection attempt #2');
      
      consoleSpy.mockRestore();
    });

    it('should handle successful reconnection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      renderHook(() => useSocket('http://127.0.0.1:3001'));

      // Simulate successful reconnection
      act(() => {
        const reconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnect'
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler(3);
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith('Socket reconnected after 3 attempts');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Transport Configuration', () => {
    it('should allow both polling and websocket transports', () => {
      renderHook(() => useSocket('http://127.0.0.1:3001'));

      expect(mockIo).toHaveBeenCalledWith(
        'http://127.0.0.1:3001',
        expect.objectContaining({
          transports: ['polling', 'websocket'],
          upgrade: true
        })
      );
    });

    it('should configure appropriate connection settings', () => {
      renderHook(() => useSocket('http://127.0.0.1:3001'));

      expect(mockIo).toHaveBeenCalledWith(
        'http://127.0.0.1:3001',
        expect.objectContaining({
          autoConnect: true,
          forceNew: false,
          reconnection: true,
          closeOnBeforeunload: true
        })
      );
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clean up socket connection on unmount', () => {
      const { unmount } = renderHook(() => useSocket('http://127.0.0.1:3001'));

      expect(mockSocket.on).toHaveBeenCalled();

      unmount();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should remove socket from global cache on cleanup', () => {
      const url = 'http://127.0.0.1:3001';
      const { unmount } = renderHook(() => useSocket(url));

      // Socket should be in cache
      expect(mockIo).toHaveBeenCalledTimes(1);

      unmount();

      // After unmount, new hook should create new socket
      renderHook(() => useSocket(url));
      expect(mockIo).toHaveBeenCalledTimes(2);
    });
  });
});