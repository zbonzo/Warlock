/**
 * @fileoverview System for managing player status effects and their durations
 * Handles application, removal, and round-based processing of effects
 */

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
    
    // Effect definitions with default parameters and behavior
    this.effectDefinitions = {
      poison: {
        default: { damage: 5, turns: 3 },
        stackable: false,
        refreshable: true
      },
      protected: {
        default: { armor: 2, turns: 1 },
        stackable: false,
        refreshable: true
      },
      invisible: {
        default: { turns: 1 },
        stackable: false,
        refreshable: true
      },
      stunned: {
        default: { turns: 1 },
        stackable: false,
        refreshable: true
      }
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
    
    // Get the effect definition
    const definition = this.effectDefinitions[effectName];
    if (!definition) {
      log.push(`Unknown effect ${effectName} could not be applied to ${player.name}.`);
      return false;
    }
    
    // Check if already has the effect
    const hasEffect = player.hasStatusEffect(effectName);
    
    // Apply default values for any missing parameters
    const finalData = {
      ...definition.default,
      ...effectData
    };
    
    // Apply the effect to the player
    player.applyStatusEffect(effectName, finalData);
    
    // Add log message if not already present
    if (!hasEffect) {
      log.push(this.getEffectApplicationMessage(player.name, effectName, finalData));
    } else {
      log.push(this.getEffectRefreshMessage(player.name, effectName, finalData));
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
    
    // Remove the effect
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
    if (!player || !player.hasStatusEffect(effectName)) return null;
    
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
    
    for (const player of alivePlayers) {
      // Process each type of effect
      this.processPoisonEffect(player, log);
      this.processTimedEffect(player, 'protected', log);
      this.processTimedEffect(player, 'invisible', log);
      this.processTimedEffect(player, 'stunned', log);
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
    
    // Apply poison damage
    player.hp = Math.max(0, player.hp - poison.damage);
    log.push(`${player.name} suffers ${poison.damage} poison damage.`);
    
    // Check if died from poison
    if (player.hp === 0) {
      player.pendingDeath = true;
      player.deathAttacker = "Poison";
    }
    
    // Decrement turns
    poison.turns--;
    
    // Remove if expired
    if (poison.turns <= 0) {
      player.removeStatusEffect('poison');
      log.push(`The poison affecting ${player.name} has worn off.`);
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
      log.push(this.getEffectExpirationMessage(player.name, effectName));
    }
  }

  /**
   * Get a message for effect application
   * @param {string} playerName - Name of the affected player
   * @param {string} effectName - Name of the effect
   * @param {Object} effectData - Effect data
   * @returns {string} Formatted message
   * @private
   */
  getEffectApplicationMessage(playerName, effectName, effectData) {
    switch (effectName) {
      case 'poison':
        return `${playerName} is poisoned for ${effectData.damage} damage over ${effectData.turns} turns.`;
      case 'protected':
        return `${playerName} is protected with ${effectData.armor} armor for ${effectData.turns} turn(s).`;
      case 'invisible':
        return `${playerName} becomes invisible for ${effectData.turns} turn(s).`;
      case 'stunned':
        return `${playerName} is stunned for ${effectData.turns} turn(s).`;
      default:
        return `${playerName} is affected by ${effectName}.`;
    }
  }

  /**
   * Get a message for effect refresh
   * @param {string} playerName - Name of the affected player
   * @param {string} effectName - Name of the effect
   * @param {Object} effectData - Effect data
   * @returns {string} Formatted message
   * @private
   */
  getEffectRefreshMessage(playerName, effectName, effectData) {
    switch (effectName) {
      case 'poison':
        return `${playerName}'s poison is refreshed for ${effectData.damage} damage over ${effectData.turns} turns.`;
      case 'protected':
        return `${playerName}'s protection is refreshed for ${effectData.turns} turn(s).`;
      case 'invisible':
        return `${playerName}'s invisibility is extended for ${effectData.turns} turn(s).`;
      case 'stunned':
        return `${playerName} remains stunned for ${effectData.turns} more turn(s).`;
      default:
        return `${playerName}'s ${effectName} effect is refreshed.`;
    }
  }

  /**
   * Get a message for effect expiration
   * @param {string} playerName - Name of the affected player
   * @param {string} effectName - Name of the effect
   * @returns {string} Formatted message
   * @private
   */
  getEffectExpirationMessage(playerName, effectName) {
    switch (effectName) {
      case 'poison':
        return `The poison affecting ${playerName} has worn off.`;
      case 'protected':
        return `${playerName} is no longer protected.`;
      case 'invisible':
        return `${playerName} is no longer invisible.`;
      case 'stunned':
        return `${playerName} is no longer stunned.`;
      default:
        return `The ${effectName} effect on ${playerName} has worn off.`;
    }
  }
}

module.exports = StatusEffectManager;