/**
 * @fileoverview Type guards for game state discriminated unions
 * Provides runtime type checking for complex game state types
 */

import type {
  PlayerState,
  GamePhaseState,
  PlayerActionState,
  MonsterState,
  GameRoomState,
  AbilityCooldownState,
  StatusEffectState,
  PlayerRoleState,
  CombatResult,
  PlayerConnectionState,
  TurnTimerState,
  CoordinationState
} from './game-state-types.js';

import { isString, isNumber, isBoolean, isObject } from './type-guards.js';

/**
 * Player state guards
 */
export function isPlayerState(value: unknown): value is PlayerState {
  if (!isObject(value)) return false;

  const state = value as Record<string, unknown>;
  if (!isString(state['status'])) return false;

  switch (state['status']) {
    case 'alive':
      return isNumber(state['hp']) && isNumber(state['maxHp']);
    case 'dead':
      return isNumber(state['deathTime']) && isString(state['causeOfDeath']) && isBoolean(state['canBeRevived']);
    case 'revived':
      return isNumber(state['revivedTime']) && isString(state['revivedBy']) &&
             isNumber(state['revivedAt']) && isNumber(state['reviveCount']);
    case 'spectating':
      return isNumber(state['leftGameTime']) &&
             isString(state['reason']) &&
             ['quit', 'kicked', 'connection_lost'].includes(state['reason'] as string);
    default:
      return false;
  }
}

/**
 * Simple stub implementation for other state guards
 * These can be expanded as needed
 */
export function isGamePhaseState(value: unknown): value is GamePhaseState {
  return isObject(value) && isString((value as Record<string, unknown>)['phase']);
}

export function isPlayerActionState(value: unknown): value is PlayerActionState {
  return isObject(value) && isString((value as Record<string, unknown>)['state']);
}

export function isMonsterState(value: unknown): value is MonsterState {
  return isObject(value) && isString((value as Record<string, unknown>)['status']);
}

export function isGameRoomState(value: unknown): value is GameRoomState {
  return isObject(value) && isString((value as Record<string, unknown>)['status']);
}

export function isAbilityCooldownState(value: unknown): value is AbilityCooldownState {
  return isObject(value) && isString((value as Record<string, unknown>)['state']);
}

export function isStatusEffectState(value: unknown): value is StatusEffectState {
  return isObject(value) && isString((value as Record<string, unknown>)['state']);
}

export function isPlayerRoleState(value: unknown): value is PlayerRoleState {
  return isObject(value) && isString((value as Record<string, unknown>)['role']);
}

export function isCombatResult(value: unknown): value is CombatResult {
  return isObject(value) && isBoolean((value as Record<string, unknown>)['success']);
}

export function isPlayerConnectionState(value: unknown): value is PlayerConnectionState {
  return isObject(value) && isString((value as Record<string, unknown>)['status']);
}

export function isTurnTimerState(value: unknown): value is TurnTimerState {
  return isObject(value) && isString((value as Record<string, unknown>)['state']);
}

export function isCoordinationState(value: unknown): value is CoordinationState {
  return isObject(value) && isString((value as Record<string, unknown>)['state']);
}
