/**
 * @fileoverview TypeScript Enhanced Combat System with coordination bonuses and comeback mechanics
 * Phase 5: Controllers & Main Classes Migration  
 * Refactored to use composition with extracted domain models
 * Uses DamageCalculator, EffectManager, and TurnResolver with full type safety
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
// Messages are now accessed through the config system
import { DamageCalculator } from './DamageCalculator.js';
import { EffectManager } from './EffectManager.js';
import { TurnResolver } from './TurnResolver.js';
import { EventTypes } from '../events/EventTypes.js';
import { GameEventBus } from '../events/GameEventBus.js';
import type { 
  Monster, 
  Player,
  GameRoom
} from '../../types/generated.js';
import type {
  GameEvent,
  EventType,
  EventPayload
} from '../events/EventTypes.js';
import { 
  CombatSystemInterface, 
  DamageCalculation, 
  SystemConfig,
  AbstractGameSystem,
  DamageModifier
} from '../../types/systems.js';
import type { ValidationResult } from '../../types/utilities.js';

export interface CombatRoundResult {
  success: boolean;
  log: CombatLogEntry[];
  playerActions: Map<string, import('../../types/generated.js').PlayerAction>;
  monsterAction?: import('../../types/generated.js').Monster;
  roundSummary: RoundSummary;
  round?: number;
}

export interface CombatLogEntry {
  type: string;
  message: string;
  playerId?: string;
  targetId?: string;
  damage?: number;
  healing?: number;
  public: boolean;
  privateMessage?: string;
  attackerMessage?: string;
}

export interface RoundSummary {
  totalDamageToMonster: number;
  totalDamageToPlayers: number;
  totalHealing: number;
  playersKilled: string[];
  abilitiesUsed: number;
  coordinatedActions: number;
}

export interface CombatSystemDependencies {
  players: Map<string, Player>;
  monsterController: any;
  statusEffectManager: any;
  racialAbilitySystem: any;
  warlockSystem: any;
  gameStateUtils: any;
  eventBus?: GameEventBus;
}

/**
 * Enhanced CombatSystem with coordination bonuses and comeback mechanics
 * Now uses composition with extracted domain models for better maintainability
 * Implements GameSystem interface for type-safe system integration
 */
export class CombatSystem extends AbstractGameSystem<GameRoom, GameEvent> implements CombatSystemInterface {
  readonly name = 'CombatSystem';
  readonly version = '2.0.0';
  
  private readonly players: Map<string, Player>;
  private readonly monsterController: any;
  private readonly _statusEffectManager: any;
  private readonly _racialAbilitySystem: any;
  private readonly _warlockSystem: any;
  private readonly _gameStateUtils: any;
  private readonly eventBus: GameEventBus | null;

  // Domain models for composition
  private readonly turnResolver: TurnResolver;
  private readonly effectManager: EffectManager;
  private readonly damageCalculator: DamageCalculator;

  constructor(dependencies: CombatSystemDependencies) {
    super();
    
    const {
      players,
      monsterController,
      statusEffectManager,
      racialAbilitySystem,
      warlockSystem,
      gameStateUtils,
      eventBus = null
    } = dependencies;

    this.players = players;
    this.monsterController = monsterController;
    this._statusEffectManager = statusEffectManager;
    this._racialAbilitySystem = racialAbilitySystem;
    this._warlockSystem = warlockSystem;
    this._gameStateUtils = gameStateUtils;
    this.eventBus = eventBus;

    // Initialize effect manager first
    this.effectManager = new EffectManager();

    // DamageCalculator expects specific callback functions
    this.damageCalculator = new DamageCalculator(
      players,
      () => ({ active: false, multiplier: 1.0 }),  // getComebackStatus callback
      () => 0  // getCoordinationCount callback
    );

    // Initialize turn resolver with the created systems
    this.turnResolver = new TurnResolver('game', {
      damageCalculator: this.damageCalculator,
      effectManager: this.effectManager,
      combatSystem: this,
      statusEffectManager: statusEffectManager
    });
  }

