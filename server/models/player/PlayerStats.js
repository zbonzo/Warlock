/**
 * @fileoverview PlayerStats domain model
 * Handles all player statistics tracking and calculations
 */
const logger = require('@utils/logger');

/**
 * PlayerStats class manages all statistical tracking for a player
 * Separated from Player class for better organization and testability
 */
class PlayerStats {
  /**
   * Create new player stats
   * @param {string} playerName - Player name for logging
   */
  constructor(playerName) {
    this.playerName = playerName;
    this.stats = {
      totalDamageDealt: 0,
      totalHealingDone: 0,
      damageTaken: 0,
      corruptionsPerformed: 0,
      abilitiesUsed: 0,
      monsterKills: 0,
      timesDied: 0,
      selfHeals: 0,
      highestSingleHit: 0,
    };
  }

  /**
   * Add damage dealt and update highest single hit
   * @param {number} damage - Damage amount to add
   */
  addDamageDealt(damage) {
    if (damage > 0) {
      this.stats.totalDamageDealt += damage;
      if (damage > this.stats.highestSingleHit) {
        this.stats.highestSingleHit = damage;
      }
      logger.info(`${this.playerName} stats updated: +${damage} damage, total: ${this.stats.totalDamageDealt}, highest: ${this.stats.highestSingleHit}`);
    }
  }

  /**
   * Add damage taken
   * @param {number} damage - Damage amount to add
   */
  addDamageTaken(damage) {
    if (damage > 0) {
      this.stats.damageTaken += damage;
      logger.info(`${this.playerName} stats updated: +${damage} damage taken, total: ${this.stats.damageTaken}`);
    }
  }

  /**
   * Add healing done
   * @param {number} healing - Healing amount to add
   */
  addHealingDone(healing) {
    if (healing > 0) {
      this.stats.totalHealingDone += healing;
      logger.info(`${this.playerName} stats updated: +${healing} healing done, total: ${this.stats.totalHealingDone}`);
    }
  }

  /**
   * Increment corruption count
   */
  addCorruption() {
    this.stats.corruptionsPerformed += 1;
    logger.info(`${this.playerName} stats updated: corruption performed, total: ${this.stats.corruptionsPerformed}`);
  }

  /**
   * Increment ability use count
   */
  addAbilityUse() {
    this.stats.abilitiesUsed += 1;
    logger.info(`${this.playerName} stats updated: ability used, total: ${this.stats.abilitiesUsed}`);
  }

  /**
   * Increment death count
   */
  addDeath() {
    this.stats.timesDied += 1;
    logger.info(`${this.playerName} stats updated: death recorded, total: ${this.stats.timesDied}`);
  }

  /**
   * Increment monster kill count
   */
  addMonsterKill() {
    this.stats.monsterKills += 1;
    logger.info(`${this.playerName} stats updated: monster kill, total: ${this.stats.monsterKills}`);
  }

  /**
   * Add self-healing
   * @param {number} healing - Self-healing amount to add
   */
  addSelfHeal(healing) {
    if (healing > 0) {
      this.stats.selfHeals += healing;
      logger.info(`${this.playerName} stats updated: +${healing} self-heal, total: ${this.stats.selfHeals}`);
    }
  }

  /**
   * Get current stats
   * @returns {Object} Current stats object
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset all stats to zero
   */
  reset() {
    this.stats = {
      totalDamageDealt: 0,
      totalHealingDone: 0,
      damageTaken: 0,
      corruptionsPerformed: 0,
      abilitiesUsed: 0,
      monsterKills: 0,
      timesDied: 0,
      selfHeals: 0,
      highestSingleHit: 0,
    };
  }

  /**
   * Get specific stat value
   * @param {string} statName - Name of the stat to get
   * @returns {number} Stat value
   */
  getStat(statName) {
    return this.stats[statName] || 0;
  }

  /**
   * Set player name (for logging after reconnection)
   * @param {string} newName - New player name
   */
  setPlayerName(newName) {
    this.playerName = newName;
  }

  /**
   * Get summary statistics for display
   * @returns {Object} Summary stats
   */
  getSummary() {
    return {
      combatStats: {
        damageDealt: this.stats.totalDamageDealt,
        damageTaken: this.stats.damageTaken,
        highestHit: this.stats.highestSingleHit,
        monsterKills: this.stats.monsterKills,
      },
      supportStats: {
        healingDone: this.stats.totalHealingDone,
        selfHealing: this.stats.selfHeals,
      },
      gameplayStats: {
        abilitiesUsed: this.stats.abilitiesUsed,
        deaths: this.stats.timesDied,
        corruptions: this.stats.corruptionsPerformed,
      },
    };
  }
}

module.exports = PlayerStats;