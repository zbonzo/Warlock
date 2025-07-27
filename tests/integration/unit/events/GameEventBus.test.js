/**
 * @fileoverview Integration tests for GameEventBus system
 * Tests event emission, listener management, middleware, and performance
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const GameEventBus = require('../../../../server/models/events/GameEventBus');
const EventMiddleware = require('../../../../server/models/events/EventMiddleware');
const { EventTypes } = require('../../../../server/models/events/EventTypes');

describe('GameEventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new GameEventBus('TEST_GAME');
  });

  afterEach(() => {
    if (eventBus) {
      eventBus.destroy();
    }
  });

  describe('Basic Event Operations', () => {
    test('should create event bus with correct game code', () => {
      expect(eventBus.gameCode).toBe('TEST_GAME');
      expect(eventBus.isEnabled).toBe(true);
      expect(eventBus.getListenerCount()).toBe(0);
    });

    test('should emit and receive events', async () => {
      const mockListener = jest.fn();
      
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, {
        playerId: 'player1',
        playerName: 'TestPlayer',
        gameCode: 'TEST_GAME'
      });

      expect(result).toBe(true);
      expect(mockListener).toHaveBeenCalledTimes(1);
      
      const eventArg = mockListener.mock.calls[0][0];
      expect(eventArg.type).toBe(EventTypes.PLAYER.JOINED);
      expect(eventArg.data.playerId).toBe('player1');
      expect(eventArg.gameCode).toBe('TEST_GAME');
      expect(eventArg.timestamp).toBeDefined();
      expect(eventArg.id).toBeDefined();
    });

    test('should handle multiple listeners for same event', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      eventBus.on(EventTypes.PLAYER.JOINED, listener1);
      eventBus.on(EventTypes.PLAYER.JOINED, listener2);
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    test('should execute listeners in priority order', async () => {
      const executionOrder = [];
      
      const lowPriorityListener = jest.fn(() => executionOrder.push('low'));
      const highPriorityListener = jest.fn(() => executionOrder.push('high'));
      const mediumPriorityListener = jest.fn(() => executionOrder.push('medium'));
      
      eventBus.on(EventTypes.PLAYER.JOINED, lowPriorityListener, { priority: 1 });
      eventBus.on(EventTypes.PLAYER.JOINED, highPriorityListener, { priority: 10 });
      eventBus.on(EventTypes.PLAYER.JOINED, mediumPriorityListener, { priority: 5 });
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(executionOrder).toEqual(['high', 'medium', 'low']);
    });

    test('should handle one-time listeners', async () => {
      const mockListener = jest.fn();
      
      eventBus.once(EventTypes.PLAYER.JOINED, mockListener);
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player2' });

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(eventBus.getListenerCount(EventTypes.PLAYER.JOINED)).toBe(0);
    });

    test('should remove listeners correctly', async () => {
      const mockListener = jest.fn();
      
      const unsubscribe = eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      expect(eventBus.getListenerCount(EventTypes.PLAYER.JOINED)).toBe(1);
      
      unsubscribe();
      expect(eventBus.getListenerCount(EventTypes.PLAYER.JOINED)).toBe(0);
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Middleware Integration', () => {
    test('should process events through middleware', async () => {
      const mockMiddleware = jest.fn((event, next) => {
        event.middlewareProcessed = true;
        next(event);
      });
      
      const mockListener = jest.fn();
      
      eventBus.addMiddleware(mockMiddleware);
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(mockMiddleware).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener.mock.calls[0][0].middlewareProcessed).toBe(true);
    });

    test('should cancel events when middleware returns false', async () => {
      const cancellingMiddleware = jest.fn((event, next) => {
        next(false); // Cancel the event
      });
      
      const mockListener = jest.fn();
      
      eventBus.addMiddleware(cancellingMiddleware);
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(result).toBe(false);
      expect(mockListener).not.toHaveBeenCalled();
    });

    test('should handle middleware errors gracefully', async () => {
      const errorMiddleware = jest.fn(() => {
        throw new Error('Middleware error');
      });
      
      const mockListener = jest.fn();
      
      eventBus.addMiddleware(errorMiddleware);
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(result).toBe(false);
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Event History and Statistics', () => {
    test('should track event history', async () => {
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });
      await eventBus.emit(EventTypes.PLAYER.LEFT, { playerId: 'player1' });
      
      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(EventTypes.PLAYER.JOINED);
      expect(history[1].type).toBe(EventTypes.PLAYER.LEFT);
    });

    test('should track statistics', async () => {
      const mockListener = jest.fn();
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player2' });
      
      const stats = eventBus.getStats();
      expect(stats.eventsEmitted).toBe(2);
      expect(stats.eventsProcessed).toBe(2);
      expect(stats.errors).toBe(0);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    test('should limit history size', async () => {
      // Set a small max history size for testing
      eventBus.maxHistorySize = 3;
      
      for (let i = 0; i < 5; i++) {
        await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: `player${i}` });
      }
      
      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(3);
      // Should contain the last 3 events
      expect(history[0].data.playerId).toBe('player2');
      expect(history[2].data.playerId).toBe('player4');
    });
  });

  describe('Error Handling', () => {
    test('should handle listener errors without stopping other listeners', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      eventBus.on(EventTypes.PLAYER.JOINED, errorListener);
      eventBus.on(EventTypes.PLAYER.JOINED, normalListener);
      
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(result).toBe(true); // Event processing should continue
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
      
      const stats = eventBus.getStats();
      expect(stats.errors).toBe(0); // Listener errors don't count as event bus errors
    });

    test('should handle disabled event bus', async () => {
      const mockListener = jest.fn();
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      eventBus.setEnabled(false);
      const result = await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });

      expect(result).toBe(false);
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('should handle high event volume efficiently', async () => {
      const mockListener = jest.fn();
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      const startTime = Date.now();
      const eventCount = 1000;
      
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: `player${i}` }));
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      expect(mockListener).toHaveBeenCalledTimes(eventCount);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const stats = eventBus.getStats();
      expect(stats.eventsEmitted).toBe(eventCount);
      expect(stats.eventsProcessed).toBe(eventCount);
    });

    test('should process events asynchronously by default', async () => {
      const processingOrder = [];
      
      const slowListener = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        processingOrder.push('slow');
      });
      
      const fastListener = jest.fn(() => {
        processingOrder.push('fast');
      });
      
      eventBus.on(EventTypes.PLAYER.JOINED, slowListener, { priority: 10 });
      eventBus.on(EventTypes.PLAYER.JOINED, fastListener, { priority: 1 });
      
      await eventBus.emit(EventTypes.PLAYER.JOINED, { playerId: 'player1' });
      
      // In async mode, both listeners are called but fast one may finish first
      expect(slowListener).toHaveBeenCalledTimes(1);
      expect(fastListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Management', () => {
    test('should clean up properly when destroyed', () => {
      const mockListener = jest.fn();
      eventBus.on(EventTypes.PLAYER.JOINED, mockListener);
      
      expect(eventBus.getListenerCount()).toBeGreaterThan(0);
      expect(eventBus.eventHistory.length).toBeGreaterThanOrEqual(0);
      
      eventBus.destroy();
      
      expect(eventBus.getListenerCount()).toBe(0);
      expect(eventBus.eventHistory.length).toBe(0);
      expect(eventBus.isEnabled).toBe(false);
    });
  });
});

describe('EventMiddleware Standard Stack', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new GameEventBus('TEST_GAME');
  });

  afterEach(() => {
    if (eventBus) {
      eventBus.destroy();
    }
  });

  test('should create and apply standard middleware stack', async () => {
    const middleware = EventMiddleware.createStandardStack({
      enableLogging: false, // Disable for testing
      enableValidation: true,
      enableRateLimit: false, // Disable for testing
      enablePerformance: true
    });

    middleware.forEach(mw => eventBus.addMiddleware(mw));

    const mockListener = jest.fn();
    eventBus.on(EventTypes.PLAYER.JOINED, mockListener);

    const result = await eventBus.emit(EventTypes.PLAYER.JOINED, {
      playerId: 'player1',
      playerName: 'TestPlayer',
      gameCode: 'TEST_GAME',
      timestamp: new Date().toISOString()
    });

    expect(result).toBe(true);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test('should validate events and reject invalid ones', async () => {
    const middleware = EventMiddleware.createStandardStack({
      enableLogging: false,
      enableValidation: true,
      enableRateLimit: false,
      enablePerformance: false
    });

    middleware.forEach(mw => eventBus.addMiddleware(mw));

    const mockListener = jest.fn();
    eventBus.on(EventTypes.PLAYER.JOINED, mockListener);

    // Valid event
    const validResult = await eventBus.emit(EventTypes.PLAYER.JOINED, {
      playerId: 'player1',
      playerName: 'TestPlayer',
      gameCode: 'TEST_GAME',
      timestamp: new Date().toISOString()
    });

    // Invalid event (missing required fields)
    const invalidResult = await eventBus.emit(EventTypes.PLAYER.JOINED, {
      // Missing required fields
    });

    expect(validResult).toBe(true);
    expect(invalidResult).toBe(false);
    expect(mockListener).toHaveBeenCalledTimes(1); // Only valid event processed
  });
});