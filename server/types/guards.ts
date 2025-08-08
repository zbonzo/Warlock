/**
 * @fileoverview Type guards for runtime checking
 * Provides type-safe runtime validation using Zod schemas
 * Part of Phase 7 - Advanced Type Features & Optimization
 */

import { z } from 'zod';
import * as Schemas from '../models/validation/ZodSchemas.js';
import type {
  Player,
  GameRoom,
  Monster,
  Ability,
  GameEvent,
  PlayerStats,
  PlayerAbilities,
  PlayerEffects,
  StatusEffect,
  GamePhase,
  GameRules,
  PlayerAction,
  AbilityAction,
  ValidationResult,
  CommandResult
} from './generated.js';

/**
 * Player-related type guards
 */
export function isPlayer(obj: unknown): obj is Player {
  return Schemas.PlayerSchemas.player.safeParse(obj).success;
}

export function isPlayerStats(obj: unknown): obj is PlayerStats {
  return Schemas.PlayerSchemas.playerStats.safeParse(obj).success;
}

export function isPlayerAbilities(obj: unknown): obj is PlayerAbilities {
  return Schemas.PlayerAbilitiesSchema.safeParse(obj).success;
}

export function isPlayerEffects(obj: unknown): obj is PlayerEffects {
  return Schemas.PlayerEffectsSchema.safeParse(obj).success;
}

export function isStatusEffect(obj: unknown): obj is StatusEffect {
  return Schemas.PlayerSchemas.statusEffect.safeParse(obj).success;
}

/**
 * Game-related type guards
 */
export function isGameRoom(obj: unknown): obj is GameRoom {
  return Schemas.GameRoomSchema.safeParse(obj).success;
}

export function isMonster(obj: unknown): obj is Monster {
  return Schemas.GameSchemas.monster.safeParse(obj).success;
}

export function isGamePhase(obj: unknown): obj is GamePhase {
  return Schemas.GameSchemas.gamePhase.safeParse(obj).success;
}

export function isGameRules(obj: unknown): obj is GameRules {
  return Schemas.GameSchemas.gameRules.safeParse(obj).success;
}

/**
 * Ability-related type guards
 */
export function isAbility(obj: unknown): obj is Ability {
  return Schemas.PlayerSchemas.ability.safeParse(obj).success;
}

/**
 * Action and Command type guards
 */
export function isPlayerAction(obj: unknown): obj is PlayerAction {
  return Schemas.ActionSchemas.playerAction.safeParse(obj).success;
}

export function isAbilityAction(obj: unknown): obj is AbilityAction {
  return Schemas.ActionSchemas.abilityAction.safeParse(obj).success;
}

export function isValidationResult(obj: unknown): obj is ValidationResult {
  return Schemas.ActionSchemas.validationResult.safeParse(obj).success;
}

export function isCommandResult(obj: unknown): obj is CommandResult {
  return Schemas.ActionSchemas.commandResult.safeParse(obj).success;
}

/**
 * Event type guards
 */
export function isGameEvent(obj: unknown): obj is GameEvent {
  return Schemas.GameEventSchema.safeParse(obj).success;
}

/**
 * Array type guards
 */
export function isPlayerArray(obj: unknown): obj is Player[] {
  if (!Array.isArray(obj)) return false;
  return obj.every(item => isPlayer(item));
}

export function isAbilityArray(obj: unknown): obj is Ability[] {
  if (!Array.isArray(obj)) return false;
  return obj.every(item => isAbility(item));
}

export function isStatusEffectArray(obj: unknown): obj is StatusEffect[] {
  if (!Array.isArray(obj)) return false;
  return obj.every(item => isStatusEffect(item));
}

/**
 * Partial type guards
 */
export function isPartialPlayer(obj: unknown): obj is Partial<Player> {
  if (typeof obj !== 'object' || obj === null) return false;
  // Use a simplified check for partial player since the schema is lazy
  return typeof obj === 'object' && obj !== null;
}

