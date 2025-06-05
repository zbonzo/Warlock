/**
 * @fileoverview Priest Strategy - Healing and detection focus
 */

const BaseStrategy = require('../base/base-strategy');

/**
 * Priest Strategy - Healing and detection focus
 */
class PriestStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Critical self-heal
    if (player.hp <= player.maxHp * 0.25) {
      const heal =
        this.findAction(availableActions, 'heal') ||
        this.findAction(availableActions, 'swiftMend');
      if (heal) {
        return {
          actionType: heal.abilityType,
          targetId: myId,
        };
      }
    }

    // Look for critically injured allies
    const mostInjured = this.getMostInjuredAlly(gameState, myId);
    if (mostInjured) {
      const injuredPlayer = gameState.players.get(mostInjured);
      if (injuredPlayer && injuredPlayer.hp <= injuredPlayer.maxHp * 0.4) {
        const heal =
          this.findAction(availableActions, 'heal') ||
          this.findAction(availableActions, 'swiftMend');
        if (heal) {
          return {
            actionType: heal.abilityType,
            targetId: mostInjured,
          };
        }
      }
    }

    // Use Divine Shield when team is threatened
    if (this.gameMemory.threatLevel === 'high') {
      const divineShield = this.findAction(availableActions, 'divineShield');
      if (divineShield) {
        // For multi-target buffs, target any player (the spell will affect everyone)
        const targetId = this.prioritizeTarget(
          divineShield.targets,
          gameState,
          myId,
          'any'
        );
        return {
          actionType: 'divineShield',
          targetId: targetId,
        };
      }
    }

    // Attack suspected Warlocks or monster
    const attackActions = this.getActionsByCategory(availableActions, 'Attack');
    if (attackActions.length > 0) {
      const action = attackActions[0];
      const targetId = this.prioritizeTarget(
        action.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: action.abilityType,
        targetId: targetId,
      };
    }

    return null;
  }
}

module.exports = PriestStrategy;
