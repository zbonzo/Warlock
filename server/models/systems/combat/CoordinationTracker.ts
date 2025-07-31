/**
 * @fileoverview Coordination tracking system for combat bonuses
 * Handles tracking and calculating coordination bonuses when multiple players target the same enemy
 */

import config from '@config';
import logger from '@utils/logger';
import messages from '@messages';

interface CoordinationBonus {
  bonus: number;
  count: number;
  bonusPerAttacker?: number;
  maxBonus?: number;
}

interface CoordinationStats {
  totalTargets: number;
  coordinatedTargets: number;
  averageAttackersPerTarget: number;
  maxAttackersOnSingleTarget: number;
}

interface CoordinatedTarget {
  targetId: string;
  attackerCount: number;
  attackers: string[];
}

/**
 * CoordinationTracker manages coordination bonuses for combat
 */
class CoordinationTracker {
  // Track coordination for this round: targetId -> [playerId1, playerId2, ...]
  private coordinationMap: Map<string, string[]> = new Map();
  private comebackActive: boolean = false;

  constructor() {
    this.coordinationMap = new Map();
  }

  /**
   * Reset coordination tracking for new round
   */
  resetTracking(): void {
    this.coordinationMap.clear();
    logger.debug('Coordination tracking reset');
  }

  /**
   * Track coordination between players targeting the same enemy
   */
  trackCoordination(actorId: string, targetId: string): void {
    if (!this.coordinationMap.has(targetId)) {
      this.coordinationMap.set(targetId, []);
    }
    
    const attackers = this.coordinationMap.get(targetId)!;
    if (!attackers.includes(actorId)) {
      attackers.push(actorId);
      logger.debug(`Coordination tracked: ${actorId} -> ${targetId}`);
    }
  }

  /**
   * Get coordination count for a specific target, excluding a specific actor
   */
  getCoordinationCount(targetId: string, excludeActorId: string): number {
    const attackers = this.coordinationMap.get(targetId) || [];
    return attackers.filter(id => id !== excludeActorId).length;
  }

  /**
   * Calculate coordination bonus for an attack
   */
  calculateCoordinationBonus(actorId: string, targetId: string): CoordinationBonus {
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
   */
  getCoordinationStats(): CoordinationStats {
    const stats: CoordinationStats = {
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
   */
  hasCoordinatedAttacks(targetId: string): boolean {
    const attackers = this.coordinationMap.get(targetId) || [];
    return attackers.length > 1;
  }

  /**
   * Get all targets with coordination
   */
  getCoordinatedTargets(): CoordinatedTarget[] {
    const coordinatedTargets: CoordinatedTarget[] = [];
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
   */
  clearTarget(targetId: string): void {
    this.coordinationMap.delete(targetId);
  }

  /**
   * Clear coordination for a specific actor
   */
  clearActor(actorId: string): void {
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

export default CoordinationTracker;