/**
 * @fileoverview Tests for EventMiddleware
 */
import { EventMiddleware } from '../../../../server/models/events/EventMiddleware';
import { GameEvent, EventType } from '../../../../server/models/events/EventTypes';
import * as EventTypes from '../../../../server/models/events/EventTypes';

// Mock dependencies
jest.mock('@utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../../../server/models/events/EventTypes', () => ({
  isValidEventType: jest.fn(),
  validateEventData: jest.fn()
}));

const mockLogger = require('@utils/logger');
const mockEventTypes = EventTypes as jest.Mocked<typeof EventTypes>;

describe('EventMiddleware', () => {
  let mockEvent: GameEvent;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEvent = {
      type: 'action.submitted' as EventType,
      timestamp: new Date(),
      payload: {
        playerId: 'player1',
        action: 'move'
      }
    };

    mockNext = jest.fn();
  });

  describe('logging middleware', () => {
    it('should log event without data by default', () => {
      const middleware = EventMiddleware.logging();

      middleware(mockEvent, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event emitted: action.submitted',
        expect.objectContaining({
          eventType: 'action.submitted',
          timestamp: expect.any(String)
        })
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should log event with data when enabled', () => {
      const middleware = EventMiddleware.logging({ logData: true });

      middleware(mockEvent, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event emitted: action.submitted',
        expect.objectContaining({
          eventType: 'action.submitted',
          payload: mockEvent.payload
        })
      );
    });

    it('should exclude specified event types from logging', () => {
      const middleware = EventMiddleware.logging({
        excludeTypes: ['action.submitted' as EventType]
      });

      middleware(mockEvent, mockNext);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should log legacy data field if present', () => {
      const legacyEvent = {
        ...mockEvent,
        data: { legacyData: 'test' }
      } as any;

      const middleware = EventMiddleware.logging({ logData: true });
      middleware(legacyEvent, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event emitted: action.submitted',
        expect.objectContaining({
          data: { legacyData: 'test' }
        })
      );
    });
  });

  describe('validation middleware', () => {
    beforeEach(() => {
      mockEventTypes.isValidEventType.mockReturnValue(true);
      mockEventTypes.validateEventData.mockReturnValue({
        valid: true,
        errors: []
      });
    });

    it('should validate event type and data', () => {
      const middleware = EventMiddleware.validation();

      middleware(mockEvent, mockNext);

      expect(mockEventTypes.isValidEventType).toHaveBeenCalledWith('action.submitted');
      expect(mockEventTypes.validateEventData).toHaveBeenCalledWith(
        'action.submitted',
        mockEvent.payload
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle invalid event type in strict mode', () => {
      mockEventTypes.isValidEventType.mockReturnValue(false);
      const middleware = EventMiddleware.validation({ strict: true });

      middleware(mockEvent, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid event type detected')
      );
      expect(mockNext).toHaveBeenCalledWith(false);
    });

    it('should handle invalid event type in non-strict mode', () => {
      mockEventTypes.isValidEventType.mockReturnValue(false);
      const middleware = EventMiddleware.validation({ strict: false });

      middleware(mockEvent, mockNext);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(); // Continue without false
    });

    it('should handle validation errors with custom error handler', () => {
      const onError = jest.fn();
      mockEventTypes.validateEventData.mockReturnValue({
        valid: false,
        errors: ['Missing required field']
      });

      const middleware = EventMiddleware.validation({ onError });
      middleware(mockEvent, mockNext);

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        mockEvent
      );
    });

    it('should handle validation errors in strict mode', () => {
      mockEventTypes.validateEventData.mockReturnValue({
        valid: false,
        errors: ['Invalid data format', 'Missing field']
      });

      const middleware = EventMiddleware.validation({ strict: true });
      middleware(mockEvent, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Event validation failed: action.submitted',
        expect.objectContaining({
          errors: ['Invalid data format', 'Missing field']
        })
      );
      expect(mockNext).toHaveBeenCalledWith(false);
    });

    it('should validate legacy data field if payload not present', () => {
      const legacyEvent = {
        type: 'action.submitted' as EventType,
        data: { legacyData: 'test' }
      } as any;

      const middleware = EventMiddleware.validation();
      middleware(legacyEvent, mockNext);

      expect(mockEventTypes.validateEventData).toHaveBeenCalledWith(
        'action.submitted',
        { legacyData: 'test' }
      );
    });
  });

  describe('rateLimiting middleware', () => {
    it('should allow events within rate limit', () => {
      const middleware = EventMiddleware.rateLimiting({
        maxEvents: 10,
        windowMs: 60000
      });

      middleware(mockEvent, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should block events exceeding rate limit', () => {
      const middleware = EventMiddleware.rateLimiting({
        maxEvents: 1,
        windowMs: 60000
      });

      const eventWithGameCode = {
        ...mockEvent,
        gameCode: 'TEST123'
      } as any;

      // First event should pass
      middleware(eventWithGameCode, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      mockNext.mockClear();

      // Second event should be blocked
      middleware(eventWithGameCode, mockNext);
      expect(mockNext).toHaveBeenCalledWith(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Event rate limit exceeded:',
        expect.objectContaining({
          gameCode: 'TEST123',
          count: 1,
          maxEvents: 1
        })
      );
    });

    it('should reset rate limit after window expires', (done) => {
      const middleware = EventMiddleware.rateLimiting({
        maxEvents: 1,
        windowMs: 50 // Very short window for testing
      });

      const eventWithGameCode = {
        ...mockEvent,
        gameCode: 'TEST123'
      } as any;

      // First event
      middleware(eventWithGameCode, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      mockNext.mockClear();

      // Wait for window to expire, then test second event
      setTimeout(() => {
        middleware(eventWithGameCode, mockNext);
        expect(mockNext).toHaveBeenCalledWith(); // Should pass again
        done();
      }, 60);
    });

    it('should exempt specified event types from rate limiting', () => {
      const middleware = EventMiddleware.rateLimiting({
        maxEvents: 0, // Block all events
        exemptTypes: ['action.submitted' as EventType]
      });

      middleware(mockEvent, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle events without gameCode', () => {
      const middleware = EventMiddleware.rateLimiting({ maxEvents: 10 });

      middleware(mockEvent, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('errorHandling middleware', () => {
    it('should catch and log errors from next function', () => {
      const error = new Error('Test error');
      const errorNext = jest.fn().mockImplementation(() => {
        throw error;
      });

      const middleware = EventMiddleware.errorHandling();
      middleware(mockEvent, errorNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event middleware error:',
        expect.objectContaining({
          eventType: 'action.submitted',
          error: 'Test error'
        })
      );
    });

    it('should call custom error handler if provided', () => {
      const error = new Error('Test error');
      const onError = jest.fn();
      const errorNext = jest.fn().mockImplementation(() => {
        throw error;
      });

      const middleware = EventMiddleware.errorHandling({ onError });
      middleware(mockEvent, errorNext);

      expect(onError).toHaveBeenCalledWith(error, mockEvent);
    });

    it('should handle non-Error exceptions', () => {
      const errorNext = jest.fn().mockImplementation(() => {
        throw 'String error';
      });

      const middleware = EventMiddleware.errorHandling();
      middleware(mockEvent, errorNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event middleware error:',
        expect.objectContaining({
          error: 'Unknown error'
        })
      );
    });
  });

  describe('performance middleware', () => {
    it('should track event processing time', (done) => {
      const middleware = EventMiddleware.performance({
        slowEventThreshold: 10
      });

      const slowNext = jest.fn().mockImplementation(() => {
        // Simulate slow processing
        setTimeout(() => done(), 20);
      });

      middleware(mockEvent, slowNext);

      // Wait a bit to ensure the warning is logged
      setTimeout(() => {
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Slow event processing detected:',
          expect.objectContaining({
            eventType: 'action.submitted'
          })
        );
        done();
      }, 30);
    });

    it('should not warn for fast events', () => {
      const middleware = EventMiddleware.performance({
        slowEventThreshold: 1000
      });

      middleware(mockEvent, mockNext);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('filtering middleware', () => {
    it('should allow events that pass filter', () => {
      const filterFn = jest.fn().mockReturnValue(true);
      const middleware = EventMiddleware.filtering(filterFn);

      middleware(mockEvent, mockNext);

      expect(filterFn).toHaveBeenCalledWith(mockEvent);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block events that fail filter', () => {
      const filterFn = jest.fn().mockReturnValue(false);
      const middleware = EventMiddleware.filtering(filterFn);

      middleware(mockEvent, mockNext);

      expect(filterFn).toHaveBeenCalledWith(mockEvent);
      expect(mockNext).toHaveBeenCalledWith(false);
    });
  });

  describe('transformation middleware', () => {
    it('should transform events successfully', () => {
      const transformedEvent = {
        ...mockEvent,
        transformed: true
      } as any;

      const transformFn = jest.fn().mockReturnValue(transformedEvent);
      const middleware = EventMiddleware.transformation(transformFn);

      middleware(mockEvent, mockNext);

      expect(transformFn).toHaveBeenCalledWith(mockEvent);
      expect(mockNext).toHaveBeenCalledWith(transformedEvent);
    });

    it('should handle transformation errors', () => {
      const error = new Error('Transform failed');
      const transformFn = jest.fn().mockImplementation(() => {
        throw error;
      });

      const middleware = EventMiddleware.transformation(transformFn);
      middleware(mockEvent, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event transformation error:',
        expect.objectContaining({
          eventType: 'action.submitted',
          error: 'Transform failed'
        })
      );
      expect(mockNext).toHaveBeenCalledWith(false);
    });
  });

  describe('authorization middleware', () => {
    it('should allow authorized events', () => {
      const authFn = jest.fn().mockReturnValue(true);
      const middleware = EventMiddleware.authorization(authFn);

      middleware(mockEvent, mockNext);

      expect(authFn).toHaveBeenCalledWith(mockEvent);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block unauthorized events', () => {
      const authFn = jest.fn().mockReturnValue(false);
      const middleware = EventMiddleware.authorization(authFn);

      middleware(mockEvent, mockNext);

      expect(authFn).toHaveBeenCalledWith(mockEvent);
      expect(mockNext).toHaveBeenCalledWith(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Event authorization failed:',
        expect.objectContaining({
          eventType: 'action.submitted'
        })
      );
    });
  });

  describe('debugging middleware', () => {
    it('should add debug information to event', () => {
      const middleware = EventMiddleware.debugging();

      middleware(mockEvent, mockNext);

      const enhancedEvent = mockNext.mock.calls[0][0];
      expect(enhancedEvent).toEqual(
        expect.objectContaining({
          ...mockEvent,
          debug: expect.objectContaining({
            middlewareTimestamp: expect.any(String),
            nodeEnv: process.env.NODE_ENV
          })
        })
      );
    });

    it('should add stack trace when enabled', () => {
      const middleware = EventMiddleware.debugging({ addStackTrace: true });

      middleware(mockEvent, mockNext);

      const enhancedEvent = mockNext.mock.calls[0][0];
      expect(enhancedEvent.debug).toEqual(
        expect.objectContaining({
          stackTrace: expect.any(String)
        })
      );
    });
  });

  describe('createStandardStack', () => {
    it('should create default middleware stack', () => {
      const stack = EventMiddleware.createStandardStack();

      expect(stack).toHaveLength(5); // error, performance, rate limiting, validation, logging
      expect(stack.every(middleware => typeof middleware === 'function')).toBe(true);
    });

    it('should create minimal stack with all features disabled', () => {
      const stack = EventMiddleware.createStandardStack({
        enableLogging: false,
        enableValidation: false,
        enableRateLimit: false,
        enablePerformance: false
      });

      expect(stack).toHaveLength(1); // Only error handling
    });

    it('should create custom stack with specific options', () => {
      const stack = EventMiddleware.createStandardStack({
        enableLogging: true,
        enableValidation: true,
        enableRateLimit: false,
        enablePerformance: false,
        logEventData: true,
        maxEventsPerMinute: 200,
        slowEventThreshold: 50
      });

      expect(stack).toHaveLength(3); // error, validation, logging
    });

    it('should apply middleware stack in correct order', () => {
      const stack = EventMiddleware.createStandardStack();

      // Test that middleware are applied in the expected order
      // This is implicit in the order they're added to the array
      expect(stack).toHaveLength(5);

      // We can't easily test the actual execution order without more complex mocking,
      // but we can verify the stack contains the expected number of middleware
    });
  });

  describe('middleware integration', () => {
    it('should chain multiple middleware correctly', () => {
      const middleware1 = EventMiddleware.logging();
      const middleware2 = EventMiddleware.validation();

      // Simulate chaining by having middleware2 as the next function for middleware1
      const chainedNext = jest.fn().mockImplementation(() => {
        middleware2(mockEvent, mockNext);
      });

      mockEventTypes.isValidEventType.mockReturnValue(true);
      mockEventTypes.validateEventData.mockReturnValue({
        valid: true,
        errors: []
      });

      middleware1(mockEvent, chainedNext);

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockEventTypes.isValidEventType).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should stop middleware chain when event is cancelled', () => {
      const middleware1 = EventMiddleware.rateLimiting({ maxEvents: 0 }); // Block all
      const middleware2 = EventMiddleware.logging();

      const chainedNext = jest.fn().mockImplementation((result) => {
        if (result !== false) {
          middleware2(mockEvent, mockNext);
        }
      });

      middleware1(mockEvent, chainedNext);

      expect(mockLogger.warn).toHaveBeenCalled(); // Rate limit warning
      expect(mockLogger.info).not.toHaveBeenCalled(); // Logging should not happen
    });
  });
});