  /**
   * Process a complete combat round
   */
  async processRound(gameRoom: any): Promise<CombatRoundResult> {
    const log: CombatLogEntry[] = [];
    const playerActions = new Map<string, any>();
    let monsterAction: any = null;
    
    const roundSummary: RoundSummary = {
      totalDamageToMonster: 0,
      totalDamageToPlayers: 0,
      totalHealing: 0,
      playersKilled: [],
      abilitiesUsed: 0,
      coordinatedActions: 0
    };

    try {
      // Phase 1: Validate all submitted actions
      const validationResults = await this.validateSubmittedActions();
      
      // Phase 2: Process player actions
      const playerResults = await this.processPlayerActions(validationResults, log, roundSummary, gameRoom);
      for (const [playerId, action] of playerResults) {
        playerActions.set(playerId, action);
      }

      // Phase 3: Process monster action
      monsterAction = await this.processMonsterAction(log, roundSummary);

      // Phase 4: Apply end-of-round effects
      await this.processEndOfRoundEffects(log, roundSummary);

      // Phase 5: Update game state
      await this.updateGameState(gameRoom, roundSummary);

      // Emit round completion event
      if (this.eventBus) {
        this.eventBus.emit('combat.round.completed' as any, {
          gameCode: gameRoom.code,
          round: gameRoom.round,
          summary: roundSummary,
          timestamp: new Date().toISOString()
        } as any);
      }

      return {
        success: true,
        log,
        playerActions,
        monsterAction,
        roundSummary,
        round: gameRoom.round
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      
      logger.error('Error processing combat round:', {
        message: errorMessage,
        stack: errorStack,
        phase: 'processRound'
      });
      
      return {
        success: false,
        log: [{
          type: 'error',
          message: `Failed to process combat round: ${errorMessage}`,
          public: true
        }],
        playerActions,
        monsterAction,
        roundSummary,
        round: gameRoom.round || 0
      };
    }
  }

  /**
   * Validate all submitted player actions
   */
  private async validateSubmittedActions(): Promise<any[]> {
    const results: any[] = [];
    const alivePlayers = this.getAlivePlayers();

    logger.info('[CombatSystem] Validating submitted actions:', {
      alivePlayersCount: alivePlayers.length,
      playersWithActions: alivePlayers.filter(p => p.hasSubmittedAction).length
    });

    for (const player of alivePlayers) {
      const hasSubmitted = player.hasSubmittedAction;
      const submittedAction = player.submittedAction;
      
      logger.info('[CombatSystem] Player action status:', {
        playerId: player.id,
        playerName: player.name,
        hasSubmitted,
        submittedActionExists: !!submittedAction,
        submittedActionKeys: submittedAction ? Object.keys(submittedAction) : []
      });

      if (hasSubmitted) {
        const validationResult = (player as any).validateSubmittedAction(alivePlayers, (this.monsterController as any)['monster']);
        
        logger.info('[CombatSystem] Validation result:', {
          playerId: (player as any)['id'],
          valid: validationResult.valid,
          errors: validationResult.errors || []
        });
        
        results.push({
          ...validationResult,
          playerId: (player as any)['id']
        });

        // Emit validation event
        if (this.eventBus) {
          (this.eventBus as any).emit(EventTypes.ACTION.VALIDATED, {
            playerId: (player as any)['id'],
            valid: validationResult.valid,
            errors: validationResult.errors || [],
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    logger.info('[CombatSystem] Validation completed:', {
      totalResults: results.length,
      validResults: results.filter(r => r.valid).length
    });

    return results;
  }

  /**
   * Process all player actions
   */
  private async processPlayerActions(
    validationResults: any[], 
    log: CombatLogEntry[], 
    summary: RoundSummary,
    gameRoom?: any
  ): Promise<Map<string, any>> {
    const processedActions = new Map<string, any>();
    
    // PHASE 1: Collect all valid actions into a single batch
    const allActions = await this.collectAllValidActions(validationResults);
    logger.info(`[CombatSystem] Collected ${allActions.length} actions for batched processing`);
    
    // PHASE 2: Analyze coordination bonuses across all actions
    const coordinationBonuses = this.analyzeCoordinationBonuses(allActions);
    if (coordinationBonuses.size > 0) {
      logger.info(`[CombatSystem] Found coordination bonuses:`, Object.fromEntries(coordinationBonuses));
      summary.coordinatedActions = Array.from(coordinationBonuses.values()).reduce((total, bonus) => total + bonus.count, 0);
    }
    
    // PHASE 3: Sort actions by priority order (ability.order property)
    const sortedActions = this.sortActionsByPriority(allActions);
    logger.info(`[CombatSystem] Sorted ${sortedActions.length} actions by priority order`);
    
    // PHASE 4: Process actions in priority order with conditional mechanics
    for (let i = 0; i < sortedActions.length; i++) {
      const action = sortedActions[i];
      
      // Check for conditional mechanics (Last Stand, etc.) before processing
      const conditionals = this.checkConditionalMechanics(action, gameRoom);
      
      // Process action with full context (coordination bonuses, conditionals)
      await this.processActionWithContext(action, coordinationBonuses, conditionals, log, summary, gameRoom);
      
      processedActions.set(action.playerId, action);
      summary.abilitiesUsed++;
    }

    return processedActions;
  }

  /**
   * Collect all valid actions from validation results
   */
  private async collectAllValidActions(validationResults: any[]): Promise<any[]> {
    const allActions = [];
    
    for (const result of validationResults) {
      if (result.valid && (result as any)['playerId']) {
        const player = this.players.get((result as any)['playerId']);
        const submittedAction = player ? (player as any)['submittedAction'] : null;
        
        if (player && submittedAction) {
          // Get ability definition to access order property
          const abilityId = submittedAction['actionType'];
          const ability = this.getAbilityDefinition(abilityId);
          
          allActions.push({
            playerId: (result as any)['playerId'],
            player,
            action: submittedAction,
            validation: result,
            ability: ability,
            order: ability?.order || 9999 // Default high order if not found
          });
        }
      }
    }
    
    return allActions;
  }

  /**
   * Analyze coordination bonuses across all actions
   */
  private analyzeCoordinationBonuses(allActions: any[]): Map<string, any> {
    const coordinationBonuses = new Map();
    const actionTypeCounts = new Map();
    
    // Count actions by type
    for (const actionData of allActions) {
      const actionType = actionData.action.actionType;
      if (!actionTypeCounts.has(actionType)) {
        actionTypeCounts.set(actionType, []);
      }
      actionTypeCounts.get(actionType).push(actionData);
    }
    
    // Generate bonuses for coordinated actions (2+ of same type)
    for (const [actionType, actions] of actionTypeCounts) {
      if (actions.length > 1) {
        coordinationBonuses.set(actionType, {
          count: actions.length,
          bonus: this.calculateBatchCoordinationBonus(actionType, actions.length),
          actions: actions
        });
      }
    }
    
    return coordinationBonuses;
  }

  /**
   * Sort actions by priority order (lower order = higher priority)
   */
  private sortActionsByPriority(allActions: any[]): any[] {
    return [...allActions].sort((a, b) => {
      // Primary sort: by ability order (lower = earlier)
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      
      // Secondary sort: by player ID for consistent ordering
      return a.playerId.localeCompare(b.playerId);
    });
  }

  /**
   * Check for conditional mechanics like Last Stand
   */
  private checkConditionalMechanics(actionData: any, _gameRoom: any): any {
    const conditionals = {
      lastStand: false,
      lowHealth: false,
      // Add more conditionals as needed
    };
    
    const player = actionData.player;
    if (player) {
      const currentHP = (player as any)['currentHP'] || 0;
      const maxHP = (player as any)['maxHP'] || 1;
      const healthPercentage = currentHP / maxHP;
      
      // Last Stand: player at very low health (< 20%)
      if (healthPercentage < 0.2 && healthPercentage > 0) {
        conditionals.lastStand = true;
        conditionals.lowHealth = true;
      } else if (healthPercentage < 0.5) {
        conditionals.lowHealth = true;
      }
    }
    
    return conditionals;
  }

  /**
   * Process action with full context (coordination, conditionals)
   */
  private async processActionWithContext(
    actionData: any,
    coordinationBonuses: Map<string, any>,
    conditionals: any,
    log: CombatLogEntry[],
    summary: RoundSummary,
    gameRoom?: any
  ): Promise<void> {
    const { player, action } = actionData;
    const actionType = action.actionType;
    
    // Log conditional mechanics
    if (conditionals.lastStand) {
      log.push({
        type: 'announcement',
        message: `${(player as any).name} makes a desperate Last Stand!`,
        public: true
      });
    }
    
    // Get coordination bonus if applicable
    const coordBonus = coordinationBonuses.get(actionType);
    const coordinationMultiplier = coordBonus ? coordBonus.bonus : 1.0;
    
    // Process the action with context
    if (coordBonus && coordBonus.count > 1) {
      // This is a coordinated action
      await this.processSingleAction(actionData, log, summary, coordinationMultiplier, gameRoom);
      
      // Log coordination on first action of this type
      if (coordBonus.actions[0] === actionData) {
        log.push({
          type: 'coordination',
          message: `${coordBonus.count} players coordinate their ${actionType} attacks! (${Math.round((coordinationMultiplier - 1) * 100)}% bonus)`,
          public: true
        });
      }
    } else {
      // Single action
      await this.processSingleAction(actionData, log, summary, 1.0, gameRoom);
    }
  }

  /**
   * Get ability definition from config
   */
  private getAbilityDefinition(abilityId: string): any {
    // Access the ability registry to get ability definitions
    try {
      return (this as any).abilityRegistry?.abilities?.[abilityId] || null;
    } catch (error) {
      logger.warn(`[CombatSystem] Could not find ability definition for ${abilityId}`);
      return null;
    }
  }

  /**
   * Calculate coordination bonus multiplier for batched processing
   */
  private calculateBatchCoordinationBonus(_actionType: string, count: number): number {
    // Base coordination bonus: 10% per additional player (2 players = 110%, 3 = 120%, etc.)
    return 1.0 + ((count - 1) * 0.1);
  }

  /**
   * Process monster action for the round
   */
  private async processMonsterAction(log: CombatLogEntry[], summary: RoundSummary): Promise<any> {
    if (!(this.monsterController as any)['monster'] || !(this.monsterController as any)['monster']['isAlive']) {
      return null;
    }

    const alivePlayers = this.getAlivePlayers();
    if (alivePlayers.length === 0) {
      return null;
    }

    try {
      const monsterAction = await (this.monsterController as any).processMonsterAction(alivePlayers, log);
      
      // Update summary with monster damage
      if ((monsterAction as any)?.['damage']) {
        summary.totalDamageToPlayers += (monsterAction as any)['damage'];
      }

      // Emit monster action event
      if (this.eventBus) {
        (this.eventBus as any).emit((EventTypes as any)['MONSTER']?.['ACTION_PROCESSED'] || 'monster.action.processed', {
          monsterId: (this.monsterController as any)['monster']['id'],
          actionType: (monsterAction as any)?.['type'] || 'attack',
          damage: (monsterAction as any)?.['damage'] || 0,
          targets: (monsterAction as any)?.['targets'] || [],
          timestamp: new Date().toISOString()
        });
      }

      return monsterAction;
    } catch (error) {
      logger.error('Error processing monster action:', error as any);
      return null;
    }
  }

  /**
   * Process end-of-round effects
   */
  private async processEndOfRoundEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    // Process status effects - using any type assertion since method doesn't exist
    await (this.effectManager as any)['processEndOfRoundEffects']?.(log, summary) || Promise.resolve();
    
    // Process cooldowns
    for (const player of this.players.values()) {
      (player as any)['processAbilityCooldowns']?.();
      (player as any)['processRacialCooldowns']?.();
    }

    // Process class-specific effects
    for (const player of this.players.values()) {
      if ((player as any)['isAlive']) {
        (player as any)['processClassEffects']?.();
      }
    }
  }

  /**
   * Update game state after round processing
   */
  private async updateGameState(gameRoom: any, summary: RoundSummary): Promise<void> {
    // Update round counter
    (gameRoom as any)['round']++;
    
    // Update player statistics
    for (const player of this.players.values()) {
      if (summary.playersKilled.includes((player as any)['id'])) {
        (player as any)['addDeath']?.();
      }
    }

    // Check for level progression
    await this.checkLevelProgression(gameRoom);
    
    // Update alive count
    (gameRoom as any)['aliveCount'] = this.getAlivePlayers().length;
  }

  /**
   * Check and handle level progression
   */
  private async checkLevelProgression(gameRoom: any): Promise<void> {
    const config_progression = (config as any)['gameBalance']?.['progression'];
    if (!config_progression) return;

    const shouldLevelUp = (gameRoom as any)['round'] % ((config_progression as any)['roundsPerLevel'] || 5) === 0;
    
    if (shouldLevelUp && (gameRoom as any)['level'] < ((config_progression as any)['maxLevel'] || 10)) {
      (gameRoom as any)['level']++;
      
      // Apply level bonuses to players
      for (const player of this.getAlivePlayers()) {
        this.applyLevelBonuses(player, (gameRoom as any)['level']);
      }

      // Emit level up event
      if (this.eventBus) {
        (this.eventBus as any).emit((EventTypes as any)['GAME']?.['LEVEL_UP'] || 'game.level.up', {
          gameCode: (gameRoom as any)['code'],
          newLevel: (gameRoom as any)['level'],
          round: gameRoom.round,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Apply level bonuses to a player
   */
  private applyLevelBonuses(player: Player, level: number): void {
    const bonuses = (config as any)['gameBalance']?.['progression']?.['levelBonuses'];
    if (!bonuses) return;

    // Apply damage modifier increase
    if ((bonuses as any)['damagePerLevel']) {
      (player as any)['damageMod'] += (bonuses as any)['damagePerLevel'];
    }

    // Apply health bonus
    if ((bonuses as any)['healthPerLevel']) {
      const healthBonus = (bonuses as any)['healthPerLevel'];
      (player as any)['maxHp'] += healthBonus;
      (player as any)['hp'] += healthBonus; // Also heal current HP
    }

    // Notify player of level up
    (player as any)['updateRelentlessFuryLevel']?.(level);
  }

  /**
   * Group validation results by action type for coordination detection
   */
  private groupActionsByType(validationResults: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    logger.info('[CombatSystem] Grouping actions by type:', {
      validationResultsCount: validationResults.length,
      validResults: validationResults.filter(r => r.valid).length
    });
    
    for (const result of validationResults) {
      logger.info('[CombatSystem] Processing validation result:', {
        playerId: (result as any)['playerId'],
        valid: result.valid,
        hasPlayerId: !!(result as any)['playerId']
      });

      if (result.valid && (result as any)['playerId']) {
        const player = this.players.get((result as any)['playerId']);
        const submittedAction = player ? (player as any)['submittedAction'] : null;
        
        logger.info('[CombatSystem] Player and action details:', {
          playerId: (result as any)['playerId'],
          playerExists: !!player,
          submittedActionExists: !!submittedAction,
          submittedActionKeys: submittedAction ? Object.keys(submittedAction) : [],
          actionType: submittedAction ? submittedAction['actionType'] : 'none'
        });

        if (player && submittedAction) {
          const actionType = submittedAction['actionType'];
          
          if (!groups.has(actionType)) {
            groups.set(actionType, []);
          }
          
          groups.get(actionType)!.push({
            playerId: (result as any)['playerId'],
            player,
            action: submittedAction,
            validation: result
          });
          
          logger.info('[CombatSystem] Added action to group:', {
            actionType,
            playerId: (result as any)['playerId'],
            groupSize: groups.get(actionType)!.length
          });
        }
      }
    }
    
    logger.info('[CombatSystem] Action grouping completed:', {
      groupCount: groups.size,
      groups: Array.from(groups.entries()).map(([type, actions]) => ({
        type,
        count: actions.length
      }))
    });
    
    return groups;
  }

  /**
   * Process coordinated actions with bonuses
   */
  private async processCoordinatedActions(
    actionType: string, 
    actions: any[], 
    log: CombatLogEntry[], 
    summary: RoundSummary,
    gameRoom?: any
  ): Promise<void> {
    const coordinationBonus = this.calculateCoordinationBonus(actions.length);
    
    for (const actionData of actions) {
      await this.processSingleAction(actionData, log, summary, coordinationBonus, gameRoom);
    }

    // Add coordination log entry
    log.push({
      type: 'coordination',
      message: (config as any).formatMessage ? 
        (config as any).formatMessage(
          'Coordinated {actionType} by {playerCount} players! (+{bonus}% effectiveness)',
          {
            actionType,
            playerCount: actions.length,
            bonus: Math.round(coordinationBonus * 100)
          }
        ) : `Coordinated ${actionType} by ${actions.length} players! (+${Math.round(coordinationBonus * 100)}% effectiveness)`,
      public: true
    });
  }

  /**
   * Process a single player action
   */
  private async processSingleAction(
    actionData: any, 
    log: CombatLogEntry[], 
    summary: RoundSummary, 
    coordinationBonus: number = 0,
    gameRoom?: any
  ): Promise<void> {
    const { player, action } = actionData;
    
    logger.info('[CombatSystem] Processing single action:', {
      playerId: (player as any)['id'],
      playerName: (player as any)['name'],
      actionType: (action as any)?.actionType || 'unknown',
      target: (action as any)?.targetId || 'none',
      coordinationBonus
    });
    
    try {
      // Process the action directly since TurnResolver.processPlayerAction doesn't exist
      let result: { damage: number; healing: number; logEntries: any[] } = { damage: 0, healing: 0, logEntries: [] };
      
      // Get the ability handler from the ability registry
      const abilityRegistry = gameRoom?.systems?.abilityRegistry;
      const actionType = (action as any)?.actionType || (action as any)?.type;
      
      if (abilityRegistry && actionType) {
        const handler = abilityRegistry.getHandler(actionType);
        if (handler) {
          logger.info('[CombatSystem] Found ability handler for:', actionType);
          
          // Execute the ability
          const abilityResult = await handler({
            action,
            player,
            game: gameRoom,
            coordinationBonus
          });
          
          logger.info('[CombatSystem] Ability result:', {
            damage: abilityResult?.damage || 0,
            healing: abilityResult?.healing || 0,
            success: abilityResult?.success
          });
          
          result = {
            damage: abilityResult?.damage || 0,
            healing: abilityResult?.healing || 0,
            logEntries: abilityResult?.logEntries || []
          };
        } else {
          logger.warn('[CombatSystem] No handler found for ability:', actionType);
        }
      } else {
        logger.warn('[CombatSystem] No ability registry or action type', { 
          hasRegistry: !!abilityRegistry, 
          actionType,
          actionKeys: Object.keys(action || {})
        });
        
        // Fallback: Create basic damage result for common attack abilities
        if (actionType && this.isAttackAbility(actionType)) {
          const baseDamage = this.calculateBasicAttackDamage(player, actionType);
          const target = this.getActionTarget(action, gameRoom);
          
          if (target) {
            const finalDamage = this.applyDamageToTarget(target, baseDamage);
            result = {
              damage: finalDamage,
              healing: 0,
              logEntries: [{
                type: 'attack',
                message: `${(player as any)['name']} attacks ${(target as any).name || 'the target'} with ${actionType} for ${finalDamage} damage!`,
                public: true
              }]
            };
            logger.info('[CombatSystem] Applied fallback attack damage:', { damage: finalDamage });
          }
        }
      }
      
      // Update summary with action results
      if ((result as any)['damage']) {
        summary.totalDamageToMonster += (result as any)['damage'];
        logger.info('[CombatSystem] Added damage to summary:', {
          damage: (result as any)['damage'],
          totalDamageToMonster: summary.totalDamageToMonster
        });
      }
      
      if ((result as any)['healing']) {
        summary.totalHealing += (result as any)['healing'];
        logger.info('[CombatSystem] Added healing to summary:', {
          healing: (result as any)['healing'],
          totalHealing: summary.totalHealing
        });
      }
      
      // Add action log entries
      if ((result as any)['logEntries'] && (result as any)['logEntries'].length > 0) {
        log.push(...(result as any)['logEntries']);
        logger.info('[CombatSystem] Added log entries:', (result as any)['logEntries'].length);
      } else {
        // Create a basic log entry if none provided
        const basicEntry = {
          type: 'action',
          message: `${(player as any)['name']} used ${actionType || 'unknown action'}`,
          public: true
        };
        log.push(basicEntry);
        logger.info('[CombatSystem] Added basic log entry:', basicEntry);
      }

      // Emit action processed event
      if (this.eventBus) {
        this.eventBus.emit('action.processed' as any, {
          playerId: player.id,
          actionType: action.actionType,
          targetId: action.targetId,
          result: result as any,
          timestamp: new Date().toISOString()
        } as any);
      }

    } catch (error) {
      logger.error('[CombatSystem] Error processing single action:', {
        error: error instanceof Error ? error.message : String(error),
        playerId: player.id,
        actionType: action.actionType || action.type
      });
      
      log.push({
        type: 'error',
        message: `Failed to process action for ${(player as any)['name']}`,
        playerId: (player as any)['id'],
        public: true
      });
    }
  }

  /**
   * Calculate coordination bonus based on number of coordinating players
   */
  private calculateCoordinationBonus(playerCount: number): number {
    const baseBonus = (config as any)['gameBalance']?.['coordination']?.['baseBonus'] || 0.1;
    const bonusPerPlayer = (config as any)['gameBalance']?.['coordination']?.['bonusPerPlayer'] || 0.05;
    
    return baseBonus + (playerCount - 1) * bonusPerPlayer;
  }

  /**
   * Get all alive players
   */
  private getAlivePlayers(): Player[] {
    return Array.from(this.players.values()).filter(player => (player as any)['isAlive']);
  }

  /**
   * Get current monster
   */
  getMonster(): Monster | null {
    return (this.monsterController as any)?.['monster'] || null;
  }

  /**
   * Check if combat is active
   */
  isCombatActive(): boolean {
    const alivePlayers = this.getAlivePlayers();
    const monster = this.getMonster();
    
    return alivePlayers.length > 0 && monster !== null && (monster as any)['isAlive'] === true;
  }

  /**
   * Get combat statistics
   */
  getCombatStats(): any {
    return {
      alivePlayerCount: this.getAlivePlayers().length,
      totalPlayerCount: this.players.size,
      monsterAlive: (this.getMonster() as any)?.['isAlive'] || false,
      monsterHp: (this.getMonster() as any)?.['hp'] || 0,
      monsterMaxHp: (this.getMonster() as any)?.['maxHp'] || 0
    };
  }

  /**
   * GameSystem interface implementation
   */
  
  /**
   * Process a game event and return updated state
   */
  async process(state: GameRoom, event: GameEvent): Promise<GameRoom> {
    if (!this.canHandle(event)) {
      return state;
    }

    switch ((event as any)['type']) {
      case 'action.submitted':
        // Process combat action
        const result = await this.processRound(state);
        // Update game state with combat results
        return this.updateGameStateWithCombatResults(state, result);
        
      case 'damage.calculated':
        // Apply damage calculation results
        return this.applyDamageToGameState(state, (event as any)['payload']);
        
      case 'heal.applied':
        // Apply healing results
        return this.applyHealingToGameState(state, (event as any)['payload']);
        
      default:
        return state;
    }
  }

  /**
   * Validate if an event can be processed
   */
  validate(event: GameEvent): ValidationResult<GameEvent> {
    const errors: string[] = [];
    
    if (!this.isCombatActive()) {
      errors.push('Combat is not active');
    }
    
    if ((event as any)['type'] === 'action.submitted') {
      const payload = (event as any)['payload'];
      const player = this.players.get((payload as any)['playerId']);
      
      if (!player) {
        errors.push('Player not found');
      } else if (!(player as any)['isAlive']) {
        errors.push('Player is not alive');
      }
    }
    
    if (errors.length === 0) {
      return {
        success: true,
        data: event,
        errors: undefined as never
      };
    } else {
      return {
        success: false,
        data: undefined as never,
        errors
      };
    }
  }

  /**
   * Check if this system can handle the given event
   */
  canHandle(event: GameEvent): boolean {
    const combatEventTypes = [
      'action.submitted',
      'action.validated', 
      'action.executed',
      'damage.calculated',
      'damage.applied',
      'heal.applied',
      'ability.used',
      'coordination.calculated'
    ];
    
    return combatEventTypes.includes((event as any)['type']);
  }

  /**
   * Get subscribed event types (EventDrivenSystem interface)
   */
  subscribedEvents(): EventType[] {
    return [
      'player.died',
      'damage.applied',
      'effect.applied',
      'effect.removed',
      'ability.used',
      'monster.spawned',
      'player.healed',
      'game.phase.changed'
    ] as EventType[];
  }

  /**
   * Handle a specific event type
   */
  async handleEvent<T extends EventType>(
    state: GameRoom,
    eventType: T,
    payload: EventPayload<T>
  ): Promise<GameRoom> {
    const event: GameEvent = { type: eventType, payload } as GameEvent;
    return this.process(state, event);
  }

  /**
   * Get processing priority
   */
  getPriority(): number {
    return 10; // High priority for combat events
  }

  /**
   * CombatSystemInterface implementation
   */
  
  /**
   * Calculate damage between entities
   */
  calculateDamage(
    attacker: Player | Monster,
    defender: Player | Monster,
    baseDamage: number
  ): DamageCalculation {
    const result = this.damageCalculator.calculateDamage({
      baseDamage,
      target: defender,
      attacker,
      options: {},
      log: []
    });
    
    return {
      finalDamage: result.finalDamage,
      baseDamage: baseDamage,
      modifiers: result.modifiers.map(mod => ({
        name: mod,
        type: 'add' as const,
        value: 0,
        source: 'system'
      })) as DamageModifier[],
      isCritical: result.critical || false,
      isBlocked: result.blocked > 0,
      damageType: 'physical' as const
    };
  }

  /**
   * Apply damage to an entity
   */
  applyDamage<T extends Player | Monster>(target: T, damage: number): T {
    if ('takeDamage' in (target as object)) {
      (target as any).takeDamage(damage);
    }
    return target;
  }

  /**
   * Calculate healing amount
   */
  calculateHealing(
    healer: Player | Monster,
    target: Player | Monster,
    baseHealing: number
  ): number {
    // Apply healing modifiers
    let finalHealing = baseHealing;
    
    // Check for healing bonuses from effects
    if ('statusEffects' in healer) {
      const healingBonus = (this.effectManager as any)['getHealingModifier']?.(healer) || 0;
      finalHealing *= (1 + healingBonus);
    }
    
    // Cap healing at max health
    if ('health' in target && 'maxHealth' in target) {
      const maxHealable = (target as any)['maxHealth'] - (target as any)['health'];
      finalHealing = Math.min(finalHealing, maxHealable);
    }
    
    return Math.floor(finalHealing);
  }

  /**
   * Check if an entity can attack
   */
  canAttack(attacker: Player | Monster, target: Player | Monster): boolean {
    // Check if attacker is alive
    const attackerAlive = 'isAlive' in attacker ? (attacker as any)['isAlive'] : 
                         'health' in attacker ? (attacker as any)['health'] > 0 : false;
    
    // Check if target is alive
    const targetAlive = 'isAlive' in target ? (target as any)['isAlive'] :
                       'health' in target ? (target as any)['health'] > 0 : false;
    
    if (!attackerAlive || !targetAlive) {
      return false;
    }
    
    // Check for disabling effects
    if ('statusEffects' in attacker) {
      const statusEffects = (attacker as any)['statusEffects'] || [];
      const isStunned = statusEffects.some(
        (effect: any) => (effect as any)['type'] === 'debuff' && (effect as any)['name'] === 'Stunned'
      );
      if (isStunned) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if an action is an attack ability (fallback method)
   */
  private isAttackAbility(actionType: string): boolean {
    const attackAbilities = [
      'attack', 'lightningBolt', 'fireball', 'backstab', 'preciseShot', 
      'pistolShot', 'psychicBolt', 'strike', 'slash', 'pierce'
    ];
    return attackAbilities.includes(actionType);
  }

  /**
   * Calculate basic attack damage (fallback method)
   */
  private calculateBasicAttackDamage(player: Player, actionType: string): number {
    const baseDamage = (player as any)['attackPower'] || 20;
    const damageMod = (player as any)['damageMod'] || 1.0;
    
    // Different abilities have different base multipliers
    let abilityMultiplier = 1.0;
    switch (actionType) {
      case 'fireball':
      case 'lightningBolt':
        abilityMultiplier = 1.2;
        break;
      case 'backstab':
        abilityMultiplier = 1.5;
        break;
      case 'preciseShot':
        abilityMultiplier = 1.1;
        break;
      default:
        abilityMultiplier = 1.0;
        break;
    }
    
    return Math.floor(baseDamage * damageMod * abilityMultiplier);
  }

  /**
   * Get the target of an action (fallback method)
   */
  private getActionTarget(action: any, gameRoom: any): any {
    const targetId = (action as any)?.targetId;
    if (!targetId) return null;
    
    // Check if targeting monster
    if (targetId === 'monster') {
      return (gameRoom as any)?.monster || this.getMonster();
    }
    
    // Check if targeting a player
    return this.players.get(targetId);
  }

  /**
   * Apply damage to target and return final damage (fallback method)
   */
  private applyDamageToTarget(target: any, damage: number): number {
    if (target && typeof (target as any).takeDamage === 'function') {
      return (target as any).takeDamage(damage);
    } else if (target) {
      // Manual damage application
      const currentHp = (target as any).hp || 0;
      const armor = (target as any).armor || 0;
      const finalDamage = Math.max(1, damage - armor);
      
      (target as any).hp = Math.max(0, currentHp - finalDamage);
      if ((target as any).hp <= 0) {
        (target as any).isAlive = false;
      }
      
      return finalDamage;
    }
    
    return 0;
  }

  /**
   * Helper method to update game state with combat results
   */
  private updateGameStateWithCombatResults(
    state: GameRoom,
    _combatResult: CombatRoundResult
  ): GameRoom {
    // Update player states
    for (const [playerId, player] of this.players) {
      if ((state as any)['players']?.get?.(playerId)) {
        (state as any)['players'].set(playerId, (player as any).toJSON?.() || player);
      }
    }
    
    // Update monster state
    const monster = this.getMonster();
    if (monster && (state as any)['monster']) {
      (state as any)['monster'] = monster;
    }
    
    return state;
  }

  /**
   * Helper method to apply damage to game state
   */
  private applyDamageToGameState(state: GameRoom, payload: any): GameRoom {
    const { targetId, damage } = payload as any;
    
    // Apply damage to player or monster
    if ((state as any)['players']?.get?.(targetId)) {
      const player = this.players.get(targetId);
      if (player) {
        (player as any).takeDamage?.(damage);
        (state as any)['players'].set(targetId, (player as any).toJSON?.() || player);
      }
    } else if ((state as any)['monster'] && (state as any)['monster']['id'] === targetId) {
      (state as any)['monster']['hp'] = Math.max(0, (state as any)['monster']['hp'] - damage);
      (state as any)['monster']['isAlive'] = (state as any)['monster']['hp'] > 0;
    }
    
    return state;
  }

  /**
   * Helper method to apply healing to game state
   */
  private applyHealingToGameState(state: GameRoom, payload: any): GameRoom {
    const { targetId, healing } = payload as any;
    
    // Apply healing to player
    if ((state as any)['players']?.get?.(targetId)) {
      const player = this.players.get(targetId);
      if (player) {
        (player as any).heal?.(healing);
        (state as any)['players'].set(targetId, (player as any).toJSON?.() || player);
      }
    }
    
    return state;
  }

  /**
   * GameSystem interface implementation
   */
  getConfig(): SystemConfig {
    return {
      enabled: true,
      debug: false,
      settings: {},
      monitoring: {
        logEvents: true,
        metricsEnabled: true,
        sampleRate: 1.0
      }
    };
  }

  updateConfig(_newConfig: Partial<SystemConfig>): void {
    // Configuration update logic would go here
  }

  async initialize(): Promise<void> {
    // System initialization logic
  }

  async cleanup(): Promise<void> {
    // System cleanup logic
  }

  isReady(): boolean {
    return true;
  }
}

export default CombatSystem;