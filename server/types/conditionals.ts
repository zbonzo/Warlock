/**
 * @fileoverview Advanced conditional types for the game system
 * Provides complex type manipulations and type-level programming
 * Part of Phase 7 - Advanced Type Features & Optimization
 */

import type { GameEvent, EventType, EventPayload } from '../models/events/EventTypes';
import type {
  Player,
  GameRoom,
  Monster,
  Ability,
  PlayerStats,
  StatusEffect,
  GamePhase,
  PlayerAction
} from './generated';

/**
 * Event-specific conditional types
 */

// Extract events by category
export type DamageEvents = Extract<GameEvent, { type: `damage.${string}` }>;
export type PlayerEvents = Extract<GameEvent, { type: `player.${string}` }>;
export type GameEvents = Extract<GameEvent, { type: `game.${string}` }>;
export type ActionEvents = Extract<GameEvent, { type: `action.${string}` }>;
export type PhaseEvents = Extract<GameEvent, { type: `phase.${string}` }>;

// Event type predicates
export type IsDamageEvent<T extends EventType> = T extends `damage.${string}` ? true : false;
export type IsPlayerEvent<T extends EventType> = T extends `player.${string}` ? true : false;
export type IsGameEvent<T extends EventType> = T extends `game.${string}` ? true : false;
export type IsActionEvent<T extends EventType> = T extends `action.${string}` ? true : false;

// Extract event payloads by category
export type DamageEventPayloads = DamageEvents['payload'];
export type PlayerEventPayloads = PlayerEvents['payload'];
export type GameEventPayloads = GameEvents['payload'];
export type ActionEventPayloads = ActionEvents['payload'];

/**
 * Player role-based conditional types
 */
export type PlayerByRole<Role extends Player['role']> = Player & { role: Role };
export type PlayersOfRole<Role extends Player['role'], P extends Player[]> = 
  Extract<P[number], { role: Role }>[];

// Extract players by status
export type PlayerByStatus<Status extends Player['status']> = Player & { status: Status };
export type AlivePlayers<P extends Player[]> = Extract<P[number], { status: 'alive' }>[];
export type DeadPlayers<P extends Player[]> = Extract<P[number], { status: 'dead' }>[];

// Player class-specific types
export type PlayerByClass<Class extends Player['class']> = Player & { class: Class };
export type WizardPlayer = PlayerByClass<'Wizard'>;
export type PaladinPlayer = PlayerByClass<'Paladin'>;
export type KnightPlayer = PlayerByClass<'Knight'>;
export type ArcherPlayer = PlayerByClass<'Archer'>;

/**
 * Ability conditional types
 */
export type AbilityByTarget<Target extends Ability['target']> = Ability & { target: Target };
export type SelfTargetAbility = AbilityByTarget<'self'>;
export type PlayerTargetAbility = AbilityByTarget<'player'>;
export type MonsterTargetAbility = AbilityByTarget<'monster'>;
export type AreaTargetAbility = AbilityByTarget<'area'>;

// Ability availability
export type AvailableAbility = Ability & { unlocked: true; currentCooldown: 0 };
export type OnCooldownAbility = Ability & { currentCooldown: number };
export type LockedAbility = Ability & { unlocked: false };

/**
 * Status effect conditional types
 */
export type BuffEffect = StatusEffect & { type: 'buff' };
export type DebuffEffect = StatusEffect & { type: 'debuff' };
export type StatusCondition = StatusEffect & { type: 'status' };
export type ImmunityEffect = StatusEffect & { type: 'immunity' };

// Extract effects by type
export type ExtractEffectType<T extends StatusEffect['type'], Effects extends StatusEffect[]> =
  Extract<Effects[number], { type: T }>[];

/**
 * Game phase conditional types
 */
export type GameInPhase<Phase extends GamePhase['current']> = GameRoom & {
  phase: GamePhase & { current: Phase }
};

export type SetupGame = GameInPhase<'setup'>;
export type DayPhaseGame = GameInPhase<'day'>;
export type NightPhaseGame = GameInPhase<'night'>;
export type VotingPhaseGame = GameInPhase<'voting'>;
export type EndedGame = GameInPhase<'ended'>;

/**
 * Conditional type utilities
 */

// If-Then-Else type
export type If<Condition extends boolean, Then, Else> = 
  Condition extends true ? Then : Else;

// Not type
export type Not<T extends boolean> = T extends true ? false : true;

