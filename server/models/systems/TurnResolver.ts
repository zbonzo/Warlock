/**
 * @fileoverview TurnResolver - TypeScript migration
 * Resolves player actions and handles turn-based game logic
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '../../utils/logger.js';
import messages from '../../config/messages/index.js';
import type { Player, PlayerAction, GameCode } from '../../types/generated.js';

// Turn resolution schemas
const ActionResultSchema = z.object({
  actionId: z.string(),
  actorId: z.string(),
  targetId: z.string().optional(),
  success: z.boolean(),
  damage: z.number().min(0).optional(),
  healing: z.number().min(0).optional(),
  effects: z.array(z.string()).default([]),
  message: z.string(),
  critical: z.boolean().default(false),
  blocked: z.number().min(0).default(0),
});

const TurnResultSchema = z.object({
  turnNumber: z.number().int().min(1),
  actionResults: z.array(ActionResultSchema),
  playerUpdates: z.array(z.any()), // Player state changes
  gameEvents: z.array(z.string()),
  nextPhase: z.enum(['action', 'results', 'ended']),
  timestamp: z.number(),
});

const ActionQueueItemSchema = z.object({
  action: z.any(), // PlayerAction
  priority: z.number().int().min(0).default(0),
  timestamp: z.number(),
});

// Type definitions
export type ActionResult = z.infer<typeof ActionResultSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;
export type ActionQueueItem = z.infer<typeof ActionQueueItemSchema>;

export interface TurnContext {
  gameCode: GameCode;
  players: Map<string, Player>;
  monster: any;
  level: number;
  round: number;
}

export interface ResolutionSystems {
  damageCalculator: any;
  effectManager: any;
  combatSystem: any;
  statusEffectManager: any;
}

/**
 * TurnResolver handles action resolution and turn-based logic
 * Processes player actions in priority order and updates game state
 */
export class TurnResolver {
  private gameCode: GameCode;
  private actionQueue: ActionQueueItem[] = [];
  private currentTurn: number = 0;
  private systems: ResolutionSystems;

  /**
   * Create a turn resolver
   * @param gameCode - Game code for logging
   * @param systems - Game systems for resolution
   */
  constructor(gameCode: GameCode, systems: ResolutionSystems) {
    this.gameCode = gameCode;
    this.systems = systems;
  }

  /**
   * Queue an action for resolution
   * @param action - Player action to queue
   * @param priority - Action priority (higher = resolves first)
   */
  queueAction(action: PlayerAction, priority: number = 0): void {
    const queueItem = ActionQueueItemSchema.parse({
      action,
      priority,
      timestamp: Date.now(),
    });

    this.actionQueue.push(queueItem);

    logger.debug('ActionQueued', {
      gameCode: this.gameCode,
      actionType: action.actionType,
      actorId: action.playerId,
      priority
    });
  }

  /**
   * Clear the action queue
   */
  clearQueue(): void {
    this.actionQueue = [];
    logger.debug('ActionQueueCleared', { gameCode: this.gameCode });
  }

  /**
   * Resolve all queued actions for the current turn
   * @param context - Turn context with game state
   * @returns Turn resolution results
   */
  resolveTurn(context: TurnContext): TurnResult {
    this.currentTurn++;

    logger.info('TurnResolutionStarted', {
      gameCode: this.gameCode,
      turn: this.currentTurn,
      queuedActions: this.actionQueue.length
    });

    // Sort actions by priority (higher first), then by timestamp
    this.actionQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    const actionResults: ActionResult[] = [];
    const playerUpdates: any[] = [];
    const gameEvents: string[] = [];

    // Process each action in order
    for (const queueItem of this.actionQueue) {
      try {
        const result = this.resolveAction(queueItem.action, context);
        actionResults.push(result);

        // Apply action effects to game state
        this.applyActionResult(result, context);

      } catch (error) {
        logger.error('ActionResolutionError', {
          gameCode: this.gameCode,
          action: queueItem.action,
          error: error instanceof Error ? error.message : String(error)
        });

        // Create failed action result
        actionResults.push(ActionResultSchema.parse({
          actionId: queueItem.action.actionType,
          actorId: queueItem.action.playerId,
          targetId: queueItem.action.targetId,
          success: false,
          message: 'Action failed to resolve'
        }));
      }
    }

    // Process end-of-turn effects
    this.processEndOfTurnEffects(context, gameEvents);

    // Determine next phase
    const nextPhase = this.determineNextPhase(context);

    const turnResult = TurnResultSchema.parse({
      turnNumber: this.currentTurn,
      actionResults,
      playerUpdates,
      gameEvents,
      nextPhase,
      timestamp: Date.now(),
    });

    // Clear the queue for next turn
    this.clearQueue();

    logger.info('TurnResolutionCompleted', {
      gameCode: this.gameCode,
      turn: this.currentTurn,
      results: actionResults.length,
      nextPhase
    });

    return turnResult;
  }

