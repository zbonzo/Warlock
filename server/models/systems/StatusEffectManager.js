/**
 * @fileoverview Updated StatusEffectManager with healing over time support
 * Handles application, removal, and round-based processing of effects including healing
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * Manages all status effects across players including healing over time
 * Centralizes effect processing logic for game consistency
 */
class StatusEffectManager {
  /**
   * Create a new status effect manager
   * @param {Map} players - Map of player objects
   * @param {GameStateUtils} gameStateUtils - Game state utility functions
   */
  constructor(players, gameStateUtils) {
    this.players = players;
    this.gameStateUtils = gameStateUtils;

    this.effectDefinitions = {
      poison: { default: { damage: 5, turns: 3 } },
      shielded: { default: { armor: 2, turns: 1 } },
      invisible: { default: { turns: 1 } },
      stunned: { default: { turns: 1 } },
      vulnerable: { default: { damageIncrease: 25, turns: 2 } },
      weakened: { default: { damageReduction: 0.25, turns: 1 } },
      enraged: {
        default: { damageBoost: 1.5, damageResistance: 0.3, turns: 2 },
      },
      healingOverTime: { default: { amount: 5, turns: 3 } }, // New effect
    };
  }

  /**
   * Apply a status effect to a player
   * @param {string} playerId - Target player's ID
   * @param {string} effectName - Name of the effect to apply
   * @param {Object} effectData - Effect parameters
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the effect was successfully applied
   */
  applyEffect(playerId, effectName, effectData, log = []) {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // Get the effect definition from config
    const effectDefinition = config.statusEffects[effectName];
    if (!effectDefinition) {
      console.warn(
        `Unknown effect ${effectName} could not be applied to ${player.name}.`
      );
      log.push(
        `Unknown effect ${effectName} could not be applied to ${player.name}.`
      );
      return false;
    }

    // Check if already has the effect
    const hasEffect = player.hasStatusEffect(effectName);

    // Apply default values for any missing parameters
    const effectDefaults = config.statusEffects[effectName]?.default || {};
    const finalData = {
      ...effectDefaults,
      ...effectData,
    };

    // FIX: Add +1 to turns for all timed effects to account for immediate countdown
    if (finalData.turns && finalData.turns > 0) {
      finalData.turns = finalData.turns + 1;
    }

    // Special handling for vulnerability
    if (effectName === 'vulnerable') {
      player.applyVulnerability(finalData.damageIncrease, finalData.turns);

      // Special log for vulnerability
      const vulnMessage = messages.getAbilityMessage(
        'statusEffects',
        'vulnerable.applied'
      );
      log.push(
        messages.formatMessage(vulnMessage, {
          playerName: player.name,
          increase: finalData.damageIncrease,
          turns: finalData.turns - 1, // Display turns (subtract the +1 we added)
        })
      );
      return true;
    }

    // For other effects, apply normally
    player.applyStatusEffect(effectName, finalData);

    // Add log message (subtract 1 from turns for display since we added 1 internally)
    const displayTurns = (finalData.turns || 1) - 1;
    const logData = { ...finalData, turns: displayTurns };

    if (!hasEffect) {
      // Get application message
      const appliedMessage = messages.getAbilityMessage(
        'statusEffects',
        `${effectName}.applied`
      );
      if (appliedMessage) {
        log.push(
          messages.formatMessage(appliedMessage, {
            playerName: player.name,
            ...logData,
          })
        );
      } else {
        // Fallback to generic message
        const genericMessage = messages.getAbilityMessage(
          'statusEffects',
          'generic.applied'
        );
        log.push(
          messages.formatMessage(genericMessage, {
            playerName: player.name,
            effectName: effectName,
            ...logData,
          })
        );
      }
    } else {
      // Get refresh message
      const refreshMessage = messages.getAbilityMessage(
        'statusEffects',
        `${effectName}.refreshed`
      );
      if (refreshMessage) {
        log.push(
          messages.formatMessage(refreshMessage, {
            playerName: player.name,
            ...logData,
          })
        );
      } else {
        // Fallback to generic message
        const genericMessage = messages.getAbilityMessage(
          'statusEffects',
          'generic.refreshed'
        );
        log.push(
          messages.formatMessage(genericMessage, {
            playerName: player.name,
            effectName: effectName,
            ...logData,
          })
        );
      }
    }

    return true;
  }

