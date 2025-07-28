/**
 * @fileoverview Generic system interfaces for game mechanics
 * Provides abstract interfaces for implementing game systems
 * Part of Phase 7 - Advanced Type Features & Optimization
 */

import type { GameEvent, EventType, EventPayload } from '../models/events/EventTypes';
import type { GameRoom, Player, Monster } from './generated';
import type { ValidationResult, ApiResponse } from './utilities';

/**
 * Base system interface
 * All game systems should implement this interface
 */
export interface BaseSystem {
  /** System name for identification */
  readonly name: string;
  
  /** System version for compatibility checking */
  readonly version: string;
  
  /** Initialize the system */
  initialize(): Promise<void>;
  
  /** Cleanup system resources */
  cleanup(): Promise<void>;
  
  /** Check if system is ready */
  isReady(): boolean;
}

/**
 * Generic game system interface
 * @template TState - The state type this system operates on
 * @template TEvent - The event type this system processes
 */
export interface GameSystem<TState, TEvent> extends BaseSystem {
  /**
   * Process an event and return the updated state
   * @param state - Current state
   * @param event - Event to process
   * @returns Updated state
   */
  process(state: TState, event: TEvent): Promise<TState>;
  
  /**
   * Validate if an event can be processed
   * @param event - Event to validate
   * @returns Validation result
   */
  validate(event: TEvent): ValidationResult<TEvent>;
  
  /**
   * Check if this system can handle the given event
   * @param event - Event to check
   * @returns True if system can handle the event
   */
  canHandle(event: TEvent): boolean;
  
  /**
   * Get system configuration
   * @returns System configuration object
   */
  getConfig(): SystemConfig;
  
  /**
   * Update system configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<SystemConfig>): void;
}

/**
 * System configuration interface
 */
export interface SystemConfig {
  /** Whether the system is enabled */
  enabled: boolean;
  
  /** Debug mode flag */
  debug: boolean;
  
  /** System-specific settings */
  settings: Record<string, unknown>;
  
  /** Performance monitoring */
  monitoring?: {
    logEvents: boolean;
    metricsEnabled: boolean;
    sampleRate: number;
  };
}

/**
 * Event-driven game system
 * Systems that react to game events
 */
export interface EventDrivenSystem<TState = GameRoom> extends GameSystem<TState, GameEvent> {
  /**
   * Subscribe to specific event types
   * @returns Array of event types this system handles
   */
  subscribedEvents(): EventType[];
  
  /**
   * Handle a specific event type
   * @param state - Current state
   * @param eventType - Type of event
   * @param payload - Event payload
   * @returns Updated state
   */
  handleEvent<T extends EventType>(
    state: TState,
    eventType: T,
    payload: EventPayload<T>
  ): Promise<TState>;
  
  /**
   * Priority for event processing (lower numbers = higher priority)
   * @returns System priority
   */
  getPriority(): number;
}

/**
 * Combat-specific system interface
 */
export interface CombatSystemInterface extends EventDrivenSystem<GameRoom> {
  /**
   * Calculate damage between entities
   * @param attacker - Attacking entity
   * @param defender - Defending entity
   * @param baseDamage - Base damage amount
   * @returns Calculated damage result
   */
  calculateDamage(
    attacker: Player | Monster,
    defender: Player | Monster,
    baseDamage: number
  ): DamageCalculation;
  
  /**
   * Apply damage to an entity
   * @param target - Target entity
   * @param damage - Damage to apply
   * @returns Updated entity
   */
  applyDamage<T extends Player | Monster>(
    target: T,
    damage: number
  ): T;
  
  /**
   * Calculate healing amount
   * @param healer - Healing entity
   * @param target - Target entity
   * @param baseHealing - Base healing amount
   * @returns Calculated healing
   */
  calculateHealing(
    healer: Player | Monster,
    target: Player | Monster,
    baseHealing: number
  ): number;
  
  /**
   * Check if an entity can attack
   * @param attacker - Attacking entity
   * @param target - Target entity
   * @returns True if attack is possible
   */
  canAttack(attacker: Player | Monster, target: Player | Monster): boolean;
}

/**
 * Damage calculation result
 */
export interface DamageCalculation {
  /** Final damage amount */
  finalDamage: number;
  
  /** Base damage before modifiers */
  baseDamage: number;
  
  /** Applied modifiers */
  modifiers: DamageModifier[];
  
  /** Whether the attack was critical */
  isCritical: boolean;
  
  /** Whether the attack was blocked */
  isBlocked: boolean;
  
  /** Damage type */
  damageType: 'physical' | 'magical' | 'true';
}

/**
 * Damage modifier interface
 */
export interface DamageModifier {
  /** Modifier name */
  name: string;
  
  /** Modifier type */
  type: 'multiply' | 'add' | 'subtract' | 'divide';
  
  /** Modifier value */
  value: number;
  
