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
import { Player } from '../Player.js';
import type { 
  Monster, 
  ActionResult, 
  ValidationResult,
  PlayerAction,
  GameRoom,
  GameEvent,
  EventType,
  EventPayload
} from '../../types/generated.js';
import { 
  CombatSystemInterface, 
  DamageCalculation, 
  SystemConfig,
  AbstractGameSystem 
} from '../../types/systems.js';

export interface CombatRoundResult {
  success: boolean;
  log: CombatLogEntry[];
  playerActions: Map<string, any>;
  monsterAction?: any;
  roundSummary: RoundSummary;
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
  private readonly statusEffectManager: any;
  private readonly racialAbilitySystem: any;
  private readonly warlockSystem: any;
  private readonly gameStateUtils: any;
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
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.warlockSystem = warlockSystem;
    this.gameStateUtils = gameStateUtils;
    this.eventBus = eventBus;

    // Initialize domain models with proper typing
    this.turnResolver = new TurnResolver({
      players,
      monsterController,
      warlockSystem,
      gameStateUtils,
      eventBus
    });

    this.effectManager = new EffectManager({
      players,
      statusEffectManager,
      racialAbilitySystem,
      warlockSystem,
      gameStateUtils,
      eventBus
    });

    this.damageCalculator = new DamageCalculator({
      players,
      monsterController,
      statusEffectManager,
      eventBus
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
      const playerResults = await this.processPlayerActions(validationResults, log, roundSummary);
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
        this.eventBus.emit(EventTypes.COMBAT.ROUND_COMPLETED, {
          gameCode: gameRoom.code,
          round: gameRoom.round,
          summary: roundSummary,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        log,
        playerActions,
        monsterAction,
        roundSummary
      };

    } catch (error) {
      logger.error('Error processing combat round:', error);
      
      return {
        success: false,
        log: [{
          type: 'error',
          message: 'Failed to process combat round',
          public: true
        }],
        playerActions,
        monsterAction,
        roundSummary
      };
    }
  }

  /**
   * Validate all submitted player actions
   */
  private async validateSubmittedActions(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const alivePlayers = this.getAlivePlayers();

    for (const player of alivePlayers) {
      if ((player as any).hasSubmittedAction) {
        const validationResult = player.validateSubmittedAction(alivePlayers, this.monsterController.monster);
        results.push({
          ...validationResult,
          playerId: player.id
        });

        // Emit validation event
        if (this.eventBus) {
          this.eventBus.emit(EventTypes.ACTION.VALIDATED, {
            playerId: player.id,
            valid: validationResult.valid,
            errors: validationResult.errors || [],
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return results;
  }

  /**
   * Process all player actions
   */
  private async processPlayerActions(
    validationResults: ValidationResult[], 
    log: CombatLogEntry[], 
    summary: RoundSummary
  ): Promise<Map<string, any>> {
    const processedActions = new Map<string, any>();
    
    // Group actions by type for coordination detection
    const actionGroups = this.groupActionsByType(validationResults);
    
    // Process coordinated actions first
    for (const [actionType, actions] of actionGroups) {
      if (actions.length > 1) {
        summary.coordinatedActions += actions.length;
        await this.processCoordinatedActions(actionType, actions, log, summary);
      } else {
        await this.processSingleAction(actions[0], log, summary);
      }
      
      for (const action of actions) {
        processedActions.set(action.playerId, action);
        summary.abilitiesUsed++;
      }
    }

    return processedActions;
  }

  /**
   * Process monster action for the round
   */
  private async processMonsterAction(log: CombatLogEntry[], summary: RoundSummary): Promise<any> {
    if (!this.monsterController.monster || !this.monsterController.monster.isAlive) {
      return null;
    }

    const alivePlayers = this.getAlivePlayers();
    if (alivePlayers.length === 0) {
      return null;
    }

    try {
      const monsterAction = await this.monsterController.processMonsterAction(alivePlayers, log);
      
      // Update summary with monster damage
      if (monsterAction?.damage) {
        summary.totalDamageToPlayers += monsterAction.damage;
      }

      // Emit monster action event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.MONSTER.ACTION_PROCESSED, {
          monsterId: this.monsterController.monster.id,
          actionType: monsterAction?.type || 'attack',
          damage: monsterAction?.damage || 0,
          targets: monsterAction?.targets || [],
          timestamp: new Date().toISOString()
        });
      }

      return monsterAction;
    } catch (error) {
      logger.error('Error processing monster action:', error);
      return null;
    }
  }

  /**
   * Process end-of-round effects
   */
  private async processEndOfRoundEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    // Process status effects
    await this.effectManager.processEndOfRoundEffects(log, summary);
    
    // Process cooldowns
    for (const player of this.players.values()) {
      player.processAbilityCooldowns();
      player.processRacialCooldowns();
    }

    // Process class-specific effects
    for (const player of this.players.values()) {
      if (player.isAlive) {
        player.processClassEffects();
      }
    }
  }

  /**
   * Update game state after round processing
   */
  private async updateGameState(gameRoom: any, summary: RoundSummary): Promise<void> {
    // Update round counter
    gameRoom.round++;
    
    // Update player statistics
    for (const player of this.players.values()) {
      if (summary.playersKilled.includes(player.id)) {
        player.addDeath();
      }
    }

    // Check for level progression
    await this.checkLevelProgression(gameRoom);
    
    // Update alive count
    gameRoom.aliveCount = this.getAlivePlayers().length;
  }

  /**
   * Check and handle level progression
   */
  private async checkLevelProgression(gameRoom: any): Promise<void> {
    const config_progression = config.gameBalance?.progression;
    if (!config_progression) return;

    const shouldLevelUp = gameRoom.round % (config_progression.roundsPerLevel || 5) === 0;
    
    if (shouldLevelUp && gameRoom.level < (config_progression.maxLevel || 10)) {
      gameRoom.level++;
      
      // Apply level bonuses to players
      for (const player of this.getAlivePlayers()) {
        this.applyLevelBonuses(player, gameRoom.level);
      }

      // Emit level up event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.GAME.LEVEL_UP, {
          gameCode: gameRoom.code,
          newLevel: gameRoom.level,
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
    const bonuses = config.gameBalance?.progression?.levelBonuses;
    if (!bonuses) return;

    // Apply damage modifier increase
    if (bonuses.damagePerLevel) {
      player.damageMod += bonuses.damagePerLevel;
    }

    // Apply health bonus
    if (bonuses.healthPerLevel) {
      const healthBonus = bonuses.healthPerLevel;
      player.maxHp += healthBonus;
      player.hp += healthBonus; // Also heal current HP
    }

    // Notify player of level up
    player.updateRelentlessFuryLevel(level);
  }

  /**
   * Group validation results by action type for coordination detection
   */
  private groupActionsByType(validationResults: ValidationResult[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const result of validationResults) {
      if (result.valid && result.playerId) {
        const player = this.players.get(result.playerId);
        if (player && (player as any).submittedAction) {
          const actionType = (player as any).submittedAction.actionType;
          
          if (!groups.has(actionType)) {
            groups.set(actionType, []);
          }
          
          groups.get(actionType)!.push({
            playerId: result.playerId,
            player,
            action: (player as any).submittedAction,
            validation: result
          });
        }
      }
    }
    
    return groups;
  }

  /**
   * Process coordinated actions with bonuses
   */
  private async processCoordinatedActions(
    actionType: string, 
    actions: any[], 
    log: CombatLogEntry[], 
    summary: RoundSummary
  ): Promise<void> {
    const coordinationBonus = this.calculateCoordinationBonus(actions.length);
    
    for (const actionData of actions) {
      await this.processSingleAction(actionData, log, summary, coordinationBonus);
    }

    // Add coordination log entry
    log.push({
      type: 'coordination',
      message: config.formatMessage(
        'Coordinated {actionType} by {playerCount} players! (+{bonus}% effectiveness)',
        {
          actionType,
          playerCount: actions.length,
          bonus: Math.round(coordinationBonus * 100)
        }
      ),
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
    coordinationBonus: number = 0
  ): Promise<void> {
    const { player, action } = actionData;
    
    try {
      // Use TurnResolver to process the action
      const result = await this.turnResolver.processPlayerAction(
        player, 
        action, 
        coordinationBonus
      );
      
      // Update summary with action results
      if (result.damage) {
        summary.totalDamageToMonster += result.damage;
      }
      
      if (result.healing) {
        summary.totalHealing += result.healing;
      }
      
      // Add action log entries
      if (result.logEntries) {
        log.push(...result.logEntries);
      }

      // Emit action processed event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.ACTION.PROCESSED, {
          playerId: player.id,
          actionType: action.actionType,
          targetId: action.targetId,
          result,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error(`Error processing action for player ${player.id}:`, error);
      
      log.push({
        type: 'error',
        message: `Failed to process action for ${player.name}`,
        playerId: player.id,
        public: true
      });
    }
  }

  /**
   * Calculate coordination bonus based on number of coordinating players
   */
  private calculateCoordinationBonus(playerCount: number): number {
    const baseBonus = config.gameBalance?.coordination?.baseBonus || 0.1;
    const bonusPerPlayer = config.gameBalance?.coordination?.bonusPerPlayer || 0.05;
    
    return baseBonus + (playerCount - 1) * bonusPerPlayer;
  }

  /**
   * Get all alive players
   */
  private getAlivePlayers(): Player[] {
    return Array.from(this.players.values()).filter(player => player.isAlive);
  }

  /**
   * Get current monster
   */
  getMonster(): Monster | null {
    return this.monsterController?.monster || null;
  }

  /**
   * Check if combat is active
   */
  isCombatActive(): boolean {
    const alivePlayers = this.getAlivePlayers();
    const monster = this.getMonster();
    
    return alivePlayers.length > 0 && monster && monster.isAlive;
  }

  /**
   * Get combat statistics
   */
  getCombatStats(): any {
    return {
      alivePlayerCount: this.getAlivePlayers().length,
      totalPlayerCount: this.players.size,
      monsterAlive: this.getMonster()?.isAlive || false,
      monsterHp: this.getMonster()?.hp || 0,
      monsterMaxHp: this.getMonster()?.maxHp || 0
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

    switch (event.type) {
      case EventTypes.ACTION.SUBMITTED:
        // Process combat action
        const result = await this.processRound();
        // Update game state with combat results
        return this.updateGameStateWithCombatResults(state, result);
        
      case EventTypes.DAMAGE.CALCULATED:
        // Apply damage calculation results
        return this.applyDamageToGameState(state, event.payload);
        
      case EventTypes.HEAL.APPLIED:
        // Apply healing results
        return this.applyHealingToGameState(state, event.payload);
        
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
    
    if (event.type === EventTypes.ACTION.SUBMITTED) {
      const payload = event.payload as any;
      const player = this.players.get(payload.playerId);
      
      if (!player) {
        errors.push('Player not found');
      } else if (!player.isAlive) {
        errors.push('Player is not alive');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 100 : 0
    };
  }

  /**
   * Check if this system can handle the given event
   */
  canHandle(event: GameEvent): boolean {
    const combatEventTypes = [
      EventTypes.ACTION.SUBMITTED,
      EventTypes.ACTION.VALIDATED,
      EventTypes.ACTION.EXECUTED,
      EventTypes.DAMAGE.CALCULATED,
      EventTypes.DAMAGE.APPLIED,
      EventTypes.HEAL.APPLIED,
      EventTypes.ABILITY.USED,
      EventTypes.COORDINATION.CALCULATED
    ];
    
    return combatEventTypes.includes(event.type);
  }

  /**
   * Get subscribed event types (EventDrivenSystem interface)
   */
  subscribedEvents(): EventType[] {
    return [
      EventTypes.ACTION.SUBMITTED,
      EventTypes.ACTION.VALIDATED,
      EventTypes.ACTION.EXECUTED,
      EventTypes.DAMAGE.CALCULATED,
      EventTypes.DAMAGE.APPLIED,
      EventTypes.HEAL.APPLIED,
      EventTypes.ABILITY.USED,
      EventTypes.COORDINATION.CALCULATED
    ];
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
    const result = this.damageCalculator.calculateDamage(
      attacker,
      defender,
      baseDamage
    );
    
    return {
      finalDamage: result.finalDamage,
      baseDamage: result.baseDamage,
      modifiers: result.modifiers || [],
      isCritical: result.isCritical || false,
      isBlocked: result.isBlocked || false,
      damageType: result.damageType || 'physical'
    };
  }

  /**
   * Apply damage to an entity
   */
  applyDamage<T extends Player | Monster>(target: T, damage: number): T {
    if ('takeDamage' in target) {
      target.takeDamage(damage);
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
      const healingBonus = this.effectManager.getHealingModifier(healer);
      finalHealing *= (1 + healingBonus);
    }
    
    // Cap healing at max health
    if ('health' in target && 'maxHealth' in target) {
      const maxHealable = target.maxHealth - target.health;
      finalHealing = Math.min(finalHealing, maxHealable);
    }
    
    return Math.floor(finalHealing);
  }

  /**
   * Check if an entity can attack
   */
  canAttack(attacker: Player | Monster, target: Player | Monster): boolean {
    // Check if attacker is alive
    const attackerAlive = 'isAlive' in attacker ? attacker.isAlive : 
                         'health' in attacker ? attacker.health > 0 : false;
    
    // Check if target is alive
    const targetAlive = 'isAlive' in target ? target.isAlive :
                       'health' in target ? target.health > 0 : false;
    
    if (!attackerAlive || !targetAlive) {
      return false;
    }
    
    // Check for disabling effects
    if ('statusEffects' in attacker) {
      const isStunned = attacker.statusEffects.some(
        effect => effect.type === 'debuff' && effect.name === 'Stunned'
      );
      if (isStunned) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Helper method to update game state with combat results
   */
  private updateGameStateWithCombatResults(
    state: GameRoom,
    result: CombatRoundResult
  ): GameRoom {
    // Update player states
    for (const [playerId, player] of this.players) {
      if (state.players[playerId]) {
        state.players[playerId] = player.toJSON();
      }
    }
    
    // Update monster state
    const monster = this.getMonster();
    if (monster && state.monster) {
      state.monster = monster;
    }
    
    return state;
  }

  /**
   * Helper method to apply damage to game state
   */
  private applyDamageToGameState(state: GameRoom, payload: any): GameRoom {
    const { targetId, damage } = payload;
    
    // Apply damage to player or monster
    if (state.players[targetId]) {
      const player = this.players.get(targetId);
      if (player) {
        player.takeDamage(damage);
        state.players[targetId] = player.toJSON();
      }
    } else if (state.monster && state.monster.id === targetId) {
      state.monster.hp = Math.max(0, state.monster.hp - damage);
      state.monster.isAlive = state.monster.hp > 0;
    }
    
    return state;
  }

  /**
   * Helper method to apply healing to game state
   */
  private applyHealingToGameState(state: GameRoom, payload: any): GameRoom {
    const { targetId, healing } = payload;
    
    // Apply healing to player
    if (state.players[targetId]) {
      const player = this.players.get(targetId);
      if (player) {
        player.heal(healing);
        state.players[targetId] = player.toJSON();
      }
    }
    
    return state;
  }
}

export default CombatSystem;