/**
 * @fileoverview Artisan (Human) Race Behavior - Strategic use of Adaptability
 */

/**
 * Artisan (Human) Race Behavior - Strategic use of Adaptability
 */
class ArtisanBehavior {
  constructor() {
    this.hasUsedAdaptability = false;
    this.bestAdaptabilityTiming = null;
  }

  /**
   * Modify decision based on Artisan racial traits
   * @param {Object} baseDecision - Base decision from class strategy
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  modifyDecision(baseDecision, availableActions, gameState, player) {
    // Use Adaptability strategically
    if (
      !this.hasUsedAdaptability &&
      this.shouldUseAdaptability(gameState, player)
    ) {
      const adaptability = availableActions.find(
        (action) => action.abilityType === 'adaptability'
      );
      if (adaptability) {
        this.hasUsedAdaptability = true;
        return {
          actionType: 'adaptability',
          targetId: player.id,
        };
      }
    }

    return baseDecision;
  }

  /**
   * Determine if now is a good time to use Adaptability
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {boolean} Whether to use Adaptability
   */
  shouldUseAdaptability(gameState, player) {
    // Use early to mid-game when we understand the situation better
    if (gameState.round < 2 || gameState.round > 6) return false;

    // Don't use if critically threatened
    if (player.hp <= player.maxHp * 0.3) return false;

    // Use if we've identified Warlocks and need better abilities to deal with them
    const suspectedWarlocks = this.countSuspectedWarlocks(gameState);
    if (suspectedWarlocks >= 2) return true;

    // Use if our current abilities aren't well-suited for the current situation
    if (gameState.round >= 4 && this.hasWeakAbilities(player)) return true;

    return false;
  }

  /**
   * Count suspected Warlocks from game events
   * @param {Object} gameState - Current game state
   * @returns {number} Number of suspected Warlocks
   */
  countSuspectedWarlocks(gameState) {
    // This would be enhanced with actual game state analysis
    return Math.floor(gameState.players.size * 0.2); // Rough estimate
  }

  /**
   * Check if player has relatively weak abilities for current situation
   * @param {Object} player - Player object
   * @returns {boolean} Whether abilities are weak
   */
  hasWeakAbilities(player) {
    // Simple heuristic - could be enhanced with actual ability analysis
    return player.class === 'Priest' || player.class === 'Oracle';
  }
}

module.exports = ArtisanBehavior;