  /**
   * Resolve a single action
   * @param action - Action to resolve
   * @param context - Turn context
   * @returns Action result
   */
  private resolveAction(action: PlayerAction, context: TurnContext): ActionResult {
    const actor = context.players.get(action.playerId);
    if (!actor) {
      throw new Error(`Actor not found: ${action.playerId}`);
    }

    // Validate action can be performed
    if (actor.status !== 'alive') {
      return ActionResultSchema.parse({
        actionId: action.actionType,
        actorId: action.playerId,
        success: false,
        message: `${actor.name} is not alive`
      });
    }

    // Check for status effects that prevent actions
    if (this.systems.statusEffectManager.isPlayerStunned(action.playerId)) {
      return ActionResultSchema.parse({
        actionId: action.actionType,
        actorId: action.playerId,
        success: false,
        message: `${actor.name} is stunned`
      });
    }

    // Resolve based on action type
    switch (action.actionType) {
      case 'attack':
        return this.resolveAttackAction(action, context);
      case 'heal':
        return this.resolveHealAction(action, context);
      case 'ability':
        return this.resolveAbilityAction(action, context);
      case 'defend':
        return this.resolveDefendAction(action, context);
      default:
        return ActionResultSchema.parse({
          actionId: action.actionType,
          actorId: action.playerId,
          success: false,
          message: `Unknown action type: ${action.actionType}`
        });
    }
  }

  /**
   * Resolve attack action
   * @param action - Attack action
   * @param context - Turn context
   * @returns Action result
   */
  private resolveAttackAction(action: PlayerAction, context: TurnContext): ActionResult {
    const actor = context.players.get(action.playerId)!;
    const target = action.targetId ? context.players.get(action.targetId) || context.monster : null;

    if (!target) {
      return ActionResultSchema.parse({
        actionId: action.actionType,
        actorId: action.playerId,
        success: false,
        message: 'Invalid target'
      });
    }

    // Calculate damage
    const baseDamage = actor.stats.attackPower;
    const damageResult = this.systems.damageCalculator.calculateDamage({
      baseDamage,
      target,
      attacker: actor
    });

    return ActionResultSchema.parse({
      actionId: action.actionType,
      actorId: action.playerId,
      targetId: action.targetId,
      success: true,
      damage: damageResult.actualDamage,
      blocked: damageResult.blocked,
      critical: damageResult.critical,
      message: `${actor.name} attacks for ${damageResult.actualDamage} damage`
    });
  }

  /**
   * Resolve heal action
   * @param action - Heal action
   * @param context - Turn context
   * @returns Action result
   */
  private resolveHealAction(action: PlayerAction, context: TurnContext): ActionResult {
    const actor = context.players.get(action.playerId)!;
    const target = action.targetId ? context.players.get(action.targetId) : actor;

    if (!target) {
      return ActionResultSchema.parse({
        actionId: action.actionType,
        actorId: action.playerId,
        success: false,
        message: 'Invalid target'
      });
    }

    const baseHealing = Math.floor(actor.stats.magicPower * 0.8);
    const finalHealing = this.systems.damageCalculator.calculateHealing(baseHealing, actor, target);

    return ActionResultSchema.parse({
      actionId: action.actionType,
      actorId: action.playerId,
      targetId: action.targetId,
      success: true,
      healing: finalHealing,
      message: `${actor.name} heals for ${finalHealing} HP`
    });
  }