// And type
export type And<A extends boolean, B extends boolean> = 
  A extends true ? B extends true ? true : false : false;

// Or type
export type Or<A extends boolean, B extends boolean> = 
  A extends true ? true : B extends true ? true : false;

// Equals type
export type Equals<X, Y> = 
  (<T>() => T extends X ? 1 : 2) extends 
  (<T>() => T extends Y ? 1 : 2) ? true : false;

// Extends type
export type Extends<A, B> = A extends B ? true : false;

/**
 * Type-level arithmetic
 */
type Length<T extends readonly any[]> = T['length'];

type BuildTuple<L extends number, T extends readonly any[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, any]>;

type Add<A extends number, B extends number> =
  Length<[...BuildTuple<A>, ...BuildTuple<B>]>;

type Subtract<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer R] ? Length<R> : never;

/**
 * String manipulation types
 */
export type Split<S extends string, D extends string> =
  S extends `${infer H}${D}${infer T}` ? [H, ...Split<T, D>] : [S];

export type Join<T extends readonly string[], D extends string> =
  T extends readonly [] ? '' :
  T extends readonly [infer F] ? F :
  T extends readonly [infer F, ...infer R] ?
    F extends string ? 
      R extends readonly string[] ? 
        `${F}${D}${Join<R, D>}` : never : never : never;

export type Replace<S extends string, From extends string, To extends string> =
  S extends `${infer Start}${From}${infer End}` 
    ? `${Start}${To}${Replace<End, From, To>}`
    : S;

/**
 * Object manipulation conditional types
 */

// Pick by value type
export type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
};

// Omit by value type
export type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K]
};

// Required keys
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T];

// Optional keys
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T];

// Readonly keys
export type ReadonlyKeys<T> = {
  [K in keyof T]-?: Equals<
    { [Q in K]: T[K] },
    { -readonly [Q in K]: T[K] }
  > extends true ? never : K
}[keyof T];

// Mutable keys
export type MutableKeys<T> = {
  [K in keyof T]-?: Equals<
    { [Q in K]: T[K] },
    { -readonly [Q in K]: T[K] }
  > extends true ? K : never
}[keyof T];

/**
 * Function type conditionals
 */
export type Parameters<T extends (...args: any) => any> = 
  T extends (...args: infer P) => any ? P : never;

export type ReturnType<T extends (...args: any) => any> = 
  T extends (...args: any) => infer R ? R : any;

export type PromiseType<T extends Promise<any>> = 
  T extends Promise<infer U> ? U : never;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  PromiseType<ReturnType<T>>;

/**
 * Tuple manipulation
 */
export type Head<T extends readonly any[]> = T extends readonly [infer H, ...any[]] ? H : never;
export type Tail<T extends readonly any[]> = T extends readonly [any, ...infer T] ? T : [];
export type Last<T extends readonly any[]> = T extends readonly [...any[], infer L] ? L : never;

/**
 * Union to intersection
 */
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Distributive conditional types
 */
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Flatten<T> = T extends any[] ? T[number] : T;

/**
 * Template literal types for event names
 */
export type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}` ?
  U extends Uncapitalize<U> ? `${Lowercase<T>}${CamelToSnakeCase<U>}` :
  `${Lowercase<T>}_${CamelToSnakeCase<U>}` : S;

export type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}` ?
  `${T}${Capitalize<SnakeToCamelCase<U>>}` : S;

/**
 * Validation conditional types
 */
export type ValidateKeys<T, K> = K extends keyof T ? K : never;
export type ValidateType<T, Expected> = T extends Expected ? T : never;

/**
 * Exhaustiveness checking
 */
export type AssertNever<T extends never> = T;
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

/**
 * Type predicate generators
 */
export type TypePredicate<T> = (value: unknown) => value is T;

export function createEventTypePredicate<T extends EventType>(
  eventType: T
): TypePredicate<Extract<GameEvent, { type: T }>> {
  return (event: unknown): event is Extract<GameEvent, { type: T }> => {
    return (event as GameEvent).type === eventType;
  };
}

/**
 * Conditional type for safe property access
 */
export type SafeGet<T, K extends string> = K extends keyof T ? T[K] : undefined;

/**
 * Type-safe builder pattern
 */
export type Builder<T> = {
  [K in keyof T]-?: (value: T[K]) => Builder<T>
} & {
  build(): T;
};

/**
 * Recursive conditional types
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};