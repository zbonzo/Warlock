/**
 * @fileoverview Runtime type guards for type safety
 * Provides runtime validation functions for basic and complex types
 */

import type {
  Player,
  Monster,
  Ability,
  GameRoom,
  StatusEffect,
  GameEvent,
  GamePhase
} from '../generated.js';

import type { ValidationResult } from './validation-types.js';

// Type guard utility type
export type TypeGuard<T> = (value: unknown) => value is T;
import type { 
  PlayerId, 
  GameCode, 
  AbilityId, 
  MonsterId,
  isPlayerId,
  isGameCode,
  isAbilityId,
  isMonsterId 
} from './brand-types.js';

// Re-export brand type guards
export { isPlayerId, isGameCode, isAbilityId, isMonsterId };

/**
 * Basic type guards
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isStringWithMinLength(minLength: number) {
  return (value: unknown): value is string => {
    return typeof value === 'string' && value.length >= minLength;
  };
}

export function isStringWithMaxLength(maxLength: number) {
  return (value: unknown): value is string => {
    return typeof value === 'string' && value.length <= maxLength;
  };
}

export function isStringMatching(pattern: RegExp) {
  return (value: unknown): value is string => {
    return typeof value === 'string' && pattern.test(value);
  };
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function isNumberInRange(min: number, max: number) {
  return (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
  };
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isObjectWithKeys<K extends string>(keys: readonly K[]) {
  return (value: unknown): value is Record<K, unknown> => {
    if (!isObject(value)) return false;
    return keys.every(key => key in value);
  };
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

export function isArrayOf<T>(guard: TypeGuard<T>) {
  return (value: unknown): value is T[] => {
    return Array.isArray(value) && value.every(guard);
  };
}

export function isArrayWithLength(length: number) {
  return <T>(value: unknown): value is T[] => {
    return Array.isArray(value) && value.length === length;
  };
}

export function isArrayWithMinLength(minLength: number) {
  return <T>(value: unknown): value is T[] => {
    return Array.isArray(value) && value.length >= minLength;
  };
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Game-specific type guards
 */
export function isPlayer(value: unknown): value is Player {
  if (!isObject(value)) return false;
  
  const player = value as Record<string, unknown>;
  return (
    isString(player['id']) &&
    isString(player['name']) &&
    isString(player['race']) &&
    isString(player['class']) &&
    isNumber(player['hp']) &&
    isNumber(player['maxHp']) &&
    isObject(player['stats']) &&
    Array.isArray(player['abilities']) &&
    isObject(player['statusEffects'])
  );
}

export type AlivePlayer = Player & { status: 'alive' };
export type WarlockPlayer = Player & { role: 'Warlock' };

export function isAlivePlayer(value: unknown): value is AlivePlayer {
  return isPlayer(value) && (value as any)['status'] === 'alive';
}

export function isWarlockPlayer(value: unknown): value is WarlockPlayer {
  return isPlayer(value) && (value as any)['role'] === 'Warlock';
}

export function isPlayerWithClass(playerClass: string) {
  return (value: unknown): value is Player => {
    return isPlayer(value) && value['class'] === playerClass;
  };
}

export function isPlayerWithRace(race: string) {
  return (value: unknown): value is Player => {
    return isPlayer(value) && value['race'] === race;
  };
}

export function isAbility(value: unknown): value is Ability {
  if (!isObject(value)) return false;
  
  const ability = value as Record<string, unknown>;
  return (
    isString(ability['id']) &&
    isString(ability['name']) &&
    isString(ability['description']) &&
    isNumber(ability['damage']) &&
    isNumber(ability['cooldown']) &&
    isString(ability['target'])
  );
}

export type UnlockedAbility = Ability & { unlocked: true };
export type CooldownAbility = Ability & { currentCooldown: number };
export type TargetedAbility = Ability & { target: Exclude<Ability['target'], 'none' | 'self'> };

export function isUnlockedAbility(value: unknown): value is UnlockedAbility {
  return isAbility(value) && (value as any).unlocked === true;
}

export function isTargetedAbility(value: unknown): value is TargetedAbility {
  const ability = value as Ability;
  return isAbility(value) && ability['target'] !== 'none' && ability['target'] !== 'self';
}

export function isAbilityWithCooldown(value: unknown): value is CooldownAbility {
  return isAbility(value) && 
         isObject(value) && 
         'currentCooldown' in value && 
         isNumber((value as any)['currentCooldown']);
}

