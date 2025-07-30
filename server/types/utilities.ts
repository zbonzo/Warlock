/**
 * @fileoverview Advanced TypeScript utility types for enhanced type safety
 * Provides common type transformations, conditional types, and advanced patterns
 * Part of Phase 7 - Advanced Type Features & Optimization
 * Enhanced with sophisticated generic utilities and runtime validation
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
 * Enhanced serializable type constraint
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
 * =============================================================================
 * ADVANCED MAPPED TYPES
 * =============================================================================
 */

/**
 * Make specific properties optional while keeping others required
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required while keeping others optional
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Create a type with default values
 */
export type WithDefaults<T, D> = T & D;

/**
 * Remove index signatures from a type
 */
export type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/**
 * Get the keys of T that are assignable to U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Create a type where all functions become optional
 */
export type OptionalMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] | undefined : T[K];
};

/**
 * Create a type with all methods required
 */
export type RequiredMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? NonNullable<T[K]> : T[K];
};

/**
 * Extract constructor parameters
 */
export type ConstructorParameters<T extends new (...args: any) => any> = 
  T extends new (...args: infer P) => any ? P : never;

/**
 * Extract instance type from constructor
 */
export type InstanceType<T extends new (...args: any) => any> = 
  T extends new (...args: any) => infer R ? R : any;

/**
 * =============================================================================
 * ADVANCED CONDITIONAL TYPES FOR GAME LOGIC
 * =============================================================================
 */

/**
 * Check if type has property at compile time
 */
export type HasProperty<T, K extends PropertyKey> = K extends keyof T ? true : false;

/**
 * Extract types that have a specific property
 */
export type WithProperty<T, K extends PropertyKey> = T extends Record<K, any> ? T : never;

/**
 * Extract types that don't have a specific property
 */
export type WithoutProperty<T, K extends PropertyKey> = T extends Record<K, any> ? never : T;

/**
 * Conditional type for ability targets
 */
export type AbilityTargetType<T extends string> = 
  T extends 'self' ? 'self' :
  T extends 'player' ? 'player' :
  T extends 'monster' ? 'monster' :
  T extends 'area' ? 'area' :
  'none';

/**
 * Conditional type for damage calculations
 */
export type DamageType<T> = 
  T extends { damageType: infer D } ? D :
  T extends { type: 'physical' } ? 'physical' :
  T extends { type: 'magical' } ? 'magical' :
  'true';

/**
 * =============================================================================
 * COMPLEX GAME LOGIC CONDITIONAL TYPES
 * =============================================================================
 */

/**
 * Conditional types for player role-based logic
 */
export type PlayerRoleLogic<T extends PlayerRole> = 
  T extends 'good' ? {
    canWin: 'eliminate_all_evil';
    teamSize: 'majority';
    abilities: 'defensive' | 'detection' | 'healing';
    canCoordinate: true;
    trustLevel: 'high';
  } :
  T extends 'evil' ? {
    canWin: 'eliminate_good_or_majority';
    teamSize: 'minority';
    abilities: 'offensive' | 'deception' | 'sabotage';
    canCoordinate: false;
    trustLevel: 'none';
  } :
  T extends 'warlock' ? {
    canWin: 'corrupt_majority';
    teamSize: 'scaling';
    abilities: 'corruption' | 'offensive' | 'deception';
    canCoordinate: true;
    trustLevel: 'variable';
  } : never;

/**
 * Conditional types for ability category logic
 */
export type AbilityCategoryLogic<T extends string> = 
  T extends 'Attack' ? {
    targeting: 'single' | 'multi' | 'area';
    requiresTarget: true;
    canCrit: true;
    canMiss: true;
    canBeBlocked: true;
    appliesThreat: true;
    damageTypes: ['physical', 'magical', 'true'];
  } :
  T extends 'Heal' ? {
    targeting: 'single' | 'multi' | 'self';
    requiresTarget: boolean;
    canCrit: true;
    canMiss: false;
    canBeBlocked: false;
    appliesThreat: false;
    healTypes: ['direct', 'overtime', 'conditional'];
  } :
  T extends 'Defense' ? {
    targeting: 'self' | 'single' | 'multi';
    requiresTarget: boolean;
    canCrit: false;
    canMiss: false;
    canBeBlocked: false;
    appliesThreat: false;
    effectTypes: ['shield', 'armor', 'resistance', 'immunity'];
  } :
  T extends 'Special' ? {
    targeting: 'any';
    requiresTarget: boolean;
    canCrit: false;
    canMiss: boolean;
    canBeBlocked: boolean;
    appliesThreat: boolean;
    effectTypes: ['detection', 'control', 'utility', 'manipulation'];
  } : never;

/**
 * Conditional types for status effect behavior
 */
export type StatusEffectBehavior<T extends string> = 
  T extends 'stunned' ? {
    duration: 'temporary';
    stackable: false;
    dispellable: true;
    blocksActions: true;
    blocksMovement: true;
    visibility: 'public';
    removedOnDeath: true;
  } :
  T extends 'poisoned' ? {
    duration: 'temporary';
    stackable: true;
    dispellable: true;
    blocksActions: false;
    blocksMovement: false;
    visibility: 'private';
    removedOnDeath: false;
    appliesDamage: 'per_turn';
  } :
  T extends 'vulnerable' ? {
    duration: 'temporary';
    stackable: true;
    dispellable: true;
    blocksActions: false;
    blocksMovement: false;
    visibility: 'private';
    removedOnDeath: true;
    damageModifier: 'increase';
  } :
  T extends 'shielded' ? {
    duration: 'until_depleted';
    stackable: false;
    dispellable: true;
    blocksActions: false;
    blocksMovement: false;
    visibility: 'public';
    removedOnDeath: true;
    damageReduction: 'absolute';
  } : {
    duration: 'custom';
    stackable: boolean;
    dispellable: boolean;
    blocksActions: boolean;
    blocksMovement: boolean;
    visibility: 'public' | 'private';
    removedOnDeath: boolean;
  };

/**
 * Conditional types for coordination bonus calculations
 */
export type CoordinationBonusLogic<T extends string> = 
  T extends 'damage' ? {
    baseBonus: 25;
    maxBonus: 100;
    bonusType: 'percentage';
    appliesTo: 'final_damage';
    stacksWith: ['critical', 'vulnerability'];
    requiresAlignment: 'same_team';
  } :
  T extends 'healing' ? {
    baseBonus: 20;
    maxBonus: 80;
    bonusType: 'percentage';
    appliesTo: 'heal_amount';
    stacksWith: ['critical'];
    requiresAlignment: 'same_team';
  } :
  T extends 'defense' ? {
    baseBonus: 15;
    maxBonus: 60;
    bonusType: 'percentage';
    appliesTo: 'shield_amount';
    stacksWith: ['armor'];
    requiresAlignment: 'same_team';
  } :
  T extends 'utility' ? {
    baseBonus: 30;
    maxBonus: 120;
    bonusType: 'percentage';
    appliesTo: 'duration' | 'chance';
    stacksWith: ['special_effects'];
    requiresAlignment: 'same_team';
  } : never;

