/**
 * @fileoverview Kinfolk (Satyr) Race Behavior - Maximize Life Bond healing
 */
class KinfolkBehavior {
  constructor() {
    this.lifeBondHealing = 0;
  }

  modifyDecision(baseDecision, availableActions, gameState, player) {
    // Track Life Bond effectiveness
    this.trackLifeBondHealing(gameState);

    // Encourage monster survival for more Life Bond healing
    return this.balanceMonsterHealth(
      baseDecision,
      availableActions,
      gameState,
      player
    );
  }

  /**
   * Track Life Bond healing effectiveness
   * @param {Object} gameState - Current game state
   */
  trackLifeBondHealing(gameState) {
    if (gameState.monster?.hp) {
      this.lifeBondHealing = Math.floor(gameState.monster.hp * 0.1);
    }
  }

  /**
   * Balance monster health for optimal Life Bond healing
   * @param {Object} baseDecision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  balanceMonsterHealth(baseDecision, availableActions, gameState, player) {
    // If we're healthy and monster HP is very low, prefer non-monster targets
    if (player.hp >= player.maxHp * 0.8 && gameState.monster?.hp <= 30) {
      if (baseDecision?.targetId === '__monster__') {
        const action = availableActions.find(
          (a) => a.abilityType === baseDecision.actionType
        );
        if (action) {
          const nonMonsterTargets = action.targets.filter(
            (t) => t !== '__monster__'
          );
          if (nonMonsterTargets.length > 0) {
            return {
              actionType: baseDecision.actionType,
              targetId: nonMonsterTargets[0],
            };
          }
        }
      }
    }

    // If we're injured and monster HP is high, slightly prefer healing over attacking
    if (player.hp <= player.maxHp * 0.6 && gameState.monster?.hp >= 100) {
      const healActions = availableActions.filter(
        (action) => action.ability.category === 'Heal'
      );
      if (
        healActions.length > 0 &&
        !baseDecision?.actionType?.includes('heal')
      ) {
        const action = healActions[0];
        return {
          actionType: action.abilityType,
          targetId: player.id,
        };
      }
    }

    return baseDecision;
  }
}
module.exports = KinfolkBehavior;