export function isMonster(value: unknown): value is Monster {
  if (!isObject(value)) return false;
  
  const monster = value as Record<string, unknown>;
  return (
    isString(monster['id']) &&
    isString(monster['name']) &&
    isNumber(monster['hp']) &&
    isNumber(monster['maxHp']) &&
    isNumber(monster['level']) &&
    isBoolean(monster['isAlive'])
  );
}

export function isAliveMonster(value: unknown): value is Monster & { isAlive: true } {
  return isMonster(value) && value['isAlive'] === true;
}

export function isGameRoom(value: unknown): value is GameRoom {
  if (!isObject(value)) return false;
  
  const room = value as Record<string, unknown>;
  return (
    isString(room['id']) &&
    isString(room['gameCode']) &&
    Array.isArray(room['players']) &&
    isBoolean(room['isActive'])
  );
}

export function isGameInPhase(phase: GamePhase) {
  return (value: unknown): value is GameRoom => {
    return isGameRoom(value) && (value as any)['currentPhase'] === phase;
  };
}

export function isStatusEffect(value: unknown): value is StatusEffect {
  if (!isObject(value)) return false;
  
  const effect = value as Record<string, unknown>;
  return (
    isString(effect['id']) &&
    isString(effect['name']) &&
    isString(effect['type']) &&
    isNumber(effect['duration'])
  );
}

export type ActiveStatusEffect = StatusEffect & { remainingDuration: number };
export type PermanentStatusEffect = StatusEffect & { duration: -1 };
export type StackableStatusEffect = StatusEffect & { stackable: true; stacks: number };

export function isActiveStatusEffect(value: unknown): value is ActiveStatusEffect {
  return isStatusEffect(value) && 'remainingDuration' in value && isNumber((value as any)['remainingDuration']);
}

export function isPermanentStatusEffect(value: unknown): value is PermanentStatusEffect {
  return isStatusEffect(value) && value['duration'] === -1;
}

export function isStackableStatusEffect(value: unknown): value is StackableStatusEffect {
  return isStatusEffect(value) && 
         (value as any)['stackable'] === true && 
         'stacks' in value && 
         isNumber((value as any)['stacks']);
}

export function isGameEvent(value: unknown): value is GameEvent {
  if (!isObject(value)) return false;
  
  const event = value as Record<string, unknown>;
  return (
    isString(event['type']) &&
    isObject(event['payload']) &&
    isValidDate(event['timestamp'])
  );
}

export function isGameEventOfType<T extends string>(eventType: T) {
  return (value: unknown): value is GameEvent & { type: T } => {
    return isGameEvent(value) && value['type'] === eventType;
  };
}

/**
 * Validation builders
 */
export function createValidator<T>(...guards: TypeGuard<any>[]) {
  return (value: unknown): value is T => {
    return guards.every(guard => guard(value));
  };
}

export function createUnionValidator<T>(...guards: TypeGuard<any>[]) {
  return (value: unknown): value is T => {
    return guards.some(guard => guard(value));
  };
}

export function createObjectValidator<T extends Record<string, any>>(
  schema: { [K in keyof T]: TypeGuard<T[K]> }
) {
  return (value: unknown): value is T => {
    if (!isObject(value)) return false;
    
    return Object.entries(schema).every(([key, guard]) => {
      return key in value && guard((value as any)[key]);
    });
  };
}

/**
 * Safe parsing functions that return validation results
 */
export function safeParsePlayer(value: unknown): ValidationResult<Player> {
  if (isPlayer(value)) {
    return { success: true, data: value, errors: undefined as never };
  }
  return { success: false, data: undefined as never, errors: ['Invalid player object'] };
}

export function safeParseAbility(value: unknown): ValidationResult<Ability> {
  if (isAbility(value)) {
    return { success: true, data: value, errors: undefined as never };
  }
  return { success: false, data: undefined as never, errors: ['Invalid ability object'] };
}

export function safeParseMonster(value: unknown): ValidationResult<Monster> {
  if (isMonster(value)) {
    return { success: true, data: value, errors: undefined as never };
  }
  return { success: false, data: undefined as never, errors: ['Invalid monster object'] };
}

export function safeParseGameRoom(value: unknown): ValidationResult<GameRoom> {
  if (isGameRoom(value)) {
    return { success: true, data: value, errors: undefined as never };
  }
  return { success: false, data: undefined as never, errors: ['Invalid game room object'] };
}