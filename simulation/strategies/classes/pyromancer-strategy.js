/**
 * @fileoverview Pyromancer Strategy - High damage, careful positioning, detection capabilities
 */

const BaseStrategy = require('../base/base-strategy');

/**
 * Pyromancer Strategy - High damage, careful positioning, detection capabilities
 */
class PyromancerStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Emergency healing when critical
    if (player.hp <= player.maxHp * 0.2) {
      const cauterize = this.findAction(availableActions, 'cauterize');
      if (cauterize) {
        return {
          actionType: 'cauterize',
          targetId: myId,
        };
      }
    }

    // Use Pyroblast for detection on suspected Warlocks
    const pyroblast = this.findAction(availableActions, 'pyroblast');
    if (pyroblast && this.gameMemory.suspectedWarlocks.size > 0) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && pyroblast.targets.includes(suspiciousTarget)) {
        // Prioritize detection over regular targeting
        console.log(
          `    ${player.name} using Pyroblast for Warlock detection on ${suspiciousTarget}`
        );
        return {
          actionType: 'pyroblast',
          targetId: suspiciousTarget,
        };
      }
    }

    // Use Inferno Blast when multiple enemies or late game
    const infernoBlast = this.findAction(availableActions, 'infernoBlast');
    if (
      infernoBlast &&
      (gameState.round >= 5 || this.gameMemory.suspectedWarlocks.size >= 2)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        infernoBlast.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'infernoBlast',
        targetId: targetId,
      };
    }

    // Use Pyroblast for sustained damage (if not used for detection above)
    if (pyroblast) {
      const targetId = this.prioritizeTarget(
        pyroblast.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'pyroblast',
        targetId: targetId,
      };
    }

    // Default to Fireball
    const fireball = this.findAction(availableActions, 'fireball');
    if (fireball) {
      const targetId = this.prioritizeTarget(
        fireball.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'fireball',
        targetId: targetId,
      };
    }

    return null;
  }
}

module.exports = PyromancerStrategy;
