/**
 * @fileoverview System for managing player status effects and their durations
 * Handles application, removal, and round-based processing of effects
 */
const config = require('@config');
const logger = require('@utils/logger');

/**
 * Manages all status effects across players
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

    console.log(`Applying effect ${effectName} to ${player.name}:`, effectData);

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
    console.log(`Player already has ${effectName}?`, hasEffect);

    // Apply default values for any missing parameters
    const effectDefaults = config.statusEffects[effectName]?.default || {};
    const finalData = {
      ...effectDefaults,
      ...effectData,
    };

    // Special handling for vulnerability
    if (effectName === 'vulnerable') {
      player.applyVulnerability(finalData.damageIncrease, finalData.turns);

      // Special log for vulnerability
      log.push(
        `${player.name} is VULNERABLE and will take ${finalData.damageIncrease}% more damage for ${finalData.turns} turn(s)!`
      );
      console.log(
        `Applied vulnerability to ${player.name}: ${finalData.damageIncrease}% for ${finalData.turns} turns`
      );
      return true;
    }

    // For other effects, apply normally
    player.applyStatusEffect(effectName, finalData);
    console.log(`Applied ${effectName} to ${player.name}`);

    // Add log message
    if (!hasEffect) {
      // Use config messages module directly
      const template = config.statusEffects.getEffectMessage
        ? config.statusEffects.getEffectMessage(effectName, 'applied')
        : `${player.name} is affected by ${effectName}.`;

      log.push(
        config.messages.formatMessage(template, {
          playerName: player.name,
          ...finalData,
        })
      );
    } else {
      // Use config messages module directly
      const template = config.statusEffects.getEffectMessage
        ? config.statusEffects.getEffectMessage(effectName, 'refreshed')
        : `${player.name}'s ${effectName} effect is refreshed.`;

      log.push(
        config.messages.formatMessage(template, {
          playerName: player.name,
          ...finalData,
        })
      );
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

    // For other effects, remove normally
    player.removeStatusEffect(effectName);

    // Add log message if effect was present
    if (hadEffect) {
      log.push(
        config.getEffectMessage(effectName, 'expired', {
          playerName: player.name,
        })
      );
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
   * Process all timed status effects for all players
   * Updates durations, applies effects, and removes expired effects
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
        } else {
          const increase = player.vulnerabilityIncrease;
          const turns = player.statusEffects.vulnerable?.turns || 0;
          log.push(
            `${player.name} remains VULNERABLE (${increase}% more damage) for ${turns} more turn(s).`
          );
        }
      }
    }

    // Process effects in order defined in config
    const processingOrder = config.statusEffects.processingOrder || {
      poison: 1,
      protected: 2,
      invisible: 4,
      stunned: 5,
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
        } else {
          this.processTimedEffect(player, effectType, log);
        }
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

    log.push(
      config.getEffectMessage('poison', 'damage', {
        playerName: player.name,
        damage: poison.damage,
      })
    );

    // Add Stone Armor degradation message if applicable
    if (armorDegradationInfo && armorDegradationInfo.degraded) {
      log.push(
        config.messages.getEvent('dwarfStoneArmor', {
          playerName: player.name,
          oldValue: armorDegradationInfo.oldValue,
          newValue: armorDegradationInfo.newArmorValue,
        })
      );

      if (
        armorDegradationInfo.destroyed &&
        armorDegradationInfo.newArmorValue <= 0
      ) {
        log.push(
          config.messages.getEvent('stoneArmorDestroyed', {
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

    // Decrement turns
    poison.turns--;

    // Remove if expired
    if (poison.turns <= 0) {
      player.removeStatusEffect('poison');
      log.push(
        config.getEffectMessage('poison', 'expired', {
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

    // Decrement turns
    effect.turns--;

    // Remove if expired
    if (effect.turns <= 0) {
      player.removeStatusEffect(effectName);
      log.push(
        config.statusEffects.getEffectMessage(effectName, 'expired', {
          playerName: player.name,
        })
      );
    }
  }
}

module.exports = StatusEffectManager;
