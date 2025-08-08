/**
 * @fileoverview Event middleware for the game event system with TypeScript type safety
 * Provides logging, validation, authorization, and other cross-cutting concerns
 * Part of Phase 4 refactoring - TypeScript Migration with proper event flow typing
 */
import { GameEvent, EventType, validateEventData, isValidEventType } from './EventTypes.js';

import logger from '../../utils/logger.js';

/**
 * Middleware function type
 */
type MiddlewareFunction = (event: GameEvent, next: (modifiedEvent?: GameEvent | false) => void) => void;

/**
 * Logging middleware options
 */
interface LoggingOptions {
  logData?: boolean;
  excludeTypes?: EventType[];
}

/**
 * Validation middleware options
 */
interface ValidationOptions {
  strict?: boolean;
  onError?: (error: Error, event: GameEvent) => void;
}

/**
 * Rate limiting middleware options
 */
interface RateLimitingOptions {
  maxEvents?: number;
  windowMs?: number;
  exemptTypes?: EventType[];
}

/**
 * Error handling middleware options
 */
interface ErrorHandlingOptions {
  onError?: (error: Error, event: GameEvent) => void;
}

/**
 * Performance monitoring middleware options
 */
interface PerformanceOptions {
  slowEventThreshold?: number;
}

/**
 * Debugging middleware options
 */
interface DebuggingOptions {
  addStackTrace?: boolean;
}

/**
 * Standard middleware stack configuration
 */
interface StandardStackOptions {
  enableLogging?: boolean;
  enableValidation?: boolean;
  enableRateLimit?: boolean;
  enablePerformance?: boolean;
  logEventData?: boolean;
  maxEventsPerMinute?: number;
  slowEventThreshold?: number;
}

/**
 * Rate limiting state
 */
interface RateLimitState {
  count: number;
  windowStart: number;
}

/**
 * Collection of built-in middleware functions for the event system
 */
export class EventMiddleware {
  /**
   * Logging middleware - logs all events for debugging
   * @param options - Middleware options
   * @returns Middleware function
   */
  static logging(options: LoggingOptions = {}): MiddlewareFunction {
    const {
      logData = false,
      excludeTypes = []
    } = options;

    return (event: GameEvent, next) => {
      if (excludeTypes.includes(event.type)) {
        return next();
      }

      const logEntry: Record<string, unknown> = {
        eventType: event.type,
        timestamp: new Date().toISOString()
      };

      // Add payload data if requested
      if (logData && 'payload' in event) {
        logEntry['payload'] = event['payload'];
      }

      // Legacy support for data field
      if (logData && 'data' in event) {
        logEntry['data'] = (event as any)['data'];
      }

      logger.info(`Event emitted: ${event.type}`, logEntry);
      next();
    };
  }

  /**
   * Validation middleware - validates event data against schemas
   * @param options - Middleware options
   * @returns Middleware function
   */
  static validation(options: ValidationOptions = {}): MiddlewareFunction {
    const {
      strict = true,
      onError = null
    } = options;

    return (event: GameEvent, next) => {
      // Check if event type is valid
      if (!isValidEventType(event.type)) {
        const error = new Error(`Invalid event type: ${event.type}`);
        if (onError) {
          onError(error, event);
        } else {
          logger.warn(`Invalid event type detected: "${event.type}" (${typeof event.type})`);
        }

        if (strict) {
          return next(false); // Cancel event
        }
      }

      // Validate event payload/data
      const eventData = 'payload' in event ? event.payload : ('data' in event ? (event as any).data : {});
      const validation = validateEventData(event.type, eventData);
      if (!validation.valid) {
        const error = new Error(`Event validation failed: ${validation.errors.join(', ')}`);
        if (onError) {
          onError(error, event);
        } else {
          logger.warn(`Event validation failed: ${event.type}`, {
            eventType: event.type,
            errors: validation.errors,
            eventData: eventData
          });
        }

        if (strict) {
          return next(false); // Cancel event
        }
      }

      next();
    };
  }

  /**
   * Rate limiting middleware - prevents event spam
   * @param options - Middleware options
   * @returns Middleware function
   */
  static rateLimiting(options: RateLimitingOptions = {}): MiddlewareFunction {
    const {
      maxEvents = 100,
      windowMs = 60000, // 1 minute
      exemptTypes = []
    } = options;

    const eventCounts = new Map<string, RateLimitState>();

    return (event: GameEvent, next) => {
      if (exemptTypes.includes(event.type)) {
        return next();
      }

      const now = Date.now();
      const gameCode = 'gameCode' in event ? (event as any).gameCode : 'unknown';

      if (!eventCounts.has(gameCode)) {
        eventCounts.set(gameCode, { count: 0, windowStart: now });
      }

      const stats = eventCounts.get(gameCode)!;

      // Reset window if expired
      if (now - stats.windowStart > windowMs) {
        stats.count = 0;
        stats.windowStart = now;
      }

      // Check rate limit
      if (stats.count >= maxEvents) {
        logger.warn('Event rate limit exceeded:', {
          gameCode,
          eventType: event.type,
          count: stats.count,
          maxEvents
        });
        return next(false); // Cancel event
      }

      stats.count++;
      next();
    };
  }

