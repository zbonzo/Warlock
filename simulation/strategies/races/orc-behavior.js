/**
 * @fileoverview Orc Race Behavior - Strategic Blood Rage timing
 */
class OrcBehavior {
  constructor() {
    this.hasUsedBloodRage = false;
    this.optimalBloodRageTiming = null;
  }

  modifyDecision(baseDecision, availableActions, gameState, player) {
    // Use Blood Rage strategically
    if (
      !this.hasUsedBloodRage &&
      this.shouldUseBloodRage(baseDecision, gameState, player)
    ) {
      const bloodRage = availableActions.find(
        (action) => action.abilityType === 'bloodRage'
      );
      if (bloodRage) {
        this.hasUsedBloodRage = true;
        return {
          actionType: 'bloodRage',
          targetId: player.id,
        };
      }
    }

    return baseDecision;
  }

  /**
   * Determine optimal Blood Rage timing
   * @param {Object} baseDecision - Base decision
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {boolean} Whether to use Blood Rage
   */
  shouldUseBloodRage(baseDecision, gameState, player) {
    // Don't use if it would kill us
    if (player.hp <= 15) return false;

    // Use before a high-damage attack
    if (
      baseDecision?.actionType &&
      this.isHighDamageAttack(baseDecision.actionType)
    ) {
      return true;
    }

    // Use when monster is low HP for finishing blow
    if (gameState.monster?.hp <= 60) return true;

    // Use when attacking a confirmed Warlock
    if (
      baseDecision?.targetId &&
      this.isSuspectedWarlock(baseDecision.targetId, gameState)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if ability is high damage
   * @param {string} abilityType - Ability type
   * @returns {boolean} Whether ability does high damage
   */
  isHighDamageAttack(abilityType) {
    const highDamageAbilities = [
      'recklessStrike',
      'aimedShot',
      'magicMissile',
      'pyroblast',
      'backstab',
      'twinStrike',
      'barbedArrow',
    ];
    return highDamageAbilities.includes(abilityType);
  }

  /**
   * Check if target is suspected Warlock
   * @param {string} targetId - Target ID
   * @param {Object} gameState - Current game state
   * @returns {boolean} Whether target is suspected
   */
  isSuspectedWarlock(targetId, gameState) {
    // This would be enhanced with actual Warlock detection logic
    return false; // Placeholder
  }
}
module.exports = OrcBehavior;
