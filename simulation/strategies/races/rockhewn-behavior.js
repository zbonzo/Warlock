/**
 * @fileoverview Rockhewn (Dwarf) Race Behavior - Leverage Stone Armor defensively
 */

/**
 * Rockhewn (Dwarf) Race Behavior - Leverage Stone Armor defensively
 */
class RockhewnBehavior {
  constructor() {
    this.armorTracker = 8; // Start with 8 armor
  }

  modifyDecision(baseDecision, availableActions, gameState, player) {
    // Track armor degradation
    this.updateArmorTracking(player);

    // Be more aggressive when armor is high
    if (this.armorTracker >= 6) {
      return this.encourageAggression(
        baseDecision,
        availableActions,
        gameState,
        player
      );
    }

    // Be more defensive when armor is low or negative
    if (this.armorTracker <= 2) {
      return this.encourageDefense(
        baseDecision,
        availableActions,
        gameState,
        player
      );
    }

    return baseDecision;
  }

  /**
   * Update internal armor tracking
   * @param {Object} player - Player object
   */
  updateArmorTracking(player) {
    // This would be enhanced with actual damage tracking
    // For now, estimate based on current HP
    const damagePercent = 1 - player.hp / player.maxHp;
    this.armorTracker = Math.max(-4, 8 - Math.floor(damagePercent * 10));
  }

  /**
   * Encourage aggressive play when armored
   * @param {Object} baseDecision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  encourageAggression(baseDecision, availableActions, gameState, player) {
    // Prefer attacking over defending when well-armored
    if (
      baseDecision?.actionType?.includes('shield') ||
      baseDecision?.actionType?.includes('heal')
    ) {
      const attackActions = availableActions.filter(
        (action) => action.ability.category === 'Attack'
      );
      if (attackActions.length > 0) {
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

  /**
   * Encourage defensive play when vulnerable
   * @param {Object} baseDecision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  encourageDefense(baseDecision, availableActions, gameState, player) {
    // Prioritize healing and defensive abilities when armor is low
    const healActions = availableActions.filter(
      (action) => action.ability.category === 'Heal'
    );
    const defenseActions = availableActions.filter(
      (action) => action.ability.category === 'Defense'
    );

    if (player.hp <= player.maxHp * 0.6 && healActions.length > 0) {
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

    return baseDecision;
  }
}

module.exports = RockhewnBehavior;
