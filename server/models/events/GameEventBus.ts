/**
 * @fileoverview Central event bus for game events with TypeScript type safety
 * Provides decoupled communication between game systems
 * Part of Phase 4 refactoring - TypeScript Migration with generic type-safe event handling
 */
import { GameEvent, EventType, EventHandler, EventPayload } from './EventTypes.js';

import logger from '../../utils/logger.js';
import messages from '../../config/messages/index.js';

/**
 * Type-safe event listener configuration
 */
interface ListenerOptions {
  once?: boolean;
  priority?: number;
}

/**
 * Internal listener wrapper with metadata
 */
interface WrappedListener<T extends GameEvent = GameEvent> {
  fn: EventHandler<T>['handle'];
  once: boolean;
  priority: number;
  id: string;
}

/**
 * Event emission options
 */
interface EmissionOptions {
  async?: boolean;
}

/**
 * Event bus statistics
 */
interface EventBusStats {
  eventsEmitted: number;
  eventsProcessed: number;
  errors: number;
  averageProcessingTime: number;
}

/**
 * Central event bus for handling game events with full type safety
 * Enables decoupled communication between systems
 */
export class GameEventBus {
  private gameCode: string;
  private listeners: Map<EventType, Set<WrappedListener>> = new Map();
  private middleware: Array<(event: GameEvent, next: (modifiedEvent?: GameEvent | false) => void) => void> = [];
  private eventHistory: GameEvent[] = [];
  private isEnabled: boolean = true;
  private readonly maxHistorySize: number = 1000;

  // Performance tracking
  private stats: EventBusStats = {
    eventsEmitted: 0,
    eventsProcessed: 0,
    errors: 0,
    averageProcessingTime: 0
  };

  /**
   * Create a new event bus for a game
   * @param gameCode - Game code for this event bus
   */
  constructor(gameCode: string) {
    this.gameCode = gameCode;
  }

  /**
   * Add middleware to process events
   * @param middleware - Middleware function (event, next) => void
   */
  addMiddleware(middleware: (event: GameEvent, next: (modifiedEvent?: GameEvent | false) => void) => void): void {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
  }

  /**
   * Register a type-safe event listener
   * @param eventType - Type of event to listen for
   * @param listener - Function to call when event occurs
   * @param options - Listener options
   * @returns Unsubscribe function
   */
  on<T extends EventType>(
    eventType: T,
    listener: (event: Extract<GameEvent, { type: T }>) => Promise<void> | void,
    options: ListenerOptions = {}
  ): () => boolean {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    // Wrap listener with options
    const wrappedListener: WrappedListener = {
      fn: listener as EventHandler<GameEvent>['handle'],
      once: options.once || false,
      priority: options.priority || 0,
      id: this._generateListenerId()
    };

    this.listeners.get(eventType)!.add(wrappedListener);

    // Return unsubscribe function
    return () => this.off(eventType, wrappedListener.id);
  }

  /**
   * Register a one-time type-safe event listener
   * @param eventType - Type of event to listen for
   * @param listener - Function to call when event occurs
   * @param options - Listener options
   * @returns Unsubscribe function
   */
  once<T extends EventType>(
    eventType: T,
    listener: (event: Extract<GameEvent, { type: T }>) => Promise<void> | void,
    options: ListenerOptions = {}
  ): () => boolean {
    return this.on(eventType, listener, { ...options, once: true });
  }

  /**
   * Remove an event listener
   * @param eventType - Type of event
   * @param listenerOrId - Listener function or ID
   */
  off(eventType: EventType, listenerOrId: string | Function): boolean {
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
   * @param eventType - Type of event (optional, if not provided removes all listeners)
   */
  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit a type-safe event to all listeners
   * @param eventType - Type of event
   * @param eventData - Event data payload
   * @param options - Emission options
   * @returns True if event was processed successfully
   */
  async emit<T extends EventType>(
    eventType: T,
    eventData: EventPayload<T>,
    options: EmissionOptions = {}
  ): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    const startTime = Date.now();
    this.stats.eventsEmitted++;

    // Create type-safe event object
    const event: Extract<GameEvent, { type: T }> = {
      type: eventType,
      payload: eventData
    } as Extract<GameEvent, { type: T }>;

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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Legacy emit method for backward compatibility
   * @param eventType - Type of event
   * @param eventData - Event data payload
   * @param options - Emission options
   * @returns True if event was processed successfully
   */
  async emitLegacy(eventType: string, eventData: Record<string, unknown> = {}, options: EmissionOptions = {}): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    const startTime = Date.now();
    this.stats.eventsEmitted++;

    // Create legacy event object
    const event = {
      type: eventType,
      data: eventData,
      gameCode: this.gameCode,
      timestamp: new Date().toISOString(),
      id: this._generateEventId()
    };

    try {
      // Add to history for debugging (cast as any for legacy support)
      this._addToHistory(event as any);

      // Process through middleware (cast as any for legacy support)
      const processedEvent = await this._processMiddleware(event as any);
      if (!processedEvent) {
        return false; // Event was cancelled by middleware
      }

      // Get listeners for this event type
      const listeners = this.listeners.get(eventType as EventType);
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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Process event through middleware chain
   * @param event - Event object
   * @returns Processed event or null if cancelled
   * @private
   */
  private async _processMiddleware(event: GameEvent): Promise<GameEvent | null> {
    let currentEvent = event;

    for (const middleware of this.middleware) {
      try {
        const result = await new Promise<GameEvent | null>((resolve) => {
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
          error: error instanceof Error ? error.message : 'Unknown error',
          eventType: event.type
        });
        return null;
      }
    }

    return currentEvent;
  }

  /**
   * Execute listeners asynchronously
   * @param listeners - Sorted listeners
   * @param event - Event object
   * @private
   */
  private async _executeListenersAsync(listeners: WrappedListener[], event: GameEvent): Promise<void> {
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
          error: error instanceof Error ? error.message : 'Unknown error',
          listenerId: listener.id
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Execute listeners synchronously
   * @param listeners - Sorted listeners
   * @param event - Event object
   * @private
   */
  private async _executeListenersSync(listeners: WrappedListener[], event: GameEvent): Promise<void> {
    const toRemove: WrappedListener[] = [];

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
          error: error instanceof Error ? error.message : 'Unknown error',
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
   * @param event - Event object
   * @private
   */
  private _addToHistory(event: GameEvent): void {
    this.eventHistory.push(event);
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Update average processing time
   * @param processingTime - Time in milliseconds
   * @private
   */
  private _updateAverageProcessingTime(processingTime: number): void {
    const totalEvents = this.stats.eventsProcessed;
    const currentAvg = this.stats.averageProcessingTime;
    this.stats.averageProcessingTime = ((currentAvg * (totalEvents - 1)) + processingTime) / totalEvents;
  }

  /**
   * Generate unique listener ID
   * @returns Unique listener ID
   * @private
   */
  private _generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   * @returns Unique event ID
   * @private
   */
  private _generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   * @returns Event bus statistics
   */
  getStats(): EventBusStats {
    return { ...this.stats };
  }

  /**
   * Get recent event history
   * @param limit - Number of recent events to return
   * @returns Recent events
   */
  getEventHistory(limit: number = 50): GameEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get current listener count
   * @param eventType - Optional event type filter
   * @returns Number of listeners
   */
  getListenerCount(eventType?: EventType): number {
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
   * @param enabled - Whether to enable the event bus
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all listeners and history
   */
  destroy(): void {
    this.listeners.clear();
    this.middleware.length = 0;
    this.eventHistory.length = 0;
    this.isEnabled = false;
  }
}

// ES module export
export default GameEventBus;