/**
 * Conditional types for game phase transitions
 */
export type GamePhaseTransitions<T extends GamePhase> = 
  T extends 'lobby' ? {
    canTransitionTo: ['setup'];
    requirements: ['min_players', 'all_ready'];
    autoTransition: false;
    timeLimit: null;
  } :
  T extends 'setup' ? {
    canTransitionTo: ['action'];
    requirements: ['roles_assigned', 'setup_complete'];
    autoTransition: true;
    timeLimit: 30000;
  } :
  T extends 'action' ? {
    canTransitionTo: ['results'];
    requirements: ['all_actions_submitted', 'timeout'];
    autoTransition: true;
    timeLimit: 120000;
  } :
  T extends 'results' ? {
    canTransitionTo: ['action', 'ended'];
    requirements: ['game_not_over'] | ['win_condition_met'];
    autoTransition: true;
    timeLimit: 15000;
  } :
  T extends 'ended' ? {
    canTransitionTo: never;
    requirements: never;
    autoTransition: false;
    timeLimit: null;
  } : never;

/**
 * Conditional types for monster scaling logic
 */
export type MonsterScalingLogic<T extends number> = 
  T extends 1 ? {
    baseHealth: 150;
    baseDamage: 20;
    abilities: ['basic_attack'];
    specialAbilities: never;
    threatLevel: 'low';
  } :
  T extends 2 ? {
    baseHealth: 200;
    baseDamage: 25;
    abilities: ['basic_attack', 'cleave'];
    specialAbilities: ['area_damage'];
    threatLevel: 'medium';
  } :
  T extends 3 ? {
    baseHealth: 275;
    baseDamage: 35;
    abilities: ['basic_attack', 'cleave', 'rage'];
    specialAbilities: ['area_damage', 'damage_boost'];
    threatLevel: 'high';
  } :
  T extends 4 ? {
    baseHealth: 375;
    baseDamage: 50;
    abilities: ['basic_attack', 'cleave', 'rage', 'intimidate'];
    specialAbilities: ['area_damage', 'damage_boost', 'stun'];
    threatLevel: 'extreme';
  } : {
    baseHealth: 500;
    baseDamage: 75;
    abilities: ['basic_attack', 'cleave', 'rage', 'intimidate', 'devastate'];
    specialAbilities: ['area_damage', 'damage_boost', 'stun', 'execution'];
    threatLevel: 'legendary';
  };

/**
 * Conditional types for ability cooldown calculations
 */
export type AbilityCooldownLogic<T extends string, Level extends number = 1> = 
  T extends 'basic_attack' ? {
    baseCooldown: 0;
    cooldownReduction: 0;
    levelScaling: false;
  } :
  T extends 'heal' ? {
    baseCooldown: Level extends 1 ? 2 : Level extends 2 ? 1 : 0;
    cooldownReduction: 'coordination_bonus';
    levelScaling: true;
  } :
  T extends 'shield' ? {
    baseCooldown: Level extends 1 ? 3 : Level extends 2 ? 2 : 1;
    cooldownReduction: 'coordination_bonus';
    levelScaling: true;
  } :
  T extends 'detect' ? {
    baseCooldown: 1;
    cooldownReduction: 'none';
    levelScaling: false;
  } : {
    baseCooldown: 1;
    cooldownReduction: 'standard';
    levelScaling: boolean;
  };

/**
 * Conditional types for threat generation
 */
export type ThreatGenerationLogic<T extends string> = 
  T extends 'attack' ? {
    baseThreat: 'high';
    threatModifiers: ['damage_dealt', 'target_priority', 'coordination_bonus'];
    decayRate: 'slow';
    maxThreat: 100;
  } :
  T extends 'heal' ? {
    baseThreat: 'medium';
    threatModifiers: ['amount_healed', 'target_priority', 'anti_detection'];
    decayRate: 'medium';
    maxThreat: 75;
  } :
  T extends 'utility' ? {
    baseThreat: 'low';
    threatModifiers: ['utility_value', 'coordination_bonus'];
    decayRate: 'fast';
    maxThreat: 50;
  } : {
    baseThreat: 'none';
    threatModifiers: never;
    decayRate: 'immediate';
    maxThreat: 0;
  };

/**
 * Conditional types for win condition checking
 */
export type WinConditionLogic<T extends 'good' | 'evil' | 'warlock'> = 
  T extends 'good' ? {
    primaryCondition: 'all_evil_eliminated';
    secondaryConditions: ['monster_defeated_with_no_evil'];
    failureConditions: ['good_minority', 'all_good_dead'];
    checkTiming: 'end_of_turn';
  } :
  T extends 'evil' ? {
    primaryCondition: 'good_minority';
    secondaryConditions: never;
    failureConditions: ['all_evil_eliminated'];
    checkTiming: 'end_of_turn';
  } :
  T extends 'warlock' ? {
    primaryCondition: 'warlock_majority';
    secondaryConditions: ['corruption_threshold_reached'];
    failureConditions: ['all_warlocks_eliminated', 'detection_threshold_reached'];
    checkTiming: 'after_corruption';
  } : never;

/**
 * Conditional types for ability validation
 */
export type AbilityValidationLogic<
  TAbility extends Ability,
  TPlayer extends Player,
  TTarget extends Player | Monster | string
> = TAbility extends { category: 'Attack' } ? {
  requiresTarget: true;
  validTargets: TTarget extends Player ? (TTarget['isAlive'] extends true ? TTarget : never) : never;
  canTargetSelf: false;
  canTargetMonster: TTarget extends Monster ? TTarget : never;
  prerequisites: ['not_stunned', 'alive'];
} : TAbility extends { category: 'Heal' } ? {
  requiresTarget: TAbility['target'] extends 'self' ? false : true;
  validTargets: TTarget extends Player ? TTarget : never;
  canTargetSelf: true;
  canTargetMonster: false;
  prerequisites: ['not_stunned', 'alive', 'target_damaged'];
} : {
  requiresTarget: boolean;
  validTargets: any;
  canTargetSelf: boolean;
  canTargetMonster: boolean;
  prerequisites: string[];
};

/**
 * Advanced utility types for complex game state transitions
 */
export type GameStateTransition<
  TCurrentState extends GamePhaseState,
  TAction extends string
> = TCurrentState extends { phase: 'lobby' } ?
  TAction extends 'start_game' ? GamePhaseState & { phase: 'setup' } : TCurrentState :
  TCurrentState extends { phase: 'setup' } ?
  TAction extends 'complete_setup' ? GamePhaseState & { phase: 'action' } : TCurrentState :
  TCurrentState extends { phase: 'action' } ?
  TAction extends 'submit_actions' ? GamePhaseState & { phase: 'results' } : TCurrentState :
  TCurrentState extends { phase: 'results' } ?
  TAction extends 'continue_game' ? GamePhaseState & { phase: 'action' } :
  TAction extends 'end_game' ? GamePhaseState & { phase: 'ended' } : TCurrentState :
  TCurrentState;

