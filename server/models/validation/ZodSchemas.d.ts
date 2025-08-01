/**
 * @fileoverview Zod validation schemas for core game entities
 * Provides runtime validation for data integrity and error prevention
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
import { z } from 'zod';
/**
 * Base schemas for common data types
 */
export declare const BaseSchemas: {
    readonly playerId: z.ZodString;
    readonly gameCode: z.ZodString;
    readonly timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    readonly healthPoints: z.ZodNumber;
    readonly round: z.ZodNumber;
    readonly turn: z.ZodNumber;
    readonly playerClass: any;
    readonly playerRace: any;
    readonly playerRole: any;
    readonly gamePhase: any;
    readonly playerStatus: any;
    readonly abilityTarget: any;
    readonly effectType: any;
    readonly position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>>;
    readonly actionResult: z.ZodObject<{
        success: z.ZodBoolean;
        reason: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
};
/**
 * Player-related schemas
 */
export declare const PlayerSchemas: any;
/**
 * Game action and command schemas
 */
export declare const ActionSchemas: {
    readonly playerAction: z.ZodObject<{
        playerId: z.ZodString;
        actionType: z.ZodString;
        targetId: z.ZodOptional<z.ZodString>;
        actionData: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
        timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>;
        round: z.ZodOptional<z.ZodNumber>;
        turn: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly abilityAction: z.ZodObject<{
        playerId: z.ZodString;
        actionType: any;
        abilityId: z.ZodString;
        targetId: z.ZodOptional<z.ZodString>;
        coordinationInfo: z.ZodOptional<z.ZodObject<{
            coordinated: z.ZodBoolean;
            partnerId: z.ZodOptional<z.ZodString>;
            timing: any;
        }, z.core.$strip>>;
        actionData: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
        timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    }, z.core.$strip>;
    readonly validationResult: z.ZodObject<{
        valid: z.ZodBoolean;
        errors: z.ZodArray<z.ZodString>;
        warnings: z.ZodArray<z.ZodString>;
        score: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    }, z.core.$strip>;
    readonly commandResult: z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodOptional<z.ZodAny>;
        errors: z.ZodDefault<z.ZodArray<z.ZodString>>;
        warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
        events: z.ZodDefault<z.ZodArray<z.ZodAny>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    }, z.core.$strip>;
};
/**
 * Game state schemas
 */
export declare const GameSchemas: any;
/**
 * Socket event schemas
 */
export declare const SocketSchemas: {
    readonly joinGame: z.ZodObject<{
        gameCode: z.ZodString;
        playerName: z.ZodString;
        playerClass: any;
        playerRace: any;
    }, z.core.$strip>;
    readonly submitAction: z.ZodObject<{
        actionType: z.ZodString;
        targetId: z.ZodOptional<z.ZodString>;
        abilityId: z.ZodOptional<z.ZodString>;
        actionData: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    }, z.core.$strip>;
    readonly gameUpdate: z.ZodLazy<z.ZodObject<{
        type: z.ZodString;
        gameState: any;
        players: z.ZodOptional<z.ZodRecord<any, z.core.SomeType>>;
        phase: any;
        message: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>;
    readonly errorMessage: z.ZodObject<{
        type: any;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
};
/**
 * Configuration schemas
 */
export declare const ConfigSchemas: {
    readonly serverConfig: z.ZodObject<{
        port: z.ZodNumber;
        host: z.ZodString;
        cors: z.ZodObject<{
            origin: z.ZodUnion<[z.ZodUnion<[z.ZodArray<z.ZodString>, z.ZodString]>, z.ZodBoolean]>;
            credentials: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
        rateLimit: z.ZodOptional<z.ZodObject<{
            windowMs: z.ZodNumber;
            max: z.ZodNumber;
            message: z.ZodString;
        }, z.core.$strip>>;
        logging: z.ZodObject<{
            level: any;
            format: any;
        }, z.core.$strip>;
    }, z.core.$strip>;
    readonly gameConfig: z.ZodLazy<z.ZodObject<{
        defaultRules: any;
        abilityConfigs: z.ZodRecord<any, z.core.SomeType>;
        classConfigs: z.ZodRecord<z.core.$ZodRecordKey, z.core.SomeType>;
        raceConfigs: z.ZodRecord<z.core.$ZodRecordKey, z.core.SomeType>;
    }, z.core.$strip>>;
};
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
//# sourceMappingURL=ZodSchemas.d.ts.map