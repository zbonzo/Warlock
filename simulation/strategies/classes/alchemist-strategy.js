/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Alchemist Strategy - Poison and invisibility tactics
 */
class AlchemistStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Smoke Bomb when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const smokeBomb = this.findAction(availableActions, 'smokeBomb');
      if (smokeBomb) {
        return {
          actionType: 'smokeBomb',
          targetId: myId,
        };
      }
    }

    // Poison Trap for area control
    const poisonTrap = this.findAction(availableActions, 'poisonTrap');
    if (
      poisonTrap &&
      (this.gameMemory.suspectedWarlocks.size >= 2 || gameState.round >= 3)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        poisonTrap.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'poisonTrap',
        targetId: targetId,
      };
    }

    // Shiv for vulnerability application
    const shiv = this.findAction(availableActions, 'shiv');
    if (shiv) {
      const targetId = this.prioritizeTarget(
        shiv.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'shiv',
        targetId: targetId,
      };
    }

    // Poison Strike as default
    const poisonStrike = this.findAction(availableActions, 'poisonStrike');
    if (poisonStrike) {
      const targetId = this.prioritizeTarget(
        poisonStrike.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'poisonStrike',
        targetId: targetId,
      };
    }

    return null;
  }
}
module.exports = AlchemistStrategy;
