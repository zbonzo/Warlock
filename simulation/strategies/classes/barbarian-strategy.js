/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Barbarian Strategy - Manage self-damage, focus on monster combat
 */
class BarbarianStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Unstoppable Rage when desperate or for finishing moves
    if (
      (player.hp <= player.maxHp * 0.3 &&
        this.gameMemory.threatLevel === 'critical') ||
      gameState.monster?.hp <= 50
    ) {
      const unstoppableRage = this.findAction(
        availableActions,
        'unstoppableRage'
      );
      if (unstoppableRage) {
        return {
          actionType: 'unstoppableRage',
          targetId: myId,
        };
      }
    }

    // Use Primal Roar to weaken threats
    const primalRoar = this.findAction(availableActions, 'primalRoar');
    if (primalRoar) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && primalRoar.targets.includes(suspiciousTarget)) {
        return {
          actionType: 'primalRoar',
          targetId: suspiciousTarget,
        };
      }
    }

    // Blood Frenzy when moderately injured for damage boost
    if (player.hp <= player.maxHp * 0.7) {
      const bloodFrenzy = this.findAction(availableActions, 'bloodFrenzy');
      if (bloodFrenzy) {
        return {
          actionType: 'bloodFrenzy',
          targetId: myId,
        };
      }
    }

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
