/**
 * @fileoverview Event type definitions and schemas for the game event system
 * Provides centralized event type constants and validation schemas
 * Part of Phase 4 refactoring - TypeScript Migration with discriminated unions
 */

import { z } from 'zod';

/**
 * Game Event Types - Central registry of all event types
 */
export const EventTypes = {
  // Game Lifecycle Events
  GAME: {
    CREATED: 'game.created',
    STARTED: 'game.started',
    ENDED: 'game.ended',
    PAUSED: 'game.paused',
    RESUMED: 'game.resumed',
    TIMEOUT: 'game.timeout',
    ERROR: 'game.error'
  },

  // Controller Events (for Socket.IO routing)
  CONTROLLER: {
    GAME_CREATED: 'controller.gameCreated',
    PLAYER_JOINED: 'controller.playerJoined',
    ERROR: 'controller.error'
  },

  // Phase Management Events
  PHASE: {
    CHANGED: 'phase.changed',
    PREPARATION: 'phase.preparation',
    ACTION: 'phase.action',
    RESOLUTION: 'phase.resolution',
    COUNTDOWN_STARTED: 'phase.countdown.started',
    COUNTDOWN_TICK: 'phase.countdown.tick',
    COUNTDOWN_ENDED: 'phase.countdown.ended'
  },

  // Player Events
  PLAYER: {
    JOINED: 'player.joined',
    LEFT: 'player.left',
    DISCONNECTED: 'player.disconnected',
    RECONNECTED: 'player.reconnected',
    READY: 'player.ready',
    NOT_READY: 'player.not_ready',
    DIED: 'player.died',
    REVIVED: 'player.revived',
    STAT_CHANGED: 'player.stat.changed',
    STATUS_UPDATED: 'player.status.updated',
    RACE_SELECTED: 'player.race.selected',
    CLASS_SELECTED: 'player.class.selected',
    NAME_CHECK: 'player.name.check',
    CLASS_ABILITIES_REQUEST: 'player.class.abilities.request'
  },

  // Action Events
  ACTION: {
    SUBMITTED: 'action.submitted',
    VALIDATED: 'action.validated',
    REJECTED: 'action.rejected',
    EXECUTED: 'action.executed',
    CANCELLED: 'action.cancelled',
    TIMEOUT: 'action.timeout'
  },

  // Combat Events
  COMBAT: {
    STARTED: 'combat.started',
    ENDED: 'combat.ended',
    TURN_STARTED: 'combat.turn.started',
    TURN_ENDED: 'combat.turn.ended'
  },

  // Damage Events
  DAMAGE: {
    CALCULATED: 'damage.calculated',
    APPLIED: 'damage.applied',
    BLOCKED: 'damage.blocked',
    REDUCED: 'damage.reduced',
    REFLECTED: 'damage.reflected',
    CRITICAL: 'damage.critical'
  },

  // Healing Events
  HEAL: {
    CALCULATED: 'heal.calculated',
    APPLIED: 'heal.applied',
    BLOCKED: 'heal.blocked',
    ENHANCED: 'heal.enhanced',
    CRITICAL: 'heal.critical'
  },

  // Effect Events
  EFFECT: {
    APPLIED: 'effect.applied',
    REMOVED: 'effect.removed',
    EXPIRED: 'effect.expired',
    TRIGGERED: 'effect.triggered',
    STACKED: 'effect.stacked',
    IMMUNITY_ACTIVATED: 'effect.immunity.activated'
  },

  // Ability Events
  ABILITY: {
    USED: 'ability.used',
    VALIDATED: 'ability.validated',
    EXECUTED: 'ability.executed',
    FAILED: 'ability.failed',
    COOLDOWN_STARTED: 'ability.cooldown.started',
    COOLDOWN_ENDED: 'ability.cooldown.ended',
    BLOCKED: 'ability.blocked'
  },

  // Coordination Events
  COORDINATION: {
    CALCULATED: 'coordination.calculated',
    APPLIED: 'coordination.applied',
    BONUS_TRIGGERED: 'coordination.bonus.triggered'
  },

  // Monster Events
  MONSTER: {
    SPAWNED: 'monster.spawned',
    DEFEATED: 'monster.defeated',
    ACTION_SELECTED: 'monster.action.selected',
    DAMAGED: 'monster.damaged',
    HEALED: 'monster.healed'
  },

  // Warlock Events
  WARLOCK: {
    REVEALED: 'warlock.revealed',
    ABILITY_USED: 'warlock.ability.used',
    ELIMINATED: 'warlock.eliminated'
  },

  // System Events
  SYSTEM: {
    INITIALIZED: 'system.initialized',
    ERROR: 'system.error',
    WARNING: 'system.warning',
    PERFORMANCE: 'system.performance'
  },

  // Socket Events (for client synchronization)
  SOCKET: {
    UPDATE_REQUIRED: 'socket.update.required',
    BROADCAST_REQUIRED: 'socket.broadcast.required',
    PLAYER_UPDATE: 'socket.player.update',
    GAME_STATE_UPDATE: 'socket.game_state.update'
  }
} as const;