/**
 * =============================================================================
 * DISCRIMINATED UNIONS FOR GAME STATES
 * =============================================================================
 */

/**
 * Enhanced player state with discriminated union
 */
export type PlayerState = 
  | { status: 'alive'; hp: number; maxHp: number; lastDamageTime?: number; lastHealTime?: number }
  | { status: 'dead'; deathTime: number; killedBy?: string; causeOfDeath: string; canBeRevived: boolean }
  | { status: 'revived'; revivedTime: number; revivedBy: string; revivedAt: number; reviveCount: number }
  | { status: 'spectating'; leftGameTime: number; reason: 'quit' | 'kicked' | 'connection_lost' };

/**
 * Enhanced game phase with discriminated union
 */
export type GamePhaseState =
  | { phase: 'lobby'; players: string[]; readyCount: number; settings: GameRoomSettings; hostId: string }
  | { phase: 'setup'; assignments: Record<string, string>; timeRemaining: number; setupComplete: boolean; warlocksAssigned: boolean }
  | { phase: 'action'; round: number; turn: number; activePlayer?: string; timeRemaining: number; actionsSubmitted: number; totalPlayers: number }
  | { phase: 'results'; winner: 'good' | 'evil' | 'draw'; summary: string; playerStats: Record<string, any>; gameEndTime: number }
  | { phase: 'ended'; finalState: any; timestamp: number; duration: number; cleanupComplete: boolean };

/**
 * Ability execution result with enhanced typing
 */
export type AbilityResult<T = any> =
  | { success: true; data: T; logs: LogEntry[]; metadata: { executionTime: number; coordinated: boolean; targetCount: number } }
  | { success: false; error: string; code: string; logs?: LogEntry[]; metadata?: { attemptedAt: number; failureReason: string } };

/**
 * Enhanced player action states
 */
export type PlayerActionState =
  | { state: 'waiting'; timeRemaining: number; hasSubmitted: false }
  | { state: 'submitted'; submittedAt: number; action: PlayerAction; hasSubmitted: true; canModify: boolean }
  | { state: 'validated'; action: PlayerAction; validationResult: ValidationResult<any>; hasSubmitted: true }
  | { state: 'executed'; action: PlayerAction; result: AbilityResult; executedAt: number; hasSubmitted: true }
  | { state: 'skipped'; reason: 'timeout' | 'stunned' | 'dead' | 'disconnected'; skipTime: number; hasSubmitted: false };

/**
 * Monster state discriminated union
 */
export type MonsterState =
  | { state: 'spawning'; level: number; spawnTime: number; abilities: string[] }
  | { state: 'active'; level: number; hp: number; maxHp: number; age: number; lastAction?: number; isControlled: boolean; controllerId?: string }
  | { state: 'defeated'; defeatedTime: number; killedBy: string[]; finalDamage: number; age: number }
  | { state: 'evolved'; previousLevel: number; newLevel: number; evolutionTime: number; newAbilities: string[] };

/**
 * Game room states with detailed metadata
 */
export type GameRoomState =
  | { 
      state: 'created'; 
      createdAt: number; 
      hostId: string; 
      gameCode: string; 
      settings: GameRoomSettings; 
      isPrivate: boolean 
    }
  | { 
      state: 'waiting_for_players'; 
      playerCount: number; 
      minPlayers: number; 
      maxPlayers: number; 
      readyPlayers: string[]; 
      canStart: boolean 
    }
  | { 
      state: 'starting'; 
      countdown: number; 
      playersReady: number; 
      totalPlayers: number; 
      startTime?: number 
    }
  | { 
      state: 'in_progress'; 
      currentPhase: GamePhaseState; 
      round: number; 
      turn: number; 
      startedAt: number; 
      estimatedEndTime?: number 
    }
  | { 
      state: 'paused'; 
      pausedAt: number; 
      pauseReason: string; 
      pausedBy: string; 
      canResume: boolean 
    }
  | { 
      state: 'finished'; 
      winner: 'good' | 'evil' | 'draw'; 
      endedAt: number; 
      duration: number; 
      finalStats: Record<string, any> 
    }
  | { 
      state: 'terminated'; 
      terminatedAt: number; 
      reason: 'host_left' | 'all_players_left' | 'error' | 'admin_action'; 
      lastPhase?: GamePhaseState 
    };

/**
 * Ability cooldown states
 */
export type AbilityCooldownState =
  | { state: 'ready'; canUse: true; remainingCooldown: 0 }
  | { state: 'cooling_down'; canUse: false; remainingCooldown: number; totalCooldown: number; usedAt: number }
  | { state: 'locked'; canUse: false; lockReason: 'not_unlocked' | 'insufficient_level' | 'stunned' | 'disabled'; unlockCondition?: string };

/**
 * Status effect states with enhanced metadata
 */
export type StatusEffectState =
  | { 
      state: 'active'; 
      type: string; 
      remainingDuration: number; 
      totalDuration: number; 
      appliedAt: number; 
      sourceId: string; 
      params: Record<string, any>;
      stacks?: number;
      canStack: boolean;
    }
  | { 
      state: 'expired'; 
      type: string; 
      expiredAt: number; 
      totalDuration: number; 
      sourceId: string; 
      expiredNaturally: boolean;
    }
  | { 
      state: 'dispelled'; 
      type: string; 
      dispelledAt: number; 
      dispelledBy: string; 
      remainingDuration: number; 
      sourceId: string;
    }
  | { 
      state: 'replaced'; 
      type: string; 
      replacedAt: number; 
      replacedBy: string; 
      newEffectId: string; 
      sourceId: string;
    };

/**
 * Player role assignments with enhanced data
 */
export type PlayerRoleState =
  | { role: 'good'; team: 'town'; assignedAt: number; specialRole?: string; hasWon: boolean }
  | { role: 'evil'; team: 'mafia'; assignedAt: number; specialRole?: string; hasWon: boolean; corrupted?: boolean; corruptedAt?: number }
  | { role: 'warlock'; team: 'warlock'; assignedAt: number; isInitialWarlock: boolean; hasWon: boolean; corruptionCount: number; detectionCount: number }
  | { role: 'neutral'; team: 'neutral'; assignedAt: number; specialRole: string; hasWon: boolean; winCondition: string };

/**
 * Combat interaction results
 */
export type CombatResult =
  | { 
      type: 'damage_dealt'; 
      attacker: string; 
      target: string; 
      damage: number; 
      damageType: 'physical' | 'magical' | 'true'; 
      wasCritical: boolean; 
      wasBlocked: boolean;
      modifiers: DamageModifier[];
    }
  | { 
      type: 'healing_applied'; 
      healer: string; 
      target: string; 
      amount: number; 
      healType: 'ability' | 'effect' | 'item' | 'regeneration'; 
      wasCoordinated: boolean;
      modifiers: HealingModifier[];
    }
  | { 
      type: 'effect_applied'; 
      source: string; 
      target: string; 
      effectType: string; 
      duration: number; 
      wasResisted: boolean; 
      stacks?: number;
    }
  | { 
      type: 'ability_failed'; 
      user: string; 
      abilityId: string; 
      target?: string; 
      failureReason: string; 
      errorCode?: string;
    };

