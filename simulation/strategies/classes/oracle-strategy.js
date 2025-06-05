/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Oracle Strategy - Detection and truth-seeking
 */
class OracleStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Sanctuary when low HP for healing + detection
    if (player.hp <= player.maxHp * 0.4) {
      const sanctuary = this.findAction(availableActions, 'sanctuaryOfTruth');
      if (sanctuary) {
        return {
          actionType: 'sanctuaryOfTruth',
          targetId: myId,
        };
      }
    }

    // Use Eye of Fate on highly suspected targets (but only if we can afford the risk)
    if (this.canAffordRisk(player, 10)) {
      const mostSuspicious = this.getMostSuspiciousTarget(gameState, myId);
      if (mostSuspicious) {
        const eyeOfFate = this.findAction(availableActions, 'fatesEye');
        if (eyeOfFate && eyeOfFate.targets.includes(mostSuspicious)) {
          return {
            actionType: 'fatesEye',
            targetId: mostSuspicious,
          };
        }
      }
    }

    // Use Spirit Guard when threatened
    if (
      this.gameMemory.threatLevel === 'medium' ||
      this.gameMemory.threatLevel === 'high'
    ) {
      const spiritGuard = this.findAction(availableActions, 'spiritGuard');
      if (spiritGuard) {
        return {
          actionType: 'spiritGuard',
          targetId: myId,
        };
      }
    }

    // Attack with Psychic Bolt
    const psychicBolt = this.findAction(availableActions, 'psychicBolt');
    if (psychicBolt) {
      const targetId = this.prioritizeTarget(
        psychicBolt.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'psychicBolt',
        targetId: targetId,
      };
    }

    return null;
  }
}
module.exports = OracleStrategy;
