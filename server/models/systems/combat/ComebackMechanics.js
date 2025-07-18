/**
 * @fileoverview Comeback mechanics for balancing gameplay
 * Provides bonuses to the good team when they're struggling
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * ComebackMechanics manages comeback bonuses and balance mechanics
 */
class ComebackMechanics {
  constructor(players) {
    this.players = players;
    this.comebackActive = false;
    this.comebackThreshold = config.gameBalance.comeback.threshold || 0.3;
    this.comebackBonus = config.gameBalance.comeback.bonus || 0.2;
  }

  /**
   * Update comeback status based on current game state
   * @param {Object} monster - Monster state
   * @returns {boolean} True if comeback status changed
   */
  updateComebackStatus(monster) {
    const goodPlayers = Array.from(this.players.values()).filter(p => 
      p.isAlive && !p.isWarlock
    );
    
    const totalGoodPlayers = goodPlayers.length;
    const avgGoodHp = totalGoodPlayers > 0 
      ? goodPlayers.reduce((sum, p) => sum + (p.hp / p.maxHp), 0) / totalGoodPlayers
      : 0;

    const monsterHpRatio = monster.hp / monster.maxHp;
    
    // Comeback is active if good team is struggling
    // (Low average HP and monster still has significant health)
    const shouldActivate = avgGoodHp < this.comebackThreshold && 
                          monsterHpRatio > 0.5 && 
                          totalGoodPlayers > 0;

    const wasActive = this.comebackActive;
    this.comebackActive = shouldActivate;

    if (this.comebackActive && !wasActive) {
      logger.info('Comeback mechanics activated');
      return true;
    } else if (!this.comebackActive && wasActive) {
      logger.info('Comeback mechanics deactivated');
      return true;
    }

    return false;
  }

  /**
   * Check if comeback mechanics are active
   * @returns {boolean} True if comeback is active
   */
  isActive() {
    return this.comebackActive;
  }

  /**
   * Get comeback bonus for damage calculations
   * @param {Object} player - Player performing the action
   * @returns {number} Comeback bonus multiplier (0.0 to 1.0)
   */
  getComebackBonus(player) {
    if (!this.comebackActive || !player || player.isWarlock) {
      return 0;
    }

    return this.comebackBonus;
  }

  /**
   * Apply comeback healing bonus
   * @param {Object} player - Player receiving healing
   * @param {number} baseAmount - Base healing amount
   * @returns {number} Modified healing amount
   */
  applyComebackHealing(player, baseAmount) {
    if (!this.comebackActive || !player || player.isWarlock) {
      return baseAmount;
    }

    const bonus = Math.floor(baseAmount * this.comebackBonus);
    return baseAmount + bonus;
  }

  /**
   * Apply comeback damage bonus
   * @param {Object} player - Player dealing damage
   * @param {number} baseDamage - Base damage amount
   * @returns {number} Modified damage amount
   */
  applyComebackDamage(player, baseDamage) {
    if (!this.comebackActive || !player || player.isWarlock) {
      return baseDamage;
    }

    const bonus = Math.floor(baseDamage * this.comebackBonus);
    return baseDamage + bonus;
  }

  /**
   * Get comeback status for display
   * @returns {Object} Comeback status information
   */
  getStatus() {
    const goodPlayers = Array.from(this.players.values()).filter(p => 
      p.isAlive && !p.isWarlock
    );
    
    const totalGoodPlayers = goodPlayers.length;
    const avgGoodHp = totalGoodPlayers > 0 
      ? goodPlayers.reduce((sum, p) => sum + (p.hp / p.maxHp), 0) / totalGoodPlayers
      : 0;

    return {
      active: this.comebackActive,
      threshold: this.comebackThreshold,
      bonus: this.comebackBonus,
      averageGoodHp: avgGoodHp,
      goodPlayersCount: totalGoodPlayers
    };
  }

  /**
   * Force activate comeback mechanics (for testing)
   * @param {boolean} active - Whether to activate comeback
   */
  forceActivate(active) {
    this.comebackActive = active;
    logger.debug(`Comeback mechanics force ${active ? 'activated' : 'deactivated'}`);
  }

  /**
   * Update comeback configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.threshold !== undefined) {
      this.comebackThreshold = config.threshold;
    }
    if (config.bonus !== undefined) {
      this.comebackBonus = config.bonus;
    }
  }

  /**
   * Reset comeback state
   */
  reset() {
    this.comebackActive = false;
    logger.debug('Comeback mechanics reset');
  }
}

module.exports = ComebackMechanics;