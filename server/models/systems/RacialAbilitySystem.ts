/**
 * @fileoverview System for managing racial abilities and their usage
 * Handles validation, queuing, and processing of racial ability effects
 */
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import messages from '../../config/messages/index.js';

// Type definitions for racial ability system

export interface RacialAbility {
  type: string;
  usesLeft?: number;
  cooldown?: number;
  [key: string]: any;
}

export interface RacialEffect {
  turns: number;
  amount?: number;
  [key: string]: any;
}

export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  hp: number;
  maxHp: number;
  racialAbility: RacialAbility | null;
  racialCooldown: number;
  racialEffects?: {
    healOverTime?: RacialEffect;
    [key: string]: RacialEffect | undefined;
  };
  canUseRacialAbility(): boolean;
  useRacialAbility(): void;
  hasStatusEffect?(effectName: string): boolean;
}

export interface PendingRacialAction {
  actorId: string;
  targetId: string;
  racialType: string;
}

export interface GameStateUtils {
  getRandomTarget(options: {
    actorId: string;
    excludeIds?: string[];
    onlyPlayers?: boolean;
  }): string | null;
}

export interface StatusEffectManager {
  // Define status effect manager interface as needed
  [key: string]: any;
}

export interface AbilityRegistry {
  hasRacialAbility(abilityType: string): boolean;
  [key: string]: any;
}

export interface LogEntry {
  type?: string;
  public?: boolean;
  targetId?: string;
  message?: string;
  privateMessage?: string;
  attackerMessage?: string;
  [key: string]: any;
}

/**
 * RacialAbilitySystem manages all racial ability operations
 * Centralizes racial ability validation and processing
 */
export class RacialAbilitySystem {
  private players: Map<string, Player>;
  private gameStateUtils: GameStateUtils;
  private statusEffectManager: StatusEffectManager;
  private abilityRegistry: AbilityRegistry | null = null;

  /**
   * Create a new racial ability system
   * @param players - Map of player objects
   * @param gameStateUtils - Game state utility functions
   * @param statusEffectManager - Status effect manager
   */
  constructor(
    players: Map<string, Player>,
    gameStateUtils: GameStateUtils,
    statusEffectManager: StatusEffectManager
  ) {
    this.players = players;
    this.gameStateUtils = gameStateUtils;
    this.statusEffectManager = statusEffectManager;
  }

  /**
   * Set the reference to the ability registry
   * @param registry - Ability registry instance
   */
  setAbilityRegistry(registry: AbilityRegistry): void {
    this.abilityRegistry = registry;
  }

  /**
   * Validate and queue a racial ability action
   * @param actorId - ID of player using the ability
   * @param targetId - ID of target (player ID or config.MONSTER_ID)
   * @param pendingRacialActions - Array of pending racial actions
   * @returns Whether the action was successfully queued
   */
  validateAndQueueRacialAction(
    actorId: string,
    targetId: string,
    pendingRacialActions: PendingRacialAction[]
  ): boolean {
    // Get the actor player
    const actor = this.players.get(actorId);

    // Validate player exists, is alive, and can use racial ability
    if (!actor || !actor.isAlive || !actor.canUseRacialAbility()) {
      return false;
    }

    // Check if player already has a racial action queued
    if (pendingRacialActions.some((a) => a.actorId === actorId)) {
      return false;
    }

    // Validate racial ability exists and is registered
    if (
      !actor.racialAbility ||
      !this.abilityRegistry?.hasRacialAbility(actor.racialAbility.type)
    ) {
      logger.warn('UnknownRacialAbilityType', {
        racialAbilityType: actor.racialAbility?.type,
        actorId,
      });
      return false;
    }

    // Handle target for player-specific abilities
    let finalTargetId = targetId;
    const monsterId = (config as any)['MONSTER_ID'] || '__monster__';
    if (targetId !== monsterId && targetId !== actorId) {
      const targetPlayer = this.players.get(targetId);

      // Validate target player exists and is alive
      if (!targetPlayer || !targetPlayer.isAlive) {
        return false;
      }

      // Handle invisible target redirection
      if (
        targetPlayer.hasStatusEffect &&
        targetPlayer.hasStatusEffect('invisible')
      ) {
        const redirectTarget = this.gameStateUtils.getRandomTarget({
          actorId,
          excludeIds: [targetId],
          onlyPlayers: true,
        });

        // If no valid redirect target, fail
        if (!redirectTarget) {
          return false;
        }

        finalTargetId = redirectTarget;
      }
    }

    // Add to pending actions
    pendingRacialActions.push({
      actorId,
      targetId: finalTargetId,
      racialType: actor.racialAbility.type,
    });

    // Mark as used on the player object
    actor.useRacialAbility();

    return true;
  }

  /**
   * Process racial ability cooldowns and ongoing effects at end of round
   * @param log - Event log to append messages to
   */
  processEndOfRoundEffects(log: LogEntry[]): void {
    const playersArray = Array.from(this.players.values());
    for (const player of playersArray) {
      if (!player.isAlive) continue;

      // Process cooldown timers
      this.processCooldowns(player, log);

      // Process healing over time effect (Kinfolk racial)
      this.processHealOverTime(player, log);
    }
  }

  /**
   * Process racial ability cooldowns for a player
   * @param player - Player object
   * @param log - Event log to append messages to
   * @private
   */
  private processCooldowns(player: Player, log: LogEntry[]): void {
    if (player.racialCooldown > 0) {
      player.racialCooldown--;
      if (player.racialCooldown === 0) {
        // Use private message from config
        const racialReadyMessage = (messages as any)['getRacialMessage']?.('racialAbilityReady') || 'Your racial ability is ready!';

        const cooldownLog: LogEntry = {
          type: 'racial_cooldown',
          public: false,
          targetId: player.id,
          message: '',
          privateMessage: racialReadyMessage || '',
          attackerMessage: '',
        };
        log.push(cooldownLog);
      }
    }
  }

  /**
   * Process healing over time effect for a player
   * @param player - Player object
   * @param log - Event log to append messages to
   * @private
   */
  private processHealOverTime(player: Player, log: LogEntry[]): void {
    if (!player.racialEffects || !player.racialEffects.healOverTime) {
      return;
    }

    const effect = player.racialEffects.healOverTime;
    const healAmount = effect.amount || 0;

    // Apply healing
    if (healAmount > 0) {
      const oldHp = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      const actualHeal = player.hp - oldHp;

      if (actualHeal > 0) {
        const healLog: LogEntry = {
          type: 'heal_over_time',
          public: true,
          targetId: player.id,
          message: `${player.name} healed for ${actualHeal} HP`,
          privateMessage: '',
          attackerMessage: '',
        };
        log.push(healLog);
      }
    }

    // Decrement duration
    effect.turns--;

    // Remove if expired
    if (effect.turns <= 0) {
      delete player.racialEffects.healOverTime;
      log.push({
        type: 'racial_effect_expired',
        message: `${player.name}'s Forest's Grace has worn off.`,
        public: true
      });
    }
  }
}

export default RacialAbilitySystem;