/**
 * Connection and network states
 */
export type PlayerConnectionState =
  | { state: 'connected'; connectedAt: number; isStable: true; lastHeartbeat: number }
  | { state: 'unstable'; connectionIssues: number; lastStableAt: number; isStable: false; retryCount: number }
  | { state: 'disconnected'; disconnectedAt: number; reason: 'network' | 'client_closed' | 'timeout' | 'kicked'; canReconnect: boolean }
  | { state: 'reconnecting'; attemptCount: number; lastAttemptAt: number; maxAttempts: number; originalDisconnectTime: number };

/**
 * Turn timer states
 */
export type TurnTimerState =
  | { state: 'running'; startedAt: number; duration: number; remainingTime: number; canExtend: boolean }
  | { state: 'paused'; pausedAt: number; remainingTime: number; pauseReason: string }
  | { state: 'expired'; expiredAt: number; duration: number; autoAdvanced: boolean }
  | { state: 'extended'; originalDuration: number; extensionTime: number; extendedBy: string; newEndTime: number };

/**
 * Coordination bonus states
 */
export type CoordinationState =
  | { state: 'none'; canCoordinate: boolean; eligiblePartners: string[] }
  | { state: 'coordinating'; partnerId: string; initiatedAt: number; confirmed: boolean; bonusType: 'damage' | 'healing' | 'defense' | 'utility' }
  | { state: 'coordinated'; partnerId: string; bonusType: 'damage' | 'healing' | 'defense' | 'utility'; bonusAmount: number; confirmedAt: number }
  | { state: 'failed'; attemptedPartnerId: string; failureReason: string; failedAt: number; canRetry: boolean };

/**
 * Event payload types with enhanced discrimination
 */
export type GameEventPayload<T extends string> = 
  T extends 'damage.applied' ? DamageAppliedPayload :
  T extends 'player.healed' ? PlayerHealedPayload :
  T extends 'ability.used' ? AbilityUsedPayload :
  T extends 'player.died' ? PlayerDiedPayload :
  T extends 'game.phase.changed' ? PhaseChangedPayload :
  T extends 'coordination.activated' ? CoordinationActivatedPayload :
  T extends 'status.effect.applied' ? StatusEffectAppliedPayload :
  never;

/**
 * =============================================================================
 * ENHANCED EVENT PAYLOAD INTERFACES
 * =============================================================================
 */

export interface DamageAppliedPayload {
  targetId: string;
  sourceId: string;
  damage: number;
  damageType: 'physical' | 'magical' | 'true';
  wasCritical: boolean;
  wasBlocked: boolean;
  modifiers: DamageModifier[];
  timestamp: number;
}

export interface PlayerHealedPayload {
  targetId: string;
  sourceId: string;
  amount: number;
  healType: 'ability' | 'effect' | 'item' | 'regeneration';
  wasCoordinated: boolean;
  modifiers: HealingModifier[];
  timestamp: number;
}

export interface AbilityUsedPayload {
  playerId: string;
  abilityId: string;
  targetId?: string;
  success: boolean;
  coordinationBonus?: number;
  cooldownApplied: number;
  resourceCost?: number;
  timestamp: number;
}

export interface PlayerDiedPayload {
  playerId: string;
  killedBy?: string;
  causeOfDeath: string;
  finalDamage: number;
  wasRevivable: boolean;
  itemsDropped?: string[];
  timestamp: number;
}

export interface PhaseChangedPayload {
  previousPhase: string;
  newPhase: string;
  reason: 'timeout' | 'trigger' | 'manual' | 'automatic';
  playersReady: number;
  totalPlayers: number;
  timestamp: number;
}

export interface CoordinationActivatedPayload {
  playerId: string;
  coordinatedWith: string[];
  bonusType: 'damage' | 'healing' | 'defense' | 'utility';
  bonusAmount: number;
  timestamp: number;
}

export interface StatusEffectAppliedPayload {
  targetId: string;
  sourceId: string;
  effectType: string;
  duration: number;
  stacks?: number;
  wasResisted: boolean;
  timestamp: number;
}

/**
 * =============================================================================
 * DAMAGE AND HEALING MODIFIER TYPES
 * =============================================================================
 */

export interface DamageModifier {
  name: string;
  type: 'multiply' | 'add' | 'subtract' | 'divide';
  value: number;
  source: 'ability' | 'item' | 'status' | 'racial' | 'coordination' | 'comeback';
  description?: string;
}

export interface HealingModifier {
  name: string;
  type: 'multiply' | 'add' | 'subtract' | 'divide';
  value: number;
  source: 'ability' | 'item' | 'status' | 'racial' | 'coordination';
  description?: string;
}

/**
 * =============================================================================
 * LOG ENTRY ENHANCED TYPE
 * =============================================================================
 */

export interface LogEntry {
  type: string;
  public: boolean;
  attackerId?: string;
  targetId?: string;
  message: string;
  privateMessage?: string;
  attackerMessage?: string;
  timestamp?: number;
  metadata?: {
    damage?: number;
    healing?: number;
    duration?: number;
    coordinated?: boolean;
    critical?: boolean;
  };
}

/**
 * =============================================================================
 * ADVANCED GENERIC HELPERS
 * =============================================================================
 */

/**
 * State machine interface with enhanced typing
 */
export interface StateMachine<State extends string, Event extends string, Context = any> {
  currentState: State;
  context: Context;
  transition(event: Event, payload?: any): State | null;
  canTransition(from: State, to: State): boolean;
  getValidTransitions(state: State): Event[];
  onEnter?(state: State, context: Context): void;
  onExit?(state: State, context: Context): void;
}

