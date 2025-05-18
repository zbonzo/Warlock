/**
 * @fileoverview System for managing warlock players, conversion, and related game mechanics
 * Centralizes warlock-specific logic for consistent behavior
 */

/**
 * WarlockSystem manages all warlock-related operations
 * Handles warlock assignments, conversions, and tracking
 */
class WarlockSystem {
  /**
   * Create a new warlock system
   * @param {Map} players - Map of player objects
   * @param {GameStateUtils} gameStateUtils - Game state utility functions
   */
  constructor(players, gameStateUtils) {
    this.players = players;
    this.gameStateUtils = gameStateUtils;
    this.numWarlocks = 0;
  }

  /**
   * Assign the initial warlock randomly
   * @param {string|null} preferredPlayerId - Preferred player ID to make warlock
   * @returns {Object|null} The assigned warlock player or null if failed
   */
  assignInitialWarlock(preferredPlayerId = null) {
    const playerIds = Array.from(this.players.keys());
    if (playerIds.length === 0) return null;

    let chosenId = preferredPlayerId;
    if (!chosenId || !this.players.has(chosenId)) {
      chosenId = playerIds[Math.floor(Math.random() * playerIds.length)];
    }

    const warlock = this.players.get(chosenId);
    if (warlock) {
      warlock.isWarlock = true;
      this.numWarlocks = 1;
      return warlock;
    }
    
    return null;
  }

  /**
   * Get the current number of warlocks
   * @returns {number} Count of warlocks
   */
  getWarlockCount() {
    return this.numWarlocks;
  }

  /**
   * Increment the warlock count
   */
  incrementWarlockCount() {
    this.numWarlocks++;
  }

  /**
   * Decrement the warlock count
   * @returns {number} New warlock count
   */
  decrementWarlockCount() {
    if (this.numWarlocks > 0) {
      this.numWarlocks--;
    }
    return this.numWarlocks;
  }

  /**
   * Check if a player is a warlock
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether the player is a warlock
   */
  isPlayerWarlock(playerId) {
    const player = this.players.get(playerId);
    return player && player.isWarlock;
  }

  /**
   * Count alive warlocks
   * @returns {number} Number of alive warlocks
   */
  countAliveWarlocks() {
    return this.gameStateUtils.getAlivePlayers()
      .filter(player => player.isWarlock)
      .length;
  }

  /**
   * Get all warlock players
   * @param {boolean} aliveOnly - Whether to only include alive warlocks
   * @returns {Array} Array of warlock player objects
   */
  getWarlocks(aliveOnly = false) {
    const playerArray = Array.from(this.players.values());
    return playerArray.filter(player => 
      player.isWarlock && (!aliveOnly || player.isAlive)
    );
  }

  /**
   * Attempt to convert a target to a Warlock
   * @param {Object} actor - The Warlock attempting the conversion
   * @param {Object} target - The potential convert (can be null for random targeting)
   * @param {Array} log - The log array to append messages to
   * @param {number} rateModifier - Optional modifier to conversion chance (default: 1.0)
   * @returns {boolean} Whether the conversion was successful
   */
  attemptConversion(actor, target, log, rateModifier = 1.0) {
    // Validate actor is a warlock
    if (!actor || !actor.isWarlock) return false;
    
    // Handle null target (for abilities that generate "threat" without a specific target)
    if (!target) {
      // For "untargeted" actions, attempt to convert a random non-warlock
      return this.attemptRandomConversion(actor, log, rateModifier);
    }
    
    // Skip if target is invalid, dead, or already a warlock
    if (!target.isAlive || target.isWarlock) return false;
   
    // Conversion chance: 20% base + 30% scaled by warlock ratio, max 70%
    // Modified by rateModifier parameter (e.g. 0.5 for AOE abilities)
    const alivePlayersCount = this.gameStateUtils.getAlivePlayers().length;
    const baseChance = Math.min(0.5, 0.2 + (this.numWarlocks / alivePlayersCount) * 0.3);
    const finalChance = baseChance * rateModifier;
    
    if (Math.random() < finalChance) {
      target.isWarlock = true;
      this.incrementWarlockCount();
      log.push(`Corruption spreads! ${target.name} has been turned into a Warlock by ${actor.name}!`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Attempt to convert a random non-warlock player
   * Used for untargeted warlock actions that generate "threat"
   * @param {Object} actor - The Warlock generating the threat
   * @param {Array} log - The log array to append messages to
   * @param {number} rateModifier - Modifier to conversion chance
   * @returns {boolean} Whether a conversion was successful
   * @private
   */
  attemptRandomConversion(actor, log, rateModifier = 0.5) {
    // Get all eligible players (alive, not warlocks, not the actor)
    const eligiblePlayers = this.gameStateUtils.getAlivePlayers()
      .filter(p => !p.isWarlock && p.id !== actor.id);
    
    if (eligiblePlayers.length === 0) return false;
    
    // Choose a random eligible player
    const randomIdx = Math.floor(Math.random() * eligiblePlayers.length);
    const target = eligiblePlayers[randomIdx];
    
    // Untargeted conversions have a lower base chance (using the rateModifier)
    return this.attemptConversion(actor, target, log, rateModifier);
  }
  
  /**
   * Convert specified player to a warlock without chance calculation
   * Used for special events or admin actions
   * @param {string} playerId - ID of player to convert
   * @param {Array} log - The log array to append messages to
   * @param {string} reason - Reason for forced conversion
   * @returns {boolean} Whether the conversion was successful
   */
  forceConvertPlayer(playerId, log, reason = 'unknown') {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive || player.isWarlock) return false;
    
    player.isWarlock = true;
    this.incrementWarlockCount();
    
    log.push(`${player.name} has been turned into a Warlock! (Reason: ${reason})`);
    return true;
  }
  
  /**
   * Check if warlocks are winning
   * @returns {boolean} Whether warlocks are currently winning
   */
  areWarlocksWinning() {
    const aliveCount = this.gameStateUtils.getAlivePlayers().length;
    const aliveWarlockCount = this.countAliveWarlocks();
    
    // Warlocks are winning if they are majority
    return aliveWarlockCount > aliveCount / 2;
  }
}

module.exports = WarlockSystem;