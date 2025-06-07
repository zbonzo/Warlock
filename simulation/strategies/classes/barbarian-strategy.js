/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Barbarian Strategy - Manage self-damage, focus on monster combat
 */
class BarbarianStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Reckless Strike - be careful about self-damage
    const recklessStrike = this.findAction(availableActions, 'recklessStrike');
    if (recklessStrike && this.canAffordRisk(player, 10)) {
      const targetId = this.prioritizeTarget(
        recklessStrike.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'recklessStrike',
        targetId: targetId,
      };
    }

    return null;
  }
}

module.exports = BarbarianStrategy;
