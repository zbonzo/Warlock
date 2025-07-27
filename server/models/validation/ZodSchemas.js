/**
 * @fileoverview Zod validation schemas for core game entities
 * Provides runtime validation for data integrity and error prevention
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
const { z } = require('zod');

/**
 * Base schemas for common data types
 */
const BaseSchemas = {
  // Common identifiers
  playerId: z.string().min(1).max(50),
  gameCode: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
  timestamp: z.string().datetime().or(z.date()),
  
  // Numeric ranges
  healthPoints: z.number().int().min(0).max(100),
  round: z.number().int().min(1).max(100),
  turn: z.number().int().min(1).max(20),
  
  // Game enums
  playerClass: z.enum(['Paladin', 'Knight', 'Archer', 'Wizard']),
  playerRace: z.enum(['Human', 'Elf', 'Dwarf', 'Halfling']),
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
};

/**
 * Player-related schemas
 */
const PlayerSchemas = {
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
  }),
  
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
  player: z.object({
    id: BaseSchemas.playerId,
    name: z.string().min(1).max(30),
    class: BaseSchemas.playerClass,
    race: BaseSchemas.playerRace,
    role: BaseSchemas.playerRole,
    status: BaseSchemas.playerStatus,
    stats: z.lazy(() => PlayerSchemas.playerStats),
    abilities: z.array(z.lazy(() => PlayerSchemas.ability)),
    statusEffects: z.array(z.lazy(() => PlayerSchemas.statusEffect)),
    actionThisRound: z.boolean().default(false),
    position: BaseSchemas.position,
    socketId: z.string().optional(),
    isReady: z.boolean().default(false),
    metadata: z.record(z.any()).optional()
  })
};

/**
 * Game action and command schemas
 */
const ActionSchemas = {
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
};

/**
 * Game state schemas
 */
const GameSchemas = {
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
    statusEffects: z.array(z.lazy(() => PlayerSchemas.statusEffect)),
    isAlive: z.boolean(),
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
  gameState: z.object({
    gameCode: BaseSchemas.gameCode,
    players: z.record(z.lazy(() => PlayerSchemas.player)),
    monster: z.lazy(() => GameSchemas.monster).optional(),
    phase: z.lazy(() => GameSchemas.gamePhase),
    rules: z.lazy(() => GameSchemas.gameRules),
    winner: z.enum(['Good', 'Evil', 'warlocks', 'innocents']).optional(),
    isActive: z.boolean().default(true),
    created: BaseSchemas.timestamp,
    lastUpdated: BaseSchemas.timestamp,
    metadata: z.record(z.any()).optional()
  })
};

/**
 * Socket event schemas
 */
const SocketSchemas = {
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
  gameUpdate: z.object({
    type: z.string().min(1),
    gameState: z.lazy(() => GameSchemas.gameState).optional(),
    players: z.record(z.lazy(() => PlayerSchemas.player)).optional(),
    phase: z.lazy(() => GameSchemas.gamePhase).optional(),
    message: z.string().optional(),
    data: z.any().optional()
  }),
  
  errorMessage: z.object({
    type: z.literal('error'),
    message: z.string().min(1),
    code: z.string().optional(),
    details: z.any().optional()
  })
};

/**
 * Configuration schemas
 */
const ConfigSchemas = {
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
  gameConfig: z.object({
    defaultRules: z.lazy(() => GameSchemas.gameRules),
    abilityConfigs: z.record(z.lazy(() => PlayerSchemas.ability)),
    classConfigs: z.record(z.object({
      name: BaseSchemas.playerClass,
      baseStats: z.lazy(() => PlayerSchemas.playerStats),
      abilities: z.array(z.string())
    })),
    raceConfigs: z.record(z.object({
      name: BaseSchemas.playerRace,
      statModifiers: z.record(z.number().int()),
      abilities: z.array(z.string())
    }))
  })
};

module.exports = {
  BaseSchemas,
  PlayerSchemas,
  ActionSchemas,
  GameSchemas,
  SocketSchemas,
  ConfigSchemas
};