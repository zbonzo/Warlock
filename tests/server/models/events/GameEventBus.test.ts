/**
 * @fileoverview Comprehensive TypeScript tests for GameEventBus
 * Testing the central event bus with full type safety and event handling logic
 */

import { GameEventBus } from '@models/events/GameEventBus';
import type { GameEvent, EventType, EventPayload } from '@models/events/EventTypes';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockMessages = {
  formatMessage: jest.fn((template: string, vars: any) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
  })
};

// Mock all dependencies
jest.mock('@utils/logger', () => mockLogger);
jest.mock('@messages', () => mockMessages);

// Test event types for type safety testing
type TestEventType = 'TEST.EVENT' | 'TEST.ACTION' | 'TEST.ERROR';

interface TestEvent extends GameEvent {
  type: TestEventType;
  payload: {
    message: string;
    data?: any;
  };
}

describe('GameEventBus (TypeScript)', () => {
  let eventBus: GameEventBus;
  const gameCode = 'TEST123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create new event bus instance
    eventBus = new GameEventBus(gameCode);
  });

  afterEach(() => {
    // Clean up event bus
    eventBus.destroy();
  });

  describe('Constructor', () => {
    it('should create GameEventBus with game code', () => {
      expect(eventBus).toBeInstanceOf(GameEventBus);
      expect((eventBus as any).gameCode).toBe(gameCode);
      expect((eventBus as any).isEnabled).toBe(true);
      expect((eventBus as any).listeners).toBeInstanceOf(Map);
      expect((eventBus as any).middleware).toEqual([]);
      expect((eventBus as any).eventHistory).toEqual([]);
    });
  });

  describe('Event Listener Management', () => {
    it('should register event listener successfully', () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      const unsubscribe = eventBus.on(eventType, mockListener);

      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getListenerCount(eventType)).toBe(1);
      expect(eventBus.getListenerCount()).toBe(1);
    });

    it('should register multiple listeners for same event type', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, listener1);
      eventBus.on(eventType, listener2);

      expect(eventBus.getListenerCount(eventType)).toBe(2);
    });

    it('should register listeners with different priorities', () => {
      const highPriorityListener = jest.fn();
      const lowPriorityListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, highPriorityListener, { priority: 10 });
      eventBus.on(eventType, lowPriorityListener, { priority: 1 });

      expect(eventBus.getListenerCount(eventType)).toBe(2);
    });

    it('should register one-time listeners', () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      const unsubscribe = eventBus.once(eventType, mockListener);

      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getListenerCount(eventType)).toBe(1);
    });

    it('should throw error for invalid listener', () => {
      const eventType: TestEventType = 'TEST.EVENT';

      expect(() => {
        (eventBus as any).on(eventType, 'not a function');
      }).toThrow('Listener must be a function');
    });

    it('should unsubscribe listener successfully', () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      const unsubscribe = eventBus.on(eventType, mockListener);
      
      expect(eventBus.getListenerCount(eventType)).toBe(1);
      
      const result = unsubscribe();
      
      expect(result).toBe(true);
      expect(eventBus.getListenerCount(eventType)).toBe(0);
    });

    it('should remove specific listener by function reference', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, listener1);
      eventBus.on(eventType, listener2);

      expect(eventBus.getListenerCount(eventType)).toBe(2);

      const result = eventBus.off(eventType, listener1);

      expect(result).toBe(true);
      expect(eventBus.getListenerCount(eventType)).toBe(1);
    });

    it('should return false when removing non-existent listener', () => {
      const eventType: TestEventType = 'TEST.EVENT';
      const result = eventBus.off(eventType, jest.fn());

      expect(result).toBe(false);
    });

    it('should remove all listeners for specific event type', () => {
      const eventType1: TestEventType = 'TEST.EVENT';
      const eventType2: TestEventType = 'TEST.ACTION';

      eventBus.on(eventType1, jest.fn());
      eventBus.on(eventType1, jest.fn());
      eventBus.on(eventType2, jest.fn());

      expect(eventBus.getListenerCount()).toBe(3);

      eventBus.removeAllListeners(eventType1);

      expect(eventBus.getListenerCount(eventType1)).toBe(0);
      expect(eventBus.getListenerCount(eventType2)).toBe(1);
      expect(eventBus.getListenerCount()).toBe(1);
    });

    it('should remove all listeners for all event types', () => {
      eventBus.on('TEST.EVENT', jest.fn());
      eventBus.on('TEST.ACTION', jest.fn());

      expect(eventBus.getListenerCount()).toBe(2);

      eventBus.removeAllListeners();

      expect(eventBus.getListenerCount()).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit event to registered listeners', async () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';
      const eventData = { message: 'Test message', data: { test: true } };

      eventBus.on(eventType, mockListener);

      const result = await eventBus.emit(eventType, eventData);

      expect(result).toBe(true);
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
          payload: eventData
        })
      );
    });

    it('should emit events to multiple listeners in priority order', async () => {
      const executionOrder: number[] = [];
      const highPriorityListener = jest.fn().mockImplementation(() => executionOrder.push(1));
      const lowPriorityListener = jest.fn().mockImplementation(() => executionOrder.push(2));
      const eventType: TestEventType = 'TEST.EVENT';

      // Register in reverse priority order to test sorting
      eventBus.on(eventType, lowPriorityListener, { priority: 1 });
      eventBus.on(eventType, highPriorityListener, { priority: 10 });

      await eventBus.emit(eventType, { message: 'Test' });

      expect(executionOrder).toEqual([1, 2]); // High priority first
      expect(highPriorityListener).toHaveBeenCalled();
      expect(lowPriorityListener).toHaveBeenCalled();
    });

    it('should remove one-time listeners after execution', async () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.once(eventType, mockListener);

      expect(eventBus.getListenerCount(eventType)).toBe(1);

      await eventBus.emit(eventType, { message: 'Test' });

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(eventBus.getListenerCount(eventType)).toBe(0);
    });

    it('should handle async listeners correctly', async () => {
      const asyncListener = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, asyncListener);

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(true);
      expect(asyncListener).toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      const eventType: TestEventType = 'TEST.ERROR';

      eventBus.on(eventType, errorListener);
      eventBus.on(eventType, goodListener);

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(true); // Should still return true
      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Listener error'),
        expect.objectContaining({
          eventType,
          error: 'Listener error'
        })
      );
    });

    it('should return true when no listeners registered', async () => {
      const eventType: TestEventType = 'TEST.EVENT';
      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(true);
    });

    it('should return false when event bus is disabled', async () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, mockListener);
      eventBus.setEnabled(false);

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(false);
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should execute listeners synchronously when specified', async () => {
      const executionOrder: number[] = [];
      const listener1 = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        executionOrder.push(1);
      });
      const listener2 = jest.fn().mockImplementation(() => {
        executionOrder.push(2);
      });
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, listener1);
      eventBus.on(eventType, listener2);

      await eventBus.emit(eventType, { message: 'Test' }, { async: false });

      expect(executionOrder).toEqual([1, 2]); // Sequential execution
    });
  });

  describe('Legacy Event Support', () => {
    it('should emit legacy events', async () => {
      const mockListener = jest.fn();
      const eventType = 'legacy.event';

      (eventBus as any).on(eventType, mockListener);

      const result = await eventBus.emitLegacy(eventType, { test: 'data' });

      expect(result).toBe(true);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
          data: { test: 'data' },
          gameCode,
          timestamp: expect.any(String),
          id: expect.any(String)
        })
      );
    });

    it('should handle legacy event without data', async () => {
      const mockListener = jest.fn();
      const eventType = 'legacy.event';

      (eventBus as any).on(eventType, mockListener);

      const result = await eventBus.emitLegacy(eventType);

      expect(result).toBe(true);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
          data: {},
          gameCode
        })
      );
    });
  });

  describe('Middleware', () => {
    it('should add and process middleware', async () => {
      const middlewareFunction = jest.fn().mockImplementation((event, next) => {
        const modifiedEvent = {
          ...event,
          payload: { ...event.payload, modified: true }
        };
        next(modifiedEvent);
      });
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.addMiddleware(middlewareFunction);
      eventBus.on(eventType, mockListener);

      await eventBus.emit(eventType, { message: 'Test' });

      expect(middlewareFunction).toHaveBeenCalled();
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            modified: true
          })
        })
      );
    });

    it('should cancel event when middleware returns false', async () => {
      const cancellingMiddleware = jest.fn().mockImplementation((event, next) => {
        next(false);
      });
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.addMiddleware(cancellingMiddleware);
      eventBus.on(eventType, mockListener);

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(false);
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle middleware errors', async () => {
      const errorMiddleware = jest.fn().mockImplementation(() => {
        throw new Error('Middleware error');
      });
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.addMiddleware(errorMiddleware);
      eventBus.on(eventType, mockListener);

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(false);
      expect(mockListener).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Middleware error'),
        expect.objectContaining({
          error: 'Middleware error',
          eventType
        })
      );
    });

    it('should throw error for invalid middleware', () => {
      expect(() => {
        eventBus.addMiddleware('not a function' as any);
      }).toThrow('Middleware must be a function');
    });

    it('should process multiple middleware in order', async () => {
      const middleware1 = jest.fn().mockImplementation((event, next) => {
        const modified = { ...event, step1: true };
        next(modified);
      });
      const middleware2 = jest.fn().mockImplementation((event, next) => {
        const modified = { ...event, step2: true };
        next(modified);
      });
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.addMiddleware(middleware1);
      eventBus.addMiddleware(middleware2);
      eventBus.on(eventType, mockListener);

      await eventBus.emit(eventType, { message: 'Test' });

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          step1: true,
          step2: true
        })
      );
    });
  });

  describe('Event History and Statistics', () => {
    it('should track event history', async () => {
      const eventType: TestEventType = 'TEST.EVENT';

      await eventBus.emit(eventType, { message: 'Event 1' });
      await eventBus.emit(eventType, { message: 'Event 2' });

      const history = eventBus.getEventHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(
        expect.objectContaining({
          type: eventType,
          payload: { message: 'Event 1' }
        })
      );
      expect(history[1]).toEqual(
        expect.objectContaining({
          type: eventType,
          payload: { message: 'Event 2' }
        })
      );
    });

    it('should limit event history size', async () => {
      const eventType: TestEventType = 'TEST.EVENT';
      const maxHistorySize = (eventBus as any).maxHistorySize;

      // Emit more events than max history size
      for (let i = 0; i < maxHistorySize + 100; i++) {
        await eventBus.emit(eventType, { message: `Event ${i}` });
      }

      const history = eventBus.getEventHistory();

      expect(history.length).toBeLessThanOrEqual(maxHistorySize);
    });

    it('should return limited event history', () => {
      const eventType: TestEventType = 'TEST.EVENT';

      // Add events directly to history for testing
      for (let i = 0; i < 100; i++) {
        (eventBus as any)._addToHistory({
          type: eventType,
          payload: { message: `Event ${i}` }
        });
      }

      const limitedHistory = eventBus.getEventHistory(10);

      expect(limitedHistory).toHaveLength(10);
      expect(limitedHistory[0].payload.message).toBe('Event 90'); // Last 10 events
    });

    it('should track event statistics', async () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, mockListener);

      const initialStats = eventBus.getStats();
      expect(initialStats.eventsEmitted).toBe(0);
      expect(initialStats.eventsProcessed).toBe(0);

      await eventBus.emit(eventType, { message: 'Test 1' });
      await eventBus.emit(eventType, { message: 'Test 2' });

      const updatedStats = eventBus.getStats();
      expect(updatedStats.eventsEmitted).toBe(2);
      expect(updatedStats.eventsProcessed).toBe(2);
      expect(updatedStats.errors).toBe(0);
      expect(updatedStats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should track error statistics', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const eventType: TestEventType = 'TEST.ERROR';

      eventBus.on(eventType, errorListener);

      await eventBus.emit(eventType, { message: 'Test' });

      const stats = eventBus.getStats();
      expect(stats.errors).toBe(1);
    });
  });

  describe('Event Bus Management', () => {
    it('should enable and disable event bus', async () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, mockListener);

      // Test enabled (default)
      let result = await eventBus.emit(eventType, { message: 'Test' });
      expect(result).toBe(true);
      expect(mockListener).toHaveBeenCalledTimes(1);

      // Test disabled
      eventBus.setEnabled(false);
      result = await eventBus.emit(eventType, { message: 'Test' });
      expect(result).toBe(false);
      expect(mockListener).toHaveBeenCalledTimes(1); // No additional calls

      // Test re-enabled
      eventBus.setEnabled(true);
      result = await eventBus.emit(eventType, { message: 'Test' });
      expect(result).toBe(true);
      expect(mockListener).toHaveBeenCalledTimes(2);
    });

    it('should destroy event bus completely', () => {
      const mockListener = jest.fn();
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.addMiddleware(jest.fn());
      eventBus.on(eventType, mockListener);
      
      // Add some history
      (eventBus as any)._addToHistory({
        type: eventType,
        payload: { message: 'Test' }
      });

      expect(eventBus.getListenerCount()).toBe(1);
      expect((eventBus as any).middleware.length).toBe(1);
      expect(eventBus.getEventHistory().length).toBe(1);

      eventBus.destroy();

      expect(eventBus.getListenerCount()).toBe(0);
      expect((eventBus as any).middleware.length).toBe(0);
      expect(eventBus.getEventHistory().length).toBe(0);
      expect((eventBus as any).isEnabled).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for event types and payloads', async () => {
      interface TypedTestEvent extends GameEvent {
        type: 'TYPED.TEST';
        payload: {
          id: number;
          name: string;
          optional?: boolean;
        };
      }

      const typedListener = jest.fn<void, [TypedTestEvent]>();
      
      eventBus.on('TYPED.TEST' as EventType, typedListener);

      await eventBus.emit('TYPED.TEST' as EventType, {
        id: 123,
        name: 'Test Name',
        optional: true
      } as any);

      expect(typedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TYPED.TEST',
          payload: {
            id: 123,
            name: 'Test Name',
            optional: true
          }
        })
      );
    });

    it('should provide type-safe unsubscribe functions', () => {
      const mockListener = jest.fn();
      const unsubscribe = eventBus.on('TEST.EVENT', mockListener);

      expect(typeof unsubscribe).toBe('function');
      
      const result = unsubscribe();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should handle listener options with proper types', () => {
      const mockListener = jest.fn();
      
      // Test all option types
      const unsubscribe1 = eventBus.on('TEST.EVENT', mockListener, { once: true });
      const unsubscribe2 = eventBus.on('TEST.EVENT', mockListener, { priority: 5 });
      const unsubscribe3 = eventBus.on('TEST.EVENT', mockListener, { 
        once: true, 
        priority: 10 
      });

      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      expect(typeof unsubscribe3).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle emission errors gracefully', async () => {
      const eventType: TestEventType = 'TEST.EVENT';
      
      // Force an error by corrupting internal state
      (eventBus as any).listeners = null;

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle general errors during emission', async () => {
      const mockListener = jest.fn().mockImplementation(() => {
        throw new Error('Async error');
      });
      const eventType: TestEventType = 'TEST.EVENT';

      eventBus.on(eventType, mockListener);

      const result = await eventBus.emit(eventType, { message: 'Test' });

      expect(result).toBe(true); // Should still succeed despite listener error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Listener error'),
        expect.objectContaining({
          eventType,
          error: 'Async error'
        })
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should generate unique listener IDs', () => {
      const id1 = (eventBus as any)._generateListenerId();
      const id2 = (eventBus as any)._generateListenerId();

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^listener_\d+_[a-z0-9]+$/);
    });

    it('should generate unique event IDs', () => {
      const id1 = (eventBus as any)._generateEventId();
      const id2 = (eventBus as any)._generateEventId();

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^event_\d+_[a-z0-9]+$/);
    });

    it('should calculate average processing time correctly', () => {
      // Access private method for testing
      const updateAvg = (eventBus as any)._updateAverageProcessingTime.bind(eventBus);
      
      // Set initial state
      (eventBus as any).stats.eventsProcessed = 1;
      (eventBus as any).stats.averageProcessingTime = 100;
      
      updateAvg(200); // Add a second event with 200ms processing time
      
      expect((eventBus as any).stats.averageProcessingTime).toBe(150); // (100 + 200) / 2
    });
  });
});