/**
 * @fileoverview Coordination tracking system for combat bonuses
 * Handles tracking and calculating coordination bonuses when multiple players target the same enemy
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * CoordinationTracker manages coordination bonuses for combat
 */
class CoordinationTracker {
  constructor() {
    // Track coordination for this round: targetId -> [playerId1, playerId2, ...]
    this.coordinationMap = new Map();
    this.comebackActive = false;
  }

  /**
   * Reset coordination tracking for new round
   */
  resetTracking() {
    this.coordinationMap.clear();
    logger.debug('Coordination tracking reset');
  }

  /**
   * Track coordination between players targeting the same enemy
   * @param {string} actorId - ID of the attacking player
   * @param {string} targetId - ID of the target being attacked
   */
  trackCoordination(actorId, targetId) {
    if (!this.coordinationMap.has(targetId)) {
      this.coordinationMap.set(targetId, []);
    }
    
    const attackers = this.coordinationMap.get(targetId);
    if (!attackers.includes(actorId)) {
      attackers.push(actorId);
      logger.debug(`Coordination tracked: ${actorId} -> ${targetId}`);
    }
  }

  /**
   * Get coordination count for a specific target, excluding a specific actor
   * @param {string} targetId - ID of the target
   * @param {string} excludeActorId - ID of the actor to exclude from count
   * @returns {number} Number of other players targeting this target
   */
  getCoordinationCount(targetId, excludeActorId) {
    const attackers = this.coordinationMap.get(targetId) || [];
    return attackers.filter(id => id !== excludeActorId).length;
  }

  /**
   * Calculate coordination bonus for an attack
   * @param {string} actorId - ID of the attacking player
   * @param {string} targetId - ID of the target being attacked
   * @returns {Object} Coordination bonus information
   */
  calculateCoordinationBonus(actorId, targetId) {
    const otherAttackers = this.getCoordinationCount(targetId, actorId);
    
    if (otherAttackers === 0) {
      return { bonus: 0, count: 0 };
    }

    // Calculate bonus based on number of other attackers
    const bonusPerAttacker = config.gameBalance.coordination.bonusPerAttacker || 0.15;
    const maxBonus = config.gameBalance.coordination.maxBonus || 0.5;
    
    const rawBonus = otherAttackers * bonusPerAttacker;
    const bonus = Math.min(rawBonus, maxBonus);

    return {
      bonus,
      count: otherAttackers,
      bonusPerAttacker,
      maxBonus
    };
  }

  /**
   * Get coordination statistics for the current round
   * @returns {Object} Coordination statistics
   */
  getCoordinationStats() {
    const stats = {
      totalTargets: this.coordinationMap.size,
      coordinatedTargets: 0,
      averageAttackersPerTarget: 0,
      maxAttackersOnSingleTarget: 0
    };

    let totalAttackers = 0;
    for (const [targetId, attackers] of this.coordinationMap) {
      if (attackers.length > 1) {
        stats.coordinatedTargets++;
      }
      totalAttackers += attackers.length;
      stats.maxAttackersOnSingleTarget = Math.max(
        stats.maxAttackersOnSingleTarget,
        attackers.length
      );
    }

    if (stats.totalTargets > 0) {
      stats.averageAttackersPerTarget = totalAttackers / stats.totalTargets;
    }

    return stats;
  }

  /**
   * Check if a target has coordinated attacks
   * @param {string} targetId - ID of the target
   * @returns {boolean} True if target has multiple attackers
   */
  hasCoordinatedAttacks(targetId) {
    const attackers = this.coordinationMap.get(targetId) || [];
    return attackers.length > 1;
  }

  /**
   * Get all targets with coordination
   * @returns {Array} Array of target IDs with multiple attackers
   */
  getCoordinatedTargets() {
    const coordinatedTargets = [];
    for (const [targetId, attackers] of this.coordinationMap) {
      if (attackers.length > 1) {
        coordinatedTargets.push({
          targetId,
          attackerCount: attackers.length,
          attackers: [...attackers]
        });
      }
    }
    return coordinatedTargets;
  }

  /**
   * Clear coordination for a specific target
   * @param {string} targetId - ID of the target to clear
   */
  clearTarget(targetId) {
    this.coordinationMap.delete(targetId);
  }

  /**
   * Clear coordination for a specific actor
   * @param {string} actorId - ID of the actor to remove
   */
  clearActor(actorId) {
    for (const [targetId, attackers] of this.coordinationMap) {
      const index = attackers.indexOf(actorId);
      if (index !== -1) {
        attackers.splice(index, 1);
        if (attackers.length === 0) {
          this.coordinationMap.delete(targetId);
        }
      }
    }
  }
}

module.exports = CoordinationTracker;