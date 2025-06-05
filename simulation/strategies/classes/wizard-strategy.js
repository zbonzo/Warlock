/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Wizard Strategy - Powerful late-game abilities, careful positioning
 */
class WizardStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Arcane Shield when threatened
    if (player.hp <= player.maxHp * 0.6) {
      const arcaneShield = this.findAction(availableActions, 'arcaneShield');
      if (arcaneShield) {
        return {
          actionType: 'arcaneShield',
          targetId: myId,
        };
      }
    }

    // Meteor Shower for multiple targets or late game
    const meteorShower = this.findAction(availableActions, 'meteorShower');
    if (
      meteorShower &&
      (gameState.round >= 4 || this.getAlivePlayers(gameState).length >= 6)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        meteorShower.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'meteorShower',
        targetId: targetId,
      };
    }

    // Magic Missile for high single-target damage
    const magicMissile = this.findAction(availableActions, 'magicMissile');
    if (magicMissile) {
      const targetId = this.prioritizeTarget(
        magicMissile.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'magicMissile',
        targetId: targetId,
      };
    }

    // Arcane Barrage as early-game option
    const arcaneBarrage = this.findAction(availableActions, 'arcaneBarrage');
    if (arcaneBarrage) {
      const targetId = this.prioritizeTarget(
        arcaneBarrage.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'arcaneBarrage',
        targetId: targetId,
      };
    }

    return null;
  }
}
module.exports = WizardStrategy;
