/**
 * @fileoverview Zod validation schemas for core game entities
 * Provides runtime validation for data integrity and error prevention
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
import { z } from 'zod';

/**
 * Base schemas for common data types
 */
export const BaseSchemas = {
  // Common identifiers
  playerId: z.string().min(1).max(50),
  gameCode: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
  timestamp: z.string().datetime().or(z.date()),

  // Numeric ranges
  healthPoints: z.number().int().min(0).max(100),
  round: z.number().int().min(1).max(100),
  turn: z.number().int().min(1).max(20),

  // Game enums
  playerClass: z.enum(['Alchemist', 'Assassin', 'Barbarian', 'Druid', 'Gunslinger', 'Oracle', 'Priest', 'Pyromancer', 'Shaman', 'Tracker', 'Warrior', 'Wizard', 'Paladin']),
  playerRace: z.enum(['Human', 'Elf', 'Dwarf', 'Halfling', 'Orc', 'Kinfolk', 'Crestfallen', 'Artisan', 'Lich', 'Rockhewn']),
  playerRole: z.enum(['Good', 'Evil', 'Warlock']),
  gamePhase: z.enum(['setup', 'day', 'night', 'voting', 'ended']),

  // Status and states
  playerStatus: z.enum(['alive', 'dead', 'revived']),
  abilityTarget: z.enum(['self', 'player', 'monster', 'area', 'none']),
  effectType: z.enum(['buff', 'debuff', 'status', 'immunity']),

  // Coordinate systems
  position: z.object({
    x: z.number().int().min(0).max(10),
    y: z.number().int().min(0).max(10)
  }).optional(),

  // Common result patterns
  actionResult: z.object({
    success: z.boolean(),
    reason: z.string().optional(),
    data: z.any().optional()
  })
} as const;

/**
 * Player-related schemas
 */
export const PlayerSchemas = {
  // Core player stats
  playerStats: z.object({
    hp: BaseSchemas.healthPoints,
    maxHp: BaseSchemas.healthPoints,
    level: z.number().int().min(1).max(20),
    experience: z.number().int().min(0),
    gold: z.number().int().min(0),
    attackPower: z.number().int().min(0).max(50),
    defensePower: z.number().int().min(0).max(50),
    magicPower: z.number().int().min(0).max(50),
    luck: z.number().int().min(0).max(100)
  }),

  // Player abilities
  ability: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(['class', 'racial', 'special']),
    target: BaseSchemas.abilityTarget,
    cooldown: z.number().int().min(0).max(10),
    currentCooldown: z.number().int().min(0).max(10),
    usesRemaining: z.number().int().min(0).optional(),
    unlocked: z.boolean(),
    requirements: z.object({
      level: z.number().int().min(1).optional(),
      class: BaseSchemas.playerClass.optional(),
      race: BaseSchemas.playerRace.optional(),
      hp: z.number().int().min(1).optional(),
      effect: z.string().optional(),
      blockedBy: z.array(z.string()).optional()
    }).optional()
  }).passthrough(), // Allow additional properties for backward compatibility

  // Status effects
  statusEffect: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    type: BaseSchemas.effectType,
    duration: z.number().int().min(-1), // -1 for permanent
    remainingDuration: z.number().int().min(-1),
    stackable: z.boolean().default(false),
    stacks: z.number().int().min(0).default(0),
    modifiers: z.object({
      hp: z.number().int().optional(),
      attackPower: z.number().int().optional(),
      defensePower: z.number().int().optional(),
      magicPower: z.number().int().optional(),
      immunity: z.array(z.string()).optional(),
      vulnerability: z.array(z.string()).optional()
    }).optional(),
    metadata: z.record(z.any()).optional()
  }),

  // Full player object
  player: z.lazy((): z.ZodType<any> => z.object({
    id: BaseSchemas.playerId,
    name: z.string().min(1).max(30),
    class: BaseSchemas.playerClass,
    race: BaseSchemas.playerRace,
    role: BaseSchemas.playerRole,
    status: BaseSchemas.playerStatus,
    stats: PlayerSchemas.playerStats,
    abilities: z.array(PlayerSchemas.ability),
    statusEffects: z.array(PlayerSchemas.statusEffect),
    actionThisRound: z.boolean().default(false),
    position: BaseSchemas.position,
    socketId: z.string().optional(),
    isReady: z.boolean().default(false),
    metadata: z.record(z.any()).optional()
  }))
} as const;

/**
 * Game action and command schemas
 */