/**
 * Repository interface with enhanced operations
 */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  findWhere(criteria: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T | null>;
  upsert(data: T): Promise<T>;
  delete(id: ID): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * =============================================================================
 * BUILDER PATTERN TYPES
 * =============================================================================
 */

/**
 * Generic builder interface
 */
export interface Builder<T> {
  build(): T;
  reset(): this;
  validate(): ValidationResult<T>;
}

/**
 * Fluent builder with method chaining
 */
export type FluentBuilder<T, K extends keyof T = keyof T> = {
  [P in K]: (value: T[P]) => FluentBuilder<T, K>;
} & Builder<T>;

/**
 * Create a fluent builder type with setters
 */
export type CreateBuilder<T> = FluentBuilder<T> & {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => CreateBuilder<T>;
} & {
  [K in keyof T as `with${Capitalize<string & K>}`]: (value: T[K]) => CreateBuilder<T>;
};

/**
 * =============================================================================
 * PERFORMANCE OPTIMIZATION TYPES
 * =============================================================================
 */

/**
 * Lazy loading wrapper with metadata
 */
export interface Lazy<T> {
  (): T;
  isLoaded: boolean;
  clear(): void;
  peek(): T | undefined;
}

/**
 * Enhanced memoized function type
 */
export interface Memoized<T extends (...args: any[]) => any> extends T {
  cache: Map<string, { value: ReturnType<T>; timestamp: number }>;
  clear(): void;
  delete(key: string): boolean;
  size(): number;
  stats(): { hits: number; misses: number; hitRate: number };
}

/**
 * Enhanced debounced function type
 */
export interface Debounced<T extends (...args: any[]) => any> extends T {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
  remainingTime(): number;
}

/**
 * Enhanced throttled function type
 */
export interface Throttled<T extends (...args: any[]) => any> extends T {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  isThrottled(): boolean;
  remainingTime(): number;
}

/**
 * =============================================================================
 * STRICT TYPE GUARDS WITH RUNTIME VALIDATION
 * =============================================================================
 */

/**
 * Enhanced type guards with comprehensive runtime validation
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

export function isStringWithMinLength(minLength: number) {
  return (value: unknown): value is string => {
    return isString(value) && value.length >= minLength;
  };
}

export function isStringWithMaxLength(maxLength: number) {
  return (value: unknown): value is string => {
    return isString(value) && value.length <= maxLength;
  };
}

export function isStringMatching(pattern: RegExp) {
  return (value: unknown): value is string => {
    return isString(value) && pattern.test(value);
  };
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

export function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

export function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

export function isNumberInRange(min: number, max: number) {
  return (value: unknown): value is number => {
    return isNumber(value) && value >= min && value <= max;
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
  return isArray(value) && value.length > 0;
}

export function isArrayOf<T>(guard: TypeGuard<T>) {
  return (value: unknown): value is T[] => {
    return isArray(value) && value.every(guard);
  };
}

export function isArrayWithLength(length: number) {
  return <T>(value: unknown): value is T[] => {
    return isArray(value) && value.length === length;
  };
}

export function isArrayWithMinLength(minLength: number) {
  return <T>(value: unknown): value is T[] => {
    return isArray(value) && value.length >= minLength;
  };
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (isObject(value) && isFunction((value as any).then));
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isValidDate(value: unknown): value is Date {
  return isDate(value) && value.getFullYear() > 1900 && value.getFullYear() < 3000;
}

export function isValidationSuccess<T>(result: ValidationResult<T>): result is ValidationSuccess<T> {
  return isObject(result) && result.success === true && isDefined((result as any).data);
}

export function isValidationError(result: ValidationResult<any>): result is ValidationError {
  return isObject(result) && result.success === false && isArray((result as any).errors);
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return isObject(response) && response.status === 'success' && isDefined((response as any).data);
}

export function isApiError(response: ApiResponse<any>): response is ApiError {
  return isObject(response) && response.status === 'error' && isString((response as any).message);
}

/**
 * =============================================================================
 * GAME-SPECIFIC TYPE GUARDS WITH VALIDATION
 * =============================================================================
 */

/**
 * Player type guards with comprehensive validation
 */
export function isPlayer(value: unknown): value is Player {
  if (!isObject(value)) return false;
  
  const obj = value as any;
  return (
    isNonEmptyString(obj.id) &&
    isNonEmptyString(obj.name) &&
    isNonNegativeInteger(obj.health) &&
    isPositiveInteger(obj.maxHealth) &&
    isString(obj.class) &&
    isString(obj.race) &&
    isString(obj.role) &&
    isString(obj.status) &&
    isBoolean(obj.isAlive) &&
    isObject(obj.stats) &&
    isArray(obj.abilities) &&
    isArray(obj.statusEffects)
  );
}

export function isAlivePlayer(value: unknown): value is AlivePlayer {
  return isPlayer(value) && value.status === 'alive' && value.isAlive && value.health > 0;
}

export function isWarlockPlayer(value: unknown): value is WarlockPlayer {
  return isPlayer(value) && value.role === 'Warlock';
}

export function isPlayerWithClass(playerClass: string) {
  return (value: unknown): value is Player => {
    return isPlayer(value) && value.class === playerClass;
  };
}

export function isPlayerWithRace(race: string) {
  return (value: unknown): value is Player => {
    return isPlayer(value) && value.race === race;
  };
}

/**
 * Ability type guards with validation
 */
export function isAbility(value: unknown): value is Ability {
  if (!isObject(value)) return false;
  
  const obj = value as any;
  return (
    isNonEmptyString(obj.id) &&
    isNonEmptyString(obj.name) &&
    isString(obj.type) &&
    isString(obj.category) &&
    isString(obj.target) &&
    isNonNegativeInteger(obj.cooldown) &&
    isNonNegativeInteger(obj.currentCooldown) &&
    isBoolean(obj.unlocked)
  );
}

export function isUnlockedAbility(value: unknown): value is UnlockedAbility {
  return isAbility(value) && value.unlocked === true;
}

export function isTargetedAbility(value: unknown): value is TargetedAbility {
  return isAbility(value) && value.target !== 'none' && value.target !== 'self';
}

export function isAbilityWithCooldown(value: unknown): value is CooldownAbility {
  return isAbility(value) && value.currentCooldown > 0;
}

/**
 * Monster type guards with validation
 */
export function isMonster(value: unknown): value is Monster {
  if (!isObject(value)) return false;
  
  const obj = value as any;
  return (
    isNonEmptyString(obj.id) &&
    isNonEmptyString(obj.name) &&
    isNonNegativeInteger(obj.health) &&
    isPositiveInteger(obj.maxHealth) &&
    isPositiveInteger(obj.level) &&
    isBoolean(obj.isAlive) &&
    isArray(obj.abilities)
  );
}

export function isAliveMonster(value: unknown): value is Monster & { isAlive: true } {
  return isMonster(value) && value.isAlive && value.health > 0;
}

/**
 * Game state type guards with validation
 */
export function isGameRoom(value: unknown): value is GameRoom {
  if (!isObject(value)) return false;
  
  const obj = value as any;
  return (
    isNonEmptyString(obj.id) &&
    isNonEmptyString(obj.gameCode) &&
    isString(obj.phase) &&
    isArray(obj.players) &&
    isObject(obj.rules) &&
    isBoolean(obj.isActive)
  );
}

export function isGameInPhase(phase: GamePhase) {
  return (value: unknown): value is GameRoom => {
    return isGameRoom(value) && value.phase === phase;
  };
}

/**
 * Status effect type guards with validation
 */
export function isStatusEffect(value: unknown): value is StatusEffect {
  if (!isObject(value)) return false;
  
  const obj = value as any;
  return (
    isNonEmptyString(obj.type) &&
    isInteger(obj.duration) &&
    isObject(obj.params) &&
    isString(obj.source)
  );
}

export function isActiveStatusEffect(value: unknown): value is ActiveStatusEffect {
  return isStatusEffect(value) && value.remainingDuration > 0;
}

export function isPermanentStatusEffect(value: unknown): value is PermanentStatusEffect {
  return isStatusEffect(value) && value.duration === -1;
}

export function isStackableStatusEffect(value: unknown): value is StackableStatusEffect {
  return isStatusEffect(value) && 
         (value as any).stackable === true && 
         isPositiveInteger((value as any).stacks);
}

/**
 * Event type guards with validation
 */
export function isGameEvent(value: unknown): value is GameEvent {
  if (!isObject(value)) return false;
  
  const obj = value as any;
  return (
    isNonEmptyString(obj.type) &&
    isObject(obj.payload) &&
    isString(obj.timestamp)
  );
}

export function isGameEventOfType<T extends EventType>(eventType: T) {
  return (value: unknown): value is Extract<GameEvent, { type: T }> => {
    return isGameEvent(value) && value.type === eventType;
  };
}

/**
 * Brand type validators with enhanced validation
 */
export function isPlayerId(value: unknown): value is PlayerId {
  return isNonEmptyString(value) && value.length > 0;
}

export function isGameCode(value: unknown): value is GameCode {
  return isString(value) && /^[A-Z0-9]{6}$/.test(value);
}

export function isAbilityId(value: unknown): value is AbilityId {
  return isNonEmptyString(value);
}

export function isMonsterId(value: unknown): value is MonsterId {
  return isNonEmptyString(value);
}

/**
 * =============================================================================
 * DISCRIMINATED UNION TYPE GUARDS
 * =============================================================================
 */

/**
 * Type guards for discriminated union states
 */
export function isPlayerState(value: unknown): value is PlayerState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.status) {
    case 'alive':
      return isNumber(obj.hp) && isNumber(obj.maxHp);
    case 'dead':
      return isNumber(obj.deathTime) && isString(obj.causeOfDeath) && isBoolean(obj.canBeRevived);
    case 'revived':
      return isNumber(obj.revivedTime) && isString(obj.revivedBy) && isNumber(obj.revivedAt) && isNumber(obj.reviveCount);
    case 'spectating':
      return isNumber(obj.leftGameTime) && ['quit', 'kicked', 'connection_lost'].includes(obj.reason);
    default:
      return false;
  }
}

