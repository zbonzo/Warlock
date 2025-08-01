"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigSchemas = exports.SocketSchemas = exports.GameSchemas = exports.ActionSchemas = exports.PlayerSchemas = exports.BaseSchemas = void 0;
/**
 * @fileoverview Zod validation schemas for core game entities
 * Provides runtime validation for data integrity and error prevention
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
const zod_1 = require("zod");
/**
 * Base schemas for common data types
 */
exports.BaseSchemas = {
    // Common identifiers
    playerId: zod_1.z.string().min(1).max(50),
    gameCode: zod_1.z.string().length(6).regex(/^[A-Z0-9]{6}$/),
    timestamp: zod_1.z.string().datetime().or(zod_1.z.date()),
    // Numeric ranges
    healthPoints: zod_1.z.number().int().min(0).max(100),
    round: zod_1.z.number().int().min(1).max(100),
    turn: zod_1.z.number().int().min(1).max(20),
    // Game enums
    playerClass: zod_1.z.enum(['Paladin', 'Knight', 'Archer', 'Wizard']),
    playerRace: zod_1.z.enum(['Human', 'Elf', 'Dwarf', 'Halfling']),
    playerRole: zod_1.z.enum(['Good', 'Evil', 'Warlock']),
    gamePhase: zod_1.z.enum(['setup', 'day', 'night', 'voting', 'ended']),
    // Status and states
    playerStatus: zod_1.z.enum(['alive', 'dead', 'revived']),
    abilityTarget: zod_1.z.enum(['self', 'player', 'monster', 'area', 'none']),
    effectType: zod_1.z.enum(['buff', 'debuff', 'status', 'immunity']),
    // Coordinate systems
    position: zod_1.z.object({
        x: zod_1.z.number().int().min(0).max(10),
        y: zod_1.z.number().int().min(0).max(10)
    }).optional(),
    // Common result patterns
    actionResult: zod_1.z.object({
        success: zod_1.z.boolean(),
        reason: zod_1.z.string().optional(),
        data: zod_1.z.any().optional()
    })
};
/**
 * Player-related schemas
 */
exports.PlayerSchemas = {
    // Core player stats
    playerStats: zod_1.z.object({
        hp: exports.BaseSchemas.healthPoints,
        maxHp: exports.BaseSchemas.healthPoints,
        level: zod_1.z.number().int().min(1).max(20),
        experience: zod_1.z.number().int().min(0),
        gold: zod_1.z.number().int().min(0),
        attackPower: zod_1.z.number().int().min(0).max(50),
        defensePower: zod_1.z.number().int().min(0).max(50),
        magicPower: zod_1.z.number().int().min(0).max(50),
        luck: zod_1.z.number().int().min(0).max(100)
    }),
    // Player abilities
    ability: zod_1.z.object({
        id: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        description: zod_1.z.string(),
        type: zod_1.z.enum(['class', 'racial', 'special']),
        target: exports.BaseSchemas.abilityTarget,
        cooldown: zod_1.z.number().int().min(0).max(10),
        currentCooldown: zod_1.z.number().int().min(0).max(10),
        usesRemaining: zod_1.z.number().int().min(0).optional(),
        unlocked: zod_1.z.boolean(),
        requirements: zod_1.z.object({
            level: zod_1.z.number().int().min(1).optional(),
            class: exports.BaseSchemas.playerClass.optional(),
            race: exports.BaseSchemas.playerRace.optional(),
            hp: zod_1.z.number().int().min(1).optional(),
            effect: zod_1.z.string().optional(),
            blockedBy: zod_1.z.array(zod_1.z.string()).optional()
        }).optional()
    }),
    // Status effects
    statusEffect: zod_1.z.object({
        id: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        description: zod_1.z.string(),
        type: exports.BaseSchemas.effectType,
        duration: zod_1.z.number().int().min(-1),
        remainingDuration: zod_1.z.number().int().min(-1),
        stackable: zod_1.z.boolean().default(false),
        stacks: zod_1.z.number().int().min(0).default(0),
        modifiers: zod_1.z.object({
            hp: zod_1.z.number().int().optional(),
            attackPower: zod_1.z.number().int().optional(),
            defensePower: zod_1.z.number().int().optional(),
            magicPower: zod_1.z.number().int().optional(),
            immunity: zod_1.z.array(zod_1.z.string()).optional(),
            vulnerability: zod_1.z.array(zod_1.z.string()).optional()
        }).optional(),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    }),
    // Full player object
    player: zod_1.z.lazy(() => zod_1.z.object({
        id: exports.BaseSchemas.playerId,
        name: zod_1.z.string().min(1).max(30),
        class: exports.BaseSchemas.playerClass,
        race: exports.BaseSchemas.playerRace,
        role: exports.BaseSchemas.playerRole,
        status: exports.BaseSchemas.playerStatus,
        stats: exports.PlayerSchemas.playerStats,
        abilities: zod_1.z.array(exports.PlayerSchemas.ability),
        statusEffects: zod_1.z.array(exports.PlayerSchemas.statusEffect),
        actionThisRound: zod_1.z.boolean().default(false),
        position: exports.BaseSchemas.position,
        socketId: zod_1.z.string().optional(),
        isReady: zod_1.z.boolean().default(false),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    }))
};
/**
 * Game action and command schemas
 */
