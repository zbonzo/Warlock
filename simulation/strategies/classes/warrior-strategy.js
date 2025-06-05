/**
 * @fileoverview Warrior Strategy - Tank role, protect allies
 */

const BaseStrategy = require('../base/base-strategy');

/**
 * Warrior Strategy - Tank role, protect allies
 */
class WarriorStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Critical health - prioritize Bandage
    if (player.hp <= player.maxHp * 0.3) {
      const bandage = this.findAction(availableActions, 'bandage');
      if (bandage) {
        return {
          actionType: 'bandage',
          targetId: myId,
        };
      }
    }

    // High threat or multiple allies injured - use Battle Cry
    if (
      this.gameMemory.threatLevel === 'high' ||
      this.gameMemory.threatLevel === 'critical'
    ) {
      const battleCry = this.findAction(availableActions, 'battleCry');
      if (battleCry) {
        // For multi-target buffs, target any player (the spell will affect everyone)
        const targetId = this.prioritizeTarget(
          battleCry.targets,
          gameState,
          myId,
          'any'
        );
        return {
          actionType: 'battleCry',
          targetId: targetId,
        };
      }
    }

    // Use Shield Wall when moderately threatened
    if (player.hp <= player.maxHp * 0.6) {
      const shieldWall = this.findAction(availableActions, 'shieldWall');
      if (shieldWall) {
        return {
          actionType: 'shieldWall',
          targetId: myId,
        };
      }
    }

    // Default to attacking to generate threat and protect allies
    const attackActions = this.getActionsByCategory(availableActions, 'Attack');
    if (attackActions.length > 0) {
      const action = attackActions[0];
      const targetId = this.prioritizeTarget(
        action.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: action.abilityType,
        targetId: targetId,
      };
    }

    return null;
  }
}

module.exports = WarriorStrategy;
