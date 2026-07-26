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
  levelUp?: number;
  winner?: string | null;
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
  levelUp?: number;
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
      // Reset per-round warlock tracking (conversion, monster-attack records, detection cooldowns)
      this._warlockSystem?.resetRoundTracking?.();

      // Phase 1: Validate all submitted actions
      const validationResults = await this.validateSubmittedActions();

      // Phase 2: Process player actions
      const playerResults = await this.processPlayerActions(validationResults, log, roundSummary, gameRoom);
      for (const [playerId, action] of playerResults) {
        playerActions.set(playerId, action);
      }

      // Phase 3: Process monster action (only if monster survived player attacks)
      const monsterAfterAttacks = this.getMonster();
      const monsterDiedThisRound = monsterAfterAttacks && (monsterAfterAttacks as any).hp <= 0;
      if (monsterDiedThisRound) {
        // Advance level (each monster kill = one level)
        const oldLevel = (gameRoom as any).level || 1;
        const newLevel = oldLevel + 1;
        if (gameRoom.gameState && typeof gameRoom.gameState.levelUp === 'function') {
          gameRoom.gameState.levelUp(newLevel);
        } else {
          (gameRoom as any).level = newLevel;
        }

        // Level up all alive players
        for (const player of this.getAlivePlayers()) {
          this.applyLevelBonuses(player, newLevel);
        }
        roundSummary.levelUp = newLevel;

        log.push({
          type: 'announcement',
          message: `The monster has been defeated! The party reaches level ${newLevel}!`,
          public: true
        });

        // Respawn a stronger monster
        this.respawnMonster(gameRoom, newLevel);
      } else {
        monsterAction = await this.processMonsterAction(log, roundSummary);
        this.checkMonsterPassthroughConversion(monsterAction, log);
      }

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
        round: gameRoom.round,
        levelUp: roundSummary.levelUp
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
        const monster = (this.monsterController as any)['monster'];
        const validationResult = (player as any).validateSubmittedAction(alivePlayers, monster);

        console.log(`[CombatSystem] Validation: ${(player as any)['name']} (${(submittedAction as any)?.['actionType']} -> ${(submittedAction as any)?.['targetId']}) valid=${validationResult.valid} errors=${JSON.stringify(validationResult.errors)} monsterHp=${monster?.hp}`);
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
   * Analyze coordination bonuses across all actions targeting the same enemy
   */
  private analyzeCoordinationBonuses(allActions: any[]): Map<string, any> {
    const coordinationBonuses = new Map();
    const targetCounts = new Map();

    // Count actions by target (only actions that have an explicit target)
    for (const actionData of allActions) {
      const targetId = actionData.action.targetId;
      if (!targetId) continue;
      if (!targetCounts.has(targetId)) {
        targetCounts.set(targetId, []);
      }
      targetCounts.get(targetId).push(actionData);
    }

    // Generate bonuses for coordinated attacks (2+ players targeting same enemy)
    for (const [targetId, actions] of targetCounts) {
      if (actions.length > 1) {
        coordinationBonuses.set(targetId, {
          count: actions.length,
          bonus: this.calculateBatchCoordinationBonus(actions.length),
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
      const currentHP = (player as any)['hp'] || 0;
      const maxHP = (player as any)['maxHp'] || 1;
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

    // Get coordination bonus if applicable (bonus applies when multiple players target the same enemy)
    const coordBonus = action.targetId ? coordinationBonuses.get(action.targetId) : undefined;
    const coordinationMultiplier = coordBonus ? coordBonus.bonus : 1.0;

    // Process the action with context
    if (coordBonus && coordBonus.count > 1) {
      // This is a coordinated attack on the same target
      await this.processSingleAction(actionData, log, summary, coordinationMultiplier, gameRoom);

      // Log coordination on first action against this target
      if (coordBonus.actions[0] === actionData) {
        const coordAbilityDef = (config as any).getAbility?.(actionType);
        const isHealAction = coordAbilityDef?.category === 'Heal';
        const bonusPct = Math.round((coordinationMultiplier - 1) * 100);
        const coordMsg = isHealAction
          ? `${coordBonus.count} players focus their healing on the same ally! (+${bonusPct}% healing)`
          : `${coordBonus.count} players focus their attacks on the same target! (+${bonusPct}% damage)`;
        log.push({
          type: 'coordination',
          message: coordMsg,
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
  private calculateBatchCoordinationBonus(count: number): number {
    const bonusPerPlayer = config.gameBalance.coordinationBonus.damageBonus / 100;
    return 1.0 + ((count - 1) * bonusPerPlayer);
  }

  /**
   * Process monster action for the round
   */
  private async processMonsterAction(log: CombatLogEntry[], summary: RoundSummary): Promise<any> {
    if (!(this.monsterController as any)['monster'] || !(this.monsterController as any)['monster']['isAlive']) {
      return null;
    }

    const allAlivePlayers = this.getAlivePlayers();
    // Exclude invisible players — they are untargetable by the monster
    const alivePlayers = allAlivePlayers.filter(
      (p: any) => !(p.statusEffects && (p.statusEffects as any).invisible)
    );
    // If every player is invisible, monster skips its action
    if (alivePlayers.length === 0) {
      log.push({
        type: 'action',
        message: 'The monster lunges forward but finds no one to attack!',
        public: true,
        source: 'monster',
        targetId: '',
        details: { reason: 'all_players_invisible' }
      } as any);
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
   * Respawn the monster with scaled stats for the new level
   */
  private respawnMonster(gameRoom: any, level: number = 1): void {
    const monster = this.getMonster();
    if (!monster) return;

    const monsterConfig = (config as any)['gameBalance']?.['monster'] || {};
    const baseHp: number = monsterConfig['baseHp'] || 100;
    const baseDamage: number = monsterConfig['baseDamage'] || 25;
    const hpPerLevel: number = monsterConfig['hpPerLevel'] || 0;
    const useExponentialScaling: boolean = monsterConfig['useExponentialScaling'] ?? true;
    const hpScalingMultiplier: number = monsterConfig['hpScalingMultiplier'] || 1.5;
    const dmgAgeMultiplier: number = monsterConfig['damageScaling']?.['ageMultiplier'] || 1;

    // Scale HP using the config's chosen method
    let newMaxHp: number;
    if (useExponentialScaling) {
      newMaxHp = Math.floor(baseHp * Math.pow(hpScalingMultiplier, level - 1));
    } else {
      newMaxHp = Math.floor(baseHp + hpPerLevel * (level - 1));
    }

    // Scale attack power using damageScaling.ageMultiplier per level
    const newAttackPower = Math.floor(baseDamage * Math.pow(dmgAgeMultiplier || 1, level - 1));

    (monster as any).maxHp = newMaxHp;
    (monster as any).hp = newMaxHp;
    (monster as any).isAlive = true;
    (monster as any).attackPower = newAttackPower;

    logger.info(`[CombatSystem] Monster respawned at level ${level}: HP=${newMaxHp}, ATK=${newAttackPower}`);
  }

  /**
   * Process end-of-round effects
   */
  private async processEndOfRoundEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    // Process all timed status effects (poison, bleed, burning, healingOverTime, etc.)
    this._statusEffectManager?.processTimedEffects?.(log);

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
    // Update round counter via GameState's method to ensure it persists through property delegation
    if (gameRoom.gameState && typeof gameRoom.gameState.nextRound === 'function') {
      gameRoom.gameState.nextRound();
    } else {
      (gameRoom as any)['round'] = ((gameRoom as any)['round'] || 0) + 1;
    }

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
   * Apply level bonuses to a player on monster kill
   */
  private applyLevelBonuses(player: Player, level: number): void {
    const levelUpConfig = (config as any)['gameBalance']?.['player']?.['levelUp'];

    // Increase max HP by hpIncrease % (default 8%)
    const hpIncrease = levelUpConfig?.['hpIncrease'] ?? 0.08;
    const hpBonus = Math.floor((player as any)['maxHp'] * hpIncrease);
    (player as any)['maxHp'] = ((player as any)['maxHp'] || 100) + hpBonus;

    // Increase damage modifier by damageIncrease multiplier (default 1.15x)
    const dmgMultiplier = levelUpConfig?.['damageIncrease'] ?? 1.15;
    (player as any)['damageMod'] = ((player as any)['damageMod'] || 1) * dmgMultiplier;

    // Full heal on level up
    if (levelUpConfig?.['fullHealOnLevelUp'] !== false) {
      (player as any)['hp'] = (player as any)['maxHp'];
    } else {
      (player as any)['hp'] = Math.min((player as any)['hp'] + hpBonus, (player as any)['maxHp']);
    }

    logger.info(`[CombatSystem] Player ${(player as any)['name']} leveled up to ${level}: maxHp=${(player as any)['maxHp']}, damageMod=${((player as any)['damageMod'] || 1).toFixed(2)}`);

    // Unlock abilities for the new level
    const allAbilities = ((player as any)['abilities'] || []) as any[];
    const currentUnlocked = ((player as any)['unlocked'] || []) as any[];
    const unlockedIds = new Set(currentUnlocked.map((a: any) => a.id || a.type));
    const newlyUnlocked = allAbilities.filter((ability: any) => {
      const unlockAt = (ability.unlockAt || 1) as number;
      return unlockAt <= level && !unlockedIds.has(ability.id || ability.type);
    });
    if (newlyUnlocked.length > 0) {
      (player as any)['unlocked'] = [...currentUnlocked, ...newlyUnlocked];
      for (const ability of newlyUnlocked) {
        logger.info(`[CombatSystem] Player ${(player as any)['name']} unlocked: ${ability.name || ability.id} (level ${level})`);
      }
    }

    (player as any)['updateRelentlessFuryLevel']?.(level);
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
      const actorId: string = (player as any)['id'];

      // Capture log length before ability execution so we can tag entries afterward
      const logLengthBeforeAction = log.length;

      // Resolve target and ability once so conversion hooks can use them in both paths
      const target = actionType ? this.getActionTarget(action, gameRoom) : null;
      const abilityObj = ((player as any).unlocked || []).find((a: any) => a.type === actionType) || null;
      const abilityCategory: string | null =
        abilityObj?.category || (config as any).getAbility?.(actionType)?.category || null;

      let registryHandledLog = false;
      if (actionType && abilityRegistry?.hasClassAbility?.(actionType)) {
        // Use the ability registry with correct handler signature: (actor, target, ability, log, systems, coordinationInfo?)
        const monster = (this.monsterController as any)?.monster || null;

        // Provide a game context that handlers need for game.players / game.monster access
        const systems = {
          ...gameRoom.systems,
          game: { players: this.players, monster }
        };

        const monsterHpBefore = monster?.hp ?? 0;
        const logLengthBefore = log.length;

        logger.info('[CombatSystem] Executing ability via registry:', { actionType, hasTarget: !!target, hasAbility: !!abilityObj });
        abilityRegistry.executeClassAbility(
          actionType,
          player,
          target,
          abilityObj,
          log,
          systems,
          coordinationBonus > 1 ? { isActive: true, bonusMultiplier: coordinationBonus } : undefined
        );

        const monsterHpAfter = monster?.hp ?? 0;
        registryHandledLog = log.length > logLengthBefore;
        result = {
          damage: Math.max(0, monsterHpBefore - monsterHpAfter),
          healing: 0,
          logEntries: []
        };
      } else if (actionType) {
        // Fallback: registry has no handler — use basic damage calculation
        logger.warn('[CombatSystem] No registry handler for ability, using fallback:', actionType);
        if (this.isAttackAbility(actionType)) {
          const baseDamage = this.calculateBasicAttackDamage(player, actionType);
          if (target) {
            const finalDamage = this.applyDamageToTarget(target, baseDamage);
            result = {
              damage: finalDamage,
              healing: 0,
              logEntries: [{
                type: 'attack',
                message: `${(player as any)['name']} attacks ${(target as any).name || 'the Monster'} with ${actionType} for ${finalDamage} damage!`,
                public: false,
                playerId: actorId
              }]
            };
          }
        }
      } else {
        logger.warn('[CombatSystem] No action type', { actionType, actionKeys: Object.keys(action || {}) });
      }

      // Reactive poison trap: if attacker targeted a player who has poisonTrap, poison the attacker
      if (
        target &&
        Object.prototype.hasOwnProperty.call(target, 'isAlive') &&
        (target as any).isAlive !== false &&
        abilityCategory === 'Attack' &&
        this._statusEffectManager?.hasEffect?.((target as any).id, 'poisonTrap')
      ) {
        const trapEffects = this._statusEffectManager?.getEffectsByType?.((target as any).id, 'poisonTrap') || [];
        const trapEffect = trapEffects[0];
        const poisonDamage = Number(trapEffect?.params?.damage) || Number(trapEffect?.params?.damagePerTurn) || 20;
        const poisonDuration = Number(trapEffect?.params?.turns) || Number(trapEffect?.params?.duration) || 2;
        this._statusEffectManager?.applyEffect?.(
          (player as any).id,
          'poison',
          { damage: poisonDamage, turns: poisonDuration },
          (target as any).id,
          (target as any).name,
          log
        );
        this._statusEffectManager?.removeEffectsByType?.((target as any).id, 'poisonTrap', log);
        log.push({
          type: 'status',
          message: `${(player as any).name} triggers ${(target as any).name}'s poison trap and is poisoned for ${poisonDamage} damage/turn!`,
          public: true,
          playerId: (player as any).id,
          targetId: (target as any).id
        });
      }

      // Warlock conversion triggers (runs regardless of which path handled the action)
      this.checkWarlockConversionTriggers(player, action, target, abilityCategory, log);

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
      } else if (!registryHandledLog) {
        // Create a basic log entry only when the registry handler didn't write to log directly
        const basicEntry = {
          type: 'action',
          message: `${(player as any)['name']} used ${actionType || 'unknown action'}`,
          public: false,
          playerId: actorId
        };
        log.push(basicEntry);
        logger.info('[CombatSystem] Added basic log entry:', basicEntry);
      }

      // Apply cooldown for abilities that require it
      if (actionType) {
        const abilityCooldown = (config as any).getAbility?.(actionType)?.cooldown ?? 0;
        if (abilityCooldown > 0) {
          (player as any)['putAbilityOnCooldown']?.(actionType, abilityCooldown);
        }
      }

      // Tag all ability-generated log entries with the acting player's ID (for warlock vision filtering)
      for (let i = logLengthBeforeAction; i < log.length; i++) {
        const entry = log[i]!;
        if (!entry.playerId) {
          entry.playerId = actorId;
          // Ability actions are private by default; only public announcements remain visible to all
          entry.public = false;
        }
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
      console.error(`[CombatSystem] CATCH in processSingleAction: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error instanceof Error ? error.stack : '');
      logger.error('[CombatSystem] Error processing single action:', {
        error: error instanceof Error ? error.message : String(error),
        playerId: (player as any)?.id,
        actionType: (action as any)?.actionType || (action as any)?.type
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
      case 'action.submitted': {
        // Process combat action
        const result = await this.processRound(state);
        // Update game state with combat results
        return this.updateGameStateWithCombatResults(state, result);
      }

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
  applyDamage<T extends Player | Monster>(target: T, damage: number, _options?: any): { success: boolean; finalDamage: number; error: any } {
    try {
      if ('takeDamage' in (target as object) && typeof (target as any).takeDamage === 'function') {
        (target as any).takeDamage(damage);
      } else {
        const finalDamage = Math.max(1, Math.floor(damage));
        (target as any).hp = Math.max(0, ((target as any).hp || 0) - finalDamage);
        if ((target as any).hp <= 0) {
          (target as any).isAlive = false;
        }
      }
      return { success: true, finalDamage: damage, error: null };
    } catch (error) {
      return { success: false, finalDamage: 0, error };
    }
  }

  /**
   * Apply healing to an entity, capping at maxHp
   */
  applyHealing<T extends Player | Monster>(
    target: T,
    amount: number,
    _options?: any
  ): { success: boolean; finalHealing: number; wasOverhealing: boolean } {
    try {
      const currentHp: number = (target as any).hp ?? 0;
      const maxHp: number = (target as any).maxHp ?? currentHp;
      const room = maxHp - currentHp;
      const actualHealing = Math.min(Math.max(0, Math.floor(amount)), room);
      const wasOverhealing = actualHealing < Math.floor(amount);
      (target as any).hp = currentHp + actualHealing;
      return { success: true, finalHealing: actualHealing, wasOverhealing };
    } catch (error) {
      return { success: false, finalHealing: 0, wasOverhealing: false };
    }
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
    if ('hp' in target && 'maxHp' in target) {
      const maxHealable = (target as any)['maxHp'] - (target as any)['hp'];
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
                         'hp' in attacker ? (attacker as any)['hp'] > 0 : false;

    // Check if target is alive
    const targetAlive = 'isAlive' in target ? (target as any)['isAlive'] :
                       'hp' in target ? (target as any)['hp'] > 0 : false;

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
    try {
      const abilityDef = (config as any).getAbility?.(actionType);
      if (abilityDef?.category) {
        return abilityDef.category === 'Attack' || abilityDef.category === 'Special';
      }
    } catch (e) { /* ignore */ }

    const attackAbilities = [
      'attack', 'lightningBolt', 'fireball', 'backstab', 'preciseShot',
      'pistolShot', 'psychicBolt', 'strike', 'slash', 'pierce',
      'clawSwipe', 'poisonStrike', 'holyBolt', 'magicMissile',
      'recklessStrike', 'twinStrike', 'aimedShot', 'barbedArrow',
      'shiv', 'deathMark', 'sweepingStrike', 'chainLightning',
      'meteorShower', 'infernoBlast', 'arcaneBarrage', 'pyroblast', 'ricochetRound'
    ];
    return attackAbilities.includes(actionType);
  }

  /**
   * Calculate basic attack damage (fallback method)
   */
  private calculateBasicAttackDamage(player: Player, actionType: string): number {
    const damageMod = (player as any)['damageMod'] || 1.0;

    // Try to use the ability's actual damage from config
    try {
      const abilityDef = (config as any).getAbility?.(actionType);
      if (abilityDef?.params?.damage) {
        return Math.floor(abilityDef.params.damage * damageMod);
      }
    } catch (e) { /* ignore */ }

    // Fallback to generic base damage
    const baseDamage = (player as any)['attackPower'] || 20;
    return Math.floor(baseDamage * damageMod);
  }

  /**
   * Get the target of an action (fallback method)
   */
  private getActionTarget(action: any, gameRoom: any): any {
    const targetId = (action as any)?.targetId;
    if (!targetId) return null;

    // Check if targeting monster
    if (targetId === config.MONSTER_ID || targetId === 'monster') {
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

  /**
   * Check and trigger warlock conversion after a player action resolves.
   *
   * Trigger 1 — warlock attacks a non-warlock player:   30% base chance (scaled)
   * Trigger 2 — non-warlock heals a warlock:            50% base chance (scaled, corrupts the healer)
   * Trigger 3a — warlock attacks the monster:           records for passthrough check later
   */
  private checkWarlockConversionTriggers(
    player: any,
    action: any,
    target: any,
    abilityCategory: string | null,
    log: CombatLogEntry[]
  ): void {
    const ws = this._warlockSystem;
    if (!ws) return;

    const targetId: string | undefined = (target as any)?.id;
    if (!targetId) return;

    const totalPlayers = this.players.size;
    const actorIsWarlock = !!(player as any).isWarlock;
    const targetIsPlayer = this.players.has(targetId);
    const targetPlayer = targetIsPlayer ? (this.players.get(targetId) as any) : null;
    const targetIsWarlock = !!targetPlayer?.isWarlock;
    const targetIsMonster = !targetIsPlayer;

    const isAttack =
      abilityCategory === 'Attack' ||
      (abilityCategory === null && this.isAttackAbility((action as any)?.actionType || (action as any)?.type));
    const isHeal = abilityCategory === 'Heal';

    const triggerChances = config.gameBalance.warlock.conversion.triggerChances;

    // Trigger 1: warlock attacks a living non-warlock player
    if (actorIsWarlock && targetIsPlayer && !targetIsWarlock && targetPlayer?.isAlive && isAttack) {
      const chance = ws.getScaledChance(triggerChances.warlockAttackPlayer, totalPlayers);
      const result = ws.attemptCorruption((player as any).id, targetId, chance);
      if (result.success) {
        log.push({
          type: 'warlock_conversion',
          message: `${targetPlayer.name} has been corrupted by ${(player as any).name}'s attack!`,
          public: false,
          playerId: (player as any).id,
          details: { trigger: 'warlock_attack', targetId }
        } as any);
      }
    }

    // Trigger 2: non-warlock heals a warlock — the healer gets corrupted
    if (!actorIsWarlock && targetIsPlayer && targetIsWarlock && isHeal) {
      const chance = ws.getScaledChance(triggerChances.playerHealsWarlock, totalPlayers);
      // targetId is the warlock; actor (healer) is the corruption target
      const result = ws.attemptCorruption(targetId, (player as any).id, chance);
      if (result.success) {
        log.push({
          type: 'warlock_conversion',
          message: `${(player as any).name} has been corrupted through healing the warlock!`,
          public: false,
          playerId: targetId,
          details: { trigger: 'heal_warlock', targetId: (player as any).id }
        } as any);
      }
    }

    // Trigger 3a: warlock attacks the monster — record for passthrough check after monster acts
    if (actorIsWarlock && targetIsMonster && isAttack) {
      ws.recordWarlockMonsterAttack((player as any).id);
    }
  }

  /**
   * Trigger 3b — after the monster attacks, check if any warlock attacked the monster this round.
   * If so, each player the monster hit has a 10% base chance (scaled) of being corrupted.
   */
  private checkMonsterPassthroughConversion(monsterAction: any, log: CombatLogEntry[]): void {
    const ws = this._warlockSystem;
    if (!ws) return;

    const warlockAttackers = ws.getWarlockMonsterAttackers();
    if (warlockAttackers.size === 0) return;

    const attackedPlayerIds: string[] = monsterAction?.targets || [];
    if (attackedPlayerIds.length === 0) return;

    const totalPlayers = this.players.size;
    const chance = ws.getScaledChance(config.gameBalance.warlock.conversion.triggerChances.monsterPassthrough, totalPlayers);

    for (const targetPlayerId of attackedPlayerIds) {
      const targetPlayer = this.players.get(targetPlayerId) as any;
      if (!targetPlayer?.isAlive || targetPlayer?.isWarlock) continue;

      for (const warlockId of warlockAttackers) {
        const result = ws.attemptCorruption(warlockId, targetPlayerId, chance);
        if (result.success) {
          log.push({
            type: 'warlock_conversion',
            message: `The monster's attack on ${targetPlayer.name} resonated with dark energy...`,
            public: false,
            playerId: warlockId,
            details: { trigger: 'monster_passthrough', targetId: targetPlayerId, warlockId }
          } as any);
          break; // one conversion per targeted player per round is enough
        }
      }
    }
  }
}

export default CombatSystem;