// Extract all event type values for type safety - definitions are below with the schemas

/**
 * Zod Schemas for Event Payloads
 */

// Base event schema
const BaseEventDataSchema = z.object({
  timestamp: z.string()
});

// Game Lifecycle Event Schemas
const GameCreatedEventSchema = BaseEventDataSchema.extend({
  gameCode: z.string(),
  createdBy: z.string()
});

const GameStartedEventSchema = BaseEventDataSchema.extend({
  gameCode: z.string(),
  playerCount: z.number().int().positive()
});

const GameEndedEventSchema = BaseEventDataSchema.extend({
  gameCode: z.string(),
  winner: z.enum(['Good', 'Evil', 'Draw']),
  duration: z.number().int().nonnegative(),
  finalStats: z.record(z.unknown())
});

// Player Event Schemas
const PlayerJoinedEventSchema = BaseEventDataSchema.extend({
  playerId: z.string(),
  playerName: z.string(),
  gameCode: z.string()
});

const PlayerLeftEventSchema = BaseEventDataSchema.extend({
  playerId: z.string(),
  playerName: z.string(),
  gameCode: z.string(),
  reason: z.enum(['disconnect', 'quit', 'kicked']).optional()
});

const PlayerDiedEventSchema = BaseEventDataSchema.extend({
  playerId: z.string(),
  playerName: z.string(),
  cause: z.enum(['damage', 'effect', 'monster']),
  killedBy: z.string().optional()
});

// Action Event Schemas
const ActionSubmittedEventSchema = BaseEventDataSchema.extend({
  playerId: z.string(),
  actionType: z.string(),
  targetId: z.string().optional(),
  abilityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  commandId: z.string().optional()
});

// Damage Event Schemas
const DamageCalculatedEventSchema = BaseEventDataSchema.extend({
  attackerId: z.string(),
  targetId: z.string(),
  baseDamage: z.number(),
  finalDamage: z.number(),
  modifiers: z.record(z.unknown()),
  abilityId: z.string().optional(),
  isCritical: z.boolean().optional()
});

const DamageAppliedEventSchema = BaseEventDataSchema.extend({
  // Single target damage event
  targetId: z.string().optional(),
  targetName: z.string().optional(),
  attackerId: z.string().optional(),
  attackerName: z.string().optional(),
  damageAmount: z.number().optional(),
  originalDamage: z.number().optional(),
  armor: z.number().optional(),
  targetHpBefore: z.number().optional(),
  targetHpAfter: z.number().optional(),
  // Area damage event fields
  sourceId: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  damage: z.number().optional(),
  baseDamage: z.number().optional()
});

// Healing Event Schemas
const HealAppliedEventSchema = BaseEventDataSchema.extend({
  targetId: z.string(),
  healing: z.number(),
  oldHealth: z.number(),
  newHealth: z.number(),
  healerId: z.string().optional(),
  abilityId: z.string().optional()
});

