/**
 * @fileoverview GameState domain model
 * Manages core game state including players, monster, and progression tracking
 */
const logger = require('@utils/logger');

/**
 * GameState class manages core game state
 * Extracted from GameRoom to improve separation of concerns
 */
class GameState {
  /**
   * Create a new game state
   * @param {string} code - Unique game code for identification
   */
  constructor(code) {
    this.code = code;
    this.players = new Map();
    this.hostId = null;
    this.started = false;
    this.round = 0;
    this.level = 1;
    this.aliveCount = 0;
    this.disconnectedPlayers = [];

    // Monster state from config
    this.monster = {
      hp: 0, // Will be set from config when game starts
      maxHp: 0,
      baseDmg: 0,
      age: 0,
    };
  }

  /**
   * Initialize monster from config
   * @param {Object} config - Game configuration
   */
  initializeMonster(config) {
    this.monster = {
      hp: config.gameBalance.monster.baseHp,
      maxHp: config.gameBalance.monster.baseHp,
      baseDmg: config.gameBalance.monster.baseDamage,
      age: config.gameBalance.monster.baseAge,
    };
  }

  /**
   * Add a player to the game state
   * @param {Object} player - Player object
   * @returns {boolean} Success status
   */
  addPlayer(player) {
    if (this.players.has(player.id)) {
      return false;
    }

    this.players.set(player.id, player);
    this.aliveCount++;

    if (!this.hostId) {
      this.hostId = player.id;
    }

    return true;
  }

  /**
   * Remove a player from the game state
   * @param {string} playerId - Player's ID
   * @returns {Object|null} Removed player or null if not found
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return null;
    }

    if (player.isAlive) {
      this.aliveCount--;
    }

    this.players.delete(playerId);

    // Update host if needed
    if (this.hostId === playerId) {
      const remainingPlayers = Array.from(this.players.keys());
      this.hostId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
    }

    return player;
  }

  /**
   * Get a player by ID
   * @param {string} playerId - Player's ID
   * @returns {Object|null} Player object or null if not found
   */
  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  /**
   * Get all players
   * @returns {Array} Array of all players
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Get alive players
   * @returns {Array} Array of alive players
   */
  getAlivePlayers() {
    return Array.from(this.players.values()).filter(p => p.isAlive);
  }

  /**
   * Update alive count based on current player states
   */
  updateAliveCount() {
    this.aliveCount = this.getAlivePlayers().length;
  }

  /**
   * Check if the game has started
   * @returns {boolean} Whether the game has started
   */
  hasStarted() {
    return this.started;
  }

  /**
   * Start the game
   */
  startGame() {
    this.started = true;
    logger.info('GameStarted', { gameCode: this.code, playerCount: this.players.size });
  }

  /**
   * Advance to next round
   */
  nextRound() {
    this.round++;
    logger.debug('RoundAdvanced', { gameCode: this.code, round: this.round });
  }

  /**
   * Level up the game
   * @param {number} newLevel - New level
   */
  levelUp(newLevel) {
    const oldLevel = this.level;
    this.level = newLevel;
    logger.info('GameLevelUp', { 
      gameCode: this.code, 
      oldLevel, 
      newLevel: this.level 
    });
  }

  /**
   * Get current game state snapshot
   * @returns {Object} Game state information
   */
  getSnapshot() {
    return {
      code: this.code,
      hostId: this.hostId,
      started: this.started,
      round: this.round,
      level: this.level,
      playerCount: this.players.size,
      aliveCount: this.aliveCount,
      monster: { ...this.monster },
    };
  }

  /**
   * Transfer player ID when they reconnect
   * @param {string} oldId - Old player ID
   * @param {string} newId - New player ID
   * @returns {boolean} Whether the transfer was successful
   */
  transferPlayerId(oldId, newId) {
    const player = this.players.get(oldId);
    if (!player) {
      return false;
    }

    // Remove from old ID
    this.players.delete(oldId);

    // Update player's ID
    player.id = newId;

    // Add to new ID
    this.players.set(newId, player);

    // Update host if needed
    if (this.hostId === oldId) {
      this.hostId = newId;
    }

    logger.debug('PlayerIdTransferred', {
      gameCode: this.code,
      oldId,
      newId,
      playerName: player.name
    });

    return true;
  }

  /**
   * Add a disconnected player for tracking
   * @param {Object} player - Disconnected player
   */
  addDisconnectedPlayer(player) {
    this.disconnectedPlayers.push({
      id: player.id,
      name: player.name,
      disconnectedAt: Date.now(),
    });
  }

  /**
   * Clean up expired disconnected players
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10 minutes)
   * @returns {Array} Array of cleaned up player names
   */
  cleanupDisconnectedPlayers(timeoutMs = 10 * 60 * 1000) {
    const now = Date.now();
    const cleanedUp = [];
    
    this.disconnectedPlayers = this.disconnectedPlayers.filter(player => {
      if (now - player.disconnectedAt > timeoutMs) {
        cleanedUp.push(player.name);
        return false;
      }
      return true;
    });
    
    return cleanedUp;
  }

  /**
   * Get players info for client updates
   * @returns {Array} Array of player info objects
   */
  getPlayersInfo() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      race: p.race,
      class: p.class,
      hp: p.hp,
      maxHp: p.maxHp,
      armor: p.armor,
      damageMod: p.damageMod,
      isWarlock: p.isWarlock,
      isAlive: p.isAlive,
      isReady: p.isReady,
      unlocked: p.unlocked,
      racialAbility: p.racialAbility,
      racialUsesLeft: p.racialUsesLeft,
      racialCooldown: p.racialCooldown,
      level: this.level,
      statusEffects: p.statusEffects,
      abilityCooldowns: p.abilityCooldowns || {},
      hasSubmittedAction: p.hasSubmittedAction || false,
      submissionStatus: p.getSubmissionStatus ? p.getSubmissionStatus() : 'none',
      stoneArmor: p.stoneArmorIntact ? {
        active: true,
        value: p.stoneArmorValue,
        effectiveArmor: p.getEffectiveArmor ? p.getEffectiveArmor() : p.armor,
      } : null,
      stats: p.stats || {
        totalDamageDealt: 0,
        totalHealingDone: 0,
        damageTaken: 0,
        corruptionsPerformed: 0,
        abilitiesUsed: 0,
        monsterKills: 0,
        timesDied: 0,
        selfHeals: 0,
        highestSingleHit: 0,
      },
    }));
  }
}

module.exports = { GameState };