  /**
   * Error handling middleware - catches and logs errors
   * @param options - Middleware options
   * @returns Middleware function
   */
  static errorHandling(options: ErrorHandlingOptions = {}): MiddlewareFunction {
    const { onError = null } = options;

    return (event: GameEvent, next) => {
      try {
        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const gameCode = 'gameCode' in event ? (event as any).gameCode : 'unknown';

        logger.error('Event middleware error:', {
          eventType: event.type,
          gameCode: gameCode,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });

        if (onError && error instanceof Error) {
          onError(error, event);
        }

        next(false); // Cancel event on error
      }
    };
  }

  /**
   * Performance monitoring middleware - tracks event processing time
   * @param options - Middleware options
   * @returns Middleware function
   */
  static performance(options: PerformanceOptions = {}): MiddlewareFunction {
    const { slowEventThreshold = 100 } = options;

    return (event: GameEvent, next) => {
      const startTime = Date.now();

      next();

      const processingTime = Date.now() - startTime;

      if (processingTime > slowEventThreshold) {
        const gameCode = 'gameCode' in event ? (event as any).gameCode : 'unknown';
        logger.warn('Slow event processing detected:', {
          eventType: event.type,
          gameCode: gameCode,
          processingTime,
          threshold: slowEventThreshold
        });
      }
    };
  }

  /**
   * Event filtering middleware - filters events based on conditions
   * @param filterFn - Function that returns true to allow event
   * @returns Middleware function
   */
  static filtering(filterFn: (event: GameEvent) => boolean): MiddlewareFunction {
    return (event: GameEvent, next) => {
      if (filterFn(event)) {
        next();
      } else {
        next(false); // Cancel event
      }
    };
  }

  /**
   * Event transformation middleware - modifies events
   * @param transformFn - Function that transforms event data
   * @returns Middleware function
   */
  static transformation(transformFn: (event: GameEvent) => GameEvent): MiddlewareFunction {
    return (event: GameEvent, next) => {
      try {
        const transformedEvent = transformFn(event);
        next(transformedEvent);
      } catch (error) {
        const gameCode = 'gameCode' in event ? (event as any).gameCode : 'unknown';
        logger.error('Event transformation error:', {
          eventType: event.type,
          gameCode: gameCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        next(false); // Cancel event on transformation error
      }
    };
  }

  /**
   * Authorization middleware - checks permissions for events
   * @param authFn - Function that returns true if authorized
   * @returns Middleware function
   */
  static authorization(authFn: (event: GameEvent) => boolean): MiddlewareFunction {
    return (event: GameEvent, next) => {
      if (authFn(event)) {
        next();
      } else {
        const gameCode = 'gameCode' in event ? (event as any).gameCode : 'unknown';
        logger.warn('Event authorization failed:', {
          eventType: event.type,
          gameCode: gameCode
        });
        next(false); // Cancel unauthorized event
      }
    };
  }

  /**
   * Debugging middleware - adds debugging information to events
   * @param options - Middleware options
   * @returns Middleware function
   */
  static debugging(options: DebuggingOptions = {}): MiddlewareFunction {
    const { addStackTrace = false } = options;

    return (event: GameEvent, next) => {
      const debugInfo: Record<string, unknown> = {
        middlewareTimestamp: new Date().toISOString(),
        nodeEnv: process.env['NODE_ENV']
      };

      if (addStackTrace) {
        debugInfo['stackTrace'] = new Error().stack;
      }

      // Add debug info to event (cast as any to allow debug property)
      const enhancedEvent: GameEvent = {
        ...event,
        debug: debugInfo
      } as any;

      next(enhancedEvent);
    };
  }

  /**
   * Create a standard middleware stack for game events
   * @param options - Configuration options
   * @returns Array of middleware functions
   */
  static createStandardStack(options: StandardStackOptions = {}): MiddlewareFunction[] {
    const {
      enableLogging = true,
      enableValidation = true,
      enableRateLimit = true,
      enablePerformance = true,
      logEventData = false,
      maxEventsPerMinute = 100,
      slowEventThreshold = 100
    } = options;

    const middleware: MiddlewareFunction[] = [];

    // Error handling should be first to catch all errors
    middleware.push(EventMiddleware.errorHandling());

    // Performance monitoring
    if (enablePerformance) {
      middleware.push(EventMiddleware.performance({
        slowEventThreshold
      }));
    }

    // Rate limiting
    if (enableRateLimit) {
      middleware.push(EventMiddleware.rateLimiting({
        maxEvents: maxEventsPerMinute,
        windowMs: 60000
      }));
    }

    // Validation
    if (enableValidation) {
      middleware.push(EventMiddleware.validation({ strict: true }));
    }

    // Logging should be last to capture final event state
    if (enableLogging) {
      middleware.push(EventMiddleware.logging({
        logData: logEventData,
        excludeTypes: ['system.performance' as EventType] // Don't log performance events to avoid spam
      }));
    }

    return middleware;
  }
}

// ES module export
export default EventMiddleware;
