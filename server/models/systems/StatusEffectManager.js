/**
 * @fileoverview Updated StatusEffectManager with FIXED validation logic
 * The key issue was that config.statusEffects[effectName] wasn't finding the effect definitions
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * Manages all status effects across players including healing over time and Oracle effects
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
      healingOverTime: { default: { amount: 5, turns: 3 } },
      spiritGuard: { default: { armor: 3, counterDamage: 25, turns: 1 } },
      sanctuary: { default: { counterDamage: 50, turns: 1 } },
    };
  }

  /**
   * Apply a status effect to a player - FIXED validation logic
   * @param {string} playerId - Target player's ID
   * @param {string} effectName - Name of the effect to apply
   * @param {Object} effectData - Effect parameters
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the effect was successfully applied
   */
  applyEffect(playerId, effectName, effectData, log = []) {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // FIXED: Check if the effect definition exists in the config
    // Try multiple ways to get the effect definition
    let effectDefinition = null;

    // Method 1: Direct property access (for new effects)
    if (config.statusEffects && config.statusEffects[effectName]) {
      effectDefinition = config.statusEffects[effectName];
    }

    // Method 2: Check our local definitions (fallback)
    if (!effectDefinition && this.effectDefinitions[effectName]) {
      effectDefinition = this.effectDefinitions[effectName];
    }

    // Method 3: Check if it's in the config helper function
    if (!effectDefinition && config.getStatusEffectDefaults) {
      const defaults = config.getStatusEffectDefaults(effectName);
      if (defaults) {
        effectDefinition = { default: defaults };
      }
    }

    // If we still don't have a definition, the effect is unknown
    if (!effectDefinition) {
      logger.warn(
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
    const effectDefaults = effectDefinition.default || {};
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

    // Special handling for spiritGuard and sanctuary
    if (effectName === 'spiritGuard' || effectName === 'sanctuary') {
      // Set up class effects for Oracle abilities
      if (!player.classEffects) {
        player.classEffects = {};
      }

      if (effectName === 'spiritGuard') {
        player.classEffects.spiritGuard = {
          armor: finalData.armor,
          counterDamage: finalData.counterDamage,
          turnsLeft: finalData.turns,
          revealsWarlocks: true,
        };

        // Also apply as a shielded effect for the armor
        player.applyStatusEffect('shielded', {
          armor: finalData.armor,
          turns: finalData.turns,
        });
      } else if (effectName === 'sanctuary') {
        player.classEffects.sanctuaryOfTruth = {
          counterDamage: finalData.counterDamage,
          turnsLeft: finalData.turns,
          autoDetect: true,
        };
      }

      // Apply the effect normally as well for tracking
      player.applyStatusEffect(effectName, finalData);
    } else {
      // For other effects, apply normally
      player.applyStatusEffect(effectName, finalData);
    }

    // Add log message (subtract 1 from turns for display since we added 1 internally)
    const displayTurns = (finalData.turns || 1) - 1;
    const logData = { ...finalData, turns: displayTurns };

    if (!hasEffect) {
      // Create a simple success message since we may not have complex message templates
      const message = `${player.name} is affected by ${effectName} for ${displayTurns} turn(s).`;
      log.push(message);
    } else {
      // Refresh message
      const message = `${player.name}'s ${effectName} effect is refreshed for ${displayTurns} turn(s).`;
      log.push(message);
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

      log.push(`${player.name} is no longer vulnerable.`);
      return true;
    }

    // Special handling for Oracle effects
    if (effectName === 'spiritGuard' && player.classEffects?.spiritGuard) {
      delete player.classEffects.spiritGuard;
      // Also remove shielded effect if it was from spirit guard
      player.removeStatusEffect('shielded');
    } else if (
      effectName === 'sanctuary' &&
      player.classEffects?.sanctuaryOfTruth
    ) {
      delete player.classEffects.sanctuaryOfTruth;
    }

    // For other effects, remove normally
    player.removeStatusEffect(effectName);

    // Add log message if effect was present
    if (hadEffect) {
      log.push(`The ${effectName} effect on ${player.name} has worn off.`);
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
    if (effectName === 'spiritGuard') {
      return player && player.classEffects && player.classEffects.spiritGuard;
    }
    if (effectName === 'sanctuary') {
      return (
        player && player.classEffects && player.classEffects.sanctuaryOfTruth
      );
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

    if (effectName === 'spiritGuard' && player.classEffects?.spiritGuard) {
      return player.classEffects.spiritGuard;
    }

    if (effectName === 'sanctuary' && player.classEffects?.sanctuaryOfTruth) {
      return player.classEffects.sanctuaryOfTruth;
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
   * Process all timed status effects for all players including healing over time and Oracle effects
   * @param {Array} log - Event log to append messages to
   */
  processTimedEffects(log = []) {
    const alivePlayers = this.gameStateUtils.getAlivePlayers();

    // Process vulnerability directly
    for (const player of alivePlayers) {
      if (player.isVulnerable) {
        const expired = player.processVulnerability();

        if (expired) {
          log.push(`${player.name} is no longer vulnerable.`);
        }
      }
    }

    // Process effects in order - use our local processing order
    const processingOrder = {
      poison: 1,
      shielded: 2,
      invisible: 4,
      stunned: 5,
      weakened: 6,
      enraged: 7,
      healingOverTime: 8,
      spiritGuard: 9,
      sanctuary: 10,
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
        } else if (effectType === 'spiritGuard') {
          this.processSpiritGuardEffect(player, log);
        } else if (effectType === 'sanctuary') {
          this.processSanctuaryEffect(player, log);
        } else {
          this.processTimedEffect(player, effectType, log);
        }
      }
    }
  }

  /**
   * Process healing over time effect for a player
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
        log.push(
          `${player.name} regenerates ${actualHeal} health from their blessing.`
        );

        // Add private message to the player
        const privateHealLog = {
          type: 'healing_over_time',
          public: false,
          targetId: player.id,
          message: '',
          privateMessage: `You regenerate ${actualHeal} HP from healing over time.`,
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
      log.push(`The healing blessing on ${player.name} has faded.`);
    }
  }

  /**
   * Process Spirit Guard effect for a player
   * @param {Object} player - Player object
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processSpiritGuardEffect(player, log) {
    if (!player.classEffects?.spiritGuard) return;

    const spiritGuard = player.classEffects.spiritGuard;

    // Decrement turns
    spiritGuard.turnsLeft--;

    // Remove if expired
    if (spiritGuard.turnsLeft <= 0) {
      delete player.classEffects.spiritGuard;
      // Also remove the shielded effect
      player.removeStatusEffect('shielded');
      player.removeStatusEffect('spiritGuard');

      log.push(`${player.name}'s Spirit Guard fades away.`);
    }
  }

  /**
   * Process Sanctuary effect for a player
   * @param {Object} player - Player object
   * @param {Array} log - Event log to append messages to
   * @private
   */
  processSanctuaryEffect(player, log) {
    if (!player.classEffects?.sanctuaryOfTruth) return;

    const sanctuary = player.classEffects.sanctuaryOfTruth;

    // Decrement turns
    sanctuary.turnsLeft--;

    // Remove if expired
    if (sanctuary.turnsLeft <= 0) {
      delete player.classEffects.sanctuaryOfTruth;
      player.removeStatusEffect('sanctuary');

      log.push(`${player.name}'s Sanctuary of Truth fades away.`);
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
      log.push(`The ${effectName} effect on ${player.name} has worn off.`);
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

    log.push(`${player.name} suffers ${poison.damage} poison damage.`);

    // Add Stone Armor degradation message if applicable
    if (armorDegradationInfo && armorDegradationInfo.degraded) {
      log.push(
        `${player.name}'s Stone Armor weakens from the poison! (${armorDegradationInfo.oldValue} → ${armorDegradationInfo.newArmorValue})`
      );

      if (
        armorDegradationInfo.destroyed &&
        armorDegradationInfo.newArmorValue <= 0
      ) {
        log.push(`${player.name}'s Stone Armor is completely destroyed!`);
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
      log.push(`The poison affecting ${player.name} has worn off.`);
    }
  }
}

module.exports = StatusEffectManager;