  /**
   * Remove a status effect from a player
   * @param {string} playerId - Target player's ID
   * @param {string} effectName - Name of the effect to remove
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the effect was successfully removed
   */
  removeEffect(playerId, effectName, log = []) {
    const player = this.players.get(playerId);
    if (!player) return false;

    const hadEffect = player.hasStatusEffect(effectName);

    // Special handling for vulnerability
    if (effectName === 'vulnerable' && player.isVulnerable) {
      player.isVulnerable = false;
      player.vulnerabilityIncrease = 0;
      delete player.statusEffects.vulnerable;

      const expiredMessage = messages.getAbilityMessage(
        'statusEffects',
        'vulnerable.expired'
      );
      log.push(
        messages.formatMessage(expiredMessage, {
          playerName: player.name,
        })
      );
      return true;
    }

    // For other effects, remove normally
    player.removeStatusEffect(effectName);

    // Add log message if effect was present
    if (hadEffect) {
      const expiredMessage = messages.getAbilityMessage(
        'statusEffects',
        `${effectName}.expired`
      );
      if (expiredMessage) {
        log.push(
          messages.formatMessage(expiredMessage, {
            playerName: player.name,
          })
        );
      } else {
        // Fallback to generic message
        const genericMessage = messages.getAbilityMessage(
          'statusEffects',
          'generic.expired'
        );
        log.push(
          messages.formatMessage(genericMessage, {
            playerName: player.name,
            effectName: effectName,
          })
        );
      }
    }

    return hadEffect;
  }

  /**
   * Check if a player has a particular status effect
   * @param {string} playerId - Target player's ID
   * @param {string} effectName - Name of the effect to check
   * @returns {boolean} Whether the player has the effect
   */
  hasEffect(playerId, effectName) {
    const player = this.players.get(playerId);
    if (effectName === 'vulnerable') {
      return player && player.isVulnerable;
    }
    return player && player.hasStatusEffect(effectName);
  }

  /**
   * Get data for a player's status effect
   * @param {string} playerId - Target player's ID
   * @param {string} effectName - Name of the effect to get
   * @returns {Object|null} Effect data or null if not found
   */
  getEffectData(playerId, effectName) {
    const player = this.players.get(playerId);
    if (!player) return null;

    if (effectName === 'vulnerable' && player.isVulnerable) {
      return {
        damageIncrease: player.vulnerabilityIncrease,
        turns: player.statusEffects.vulnerable?.turns || 0,
      };
    }

    if (!player.hasStatusEffect(effectName)) return null;
    return player.statusEffects[effectName];
  }

  /**
   * Check if a player is stunned
   * @param {string} playerId - Target player's ID
   * @returns {boolean} Whether the player is stunned
   */
  isPlayerStunned(playerId) {
    return this.hasEffect(playerId, 'stunned');
  }

  /**
   * UPDATED: Process all timed status effects for all players including healing over time
   * @param {Array} log - Event log to append messages to
   */
  processTimedEffects(log = []) {
    const alivePlayers = this.gameStateUtils.getAlivePlayers();

    // Process vulnerability directly
    for (const player of alivePlayers) {
      if (player.isVulnerable) {
        const expired = player.processVulnerability();

        if (expired) {
          const expiredMessage = messages.getAbilityMessage(
            'statusEffects',
            'vulnerable.expired'
          );
          log.push(
            messages.formatMessage(expiredMessage, {
              playerName: player.name,
            })
          );
        } else {
          const increase = player.vulnerabilityIncrease;
          const turns = (player.statusEffects.vulnerable?.turns || 1) - 1; // Subtract 1 for display
          const activeMessage = messages.getAbilityMessage(
            'statusEffects',
            'vulnerable.active'
          );
          log.push(
            messages.formatMessage(activeMessage, {
              playerName: player.name,
              increase: increase,
              turns: turns,
            })
          );
        }
      }
    }

    // Process effects in order defined in config
    const processingOrder = config.statusEffects.processingOrder || {
      poison: 1,
      shielded: 2,
      invisible: 4,
      stunned: 5,
      weakened: 6,
      enraged: 7,
      healingOverTime: 8,
    };

    // Sort effect types by processing order
    const effectTypes = Object.keys(processingOrder).sort((a, b) => {
      return processingOrder[a] - processingOrder[b];
    });

    // Process each effect type in order
    for (const effectType of effectTypes) {
      // Skip vulnerability as it's handled separately
      if (effectType === 'vulnerable') continue;

      for (const player of alivePlayers) {
        if (effectType === 'poison') {
          this.processPoisonEffect(player, log);
        } else if (effectType === 'healingOverTime') {
          this.processHealingOverTime(player, log);
        } else {
          this.processTimedEffect(player, effectType, log);
        }
      }
    }
  }

