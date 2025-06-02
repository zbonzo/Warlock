/**
 * @fileoverview System for managing racial abilities and their usage
 * Handles validation, queuing, and processing of racial ability effects
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * RacialAbilitySystem manages all racial ability operations
 * Centralizes racial ability validation and processing
 */
class RacialAbilitySystem {
  /**
   * Create a new racial ability system
   * @param {Map} players - Map of player objects
   * @param {GameStateUtils} gameStateUtils - Game state utility functions
   * @param {StatusEffectManager} statusEffectManager - Status effect manager
   */
  constructor(players, gameStateUtils, statusEffectManager) {
    this.players = players;
    this.gameStateUtils = gameStateUtils;
    this.statusEffectManager = statusEffectManager;
    this.abilityRegistry = null; // Will be set by GameRoom
  }

  /**
   * Set the reference to the ability registry
   * @param {AbilityRegistry} registry - Ability registry instance
   */
  setAbilityRegistry(registry) {
    this.abilityRegistry = registry;
  }

  /**
   * Validate and queue a racial ability action
   * @param {string} actorId - ID of player using the ability
   * @param {string} targetId - ID of target (player ID or '__monster__')
   * @param {Array} pendingRacialActions - Array of pending racial actions
   * @returns {boolean} Whether the action was successfully queued
   */
  validateAndQueueRacialAction(actorId, targetId, pendingRacialActions) {
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
      logger.warn(`Unknown racial ability type: ${actor.racialAbility?.type}`);
      return false;
    }

    // Handle target for player-specific abilities
    let finalTargetId = targetId;
    if (targetId !== '__monster__' && targetId !== actorId) {
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
        finalTargetId = this.gameStateUtils.getRandomTarget({
          actorId,
          excludeIds: [targetId],
          onlyPlayers: true,
        });

        // If no valid redirect target, fail
        if (!finalTargetId) {
          return false;
        }
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
   * @param {Array} log - Event log to append messages to
   */
  processEndOfRoundEffects(log) {
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      // Process cooldown timers
      this.processCooldowns(player, log);

      // Process healing over time effect (Kinfolk racial)
      this.processHealOverTime(player, log);
    }
  }

  /**
   * Process racial ability cooldowns for a player
   * @param {Object} player - Player object
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processCooldowns(player, log) {
    if (player.racialCooldown > 0) {
      player.racialCooldown--;
      if (player.racialCooldown === 0) {
        // Use private message from config
        const racialReadyMessage = messages.getMessage(
          'private',
          'racialAbilityReady'
        );

        const cooldownLog = {
          type: 'racial_cooldown',
          public: false,
          targetId: player.id,
          message: '',
          privateMessage: racialReadyMessage,
          attackerMessage: '',
        };
        log.push(cooldownLog);
      }
    }
  }

  /**
   * Process healing over time effect for a player
   * @param {Object} player - Player object
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processHealOverTime(player, log) {
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
        log.push(
          messages.getEvent('playerHealed', {
            playerName: player.name,
            amount: actualHeal,
          })
        );
      }
    }

    // Decrement duration
    effect.turns--;

    // Remove if expired
    if (effect.turns <= 0) {
      delete player.racialEffects.healOverTime;
      log.push(`${player.name}'s Forest's Grace has worn off.`);
    }
  }
}

module.exports = RacialAbilitySystem;


