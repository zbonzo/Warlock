/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Gunslinger Strategy - Ranged safety, smoke screen escapes
 */
class GunslingerStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Smoke Screen when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const smokeScreen = this.findAction(availableActions, 'smokeScreen');
      if (smokeScreen) {
        return {
          actionType: 'smokeScreen',
          targetId: myId,
        };
      }
    }

    // Aimed Shot for high single-target damage
    const aimedShot = this.findAction(availableActions, 'aimedShot');
    if (aimedShot) {
      const targetId = this.prioritizeTarget(
        aimedShot.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'aimedShot',
        targetId: targetId,
      };
    }

    // Ricochet Round for multiple targets
    const ricochetRound = this.findAction(availableActions, 'ricochetRound');
    if (
      ricochetRound &&
      (this.getAlivePlayers(gameState).length >= 5 || gameState.round >= 4)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        ricochetRound.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'ricochetRound',
        targetId: targetId,
      };
    }

    // Pistol Shot as reliable default
    const pistolShot = this.findAction(availableActions, 'pistolShot');
    if (pistolShot) {
      const targetId = this.prioritizeTarget(
        pistolShot.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'pistolShot',
        targetId: targetId,
      };
    }

    return null;
  }
}
module.exports = GunslingerStrategy;