// Effect Event Schemas
const EffectAppliedEventSchema = BaseEventDataSchema.extend({
  targetId: z.string(),
  effectType: z.string(),
  effectId: z.string(),
  duration: z.number().optional(),
  appliedBy: z.string().optional(),
  abilityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

// Ability Event Schemas
const AbilityUsedEventSchema = BaseEventDataSchema.extend({
  playerId: z.string(),
  abilityId: z.string(),
  targetId: z.string().optional(),
  result: z.enum(['success', 'failed', 'blocked']),
  metadata: z.record(z.unknown()).optional()
});

// Phase Event Schemas
const PhaseChangedEventSchema = BaseEventDataSchema.extend({
  oldPhase: z.string(),
  newPhase: z.string(),
  duration: z.number().optional(),
  reason: z.string().optional()
});

// Coordination Event Schemas
const CoordinationCalculatedEventSchema = BaseEventDataSchema.extend({
  targetId: z.string(),
  coordinationCount: z.number().int(),
  participants: z.array(z.string()),
  bonusMultiplier: z.number()
});

// Socket Event Schemas
const SocketUpdateRequiredEventSchema = BaseEventDataSchema.extend({
  updateType: z.string(),
  targetPlayers: z.array(z.string()).optional(),
  data: z.record(z.unknown())
});

/**
 * Discriminated Union for Game Events
 * This provides type-safe event handling with proper payload types
 */
export type GameEvent = 
  | { type: typeof EventTypes.GAME.CREATED; payload: z.infer<typeof GameCreatedEventSchema> }
  | { type: typeof EventTypes.GAME.STARTED; payload: z.infer<typeof GameStartedEventSchema> }
  | { type: typeof EventTypes.GAME.ENDED; payload: z.infer<typeof GameEndedEventSchema> }
  | { type: typeof EventTypes.PLAYER.JOINED; payload: z.infer<typeof PlayerJoinedEventSchema> }
  | { type: typeof EventTypes.PLAYER.LEFT; payload: z.infer<typeof PlayerLeftEventSchema> }
  | { type: typeof EventTypes.PLAYER.DIED; payload: z.infer<typeof PlayerDiedEventSchema> }
  | { type: typeof EventTypes.ACTION.SUBMITTED; payload: z.infer<typeof ActionSubmittedEventSchema> }
  | { type: typeof EventTypes.ACTION.VALIDATED; payload: z.infer<typeof ActionSubmittedEventSchema> }
  | { type: typeof EventTypes.ACTION.REJECTED; payload: z.infer<typeof ActionSubmittedEventSchema> }
  | { type: typeof EventTypes.ACTION.EXECUTED; payload: z.infer<typeof ActionSubmittedEventSchema> }
  | { type: typeof EventTypes.ACTION.CANCELLED; payload: z.infer<typeof ActionSubmittedEventSchema> }
  | { type: typeof EventTypes.DAMAGE.CALCULATED; payload: z.infer<typeof DamageCalculatedEventSchema> }
  | { type: typeof EventTypes.DAMAGE.APPLIED; payload: z.infer<typeof DamageAppliedEventSchema> }
  | { type: typeof EventTypes.HEAL.APPLIED; payload: z.infer<typeof HealAppliedEventSchema> }
  | { type: typeof EventTypes.EFFECT.APPLIED; payload: z.infer<typeof EffectAppliedEventSchema> }
  | { type: typeof EventTypes.ABILITY.USED; payload: z.infer<typeof AbilityUsedEventSchema> }
  | { type: typeof EventTypes.ABILITY.VALIDATED; payload: z.infer<typeof AbilityUsedEventSchema> }
  | { type: typeof EventTypes.ABILITY.FAILED; payload: z.infer<typeof AbilityUsedEventSchema> }
  | { type: typeof EventTypes.PHASE.CHANGED; payload: z.infer<typeof PhaseChangedEventSchema> }
  | { type: typeof EventTypes.COORDINATION.CALCULATED; payload: z.infer<typeof CoordinationCalculatedEventSchema> }
  | { type: typeof EventTypes.SOCKET.UPDATE_REQUIRED; payload: z.infer<typeof SocketUpdateRequiredEventSchema> };

/**
 * Type-safe event handler interface
 */
export interface EventHandler<T extends GameEvent> {
  handle(event: T): Promise<void> | void;
}

/**
 * Extract event type from discriminated union
 */
export type EventType = GameEvent['type'];

/**
 * Extract payload type for a specific event type
 */
export type EventPayload<T extends EventType> = Extract<GameEvent, { type: T }>['payload'];

/**
 * Map of event types to their payload types
 */
export type EventPayloadMap = {
  [K in GameEvent['type']]: Extract<GameEvent, { type: K }>['payload'];
};

/**
 * Event Schema Definitions (legacy support)
 * Maintained for backward compatibility
 */
export const EventSchemas = {
  [EventTypes.GAME.CREATED]: GameCreatedEventSchema,
  [EventTypes.GAME.STARTED]: GameStartedEventSchema,
  [EventTypes.GAME.ENDED]: GameEndedEventSchema,
  [EventTypes.PLAYER.JOINED]: PlayerJoinedEventSchema,
  [EventTypes.PLAYER.LEFT]: PlayerLeftEventSchema,
  [EventTypes.PLAYER.DIED]: PlayerDiedEventSchema,
  [EventTypes.ACTION.SUBMITTED]: ActionSubmittedEventSchema,
  [EventTypes.DAMAGE.CALCULATED]: DamageCalculatedEventSchema,
  [EventTypes.DAMAGE.APPLIED]: DamageAppliedEventSchema,
  [EventTypes.HEAL.APPLIED]: HealAppliedEventSchema,
  [EventTypes.EFFECT.APPLIED]: EffectAppliedEventSchema,
  [EventTypes.ABILITY.USED]: AbilityUsedEventSchema,
  [EventTypes.PHASE.CHANGED]: PhaseChangedEventSchema,
  [EventTypes.COORDINATION.CALCULATED]: CoordinationCalculatedEventSchema,
  [EventTypes.SOCKET.UPDATE_REQUIRED]: SocketUpdateRequiredEventSchema
} as const;

/**
 * Event Categories for filtering and middleware
 */
export const EventCategories = {
  GAME_LIFECYCLE: [
    EventTypes.GAME.CREATED,
    EventTypes.GAME.STARTED,
    EventTypes.GAME.ENDED,
    EventTypes.GAME.PAUSED,
    EventTypes.GAME.RESUMED
  ],

  PLAYER_ACTIONS: [
    EventTypes.ACTION.SUBMITTED,
    EventTypes.ACTION.VALIDATED,
    EventTypes.ACTION.EXECUTED,
    EventTypes.ABILITY.USED
  ],

  COMBAT_EFFECTS: [
    EventTypes.DAMAGE.CALCULATED,
    EventTypes.DAMAGE.APPLIED,
    EventTypes.HEAL.APPLIED,
    EventTypes.EFFECT.APPLIED,
    EventTypes.EFFECT.TRIGGERED
  ],

  STATE_CHANGES: [
    EventTypes.PLAYER.STAT_CHANGED,
    EventTypes.PLAYER.STATUS_UPDATED,
    EventTypes.PHASE.CHANGED,
    EventTypes.COORDINATION.CALCULATED
  ],

  SOCKET_EVENTS: [
    EventTypes.SOCKET.UPDATE_REQUIRED,
    EventTypes.SOCKET.BROADCAST_REQUIRED,
    EventTypes.SOCKET.PLAYER_UPDATE,
    EventTypes.SOCKET.GAME_STATE_UPDATE
  ]
} as const;

/**
 * Validate event data against schema
 * @param eventType - Type of event
 * @param eventData - Event data to validate
 * @returns Validation result { valid: boolean, errors: string[] }
 */
export function validateEventData(eventType: EventType, eventData: unknown): { valid: boolean; errors: string[] } {
  const schema = EventSchemas[eventType as keyof typeof EventSchemas];
  if (!schema) {
    return { valid: true, errors: [] }; // No schema = no validation
  }

  try {
    schema.parse(eventData);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Get all event types in a category
 * @param category - Event category name
 * @returns Array of event types
 */
export function getEventsByCategory(category: keyof typeof EventCategories): readonly string[] {
  return EventCategories[category] || [];
}

/**
 * Check if event type exists
 * @param eventType - Event type to check
 * @returns True if event type is defined
 */
export function isValidEventType(eventType: string): eventType is EventType {
  for (const category of Object.values(EventTypes)) {
    if (typeof category === 'object') {
      if (Object.values(category).includes(eventType as any)) {
        return true;
      }
    } else if (category === eventType) {
      return true;
    }
  }
  return false;
}

/**
 * Type guard for specific event types
 * @param event - Event to check
 * @param eventType - Expected event type
 * @returns True if event matches the specified type
 */
export function isEventOfType<T extends EventType>(
  event: GameEvent,
  eventType: T
): event is Extract<GameEvent, { type: T }> {
  return event.type === eventType;
}

/**
 * Create a type-safe event
 * @param type - Event type
 * @param payload - Event payload
 * @returns Type-safe event object
 */
export function createEvent<T extends EventType>(
  type: T,
  payload: EventPayload<T>
): Extract<GameEvent, { type: T }> {
  return { type, payload } as Extract<GameEvent, { type: T }>;
}