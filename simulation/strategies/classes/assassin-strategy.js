/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Assassin Strategy - Stealth and precise strikes
 */
class AssassinStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use invisibility when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const shadowVeil = this.findAction(availableActions, 'shadowVeil');
      if (shadowVeil) {
        return {
          actionType: 'shadowVeil',
          targetId: myId,
        };
      }
    }

    // Use Death Mark on suspected Warlocks for poison + stealth combo
    const deathMark = this.findAction(availableActions, 'deathMark');
    if (deathMark) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && deathMark.targets.includes(suspiciousTarget)) {
        return {
          actionType: 'deathMark',
          targetId: suspiciousTarget,
        };
      }
    }

    // Twin Strike for sustained damage
    const twinStrike = this.findAction(availableActions, 'twinStrike');
    if (twinStrike) {
      const targetId = this.prioritizeTarget(
        twinStrike.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'twinStrike',
        targetId: targetId,
      };
    }

    // Backstab as default
    const backstab = this.findAction(availableActions, 'backstab');
    if (backstab) {
      const targetId = this.prioritizeTarget(
        backstab.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'backstab',
        targetId: targetId,
      };
    }

    return null;
  }
}
module.exports = AssassinStrategy;
