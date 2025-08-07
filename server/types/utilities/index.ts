/**
 * @fileoverview Main utilities export file
 * Re-exports all utility types and functions from focused modules
 */

// Core type utilities
export type {
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  OptionalFields,
  RequiredFields,
  StringKeys,
  NumberKeys,
  BooleanKeys,
  FunctionKeys,
  StrictOmit,
  StrictPick,
  Mutable,
  Immutable,
  UnwrapPromise,
  UnwrapArray,
  AsyncFunction,
  SyncFunction,
  Predicate,
  Mapper,
  Reducer,
  NonNullableFields,
  NullableFields,
  Merge,
  XOR,
  TypeGuard,
  Constructor,
  Entries,
  Values,
  Exhaustive,
  DiscriminateUnion,
  ConstructorParameters,
  InstanceType,
  Parameters,
  ReturnType,
  AsyncReturnType,
  PartialBy,
  RequiredBy,
  WithDefaults,
  RemoveIndex,
  KeysOfType,
  OptionalMethods,
  RequiredMethods
} from './core-types.js';

// Brand types
export type {
  Brand,
  PlayerId,
  GameCode,
  AbilityId,
  MonsterId,
  Singleton
} from './brand-types.js';

export {
  isPlayerId,
  isGameCode,
  isAbilityId,
  isMonsterId,
  createPlayerId,
  createGameCode,
  createAbilityId,
  createMonsterId
} from './brand-types.js';

// Validation types
export type {
  ValidationSuccess,
  ValidationError,
  ValidationResult,
  ApiSuccess,
  ApiError,
  ApiResponse,
  JSONValue,
  JSONObject,
  JSONArray,
  Serializable
} from './validation-types.js';

export {
  isValidationSuccess,
  isValidationError,
  isApiSuccess,
  isApiError,
  collectValidationErrors
} from './validation-types.js';

// Type guards
export {
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
  createValidator,
  createUnionValidator,
  createObjectValidator,
  safeParsePlayer,
  safeParseAbility,
  safeParseMonster,
  safeParseGameRoom
} from './type-guards.js';

export type {
  AlivePlayer,
  WarlockPlayer,
  UnlockedAbility,
  CooldownAbility,
  TargetedAbility,
  ActiveStatusEffect,
  PermanentStatusEffect,
  StackableStatusEffect
} from './type-guards.js';

// Assertions
export {
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
  createAssertion,
  exhaustiveCheck
} from './assertions.js';

// Game state types
export type {
  GameRoomSettings,
  PlayerState,
  GamePhaseState,
  LogEntry,
  DamageModifier,
  HealingModifier,
  AbilityResult,
  PlayerActionState,
  MonsterState,
  GameRoomState,
  AbilityCooldownState,
  StatusEffectState,
  PlayerRoleState,
  CombatResult,
  PlayerConnectionState,
  TurnTimerState,
  CoordinationState,
  GameStateTransition
} from './game-state-types.js';

// Game state guards
export {
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
  isCoordinationState
} from './game-state-guards.js';

// Event types
export type {
  EventMap,
  EventHandler,
  TypedEventEmitter,
  GameEventPayload,
  DamageAppliedPayload,
  PlayerHealedPayload,
  AbilityUsedPayload,
  PlayerDiedPayload,
  PhaseChangedPayload,
  CoordinationActivatedPayload,
  StatusEffectAppliedPayload
} from './event-types.js';

// Performance types
export type {
  Lazy,
  Memoized,
  Debounced,
  Throttled,
  Repository,
  QueryOptions,
  PaginatedResult,
  Builder,
  FluentBuilder,
  CreateBuilder,
  StateMachine,
  PerformanceUtils
} from './performance-types.js';

// Performance utilities
export {
  createLazy,
  memoize,
  debounce,
  throttle,
  deepClone,
  deepFreeze,
  deepMerge,
  measureExecutionTime,
  measureAsyncExecutionTime,
  PerformanceUtils
} from './performance-utils.js';

// Game-specific utility types for backward compatibility
export type PartialPlayer = DeepPartial<import('../generated.js').Player>;
export type RequiredPlayer = Required<import('../generated.js').Player>;
export type ReadonlyPlayer = Readonly<import('../generated.js').Player>;
export type PlayerUpdate = Pick<import('../generated.js').Player, 'health' | 'statusEffects' | 'abilities' | 'stats'>;
export type PlayerCombatUpdate = Pick<import('../generated.js').Player, 'health' | 'statusEffects'>;
export type PlayerStatsUpdate = Pick<import('../generated.js').Player, 'stats'>;
export type CreatePlayerInput = Omit<import('../generated.js').Player, 'id' | 'createdAt' | 'updatedAt' | 'socketId'>;
export type CreateGameInput = Omit<import('../generated.js').GameRoom, 'id' | 'gameCode' | 'createdAt' | 'players' | 'isActive'>;
export type CreateMonsterInput = Omit<import('../generated.js').Monster, 'id' | 'isAlive'>;

// Game room utility types
export type PartialGameRoom = Partial<import('../generated.js').GameRoom>;
export type GameRoomUpdate = Pick<import('../generated.js').GameRoom, 'players' | 'isActive' | 'lastUpdated'>;