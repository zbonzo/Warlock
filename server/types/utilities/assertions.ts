/**
 * @fileoverview Assertion functions for runtime type checking
 * Provides assertion functions that throw errors on type mismatches
 */

import type { Player, Monster, Ability, GameRoom } from '../generated.js';
import {
  isDefined,
  isString,
  isNonEmptyString,
  isNumber,
  isPositiveNumber,
  isInteger,
  isBoolean,
  isObject,
  isArray,
  isPlayer,
  isAlivePlayer,
  isAbility,
  isMonster,
  isGameRoom,
  type AlivePlayer
} from './type-guards.js';

/**
 * Basic assertion functions
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message || 'Expected value to be defined');
  }
}

export function assertString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || `Expected string, got ${typeof value}`);
  }
}

export function assertNonEmptyString(value: unknown, message?: string): asserts value is string {
  if (!isNonEmptyString(value)) {
    throw new Error(message || 'Expected non-empty string');
  }
}

export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || `Expected number, got ${typeof value}`);
  }
}

export function assertPositiveNumber(value: unknown, message?: string): asserts value is number {
  if (!isPositiveNumber(value)) {
    throw new Error(message || 'Expected positive number');
  }
}

export function assertInteger(value: unknown, message?: string): asserts value is number {
  if (!isInteger(value)) {
    throw new Error(message || 'Expected integer');
  }
}

export function assertBoolean(value: unknown, message?: string): asserts value is boolean {
  if (!isBoolean(value)) {
    throw new Error(message || `Expected boolean, got ${typeof value}`);
  }
}

export function assertObject(value: unknown, message?: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message || 'Expected object');
  }
}

export function assertArray<T>(value: unknown, message?: string): asserts value is T[] {
  if (!isArray(value)) {
    throw new Error(message || 'Expected array');
  }
}

/**
 * Game-specific assertion functions
 */
export function assertPlayer(value: unknown, message?: string): asserts value is Player {
  if (!isPlayer(value)) {
    throw new Error(message || 'Expected valid player object');
  }
}

export function assertAlivePlayer(value: unknown, message?: string): asserts value is AlivePlayer {
  if (!isAlivePlayer(value)) {
    throw new Error(message || 'Expected alive player');
  }
}

export function assertAbility(value: unknown, message?: string): asserts value is Ability {
  if (!isAbility(value)) {
    throw new Error(message || 'Expected valid ability object');
  }
}

export function assertMonster(value: unknown, message?: string): asserts value is Monster {
  if (!isMonster(value)) {
    throw new Error(message || 'Expected valid monster object');
  }
}

export function assertGameRoom(value: unknown, message?: string): asserts value is GameRoom {
  if (!isGameRoom(value)) {
    throw new Error(message || 'Expected valid game room object');
  }
}

/**
 * Custom assertion builder
 */
export function createAssertion<T>(
  typeGuard: (value: unknown) => value is T,
  errorMessage: string
) {
  return (value: unknown, customMessage?: string): asserts value is T => {
    if (!typeGuard(value)) {
      throw new Error(customMessage || errorMessage);
    }
  };
}

/**
 * Utility for exhaustive checking in switch statements
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled case: ${value}`);
}