exports.ActionSchemas = {
    // Base action structure
    playerAction: zod_1.z.object({
        playerId: exports.BaseSchemas.playerId,
        actionType: zod_1.z.string().min(1),
        targetId: zod_1.z.string().optional(),
        actionData: zod_1.z.record(zod_1.z.any()).optional(),
        timestamp: exports.BaseSchemas.timestamp,
        round: exports.BaseSchemas.round.optional(),
        turn: exports.BaseSchemas.turn.optional()
    }),
    // Ability usage action
    abilityAction: zod_1.z.object({
        playerId: exports.BaseSchemas.playerId,
        actionType: zod_1.z.literal('ability'),
        abilityId: zod_1.z.string().min(1),
        targetId: zod_1.z.string().optional(),
        coordinationInfo: zod_1.z.object({
            coordinated: zod_1.z.boolean(),
            partnerId: exports.BaseSchemas.playerId.optional(),
            timing: zod_1.z.enum(['simultaneous', 'sequential']).optional()
        }).optional(),
        actionData: zod_1.z.record(zod_1.z.any()).optional(),
        timestamp: exports.BaseSchemas.timestamp
    }),
    // Validation result
    validationResult: zod_1.z.object({
        valid: zod_1.z.boolean(),
        errors: zod_1.z.array(zod_1.z.string()),
        warnings: zod_1.z.array(zod_1.z.string()),
        score: zod_1.z.number().min(0).max(100).optional(),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    }),
    // Command execution result
    commandResult: zod_1.z.object({
        success: zod_1.z.boolean(),
        data: zod_1.z.any().optional(),
        errors: zod_1.z.array(zod_1.z.string()).default([]),
        warnings: zod_1.z.array(zod_1.z.string()).default([]),
        events: zod_1.z.array(zod_1.z.any()).default([]),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    })
};
/**
 * Game state schemas
 */