export const ActionSchemas = {
  // Base action structure
  playerAction: z.object({
    playerId: BaseSchemas.playerId,
    actionType: z.string().min(1),
    targetId: z.string().optional(),
    actionData: z.record(z.any()).optional(),
    timestamp: BaseSchemas.timestamp,
    round: BaseSchemas.round.optional(),
    turn: BaseSchemas.turn.optional()
  }),

  // Ability usage action
  abilityAction: z.object({
    playerId: BaseSchemas.playerId,
    actionType: z.literal('ability'),
    abilityId: z.string().min(1),
    targetId: z.string().optional(),
    coordinationInfo: z.object({
      coordinated: z.boolean(),
      partnerId: BaseSchemas.playerId.optional(),
      timing: z.enum(['simultaneous', 'sequential']).optional()
    }).optional(),
    actionData: z.record(z.any()).optional(),
    timestamp: BaseSchemas.timestamp
  }),

  // Validation result
  validationResult: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    score: z.number().min(0).max(100).optional(),
    metadata: z.record(z.any()).optional()
  }),

  // Command execution result
  commandResult: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    errors: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    events: z.array(z.any()).default([]),
    metadata: z.record(z.any()).optional()
  })
} as const;

/**
 * Game state schemas
 */
export const GameSchemas = {
  // Monster object
  monster: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    hp: BaseSchemas.healthPoints,
    maxHp: BaseSchemas.healthPoints,
    level: z.number().int().min(1).max(20),
    attackPower: z.number().int().min(0).max(100),
    defensePower: z.number().int().min(0).max(100),
    abilities: z.array(z.string()),
    statusEffects: z.array(PlayerSchemas.statusEffect),
    isAlive: z.boolean(),
    race: z.literal('Monster'), // Required for system compatibility
    metadata: z.record(z.any()).optional()
  }),

  // Game phase tracking
  gamePhase: z.object({
    current: BaseSchemas.gamePhase,
    round: BaseSchemas.round,
    turn: BaseSchemas.turn,
    timeLimit: z.number().int().min(0).optional(),
    startTime: BaseSchemas.timestamp.optional(),
    actionsSubmitted: z.record(z.boolean()).default({}),
    canSubmitActions: z.boolean().default(true)
  }),

  // Game rules configuration
  gameRules: z.object({
    maxPlayers: z.number().int().min(3).max(12),
    minPlayers: z.number().int().min(3).max(12),
    maxRounds: z.number().int().min(5).max(50),
    turnTimeLimit: z.number().int().min(30).max(600), // seconds
    warlockCount: z.number().int().min(1).max(3),
    allowSpectators: z.boolean().default(false),
    allowLateJoin: z.boolean().default(false),
    difficultyModifier: z.number().min(0.5).max(2.0).default(1.0)
  }),

  // Complete game state
  gameState: z.lazy((): z.ZodType<any> => z.object({
    gameCode: BaseSchemas.gameCode,
    players: z.record(PlayerSchemas.player),
    monster: GameSchemas.monster.optional(),
    phase: GameSchemas.gamePhase,
    rules: GameSchemas.gameRules,
    winner: z.enum(['Good', 'Evil', 'warlocks', 'innocents']).optional(),
    isActive: z.boolean().default(true),
    created: BaseSchemas.timestamp,
    lastUpdated: BaseSchemas.timestamp,
    metadata: z.record(z.any()).optional()
  }))
} as const;

/**
 * Socket event schemas
 */
export const SocketSchemas = {
  // Incoming socket events
  joinGame: z.object({
    gameCode: BaseSchemas.gameCode,
    playerName: z.string().min(1).max(30),
    playerClass: BaseSchemas.playerClass,
    playerRace: BaseSchemas.playerRace
  }),

  submitAction: z.object({
    actionType: z.string().min(1),
    targetId: z.string().optional(),
    abilityId: z.string().optional(),
    actionData: z.record(z.any()).optional()
  }),

  // Outgoing socket events
  gameUpdate: z.lazy((): z.ZodType<any> => z.object({
    type: z.string().min(1),
    gameState: GameSchemas.gameState.optional(),
    players: z.record(PlayerSchemas.player).optional(),
    phase: GameSchemas.gamePhase.optional(),
    message: z.string().optional(),
    data: z.any().optional()
  })),

  errorMessage: z.object({
    type: z.literal('error'),
    message: z.string().min(1),
    code: z.string().optional(),
    details: z.any().optional()
  })
} as const;

/**
 * Configuration schemas
 */