  /**
   * Resolve ability action
   * @param action - Ability action
   * @param context - Turn context
   * @returns Action result
   */
  private resolveAbilityAction(action: PlayerAction, context: TurnContext): ActionResult {
    // This would delegate to ability-specific handlers
    return ActionResultSchema.parse({
      actionId: action.actionType,
      actorId: action.playerId,
      success: true,
      message: 'Ability used'
    });
  }

  /**
   * Resolve defend action
   * @param action - Defend action
   * @param context - Turn context
   * @returns Action result
   */
  private resolveDefendAction(action: PlayerAction, context: TurnContext): ActionResult {
    const actor = context.players.get(action.playerId)!;

    // Apply temporary defense bonus
    this.systems.effectManager.applyEffect(action.playerId, {
      id: 'defending',
      name: 'Defending',
      type: 'buff',
      duration: 1,
      metadata: { armorBonus: 5 }
    });

    return ActionResultSchema.parse({
      actionId: action.actionType,
      actorId: action.playerId,
      success: true,
      effects: ['defending'],
      message: `${actor.name} takes a defensive stance`
    });
  }

  /**
   * Apply action result to game state
   * @param result - Action result
   * @param context - Turn context
   */
  private applyActionResult(result: ActionResult, context: TurnContext): void {
    // Apply damage
    if (result.damage && result.targetId) {
      const target = context.players.get(result.targetId);
      if (target) {
        target.stats.hp = Math.max(0, target.stats.hp - result.damage);
        if (target.stats.hp <= 0) {
          target.status = 'dead';
        }
      }
    }

    // Apply healing
    if (result.healing && result.targetId) {
      const target = context.players.get(result.targetId);
      if (target) {
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + result.healing);
      }
    }
  }

  /**
   * Process end-of-turn effects
   * @param context - Turn context
   * @param gameEvents - Array to add events to
   */
  private processEndOfTurnEffects(context: TurnContext, gameEvents: string[]): void {
    for (const [playerId, player] of context.players) {
      // Process status effect durations
      const expiredEffects = this.systems.effectManager.processEffectDurations(playerId);

      for (const effect of expiredEffects) {
        gameEvents.push(`${player.name}'s ${effect.name} effect expired`);
      }
    }
  }

  /**
   * Determine next phase based on game state
   * @param context - Turn context
   * @returns Next game phase
   */
  private determineNextPhase(context: TurnContext): 'action' | 'results' | 'ended' {
    const alivePlayers = Array.from(context.players.values()).filter(p => p.status === 'alive');

    // Check win conditions
    if (alivePlayers.length === 0) {
      return 'ended';
    }

    if (context.monster && context.monster.hp <= 0) {
      return 'ended';
    }

    return 'results';
  }

  /**
   * Get current turn number
   * @returns Current turn number
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * Get queued action count
   * @returns Number of queued actions
   */
  getQueuedActionCount(): number {
    return this.actionQueue.length;
  }

  /**
   * Type-safe serialization
   * @returns Serializable resolver state
   */
  toJSON(): Record<string, any> {
    return {
      gameCode: this.gameCode,
      actionQueue: this.actionQueue,
      currentTurn: this.currentTurn,
    };
  }

  /**
   * Create TurnResolver from serialized data
   * @param data - Serialized resolver data
   * @param systems - Game systems
   * @returns New TurnResolver instance
   */
  static fromJSON(data: any, systems: ResolutionSystems): TurnResolver {
    const resolver = new TurnResolver(data.gameCode, systems);
    resolver.actionQueue = data.actionQueue || [];
    resolver.currentTurn = data.currentTurn || 0;
    return resolver;
  }
}

export default TurnResolver;
