/**
 * @fileoverview Central event bus for game events
 * Provides decoupled communication between game systems
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * Central event bus for handling game events
 * Enables decoupled communication between systems
 */
class GameEventBus {
  /**
   * Create a new event bus for a game
   * @param {string} gameCode - Game code for this event bus
   */
  constructor(gameCode) {
    this.gameCode = gameCode;
    this.listeners = new Map(); // eventType -> Set of listeners
    this.middleware = []; // Array of middleware functions
    this.eventHistory = []; // For debugging and replay
    this.isEnabled = true;
    this.maxHistorySize = 1000;

    // Performance tracking
    this.stats = {
      eventsEmitted: 0,
      eventsProcessed: 0,
      errors: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Add middleware to process events
   * @param {Function} middleware - Middleware function (event, next) => void
   */
  addMiddleware(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
  }

  /**
   * Register an event listener
   * @param {string} eventType - Type of event to listen for
   * @param {Function} listener - Function to call when event occurs
   * @param {Object} options - Listener options
   * @param {boolean} options.once - Remove listener after first call
   * @param {number} options.priority - Execution priority (higher = earlier)
   */
  on(eventType, listener, options = {}) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    // Wrap listener with options
    const wrappedListener = {
      fn: listener,
      once: options.once || false,
      priority: options.priority || 0,
      id: this._generateListenerId()
    };

    this.listeners.get(eventType).add(wrappedListener);

    // Return unsubscribe function
    return () => this.off(eventType, wrappedListener.id);
  }

  /**
   * Register a one-time event listener
   * @param {string} eventType - Type of event to listen for
   * @param {Function} listener - Function to call when event occurs
   * @param {Object} options - Listener options
   */
  once(eventType, listener, options = {}) {
    return this.on(eventType, listener, { ...options, once: true });
  }

  /**
   * Remove an event listener
   * @param {string} eventType - Type of event
   * @param {string|Function} listenerOrId - Listener function or ID
   */
  off(eventType, listenerOrId) {
    const listeners = this.listeners.get(eventType);
    if (!listeners) return false;

    // Find and remove listener
    for (const listener of listeners) {
      if (listener.id === listenerOrId || listener.fn === listenerOrId) {
        listeners.delete(listener);
        return true;
      }
    }
    return false;
  }

  /**
   * Remove all listeners for an event type
   * @param {string} eventType - Type of event
   */
  removeAllListeners(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit an event to all listeners
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data payload
   * @param {Object} options - Emission options
   * @param {boolean} options.async - Process listeners asynchronously
   * @returns {Promise<boolean>} True if event was processed successfully
   */
  async emit(eventType, eventData = {}, options = {}) {
    if (!this.isEnabled) {
      return false;
    }

    const startTime = Date.now();
    this.stats.eventsEmitted++;

    // Create event object
    const event = {
      type: eventType,
      data: eventData,
      gameCode: this.gameCode,
      timestamp: new Date().toISOString(),
      id: this._generateEventId()
    };

    try {
      // Add to history for debugging
      this._addToHistory(event);

      // Process through middleware
      const processedEvent = await this._processMiddleware(event);
      if (!processedEvent) {
        return false; // Event was cancelled by middleware
      }

      // Get listeners for this event type
      const listeners = this.listeners.get(eventType);
      if (!listeners || listeners.size === 0) {
        return true; // No listeners, but not an error
      }

      // Sort listeners by priority
      const sortedListeners = Array.from(listeners).sort((a, b) => b.priority - a.priority);

      // Execute listeners
      if (options.async !== false) {
        await this._executeListenersAsync(sortedListeners, processedEvent);
      } else {
        await this._executeListenersSync(sortedListeners, processedEvent);
      }

      // Update stats
      this.stats.eventsProcessed++;
      this._updateAverageProcessingTime(Date.now() - startTime);

      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error(`Event emission error in game ${this.gameCode}:`, {
        eventType,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Process event through middleware chain
   * @param {Object} event - Event object
   * @returns {Promise<Object|null>} Processed event or null if cancelled
   * @private
   */
  async _processMiddleware(event) {
    let currentEvent = event;

    for (const middleware of this.middleware) {
      try {
        const result = await new Promise((resolve) => {
          middleware(currentEvent, (modifiedEvent) => {
            resolve(modifiedEvent === false ? null : modifiedEvent || currentEvent);
          });
        });

        if (result === null) {
          return null; // Event cancelled
        }
        currentEvent = result;
      } catch (error) {
        logger.error(`Middleware error in game ${this.gameCode}:`, {
          error: error.message,
          eventType: event.type
        });
        return null;
      }
    }

    return currentEvent;
  }

  /**
   * Execute listeners asynchronously
   * @param {Array} listeners - Sorted listeners
   * @param {Object} event - Event object
   * @private
   */
  async _executeListenersAsync(listeners, event) {
    const promises = listeners.map(async (listener) => {
      try {
        await listener.fn(event);
        
        // Remove one-time listeners
        if (listener.once) {
          const eventListeners = this.listeners.get(event.type);
          if (eventListeners) {
            eventListeners.delete(listener);
          }
        }
      } catch (error) {
        logger.error(`Listener error in game ${this.gameCode}:`, {
          eventType: event.type,
          error: error.message,
          listenerId: listener.id
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Execute listeners synchronously
   * @param {Array} listeners - Sorted listeners
   * @param {Object} event - Event object
   * @private
   */
  async _executeListenersSync(listeners, event) {
    const toRemove = [];

    for (const listener of listeners) {
      try {
        await listener.fn(event);
        
        // Mark one-time listeners for removal
        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        logger.error(`Listener error in game ${this.gameCode}:`, {
          eventType: event.type,
          error: error.message,
          listenerId: listener.id
        });
      }
    }

    // Remove one-time listeners
    if (toRemove.length > 0) {
      const eventListeners = this.listeners.get(event.type);
      if (eventListeners) {
        toRemove.forEach(listener => eventListeners.delete(listener));
      }
    }
  }

  /**
   * Add event to history for debugging
   * @param {Object} event - Event object
   * @private
   */
  _addToHistory(event) {
    this.eventHistory.push(event);
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Update average processing time
   * @param {number} processingTime - Time in milliseconds
   * @private
   */
  _updateAverageProcessingTime(processingTime) {
    const totalEvents = this.stats.eventsProcessed;
    const currentAvg = this.stats.averageProcessingTime;
    this.stats.averageProcessingTime = ((currentAvg * (totalEvents - 1)) + processingTime) / totalEvents;
  }

  /**
   * Generate unique listener ID
   * @returns {string} Unique listener ID
   * @private
   */
  _generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   * @returns {string} Unique event ID
   * @private
   */
  _generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   * @returns {Object} Event bus statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get recent event history
   * @param {number} limit - Number of recent events to return
   * @returns {Array} Recent events
   */
  getEventHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get current listener count
   * @param {string} eventType - Optional event type filter
   * @returns {number} Number of listeners
   */
  getListenerCount(eventType) {
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      return listeners ? listeners.size : 0;
    }
    
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.size;
    }
    return total;
  }

  /**
   * Enable or disable the event bus
   * @param {boolean} enabled - Whether to enable the event bus
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Clear all listeners and history
   */
  destroy() {
    this.listeners.clear();
    this.middleware.length = 0;
    this.eventHistory.length = 0;
    this.isEnabled = false;
  }
}

module.exports = GameEventBus;