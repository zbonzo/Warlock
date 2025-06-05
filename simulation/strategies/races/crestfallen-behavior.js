/**
 * @fileoverview Crestfallen (Elf) Race Behavior - Use Moonbeam for Warlock detection
 */
class CrestfallenBehavior {
  constructor() {
    this.moonbeamActive = false;
    this.detectedWarlocks = new Set();
  }

  modifyDecision(baseDecision, availableActions, gameState, player) {
    // Track Moonbeam activation
    this.moonbeamActive = player.hp <= player.maxHp * 0.5;

    // If Moonbeam is active, slightly prefer staying vulnerable to gather intel
    if (this.moonbeamActive && player.hp > player.maxHp * 0.2) {
      return this.moonbeamStrategy(
        baseDecision,
        availableActions,
        gameState,
        player
      );
    }

    // Use detection intel in targeting decisions
    return this.enhanceTargeting(
      baseDecision,
      availableActions,
      gameState,
      player
    );
  }

  /**
   * Strategy when Moonbeam is active
   * @param {Object} baseDecision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  moonbeamStrategy(baseDecision, availableActions, gameState, player) {
    // Don't heal immediately - stay vulnerable for one more round to potentially detect attackers
    if (
      baseDecision?.actionType?.includes('heal') &&
      player.hp > player.maxHp * 0.25
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
   * Enhance targeting with Moonbeam detection intel
   * @param {Object} baseDecision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  enhanceTargeting(baseDecision, availableActions, gameState, player) {
    // If we have detected Warlocks, prioritize them
    if (this.detectedWarlocks.size > 0 && baseDecision?.actionType) {
      const action = availableActions.find(
        (a) => a.abilityType === baseDecision.actionType
      );
      if (action && action.ability.category === 'Attack') {
        for (const warlockId of this.detectedWarlocks) {
          if (action.targets.includes(warlockId)) {
            return {
              actionType: baseDecision.actionType,
              targetId: warlockId,
            };
          }
        }
      }
    }

    return baseDecision;
  }
}
module.exports = CrestfallenBehavior;
