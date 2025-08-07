/**
 * @fileoverview Brand types for type safety with primitive values
 * Provides branded types to prevent mixing up similar primitive values
 */

/**
 * Base brand type utility
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Game-specific branded types
 */
export type PlayerId = Brand<string, 'PlayerId'>;
export type GameCode = Brand<string, 'GameCode'>;
export type AbilityId = Brand<string, 'AbilityId'>;
export type MonsterId = Brand<string, 'MonsterId'>;

/**
 * Type guards for branded types
 */
export function isPlayerId(value: unknown): value is PlayerId {
  return typeof value === 'string' && value.length > 0;
}

export function isGameCode(value: unknown): value is GameCode {
  return typeof value === 'string' && /^[A-Z]{4}$/.test(value);
}

export function isAbilityId(value: unknown): value is AbilityId {
  return typeof value === 'string' && value.length > 0;
}

export function isMonsterId(value: unknown): value is MonsterId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Brand type creators with validation
 */
export function createPlayerId(id: string): PlayerId {
  if (!id || typeof id !== 'string') {
    throw new Error('PlayerId must be a non-empty string');
  }
  return id as PlayerId;
}

export function createGameCode(code: string): GameCode {
  if (!code || typeof code !== 'string' || !/^[A-Z]{4}$/.test(code)) {
    throw new Error('GameCode must be a 4-character uppercase string');
  }
  return code as GameCode;
}

export function createAbilityId(id: string): AbilityId {
  if (!id || typeof id !== 'string') {
    throw new Error('AbilityId must be a non-empty string');
  }
  return id as AbilityId;
}

export function createMonsterId(id: string): MonsterId {
  if (!id || typeof id !== 'string') {
    throw new Error('MonsterId must be a non-empty string');
  }
  return id as MonsterId;
}

/**
 * Singleton pattern type
 */
export type Singleton<T> = T & {
  readonly __singleton: unique symbol;
  getInstance(): T;
};