export function isGamePhaseState(value: unknown): value is GamePhaseState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.phase) {
    case 'lobby':
      return isArray(obj.players) && isNumber(obj.readyCount) && isObject(obj.settings) && isString(obj.hostId);
    case 'setup':
      return isObject(obj.assignments) && isNumber(obj.timeRemaining) && isBoolean(obj.setupComplete) && isBoolean(obj.warlocksAssigned);
    case 'action':
      return isNumber(obj.round) && isNumber(obj.turn) && isNumber(obj.timeRemaining) && isNumber(obj.actionsSubmitted) && isNumber(obj.totalPlayers);
    case 'results':
      return ['good', 'evil', 'draw'].includes(obj.winner) && isString(obj.summary) && isObject(obj.playerStats) && isNumber(obj.gameEndTime);
    case 'ended':
      return isNumber(obj.timestamp) && isNumber(obj.duration) && isBoolean(obj.cleanupComplete);
    default:
      return false;
  }
}

export function isPlayerActionState(value: unknown): value is PlayerActionState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'waiting':
      return isNumber(obj.timeRemaining) && obj.hasSubmitted === false;
    case 'submitted':
      return isNumber(obj.submittedAt) && isObject(obj.action) && obj.hasSubmitted === true && isBoolean(obj.canModify);
    case 'validated':
      return isObject(obj.action) && isObject(obj.validationResult) && obj.hasSubmitted === true;
    case 'executed':
      return isObject(obj.action) && isObject(obj.result) && isNumber(obj.executedAt) && obj.hasSubmitted === true;
    case 'skipped':
      return ['timeout', 'stunned', 'dead', 'disconnected'].includes(obj.reason) && isNumber(obj.skipTime) && obj.hasSubmitted === false;
    default:
      return false;
  }
}

export function isMonsterState(value: unknown): value is MonsterState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'spawning':
      return isNumber(obj.level) && isNumber(obj.spawnTime) && isArray(obj.abilities);
    case 'active':
      return isNumber(obj.level) && isNumber(obj.hp) && isNumber(obj.maxHp) && isNumber(obj.age) && isBoolean(obj.isControlled);
    case 'defeated':
      return isNumber(obj.defeatedTime) && isArray(obj.killedBy) && isNumber(obj.finalDamage) && isNumber(obj.age);
    case 'evolved':
      return isNumber(obj.previousLevel) && isNumber(obj.newLevel) && isNumber(obj.evolutionTime) && isArray(obj.newAbilities);
    default:
      return false;
  }
}

export function isGameRoomState(value: unknown): value is GameRoomState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'created':
      return isNumber(obj.createdAt) && isString(obj.hostId) && isString(obj.gameCode) && isObject(obj.settings) && isBoolean(obj.isPrivate);
    case 'waiting_for_players':
      return isNumber(obj.playerCount) && isNumber(obj.minPlayers) && isNumber(obj.maxPlayers) && isArray(obj.readyPlayers) && isBoolean(obj.canStart);
    case 'starting':
      return isNumber(obj.countdown) && isNumber(obj.playersReady) && isNumber(obj.totalPlayers);
    case 'in_progress':
      return isObject(obj.currentPhase) && isNumber(obj.round) && isNumber(obj.turn) && isNumber(obj.startedAt);
    case 'paused':
      return isNumber(obj.pausedAt) && isString(obj.pauseReason) && isString(obj.pausedBy) && isBoolean(obj.canResume);
    case 'finished':
      return ['good', 'evil', 'draw'].includes(obj.winner) && isNumber(obj.endedAt) && isNumber(obj.duration) && isObject(obj.finalStats);
    case 'terminated':
      return isNumber(obj.terminatedAt) && ['host_left', 'all_players_left', 'error', 'admin_action'].includes(obj.reason);
    default:
      return false;
  }
}

export function isAbilityCooldownState(value: unknown): value is AbilityCooldownState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'ready':
      return obj.canUse === true && obj.remainingCooldown === 0;
    case 'cooling_down':
      return obj.canUse === false && isNumber(obj.remainingCooldown) && isNumber(obj.totalCooldown) && isNumber(obj.usedAt);
    case 'locked':
      return obj.canUse === false && ['not_unlocked', 'insufficient_level', 'stunned', 'disabled'].includes(obj.lockReason);
    default:
      return false;
  }
}

