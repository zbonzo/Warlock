/**
 * @fileoverview Event middleware for the game event system
 * Provides logging, validation, authorization, and other cross-cutting concerns
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const logger = require('@utils/logger');
const { validateEventData, isValidEventType } = require('./EventTypes');

/**
 * Collection of built-in middleware functions for the event system
 */
class EventMiddleware {
  /**
   * Logging middleware - logs all events for debugging
   * @param {Object} options - Middleware options
   * @param {boolean} options.logData - Whether to log event data
   * @param {string[]} options.excludeTypes - Event types to skip logging
   * @returns {Function} Middleware function
   */
  static logging(options = {}) {
    const {
      logData = false,
      excludeTypes = []
    } = options;

    return (event, next) => {
      if (excludeTypes.includes(event.type)) {
        return next();
      }

      const logEntry = {
        eventType: event.type,
        gameCode: event.gameCode,
        timestamp: event.timestamp,
        eventId: event.id
      };

      if (logData) {
        logEntry.data = event.data;
      }

      logger.info('Event emitted:', logEntry);
      next();
    };
  }

  /**
   * Validation middleware - validates event data against schemas
   * @param {Object} options - Middleware options
   * @param {boolean} options.strict - Whether to reject invalid events
   * @param {Function} options.onError - Custom error handler
   * @returns {Function} Middleware function
   */
  static validation(options = {}) {
    const {
      strict = true,
      onError = null
    } = options;

    return (event, next) => {
      // Check if event type is valid
      if (!isValidEventType(event.type)) {
        const error = new Error(`Invalid event type: ${event.type}`);
        if (onError) {
          onError(error, event);
        } else {
          logger.warn('Invalid event type:', { eventType: event.type, gameCode: event.gameCode });
        }
        
        if (strict) {
          return next(false); // Cancel event
        }
      }

      // Validate event data
      const validation = validateEventData(event.type, event.data);
      if (!validation.valid) {
        const error = new Error(`Event validation failed: ${validation.errors.join(', ')}`);
        if (onError) {
          onError(error, event);
        } else {
          logger.warn('Event validation failed:', {
            eventType: event.type,
            gameCode: event.gameCode,
            errors: validation.errors
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
   * @param {Object} options - Middleware options
   * @param {number} options.maxEvents - Maximum events per window
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {string[]} options.exemptTypes - Event types exempt from rate limiting
   * @returns {Function} Middleware function
   */
  static rateLimiting(options = {}) {
    const {
      maxEvents = 100,
      windowMs = 60000, // 1 minute
      exemptTypes = []
    } = options;

    const eventCounts = new Map(); // gameCode -> { count, windowStart }

    return (event, next) => {
      if (exemptTypes.includes(event.type)) {
        return next();
      }

      const now = Date.now();
      const gameCode = event.gameCode;
      
      if (!eventCounts.has(gameCode)) {
        eventCounts.set(gameCode, { count: 0, windowStart: now });
      }

      const stats = eventCounts.get(gameCode);
      
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
   * @param {Object} options - Middleware options
   * @param {Function} options.onError - Custom error handler
   * @returns {Function} Middleware function
   */
  static errorHandling(options = {}) {
    const { onError = null } = options;

    return (event, next) => {
      try {
        next();
      } catch (error) {
        logger.error('Event middleware error:', {
          eventType: event.type,
          gameCode: event.gameCode,
          error: error.message,
          stack: error.stack
        });

        if (onError) {
          onError(error, event);
        }

        next(false); // Cancel event on error
      }
    };
  }

  /**
   * Performance monitoring middleware - tracks event processing time
   * @param {Object} options - Middleware options
   * @param {number} options.slowEventThreshold - Threshold in ms for slow events
   * @returns {Function} Middleware function
   */
  static performance(options = {}) {
    const { slowEventThreshold = 100 } = options;

    return (event, next) => {
      const startTime = Date.now();
      
      next();
      
      const processingTime = Date.now() - startTime;
      
      if (processingTime > slowEventThreshold) {
        logger.warn('Slow event processing detected:', {
          eventType: event.type,
          gameCode: event.gameCode,
          processingTime,
          threshold: slowEventThreshold
        });
      }
    };
  }

  /**
   * Event filtering middleware - filters events based on conditions
   * @param {Function} filterFn - Function that returns true to allow event
   * @returns {Function} Middleware function
   */
  static filtering(filterFn) {
    return (event, next) => {
      if (filterFn(event)) {
        next();
      } else {
        next(false); // Cancel event
      }
    };
  }

  /**
   * Event transformation middleware - modifies events
   * @param {Function} transformFn - Function that transforms event data
   * @returns {Function} Middleware function
   */
  static transformation(transformFn) {
    return (event, next) => {
      try {
        const transformedEvent = transformFn(event);
        next(transformedEvent);
      } catch (error) {
        logger.error('Event transformation error:', {
          eventType: event.type,
          gameCode: event.gameCode,
          error: error.message
        });
        next(false); // Cancel event on transformation error
      }
    };
  }

  /**
   * Authorization middleware - checks permissions for events
   * @param {Function} authFn - Function that returns true if authorized
   * @returns {Function} Middleware function
   */
  static authorization(authFn) {
    return (event, next) => {
      if (authFn(event)) {
        next();
      } else {
        logger.warn('Event authorization failed:', {
          eventType: event.type,
          gameCode: event.gameCode
        });
        next(false); // Cancel unauthorized event
      }
    };
  }

  /**
   * Debugging middleware - adds debugging information to events
   * @param {Object} options - Middleware options
   * @param {boolean} options.addStackTrace - Whether to add stack trace
   * @returns {Function} Middleware function
   */
  static debugging(options = {}) {
    const { addStackTrace = false } = options;

    return (event, next) => {
      const debugInfo = {
        middlewareTimestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV
      };

      if (addStackTrace) {
        debugInfo.stackTrace = new Error().stack;
      }

      // Add debug info to event
      const enhancedEvent = {
        ...event,
        debug: debugInfo
      };

      next(enhancedEvent);
    };
  }

  /**
   * Create a standard middleware stack for game events
   * @param {Object} options - Configuration options
   * @returns {Function[]} Array of middleware functions
   */
  static createStandardStack(options = {}) {
    const {
      enableLogging = true,
      enableValidation = true,
      enableRateLimit = true,
      enablePerformance = true,
      logEventData = false,
      maxEventsPerMinute = 100,
      slowEventThreshold = 100
    } = options;

    const middleware = [];

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
        excludeTypes: ['system.performance'] // Don't log performance events to avoid spam
      }));
    }

    return middleware;
  }
}

module.exports = EventMiddleware;