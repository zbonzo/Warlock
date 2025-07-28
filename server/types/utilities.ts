/**
 * @fileoverview Utility types for enhanced type safety
 * Provides common type transformations and helpers
 * Part of Phase 7 - Advanced Type Features & Optimization
 */

import type {
  Player,
  GameRoom,
  Monster,
  Ability,
  PlayerStats,
  StatusEffect,
  GamePhase,
  GameRules,
  PlayerAction,
  GameEvent
} from './generated';

/**
 * Deep Partial utility type
 * Makes all properties and nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Required utility type
 * Makes all properties and nested properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Deep Readonly utility type
 * Makes all properties and nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Player-specific utility types
 */
export type PartialPlayer = Partial<Player>;
export type RequiredPlayer = Required<Player>;
export type ReadonlyPlayer = Readonly<Player>;

// Update types for common operations
export type PlayerUpdate = Pick<Player, 'health' | 'statusEffects' | 'abilities' | 'stats'>;
export type PlayerCombatUpdate = Pick<Player, 'health' | 'statusEffects'>;
export type PlayerStatsUpdate = Pick<Player, 'stats'>;

// Creation types (omit auto-generated fields)
export type CreatePlayerInput = Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'socketId'>;
export type CreateGameInput = Omit<GameRoom, 'id' | 'gameCode' | 'createdAt' | 'players' | 'isActive'>;
export type CreateMonsterInput = Omit<Monster, 'id' | 'isAlive'>;

/**
 * GameRoom-specific utility types
 */
export type PartialGameRoom = Partial<GameRoom>;
export type GameRoomUpdate = Pick<GameRoom, 'phase' | 'players' | 'monster' | 'winner'>;
export type GameRoomSettings = Pick<GameRoom, 'rules' | 'maxPlayers' | 'isPrivate'>;

/**
 * Extract specific player states
 */
export type AlivePlayer = Player & { status: 'alive' };
export type DeadPlayer = Player & { status: 'dead' };
export type WarlockPlayer = Player & { role: 'Warlock' };
export type GoodPlayer = Player & { role: 'Good' };
export type EvilPlayer = Player & { role: 'Evil' };

/**
 * Ability-specific utility types
 */
export type UnlockedAbility = Ability & { unlocked: true };
export type CooldownAbility = Ability & { currentCooldown: number };
export type TargetedAbility = Ability & { target: Exclude<Ability['target'], 'none' | 'self'> };

/**
 * Status effect utilities
 */
export type ActiveStatusEffect = StatusEffect & { remainingDuration: number };
export type PermanentStatusEffect = StatusEffect & { duration: -1 };
export type StackableStatusEffect = StatusEffect & { stackable: true; stacks: number };

/**
 * Conditional type helpers
 */
export type NonNullableFields<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

export type NullableFields<T> = {
  [K in keyof T]: T[K] | null;
};

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract keys of specific types
 */
export type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

export type BooleanKeys<T> = {
  [K in keyof T]: T[K] extends boolean ? K : never;
}[keyof T];

export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Type-safe omit and pick helpers
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Mutable type (removes readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Immutable type (adds readonly)
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * Extract promise type
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract array type
 */
export type UnwrapArray<T> = T extends (infer U)[] ? U : T;

/**
 * Function type helpers
 */
export type AsyncFunction<T = void> = () => Promise<T>;
export type SyncFunction<T = void> = () => T;
export type Predicate<T> = (value: T) => boolean;
export type Mapper<T, U> = (value: T) => U;
export type Reducer<T, U> = (accumulator: U, value: T) => U;

/**
 * Branded types for type safety
 */
export type Brand<T, B> = T & { __brand: B };

export type PlayerId = Brand<string, 'PlayerId'>;
export type GameCode = Brand<string, 'GameCode'>;
export type AbilityId = Brand<string, 'AbilityId'>;
export type MonsterId = Brand<string, 'MonsterId'>;

/**
 * Validation result types
 */
export type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationError = {
  success: false;
  errors: string[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * API response types
 */
export type ApiSuccess<T> = {
  status: 'success';
  data: T;
  timestamp: string;
};

export type ApiError = {
  status: 'error';
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Discriminated union helpers
 */
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = 
  T extends Record<K, V> ? T : never;

/**
 * Type-safe event emitter types
 */
export type EventMap = {
  [key: string]: any;
};

export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export type TypedEventEmitter<Events extends EventMap> = {
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
};

/**
 * Utility type for exhaustive checks
 */
export type Exhaustive<T> = T extends never ? true : false;

/**
 * Type safe entries and values
 */
export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export type Values<T> = T[keyof T];

/**
 * Merge types with second type overriding first
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * XOR type - exactly one of T or U, not both
 */
export type XOR<T, U> = (T | U) extends object ?
  (Without<T, U> & U) | (Without<U, T> & T) : T | U;

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

/**
 * Type guards helper type
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Constructor type
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Singleton type
 */
export type Singleton<T> = T & {
  getInstance(): T;
};

/**
 * JSON-compatible types
 */
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONObject 
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

/**
 * Serializable type constraint
 */
export type Serializable<T> = T extends 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | Date
  | { toJSON(): any }
  | Serializable<any>[]
  | { [key: string]: Serializable<any> }
  ? T
  : never;

/**
 * Export namespace for convenience
 */
export const TypeUtils = {
  isValidationSuccess: <T>(result: ValidationResult<T>): result is ValidationSuccess<T> => {
    return result.success === true;
  },
  
  isApiSuccess: <T>(response: ApiResponse<T>): response is ApiSuccess<T> => {
    return response.status === 'success';
  },
  
  isApiError: <T>(response: ApiResponse<T>): response is ApiError => {
    return response.status === 'error';
  },
  
  createPlayerId: (id: string): PlayerId => id as PlayerId,
  createGameCode: (code: string): GameCode => code as GameCode,
  createAbilityId: (id: string): AbilityId => id as AbilityId,
  createMonsterId: (id: string): MonsterId => id as MonsterId,
};