  /** Source of the modifier */
  source: string;
}

/**
 * Effect system interface
 */
export interface EffectSystemInterface extends EventDrivenSystem<GameRoom> {
  /**
   * Apply an effect to an entity
   * @param target - Target entity
   * @param effect - Effect to apply
   * @returns Updated entity
   */
  applyEffect<T extends Player | Monster>(
    target: T,
    effect: EffectApplication
  ): T;
  
  /**
   * Remove an effect from an entity
   * @param target - Target entity
   * @param effectId - Effect ID to remove
   * @returns Updated entity
   */
  removeEffect<T extends Player | Monster>(
    target: T,
    effectId: string
  ): T;
  
  /**
   * Process effects for all entities
   * @param state - Game state
   * @returns Updated state
   */
  processEffects(state: GameRoom): Promise<GameRoom>;
  
  /**
   * Check if an entity is immune to an effect
   * @param target - Target entity
   * @param effectType - Effect type to check
   * @returns True if immune
   */
  isImmune(target: Player | Monster, effectType: string): boolean;
}

/**
 * Effect application data
 */
export interface EffectApplication {
  /** Effect ID */
  id: string;
  
  /** Effect type */
  type: 'buff' | 'debuff' | 'status' | 'immunity';
  
  /** Effect name */
  name: string;
  
  /** Effect duration (-1 for permanent) */
  duration: number;
  
  /** Effect source */
  source: string;
  
  /** Effect metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Phase system interface
 */
export interface PhaseSystemInterface extends EventDrivenSystem<GameRoom> {
  /**
   * Transition to next phase
   * @param state - Current game state
   * @returns Updated state with new phase
   */
  nextPhase(state: GameRoom): Promise<GameRoom>;
  
  /**
   * Check if phase transition is valid
   * @param fromPhase - Current phase
   * @param toPhase - Target phase
   * @returns True if transition is valid
   */
  canTransition(fromPhase: string, toPhase: string): boolean;
  
  /**
   * Get phase duration
   * @param phase - Phase name
   * @returns Duration in milliseconds
   */
  getPhaseDuration(phase: string): number;
  
  /**
   * Handle phase timeout
   * @param state - Current game state
   * @returns Updated state
   */
  handlePhaseTimeout(state: GameRoom): Promise<GameRoom>;
}

/**
 * System manager interface
 */
export interface SystemManager {
  /**
   * Register a system
   * @param system - System to register
   */
  registerSystem(system: BaseSystem): void;
  
  /**
   * Unregister a system
   * @param systemName - Name of system to unregister
   */
  unregisterSystem(systemName: string): void;
  
  /**
   * Get a system by name
   * @param systemName - System name
   * @returns System instance or undefined
   */
  getSystem<T extends BaseSystem>(systemName: string): T | undefined;
  
  /**
   * Get all registered systems
   * @returns Array of systems
   */
  getAllSystems(): BaseSystem[];
  
  /**
   * Initialize all systems
   */
  initializeAll(): Promise<void>;
  
  /**
   * Cleanup all systems
   */
  cleanupAll(): Promise<void>;
  
  /**
   * Process an event through all relevant systems
   * @param state - Current state
   * @param event - Event to process
   * @returns Updated state
   */
  processEvent(state: GameRoom, event: GameEvent): Promise<GameRoom>;
}

/**
 * System metrics interface
 */
export interface SystemMetrics {
  /** System name */
  systemName: string;
  
  /** Total events processed */
  eventsProcessed: number;
  
  /** Average processing time in ms */
  averageProcessingTime: number;
  
  /** Error count */
  errorCount: number;
  
  /** Last error timestamp */
  lastError?: Date;
  
  /** System uptime in ms */
  uptime: number;
}

/**
 * Abstract base class for game systems
 */
export abstract class AbstractGameSystem<TState, TEvent> implements GameSystem<TState, TEvent> {
  abstract readonly name: string;
  abstract readonly version: string;
  
  protected config: SystemConfig = {
    enabled: true,
    debug: false,
    settings: {}
  };
  
  protected ready = false;
  
  async initialize(): Promise<void> {
    // Override in subclasses
    this.ready = true;
  }
  
  async cleanup(): Promise<void> {
    // Override in subclasses
    this.ready = false;
  }
  
  isReady(): boolean {
    return this.ready;
  }
  
  getConfig(): SystemConfig {
    return { ...this.config };
  }
  
  updateConfig(config: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  abstract process(state: TState, event: TEvent): Promise<TState>;
  abstract validate(event: TEvent): ValidationResult<TEvent>;
  abstract canHandle(event: TEvent): boolean;
}

/**
 * Type guard for combat systems
 */
export function isCombatSystem(system: BaseSystem): system is CombatSystemInterface {
  return 'calculateDamage' in system && 'applyDamage' in system;
}

/**
 * Type guard for effect systems
 */
export function isEffectSystem(system: BaseSystem): system is EffectSystemInterface {
  return 'applyEffect' in system && 'removeEffect' in system;
}

/**
 * Type guard for phase systems
 */
export function isPhaseSystem(system: BaseSystem): system is PhaseSystemInterface {
  return 'nextPhase' in system && 'canTransition' in system;
}