/**
 * @fileoverview Event type definitions and schemas for the game event system
 * Provides centralized event type constants and validation schemas
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */

/**
 * Game Event Types - Central registry of all event types
 */
const EventTypes = {
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
    CLASS_SELECTED: 'player.class.selected'
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
};

/**
 * Event Schema Definitions
 * Used for validation and documentation
 */
const EventSchemas = {
  [EventTypes.GAME.CREATED]: {
    gameCode: 'string',
    createdBy: 'string',
    timestamp: 'string'
  },

  [EventTypes.GAME.STARTED]: {
    gameCode: 'string',
    playerCount: 'number',
    timestamp: 'string'
  },

  [EventTypes.GAME.ENDED]: {
    gameCode: 'string',
    winner: 'string', // 'Good', 'Evil', 'Draw'
    duration: 'number',
    finalStats: 'object',
    timestamp: 'string'
  },

  [EventTypes.PLAYER.JOINED]: {
    playerId: 'string',
    playerName: 'string',
    gameCode: 'string',
    timestamp: 'string'
  },

  [EventTypes.PLAYER.DIED]: {
    playerId: 'string',
    playerName: 'string',
    cause: 'string', // 'damage', 'effect', 'monster'
    killedBy: 'string?', // Optional killer ID
    timestamp: 'string'
  },

  [EventTypes.ACTION.SUBMITTED]: {
    playerId: 'string',
    actionType: 'string',
    targetId: 'string?',
    abilityId: 'string?',
    metadata: 'object?',
    timestamp: 'string'
  },

  [EventTypes.DAMAGE.CALCULATED]: {
    attackerId: 'string',
    targetId: 'string',
    baseDamage: 'number',
    finalDamage: 'number',
    modifiers: 'object',
    abilityId: 'string?',
    isCritical: 'boolean?',
    timestamp: 'string'
  },

  [EventTypes.DAMAGE.APPLIED]: {
    targetId: 'string',
    damage: 'number',
    oldHealth: 'number',
    newHealth: 'number',
    attackerId: 'string?',
    abilityId: 'string?',
    timestamp: 'string'
  },

  [EventTypes.HEAL.APPLIED]: {
    targetId: 'string',
    healing: 'number',
    oldHealth: 'number',
    newHealth: 'number',
    healerId: 'string?',
    abilityId: 'string?',
    timestamp: 'string'
  },

  [EventTypes.EFFECT.APPLIED]: {
    targetId: 'string',
    effectType: 'string',
    effectId: 'string',
    duration: 'number?',
    appliedBy: 'string?',
    abilityId: 'string?',
    metadata: 'object?',
    timestamp: 'string'
  },

  [EventTypes.ABILITY.USED]: {
    playerId: 'string',
    abilityId: 'string',
    targetId: 'string?',
    result: 'string', // 'success', 'failed', 'blocked'
    metadata: 'object?',
    timestamp: 'string'
  },

  [EventTypes.PHASE.CHANGED]: {
    oldPhase: 'string',
    newPhase: 'string',
    duration: 'number?',
    reason: 'string?',
    timestamp: 'string'
  },

  [EventTypes.COORDINATION.CALCULATED]: {
    targetId: 'string',
    coordinationCount: 'number',
    participants: 'array',
    bonusMultiplier: 'number',
    timestamp: 'string'
  },

  [EventTypes.SOCKET.UPDATE_REQUIRED]: {
    updateType: 'string',
    targetPlayers: 'array?', // If null, broadcast to all
    data: 'object',
    timestamp: 'string'
  }
};

/**
 * Event Categories for filtering and middleware
 */
const EventCategories = {
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
};

/**
 * Validate event data against schema
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateEventData(eventType, eventData) {
  const schema = EventSchemas[eventType];
  if (!schema) {
    return { valid: true, errors: [] }; // No schema = no validation
  }

  const errors = [];
  
  // Check required fields
  for (const [field, type] of Object.entries(schema)) {
    const isOptional = type.endsWith('?');
    const expectedType = isOptional ? type.slice(0, -1) : type;
    const value = eventData[field];

    if (!isOptional && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (value !== undefined && value !== null) {
      if (!validateFieldType(value, expectedType)) {
        errors.push(`Invalid type for field ${field}: expected ${expectedType}, got ${typeof value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate field type
 * @param {*} value - Value to validate
 * @param {string} expectedType - Expected type
 * @returns {boolean} True if valid
 * @private
 */
function validateFieldType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return true; // Unknown type, assume valid
  }
}

/**
 * Get all event types in a category
 * @param {string} category - Event category name
 * @returns {string[]} Array of event types
 */
function getEventsByCategory(category) {
  return EventCategories[category] || [];
}

/**
 * Check if event type exists
 * @param {string} eventType - Event type to check
 * @returns {boolean} True if event type is defined
 */
function isValidEventType(eventType) {
  for (const category of Object.values(EventTypes)) {
    if (typeof category === 'object') {
      if (Object.values(category).includes(eventType)) {
        return true;
      }
    } else if (category === eventType) {
      return true;
    }
  }
  return false;
}

module.exports = {
  EventTypes,
  EventSchemas,
  EventCategories,
  validateEventData,
  getEventsByCategory,
  isValidEventType
};