export const ConfigSchemas = {
  // Server configuration
  serverConfig: z.object({
    port: z.number().int().min(1000).max(65535),
    host: z.string().min(1),
    cors: z.object({
      origin: z.array(z.string()).or(z.string()).or(z.boolean()),
      credentials: z.boolean().default(true)
    }),
    rateLimit: z.object({
      windowMs: z.number().int().min(1000),
      max: z.number().int().min(1),
      message: z.string()
    }).optional(),
    logging: z.object({
      level: z.enum(['error', 'warn', 'info', 'debug']),
      format: z.enum(['json', 'simple']).default('simple')
    })
  }),

  // Game configuration
  gameConfig: z.lazy((): z.ZodType<any> => z.object({
    defaultRules: GameSchemas.gameRules,
    abilityConfigs: z.record(PlayerSchemas.ability),
    classConfigs: z.record(z.object({
      name: BaseSchemas.playerClass,
      baseStats: PlayerSchemas.playerStats,
      abilities: z.array(z.string())
    })),
    raceConfigs: z.record(z.object({
      name: BaseSchemas.playerRace,
      statModifiers: z.record(z.number().int()),
      abilities: z.array(z.string())
    }))
  }))
} as const;

// Type exports for TypeScript consumers
export type PlayerClass = z.infer<typeof BaseSchemas.playerClass>;
export type PlayerRace = z.infer<typeof BaseSchemas.playerRace>;
export type PlayerRole = z.infer<typeof BaseSchemas.playerRole>;
export type GamePhase = z.infer<typeof BaseSchemas.gamePhase>;
export type PlayerStatus = z.infer<typeof BaseSchemas.playerStatus>;
export type AbilityTarget = z.infer<typeof BaseSchemas.abilityTarget>;
export type EffectType = z.infer<typeof BaseSchemas.effectType>;

export type Player = z.infer<typeof PlayerSchemas.player>;
export type PlayerStats = z.infer<typeof PlayerSchemas.playerStats>;
export type Ability = z.infer<typeof PlayerSchemas.ability>;
export type StatusEffect = z.infer<typeof PlayerSchemas.statusEffect>;

export type PlayerAction = z.infer<typeof ActionSchemas.playerAction>;
export type AbilityAction = z.infer<typeof ActionSchemas.abilityAction>;
export type ValidationResult = z.infer<typeof ActionSchemas.validationResult>;
export type CommandResult = z.infer<typeof ActionSchemas.commandResult>;

export type Monster = z.infer<typeof GameSchemas.monster>;
export type GamePhaseData = z.infer<typeof GameSchemas.gamePhase>;
export type GameRules = z.infer<typeof GameSchemas.gameRules>;
export type GameState = z.infer<typeof GameSchemas.gameState>;

export type JoinGameData = z.infer<typeof SocketSchemas.joinGame>;
export type SubmitActionData = z.infer<typeof SocketSchemas.submitAction>;
export type GameUpdateData = z.infer<typeof SocketSchemas.gameUpdate>;
export type ErrorMessageData = z.infer<typeof SocketSchemas.errorMessage>;

export type ServerConfig = z.infer<typeof ConfigSchemas.serverConfig>;
export type GameConfig = z.infer<typeof ConfigSchemas.gameConfig>;

// Individual schema exports for guards.ts and other consumers
export const PlayerSchema = PlayerSchemas.player;
export const PlayerStatsSchema = PlayerSchemas.playerStats;
export const AbilitySchema = PlayerSchemas.ability;
export const StatusEffectSchema = PlayerSchemas.statusEffect;

export const PlayerActionSchema = ActionSchemas.playerAction;
export const AbilityActionSchema = ActionSchemas.abilityAction;
export const ValidationResultSchema = ActionSchemas.validationResult;
export const CommandResultSchema = ActionSchemas.commandResult;

export const MonsterSchema = GameSchemas.monster;
export const GamePhaseSchema = GameSchemas.gamePhase;
export const GameRulesSchema = GameSchemas.gameRules;
export const GameStateSchema = GameSchemas.gameState;

// For now, create placeholder schemas for missing types that don't have direct mappings
export const PlayerAbilitiesSchema = z.array(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['class', 'racial', 'special']),
  unlocked: z.boolean()
}));
export const PlayerEffectsSchema = z.array(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['buff', 'debuff', 'status', 'immunity']),
  duration: z.number().int().min(-1)
}));
export const GameRoomSchema = z.object({
  gameCode: z.string().length(6),
  players: z.record(z.any()),
  isActive: z.boolean(),
  created: z.string(),
  lastUpdated: z.string()
});
export const GameEventSchema = z.object({
  type: z.string(),
  payload: z.any(),
  timestamp: BaseSchemas.timestamp,
  gameCode: BaseSchemas.gameCode.optional()
});