export function isStatusEffectState(value: unknown): value is StatusEffectState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'active':
      return isString(obj.type) && isNumber(obj.remainingDuration) && isNumber(obj.totalDuration) && isNumber(obj.appliedAt) && isString(obj.sourceId) && isObject(obj.params) && isBoolean(obj.canStack);
    case 'expired':
      return isString(obj.type) && isNumber(obj.expiredAt) && isNumber(obj.totalDuration) && isString(obj.sourceId) && isBoolean(obj.expiredNaturally);
    case 'dispelled':
      return isString(obj.type) && isNumber(obj.dispelledAt) && isString(obj.dispelledBy) && isNumber(obj.remainingDuration) && isString(obj.sourceId);
    case 'replaced':
      return isString(obj.type) && isNumber(obj.replacedAt) && isString(obj.replacedBy) && isString(obj.newEffectId) && isString(obj.sourceId);
    default:
      return false;
  }
}

export function isPlayerRoleState(value: unknown): value is PlayerRoleState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.role) {
    case 'good':
      return obj.team === 'town' && isNumber(obj.assignedAt) && isBoolean(obj.hasWon);
    case 'evil':
      return obj.team === 'mafia' && isNumber(obj.assignedAt) && isBoolean(obj.hasWon);
    case 'warlock':
      return obj.team === 'warlock' && isNumber(obj.assignedAt) && isBoolean(obj.isInitialWarlock) && isBoolean(obj.hasWon) && isNumber(obj.corruptionCount) && isNumber(obj.detectionCount);
    case 'neutral':
      return obj.team === 'neutral' && isNumber(obj.assignedAt) && isString(obj.specialRole) && isBoolean(obj.hasWon) && isString(obj.winCondition);
    default:
      return false;
  }
}

export function isCombatResult(value: unknown): value is CombatResult {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.type) {
    case 'damage_dealt':
      return isString(obj.attacker) && isString(obj.target) && isNumber(obj.damage) && ['physical', 'magical', 'true'].includes(obj.damageType) && isBoolean(obj.wasCritical) && isBoolean(obj.wasBlocked) && isArray(obj.modifiers);
    case 'healing_applied':
      return isString(obj.healer) && isString(obj.target) && isNumber(obj.amount) && ['ability', 'effect', 'item', 'regeneration'].includes(obj.healType) && isBoolean(obj.wasCoordinated) && isArray(obj.modifiers);
    case 'effect_applied':
      return isString(obj.source) && isString(obj.target) && isString(obj.effectType) && isNumber(obj.duration) && isBoolean(obj.wasResisted);
    case 'ability_failed':
      return isString(obj.user) && isString(obj.abilityId) && isString(obj.failureReason);
    default:
      return false;
  }
}

export function isPlayerConnectionState(value: unknown): value is PlayerConnectionState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'connected':
      return isNumber(obj.connectedAt) && obj.isStable === true && isNumber(obj.lastHeartbeat);
    case 'unstable':
      return isNumber(obj.connectionIssues) && isNumber(obj.lastStableAt) && obj.isStable === false && isNumber(obj.retryCount);
    case 'disconnected':
      return isNumber(obj.disconnectedAt) && ['network', 'client_closed', 'timeout', 'kicked'].includes(obj.reason) && isBoolean(obj.canReconnect);
    case 'reconnecting':
      return isNumber(obj.attemptCount) && isNumber(obj.lastAttemptAt) && isNumber(obj.maxAttempts) && isNumber(obj.originalDisconnectTime);
    default:
      return false;
  }
}

export function isTurnTimerState(value: unknown): value is TurnTimerState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'running':
      return isNumber(obj.startedAt) && isNumber(obj.duration) && isNumber(obj.remainingTime) && isBoolean(obj.canExtend);
    case 'paused':
      return isNumber(obj.pausedAt) && isNumber(obj.remainingTime) && isString(obj.pauseReason);
    case 'expired':
      return isNumber(obj.expiredAt) && isNumber(obj.duration) && isBoolean(obj.autoAdvanced);
    case 'extended':
      return isNumber(obj.originalDuration) && isNumber(obj.extensionTime) && isString(obj.extendedBy) && isNumber(obj.newEndTime);
    default:
      return false;
  }
}

export function isCoordinationState(value: unknown): value is CoordinationState {
  if (!isObject(value)) return false;
  const obj = value as any;
  
  switch (obj.state) {
    case 'none':
      return isBoolean(obj.canCoordinate) && isArray(obj.eligiblePartners);
    case 'coordinating':
      return isString(obj.partnerId) && isNumber(obj.initiatedAt) && isBoolean(obj.confirmed) && ['damage', 'healing', 'defense', 'utility'].includes(obj.bonusType);
    case 'coordinated':
      return isString(obj.partnerId) && ['damage', 'healing', 'defense', 'utility'].includes(obj.bonusType) && isNumber(obj.bonusAmount) && isNumber(obj.confirmedAt);
    case 'failed':
      return isString(obj.attemptedPartnerId) && isString(obj.failureReason) && isNumber(obj.failedAt) && isBoolean(obj.canRetry);
    default:
      return false;
  }
}

/**
 * =============================================================================
 * RUNTIME VALIDATION BUILDERS AND ASSERTIONS
 * =============================================================================
 */

/**
 * Creates a validation function that checks multiple conditions
 */
export function createValidator<T>(...guards: TypeGuard<any>[]) {
  return (value: unknown): value is T => {
    return guards.every(guard => guard(value));
  };
}

/**
 * Creates a validation function that checks at least one condition
 */
export function createUnionValidator<T>(...guards: TypeGuard<any>[]) {
  return (value: unknown): value is T => {
    return guards.some(guard => guard(value));
  };
}

/**
 * Creates a validation function for object properties
 */
export function createObjectValidator<T extends Record<string, any>>(
  propertyValidators: { [K in keyof T]: TypeGuard<T[K]> }
) {
  return (value: unknown): value is T => {
    if (!isObject(value)) return false;
    
    const obj = value as any;
    return Object.entries(propertyValidators).every(([key, validator]) => {
      return validator(obj[key]);
    });
  };
}

/**
 * Assertion functions that throw errors for invalid types
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message || 'Value must be defined');
  }
}

export function assertString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || 'Value must be a string');
  }
}

export function assertNonEmptyString(value: unknown, message?: string): asserts value is string {
  if (!isNonEmptyString(value)) {
    throw new Error(message || 'Value must be a non-empty string');
  }
}

export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || 'Value must be a valid number');
  }
}

export function assertPositiveNumber(value: unknown, message?: string): asserts value is number {
  if (!isPositiveNumber(value)) {
    throw new Error(message || 'Value must be a positive number');
  }
}

export function assertInteger(value: unknown, message?: string): asserts value is number {
  if (!isInteger(value)) {
    throw new Error(message || 'Value must be an integer');
  }
}

export function assertBoolean(value: unknown, message?: string): asserts value is boolean {
  if (!isBoolean(value)) {
    throw new Error(message || 'Value must be a boolean');
  }
}

export function assertObject(value: unknown, message?: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message || 'Value must be an object');
  }
}

export function assertArray<T>(value: unknown, message?: string): asserts value is T[] {
  if (!isArray(value)) {
    throw new Error(message || 'Value must be an array');
  }
}

export function assertPlayer(value: unknown, message?: string): asserts value is Player {
  if (!isPlayer(value)) {
    throw new Error(message || 'Value must be a valid Player object');
  }
}

export function assertAlivePlayer(value: unknown, message?: string): asserts value is AlivePlayer {
  if (!isAlivePlayer(value)) {
    throw new Error(message || 'Value must be an alive Player object');
  }
}

export function assertAbility(value: unknown, message?: string): asserts value is Ability {
  if (!isAbility(value)) {
    throw new Error(message || 'Value must be a valid Ability object');
  }
}

export function assertMonster(value: unknown, message?: string): asserts value is Monster {
  if (!isMonster(value)) {
    throw new Error(message || 'Value must be a valid Monster object');
  }
}

export function assertGameRoom(value: unknown, message?: string): asserts value is GameRoom {
  if (!isGameRoom(value)) {
    throw new Error(message || 'Value must be a valid GameRoom object');
  }
}

/**
 * Safe parsing functions that return validation results
 */