exports.GameSchemas = {
    // Monster object
    monster: zod_1.z.object({
        id: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        hp: exports.BaseSchemas.healthPoints,
        maxHp: exports.BaseSchemas.healthPoints,
        level: zod_1.z.number().int().min(1).max(20),
        attackPower: zod_1.z.number().int().min(0).max(100),
        defensePower: zod_1.z.number().int().min(0).max(100),
        abilities: zod_1.z.array(zod_1.z.string()),
        statusEffects: zod_1.z.array(exports.PlayerSchemas.statusEffect),
        isAlive: zod_1.z.boolean(),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    }),
    // Game phase tracking
    gamePhase: zod_1.z.object({
        current: exports.BaseSchemas.gamePhase,
        round: exports.BaseSchemas.round,
        turn: exports.BaseSchemas.turn,
        timeLimit: zod_1.z.number().int().min(0).optional(),
        startTime: exports.BaseSchemas.timestamp.optional(),
        actionsSubmitted: zod_1.z.record(zod_1.z.boolean()).default({}),
        canSubmitActions: zod_1.z.boolean().default(true)
    }),
    // Game rules configuration
    gameRules: zod_1.z.object({
        maxPlayers: zod_1.z.number().int().min(3).max(12),
        minPlayers: zod_1.z.number().int().min(3).max(12),
        maxRounds: zod_1.z.number().int().min(5).max(50),
        turnTimeLimit: zod_1.z.number().int().min(30).max(600),
        warlockCount: zod_1.z.number().int().min(1).max(3),
        allowSpectators: zod_1.z.boolean().default(false),
        allowLateJoin: zod_1.z.boolean().default(false),
        difficultyModifier: zod_1.z.number().min(0.5).max(2.0).default(1.0)
    }),
    // Complete game state
    gameState: zod_1.z.lazy(() => zod_1.z.object({
        gameCode: exports.BaseSchemas.gameCode,
        players: zod_1.z.record(exports.PlayerSchemas.player),
        monster: exports.GameSchemas.monster.optional(),
        phase: exports.GameSchemas.gamePhase,
        rules: exports.GameSchemas.gameRules,
        winner: zod_1.z.enum(['Good', 'Evil', 'warlocks', 'innocents']).optional(),
        isActive: zod_1.z.boolean().default(true),
        created: exports.BaseSchemas.timestamp,
        lastUpdated: exports.BaseSchemas.timestamp,
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    }))
};
/**
 * Socket event schemas
 */
exports.SocketSchemas = {
    // Incoming socket events
    joinGame: zod_1.z.object({
        gameCode: exports.BaseSchemas.gameCode,
        playerName: zod_1.z.string().min(1).max(30),
        playerClass: exports.BaseSchemas.playerClass,
        playerRace: exports.BaseSchemas.playerRace
    }),
    submitAction: zod_1.z.object({
        actionType: zod_1.z.string().min(1),
        targetId: zod_1.z.string().optional(),
        abilityId: zod_1.z.string().optional(),
        actionData: zod_1.z.record(zod_1.z.any()).optional()
    }),
    // Outgoing socket events
    gameUpdate: zod_1.z.lazy(() => zod_1.z.object({
        type: zod_1.z.string().min(1),
        gameState: exports.GameSchemas.gameState.optional(),
        players: zod_1.z.record(exports.PlayerSchemas.player).optional(),
        phase: exports.GameSchemas.gamePhase.optional(),
        message: zod_1.z.string().optional(),
        data: zod_1.z.any().optional()
    })),
    errorMessage: zod_1.z.object({
        type: zod_1.z.literal('error'),
        message: zod_1.z.string().min(1),
        code: zod_1.z.string().optional(),
        details: zod_1.z.any().optional()
    })
};
/**
 * Configuration schemas
 */
exports.ConfigSchemas = {
    // Server configuration
    serverConfig: zod_1.z.object({
        port: zod_1.z.number().int().min(1000).max(65535),
        host: zod_1.z.string().min(1),
        cors: zod_1.z.object({
            origin: zod_1.z.array(zod_1.z.string()).or(zod_1.z.string()).or(zod_1.z.boolean()),
            credentials: zod_1.z.boolean().default(true)
        }),
        rateLimit: zod_1.z.object({
            windowMs: zod_1.z.number().int().min(1000),
            max: zod_1.z.number().int().min(1),
            message: zod_1.z.string()
        }).optional(),
        logging: zod_1.z.object({
            level: zod_1.z.enum(['error', 'warn', 'info', 'debug']),
            format: zod_1.z.enum(['json', 'simple']).default('simple')
        })
    }),
    // Game configuration
    gameConfig: zod_1.z.lazy(() => zod_1.z.object({
        defaultRules: exports.GameSchemas.gameRules,
        abilityConfigs: zod_1.z.record(exports.PlayerSchemas.ability),
        classConfigs: zod_1.z.record(zod_1.z.object({
            name: exports.BaseSchemas.playerClass,
            baseStats: exports.PlayerSchemas.playerStats,
            abilities: zod_1.z.array(zod_1.z.string())
        })),
        raceConfigs: zod_1.z.record(zod_1.z.object({
            name: exports.BaseSchemas.playerRace,
            statModifiers: zod_1.z.record(zod_1.z.number().int()),
            abilities: zod_1.z.array(zod_1.z.string())
        }))
    }))
};