  /**
   * NEW: Process healing over time effect for a player
   * @param {Object} player - Player object
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processHealingOverTime(player, log) {
    if (!player.hasStatusEffect('healingOverTime')) return;

    const healing = player.statusEffects.healingOverTime;
    const healAmount = healing.amount || 0;

    // Apply healing
    if (healAmount > 0) {
      const oldHp = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      const actualHeal = player.hp - oldHp;

      if (actualHeal > 0) {
        const healMessage = messages.getAbilityMessage(
          'statusEffects',
          'healingOverTime.healing'
        );
        log.push(
          messages.formatMessage(healMessage, {
            playerName: player.name,
            amount: actualHeal,
          })
        );

        // Add private message to the player
        const privateHealLog = {
          type: 'healing_over_time',
          public: false,
          targetId: player.id,
          message: '',
          privateMessage: messages.formatMessage(
            messages.getAbilityMessage(
              'statusEffects',
              'private.youRegenerateHP'
            ),
            { amount: actualHeal }
          ),
          attackerMessage: '',
        };
        log.push(privateHealLog);
      }
    }

    // Decrement turns
    healing.turns--;

    // Remove if expired
    if (healing.turns <= 0) {
      player.removeStatusEffect('healingOverTime');

      const expiredMessage = messages.getAbilityMessage(
        'statusEffects',
        'healingOverTime.expired'
      );
      log.push(
        messages.formatMessage(expiredMessage, {
          playerName: player.name,
        })
      );
    }
  }

  /**
   * Process a generic timed effect for a player
   * @param {Object} player - Player object
   * @param {string} effectName - Name of the effect to process
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processTimedEffect(player, effectName, log) {
    if (!player.hasStatusEffect(effectName)) return;

    const effect = player.statusEffects[effectName];

    // Decrement turns (this is correct with the +1 fix in applyEffect)
    effect.turns--;

    // Remove if expired
    if (effect.turns <= 0) {
      player.removeStatusEffect(effectName);

      const expiredMessage = messages.getAbilityMessage(
        'statusEffects',
        `${effectName}.expired`
      );
      if (expiredMessage) {
        log.push(
          messages.formatMessage(expiredMessage, {
            playerName: player.name,
          })
        );
      } else {
        // Fallback to generic message
        const genericMessage = messages.getAbilityMessage(
          'statusEffects',
          'generic.expired'
        );
        log.push(
          messages.formatMessage(genericMessage, {
            playerName: player.name,
            effectName: effectName,
          })
        );
      }
    }
  }

  /**
   * Process poison effect for a player
   * @param {Object} player - Player object
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processPoisonEffect(player, log) {
    if (!player.hasStatusEffect('poison')) return;

    const poison = player.statusEffects.poison;

    // Process Stone Armor degradation for Dwarves (before applying poison damage)
    let armorDegradationInfo = null;
    if (player.race === 'Dwarf' && player.stoneArmorIntact) {
      armorDegradationInfo = player.processStoneArmorDegradation(poison.damage);
    }

    // Apply poison damage
    player.hp = Math.max(0, player.hp - poison.damage);

    const poisonDamageMessage = messages.getAbilityMessage(
      'statusEffects',
      'poison.damage'
    );
    log.push(
      messages.formatMessage(poisonDamageMessage, {
        playerName: player.name,
        damage: poison.damage,
      })
    );

    // Add Stone Armor degradation message if applicable
    if (armorDegradationInfo && armorDegradationInfo.degraded) {
      const armorMessage = messages.getEvent('dwarfStoneArmor');
      log.push(
        messages.formatMessage(armorMessage, {
          playerName: player.name,
          oldValue: armorDegradationInfo.oldValue,
          newValue: armorDegradationInfo.newArmorValue,
        })
      );

      if (
        armorDegradationInfo.destroyed &&
        armorDegradationInfo.newArmorValue <= 0
      ) {
        const destroyedMessage = messages.getEvent('stoneArmorDestroyed');
        log.push(
          messages.formatMessage(destroyedMessage, {
            playerName: player.name,
          })
        );
      }
    }

    // Check if died from poison
    if (player.hp === 0) {
      player.pendingDeath = true;
      player.deathAttacker = 'Poison';
    }

    // Decrement turns (this is correct with the +1 fix in applyEffect)
    poison.turns--;

    // Remove if expired
    if (poison.turns <= 0) {
      player.removeStatusEffect('poison');

      const expiredMessage = messages.getAbilityMessage(
        'statusEffects',
        'poison.expired'
      );
      log.push(
        messages.formatMessage(expiredMessage, {
          playerName: player.name,
        })
      );
    }
  }
}

module.exports = StatusEffectManager;