export function safeParsePlayer(value: unknown): ValidationResult<Player> {
  if (isPlayer(value)) {
    return { success: true, data: value };
  }
  return { success: false, errors: ['Invalid Player object'] };
}

export function safeParseAbility(value: unknown): ValidationResult<Ability> {
  if (isAbility(value)) {
    return { success: true, data: value };
  }
  return { success: false, errors: ['Invalid Ability object'] };
}

export function safeParseMonster(value: unknown): ValidationResult<Monster> {
  if (isMonster(value)) {
    return { success: true, data: value };
  }
  return { success: false, errors: ['Invalid Monster object'] };
}

export function safeParseGameRoom(value: unknown): ValidationResult<GameRoom> {
  if (isGameRoom(value)) {
    return { success: true, data: value };
  }
  return { success: false, errors: ['Invalid GameRoom object'] };
}

/**
 * Validation error collection helper
 */
export function collectValidationErrors<T>(
  value: unknown,
  validators: Array<{ name: string; guard: TypeGuard<any> }>
): ValidationResult<T> {
  const errors: string[] = [];
  
  for (const { name, guard } of validators) {
    if (!guard(value)) {
      errors.push(`Failed validation: ${name}`);
    }
  }
  
  if (errors.length === 0) {
    return { success: true, data: value as T };
  }
  
  return { success: false, errors };
}

/**
 * Enhanced brand type creators with validation
 */
export function createPlayerId(id: string): PlayerId {
  if (!isString(id) || id.length === 0) {
    throw new Error('PlayerId must be a non-empty string');
  }
  return id as PlayerId;
}

export function createGameCode(code: string): GameCode {
  if (!isString(code) || !/^[A-Z0-9]{6}$/.test(code)) {
    throw new Error('GameCode must be a 6-character alphanumeric string');
  }
  return code as GameCode;
}

export function createAbilityId(id: string): AbilityId {
  if (!isString(id) || id.length === 0) {
    throw new Error('AbilityId must be a non-empty string');
  }
  return id as AbilityId;
}

export function createMonsterId(id: string): MonsterId {
  if (!isString(id) || id.length === 0) {
    throw new Error('MonsterId must be a non-empty string');
  }
  return id as MonsterId;
}

/**
 * =============================================================================
 * ENHANCED NAMESPACE UTILITIES
 * =============================================================================
 */

export const TypeUtils = {
  // Basic type guards
  isDefined,
  isString,
  isNonEmptyString,
  isStringWithMinLength,
  isStringWithMaxLength,
  isStringMatching,
  isNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  isPositiveInteger,
  isNonNegativeInteger,
  isNumberInRange,
  isBoolean,
  isObject,
  isObjectWithKeys,
  isArray,
  isNonEmptyArray,
  isArrayOf,
  isArrayWithLength,
  isArrayWithMinLength,
  isFunction,
  isPromise,
  isDate,
  isValidDate,
  
  // Validation helpers
  isValidationSuccess,
  isValidationError,
  isApiSuccess,
  isApiError,
  
  // Game-specific type guards
  isPlayer,
  isAlivePlayer,
  isWarlockPlayer,
  isPlayerWithClass,
  isPlayerWithRace,
  isAbility,
  isUnlockedAbility,
  isTargetedAbility,
  isAbilityWithCooldown,
  isMonster,
  isAliveMonster,
  isGameRoom,
  isGameInPhase,
  isStatusEffect,
  isActiveStatusEffect,
  isPermanentStatusEffect,
  isStackableStatusEffect,
  isGameEvent,
  isGameEventOfType,
  
  // Discriminated union type guards
  isPlayerState,
  isGamePhaseState,
  isPlayerActionState,
  isMonsterState,
  isGameRoomState,
  isAbilityCooldownState,
  isStatusEffectState,
  isPlayerRoleState,
  isCombatResult,
  isPlayerConnectionState,
  isTurnTimerState,
  isCoordinationState,
  
  // Brand type validators
  isPlayerId,
  isGameCode,
  isAbilityId,
  isMonsterId,
  
  // Brand type creators
  createPlayerId,
  createGameCode,
  createAbilityId,
  createMonsterId,
  
  // Validation builders
  createValidator,
  createUnionValidator,
  createObjectValidator,
  
  // Assertion functions
  assertDefined,
  assertString,
  assertNonEmptyString,
  assertNumber,
  assertPositiveNumber,
  assertInteger,
  assertBoolean,
  assertObject,
  assertArray,
  assertPlayer,
  assertAlivePlayer,
  assertAbility,
  assertMonster,
  assertGameRoom,
  
  // Safe parsing functions
  safeParsePlayer,
  safeParseAbility,
  safeParseMonster,
  safeParseGameRoom,
  collectValidationErrors,
  
  // Utility functions
  exhaustiveCheck: (value: never): never => {
    throw new Error(`Unhandled case: ${value}`);
  },
  
  // Performance helpers
  createLazy: <T>(factory: () => T): Lazy<T> => {
    let value: T;
    let loaded = false;
    
    const lazy = () => {
      if (!loaded) {
        value = factory();
        loaded = true;
      }
      return value;
    };
    
    lazy.isLoaded = loaded;
    lazy.clear = () => {
      loaded = false;
      value = undefined as any;
    };
    lazy.peek = () => loaded ? value : undefined;
    
    return lazy;
  },
  
  // Object utilities
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => TypeUtils.deepClone(item)) as any;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = TypeUtils.deepClone(obj[key]);
      }
    }
    return cloned;
  },
  
  // Validation utilities
  createValidationSuccess: <T>(data: T): ValidationSuccess<T> => ({
    success: true,
    data
  }),
  
  createValidationError: (errors: string[]): ValidationError => ({
    success: false,
    errors
  }),
  
  createApiSuccess: <T>(data: T): ApiSuccess<T> => ({
    status: 'success',
    data,
    timestamp: new Date().toISOString()
  }),
  
  createApiError: (message: string, code?: string, details?: unknown): ApiError => ({
    status: 'error',
    message,
    code,
    details,
    timestamp: new Date().toISOString()
  })
};