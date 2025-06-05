/**
 * @fileoverview XXX Race Behavior -
 */

/**
 * Shaman Strategy - Balanced combat and healing
 */
class ShamanStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Heal critically injured allies
    const mostInjured = this.getMostInjuredAlly(gameState, myId);
    if (mostInjured) {
      const injuredPlayer = gameState.players.get(mostInjured);
      if (injuredPlayer && injuredPlayer.hp <= injuredPlayer.maxHp * 0.3) {
        const ancestralHeal = this.findAction(
          availableActions,
          'ancestralHeal'
        );
        if (ancestralHeal) {
          return {
            actionType: 'ancestralHeal',
            targetId: mostInjured,
          };
        }
      }
    }

    // Use Totemic Barrier when threatened
    if (player.hp <= player.maxHp * 0.6) {
      const totemShield = this.findAction(availableActions, 'totemShield');
      if (totemShield) {
        return {
          actionType: 'totemShield',
          targetId: myId,
        };
      }
    }

    // Chain Lightning for multiple targets
    const chainLightning = this.findAction(availableActions, 'chainLightning');
    if (
      chainLightning &&
      (this.getAlivePlayers(gameState).length >= 5 ||
        this.gameMemory.suspectedWarlocks.size >= 2)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        chainLightning.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'chainLightning',
        targetId: targetId,
      };
    }

    // Lightning Bolt as default attack
    const lightningBolt = this.findAction(availableActions, 'lightningBolt');
    if (lightningBolt) {
      const targetId = this.prioritizeTarget(
        lightningBolt.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'lightningBolt',
        targetId: targetId,
      };
    }

    return null;
  }
}

module.exports = ShamanStrategy;
