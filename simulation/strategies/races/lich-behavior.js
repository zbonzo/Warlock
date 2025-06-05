/**
 * @fileoverview Lich (Skeleton) Race Behavior - Preserve Undying ability
 */

/**
 * Lich (Skeleton) Race Behavior - Preserve Undying ability
 */
class LichBehavior {
  constructor() {
    this.hasUsedUndying = false;
    this.riskTolerance = 'high'; // high, medium, low
  }

  modifyDecision(baseDecision, availableActions, gameState, player) {
    // Adjust risk tolerance based on Undying availability
    this.updateRiskTolerance(player);

    // Modify decision based on risk tolerance
    return this.adjustForRisk(
      baseDecision,
      availableActions,
      gameState,
      player
    );
  }

  /**
   * Update risk tolerance based on Undying status
   * @param {Object} player - Player object
   */
  updateRiskTolerance(player) {
    if (!this.hasUsedUndying) {
      this.riskTolerance = 'high'; // Can afford to be aggressive
    } else if (player.hp >= player.maxHp * 0.5) {
      this.riskTolerance = 'medium';
    } else {
      this.riskTolerance = 'low'; // Must be very careful
    }
  }

  /**
   * Adjust decision based on current risk tolerance
   * @param {Object} baseDecision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  adjustForRisk(baseDecision, availableActions, gameState, player) {
    if (this.riskTolerance === 'low') {
      // Prioritize healing and defense when Undying is used
      const healActions = availableActions.filter(
        (action) => action.ability.category === 'Heal'
      );
      const defenseActions = availableActions.filter(
        (action) => action.ability.category === 'Defense'
      );

      if (player.hp <= player.maxHp * 0.4 && healActions.length > 0) {
        const action = healActions[0];
        return {
          actionType: action.abilityType,
          targetId: player.id,
        };
      }

      if (defenseActions.length > 0) {
        const action = defenseActions[0];
        return {
          actionType: action.abilityType,
          targetId: player.id,
        };
      }
    } else if (this.riskTolerance === 'high') {
      // Be more aggressive when Undying is available
      const attackActions = availableActions.filter(
        (action) => action.ability.category === 'Attack'
      );
      if (
        attackActions.length > 0 &&
        !baseDecision?.actionType?.includes('attack')
      ) {
        const action = attackActions[0];
        return {
          actionType: action.abilityType,
          targetId: action.targets.includes('__monster__')
            ? '__monster__'
            : action.targets[0],
        };
      }
    }

    return baseDecision;
  }
}

module.exports = LichBehavior;
