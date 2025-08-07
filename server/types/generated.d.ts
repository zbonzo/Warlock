/**
 * @fileoverview Auto-generated TypeScript types from Zod schemas
 * Generated for Phase 2: Zod-to-TypeScript Type Generation
 * These types are automatically inferred from the Zod validation schemas
 */
import { z } from 'zod';
import * as Schemas from '../models/validation/ZodSchemas.js';
export type PlayerId = z.infer<typeof Schemas.BaseSchemas.playerId>;
export type GameCode = z.infer<typeof Schemas.BaseSchemas.gameCode>;
export type Timestamp = z.infer<typeof Schemas.BaseSchemas.timestamp>;
export type HealthPoints = z.infer<typeof Schemas.BaseSchemas.healthPoints>;
export type Round = z.infer<typeof Schemas.BaseSchemas.round>;
export type Turn = z.infer<typeof Schemas.BaseSchemas.turn>;
export type PlayerClass = z.infer<typeof Schemas.BaseSchemas.playerClass>;
export type PlayerRace = z.infer<typeof Schemas.BaseSchemas.playerRace>;
export type PlayerRole = z.infer<typeof Schemas.BaseSchemas.playerRole>;
export type GamePhase = z.infer<typeof Schemas.BaseSchemas.gamePhase>;
export type PlayerStatus = z.infer<typeof Schemas.BaseSchemas.playerStatus>;
export type AbilityTarget = z.infer<typeof Schemas.BaseSchemas.abilityTarget>;
export type EffectType = z.infer<typeof Schemas.BaseSchemas.effectType>;
export type Position = z.infer<typeof Schemas.BaseSchemas.position>;
export type ActionResult = z.infer<typeof Schemas.BaseSchemas.actionResult>;
export type PlayerStats = z.infer<typeof Schemas.PlayerSchemas.playerStats>;
export type Ability = z.infer<typeof Schemas.PlayerSchemas.ability>;
export type StatusEffect = z.infer<typeof Schemas.PlayerSchemas.statusEffect>;
export type Player = z.infer<typeof Schemas.PlayerSchemas.player>;
export type PlayerAction = z.infer<typeof Schemas.ActionSchemas.playerAction>;
export type AbilityAction = z.infer<typeof Schemas.ActionSchemas.abilityAction>;
export type ValidationResult = z.infer<typeof Schemas.ActionSchemas.validationResult>;
export type CommandResult = z.infer<typeof Schemas.ActionSchemas.commandResult>;
export type Monster = z.infer<typeof Schemas.GameSchemas.monster>;
export type GamePhaseData = z.infer<typeof Schemas.GameSchemas.gamePhase>;
export type GameRules = z.infer<typeof Schemas.GameSchemas.gameRules>;
export type GameState = z.infer<typeof Schemas.GameSchemas.gameState>;
export type JoinGameData = z.infer<typeof Schemas.SocketSchemas.joinGame>;
export type SubmitActionData = z.infer<typeof Schemas.SocketSchemas.submitAction>;
export type GameUpdateData = z.infer<typeof Schemas.SocketSchemas.gameUpdate>;
export type ErrorMessageData = z.infer<typeof Schemas.SocketSchemas.errorMessage>;
export type ServerConfig = z.infer<typeof Schemas.ConfigSchemas.serverConfig>;
export type GameConfig = z.infer<typeof Schemas.ConfigSchemas.gameConfig>;
export type GameEvent = {
    type: 'damage.applied';
    payload: DamageAppliedEvent;
} | {
    type: 'player.healed';
    payload: PlayerHealedEvent;
} | {
    type: 'ability.used';
    payload: AbilityUsedEvent;
} | {
    type: 'player.died';
    payload: PlayerDiedEvent;
} | {
    type: 'game.phase.changed';
    payload: GamePhaseChangedEvent;
} | {
    type: 'monster.spawned';
    payload: MonsterSpawnedEvent;
} | {
    type: 'effect.applied';
    payload: EffectAppliedEvent;
} | {
    type: 'effect.removed';
    payload: EffectRemovedEvent;
};
export interface DamageAppliedEvent {
    targetId: string;
    sourceId: string;
    damage: number;
    damageType: 'physical' | 'magical' | 'true';
    timestamp: Timestamp;
}
export interface PlayerHealedEvent {
    targetId: string;
    sourceId: string;
    amount: number;
    healType: 'ability' | 'effect' | 'item';
    timestamp: Timestamp;
}
export interface AbilityUsedEvent {
    playerId: string;
    abilityId: string;
    targetId?: string;
    success: boolean;
    timestamp: Timestamp;
}
export interface PlayerDiedEvent {
    playerId: string;
    killedBy?: string;
    causeOfDeath: string;
    timestamp: Timestamp;
}
export interface GamePhaseChangedEvent {
    previousPhase: GamePhase;
    newPhase: GamePhase;
    round: number;
    turn?: number;
    timestamp: Timestamp;
}
export interface MonsterSpawnedEvent {
    monsterId: string;
    monsterType: string;
    level: number;
    timestamp: Timestamp;
}
export interface EffectAppliedEvent {
    targetId: string;
    effectId: string;
    sourceId: string;
    duration: number;
    timestamp: Timestamp;
}
export interface EffectRemovedEvent {
    targetId: string;
    effectId: string;
    reason: 'expired' | 'dispelled' | 'replaced';
    timestamp: Timestamp;
}
export type EventType = GameEvent['type'];
export type EventPayload<T extends EventType> = Extract<GameEvent, {
    type: T;
}>['payload'];
export type PartialPlayer = Partial<Player>;
export type PartialGameState = Partial<GameState>;
export type PlayerUpdate = Pick<Player, 'status' | 'stats' | 'statusEffects'>;
export type CreatePlayerInput = Omit<Player, 'id' | 'socketId' | 'isReady' | 'actionThisRound'>;
export type CreateGameInput = Pick<GameState, 'rules'> & {
    hostPlayerId: string;
};
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export declare function isPlayer(obj: any): obj is Player;
export declare function isGameState(obj: any): obj is GameState;
export declare function isValidAction(obj: any): obj is PlayerAction;
export { Schemas };
export { GameRoom } from '../models/GameRoom.js';
//# sourceMappingURL=generated.d.ts.map