export function isPartialGameRoom(obj: unknown): obj is Partial<GameRoom> {
  if (typeof obj !== 'object' || obj === null) return false;
  return Schemas.GameRoomSchema.partial().safeParse(obj).success;
}

/**
 * Enhanced type guards with error reporting
 */
export function assertPlayer(obj: unknown): asserts obj is Player {
  const result = Schemas.PlayerSchemas.player.safeParse(obj);
  if (!result.success) {
    throw new Error(`Invalid Player object: ${result.error.message}`);
  }
}

export function assertGameRoom(obj: unknown): asserts obj is GameRoom {
  const result = Schemas.GameRoomSchema.safeParse(obj);
  if (!result.success) {
    throw new Error(`Invalid GameRoom object: ${result.error.message}`);
  }
}

export function assertGameEvent(obj: unknown): asserts obj is GameEvent {
  const result = Schemas.GameEventSchema.safeParse(obj);
  if (!result.success) {
    throw new Error(`Invalid GameEvent object: ${result.error.message}`);
  }
}

/**
 * Type guard with validation details
 */
export function validateWithDetails<T>(
  obj: unknown,
  schema: z.ZodSchema<T>
): { valid: true; data: T } | { valid: false; errors: z.ZodError } {
  const result = schema.safeParse(obj);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, errors: result.error };
}

/**
 * Narrow type guards for specific checks
 */
export function isAlivePlayer(obj: unknown): obj is Player & { status: 'alive' } {
  return isPlayer(obj) && obj.status === 'alive';
}

export function isDeadPlayer(obj: unknown): obj is Player & { status: 'dead' } {
  return isPlayer(obj) && obj.status === 'dead';
}

export function isWarlockPlayer(obj: unknown): obj is Player & { role: 'Warlock' } {
  return isPlayer(obj) && obj.role === 'Warlock';
}

export function isGoodPlayer(obj: unknown): obj is Player & { role: 'Good' } {
  return isPlayer(obj) && obj.role === 'Good';
}

export function isEvilPlayer(obj: unknown): obj is Player & { role: 'Evil' } {
  return isPlayer(obj) && obj.role === 'Evil';
}

/**
 * Complex object type guards
 */
export function hasValidStats(player: unknown): player is Player & { stats: PlayerStats } {
  return isPlayer(player) && isPlayerStats(player.stats);
}

export function hasAbilities(player: unknown): player is Player & { abilities: Ability[] } {
  return isPlayer(player) && isAbilityArray(player.abilities);
}

export function hasStatusEffects(entity: unknown): entity is (Player | Monster) & { statusEffects: StatusEffect[] } {
  return (isPlayer(entity) || isMonster(entity)) && isStatusEffectArray(entity.statusEffects);
}

/**
 * Generic type guard factory
 */
export function createTypeGuard<T>(schema: z.ZodSchema<T>) {
  return (obj: unknown): obj is T => {
    return schema.safeParse(obj).success;
  };
}

/**
 * Export all guards as a namespace for convenience
 */
export const TypeGuards = {
  // Player guards
  isPlayer,
  isPlayerStats,
  isPlayerAbilities,
  isPlayerEffects,
  isStatusEffect,

  // Game guards
  isGameRoom,
  isMonster,
  isGamePhase,
  isGameRules,

  // Ability guards
  isAbility,

  // Action guards
  isPlayerAction,
  isAbilityAction,
  isValidationResult,
  isCommandResult,

  // Event guards
  isGameEvent,

  // Array guards
  isPlayerArray,
  isAbilityArray,
  isStatusEffectArray,

  // Partial guards
  isPartialPlayer,
  isPartialGameRoom,

  // Assertion guards
  assertPlayer,
  assertGameRoom,
  assertGameEvent,

  // Narrow guards
  isAlivePlayer,
  isDeadPlayer,
  isWarlockPlayer,
  isGoodPlayer,
  isEvilPlayer,

  // Complex guards
  hasValidStats,
  hasAbilities,
  hasStatusEffects,

  // Utilities
  validateWithDetails,
  createTypeGuard
};
