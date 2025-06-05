/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Tracker Strategy - Control Monster against Warlocks, precision shots, detection
 */
class TrackerStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Control Monster on suspected Warlocks when available
    const controlMonster = this.findAction(availableActions, 'controlMonster');
    if (controlMonster && this.gameMemory.suspectedWarlocks.size > 0) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (
        suspiciousTarget &&
        controlMonster.targets.includes(suspiciousTarget)
      ) {
        return {
          actionType: 'controlMonster',
          targetId: suspiciousTarget,
        };
      }
    }

    // NEW: Use Barbed Arrow for detection on suspected Warlocks
    const barbedArrow = this.findAction(availableActions, 'barbedArrow');
    if (barbedArrow && this.gameMemory.suspectedWarlocks.size > 0) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && barbedArrow.targets.includes(suspiciousTarget)) {
        // Prioritize detection over regular damage
        console.log(
          `    ${player.name} using Barbed Arrow for Warlock detection on ${suspiciousTarget}`
        );
        return {
          actionType: 'barbedArrow',
          targetId: suspiciousTarget,
        };
      }
    }

    // Use Camouflage when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const camouflage = this.findAction(availableActions, 'camouflage');
      if (camouflage) {
        return {
          actionType: 'camouflage',
          targetId: myId,
        };
      }
    }

    // Barbed Arrow for sustained damage (if not used for detection above)
    if (barbedArrow) {
      const targetId = this.prioritizeTarget(
        barbedArrow.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'barbedArrow',
        targetId: targetId,
      };
    }

    // Precise Shot as default
    const preciseShot = this.findAction(availableActions, 'preciseShot');
    if (preciseShot) {
      const targetId = this.prioritizeTarget(
        preciseShot.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'preciseShot',
        targetId: targetId,
      };
    }

    return null;
  }
}
module.exports = TrackerStrategy;
