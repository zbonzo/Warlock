/**
 * @fileoverview Thematic AI Strategies
 * AI that plays classes according to their intended mechanics and themes
 */

const { BaseAIStrategy } = require('./ai-player');

/**
 * Barbarian AI - Aggressive, self-destructive, monster-focused
 * Theme: Trade safety for power, heal by killing monsters
 */
class ThematicBarbarianStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicBarbarian');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    const healthPercent = player.hp / player.maxHp;

    // CRITICAL: If very low health, MUST try to kill monster for potential healing
    if (healthPercent < 0.3) {
      const monsterAttacks = availableActions.filter(
        (action) =>
          action.targets.includes('__monster__') &&
          (action.ability?.category === 'Attack' ||
            action.abilityType === 'recklessStrike')
      );

      if (monsterAttacks.length > 0) {
        // Prefer reckless strike when desperate
        const recklessStrike = monsterAttacks.find(
          (a) => a.abilityType === 'recklessStrike'
        );
        if (recklessStrike) {
          return {
            actionType: recklessStrike.abilityType,
            targetId: '__monster__',
          };
        }

        // Otherwise any monster attack
        const attack = this.randomChoice(monsterAttacks);
        return { actionType: attack.abilityType, targetId: '__monster__' };
      }
    }

    // Activate Blood Frenzy early for damage boost
    const bloodFrenzy = this.findAction(availableActions, 'bloodFrenzy');
    if (bloodFrenzy && healthPercent > 0.6) {
      return { actionType: bloodFrenzy.abilityType, targetId: player.id };
    }

    // Use Unstoppable Rage when moderately wounded
    if (healthPercent < 0.5) {
      const rage = this.findAction(availableActions, 'unstoppableRage');
      if (rage) {
        return { actionType: rage.abilityType, targetId: player.id };
      }
    }

    // Generally prefer attacking monster (for potential healing/safety)
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);
      // 80% chance to attack monster, 20% players
      const targetId =
        Math.random() < 0.8
          ? '__monster__'
          : this.preferPlayers(attack.targets);
      return { actionType: attack.abilityType, targetId: targetId };
    }

    // Fallback
    return this.randomFallback(availableActions, player);
  }
}

/**
 * Priest AI - Support-focused, team healing priority
 * Theme: Keep the team alive, avoid direct combat
 */
class ThematicPriestStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicPriest');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // If not a warlock, prioritize healing others
    if (!isWarlock) {
      const healActions = this.findActionsByCategory(availableActions, 'Heal');
      if (healActions.length > 0) {
        const heal = this.randomChoice(healActions);

        // Try to heal others first, self only if no other targets
        const otherTargets = heal.targets.filter(
          (t) => t !== player.id && t !== '__monster__'
        );
        if (otherTargets.length > 0) {
          return {
            actionType: heal.abilityType,
            targetId: this.randomChoice(otherTargets),
          };
        } else if (player.hp < player.maxHp * 0.7) {
          return { actionType: heal.abilityType, targetId: player.id };
        }
      }

      // Use Divine Shield to protect team
      const divineShield = this.findAction(availableActions, 'divineShield');
      if (divineShield) {
        return { actionType: divineShield.abilityType, targetId: '__multi__' };
      }
    }

    // Combat as last resort, prefer monster
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);
      return {
        actionType: attack.abilityType,
        targetId: this.preferMonster(attack.targets),
      };
    }

    return this.randomFallback(availableActions, player);
  }
}

/**
 * Oracle AI - Information gathering, warlock detection focus
 * Theme: Use detection abilities, protective magic
 */
class ThematicOracleStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicOracle');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // If not warlock, use detection abilities frequently
    if (!isWarlock) {
      const detectionActions = availableActions.filter(
        (action) =>
          action.ability?.effect === 'detect' ||
          action.abilityType === 'fatesEye' ||
          action.abilityType === 'sanctuaryOfTruth'
      );

      if (detectionActions.length > 0 && Math.random() < 0.6) {
        const detection = this.randomChoice(detectionActions);
        if (detection.abilityType === 'sanctuaryOfTruth') {
          return { actionType: detection.abilityType, targetId: player.id };
        } else {
          const playerTargets = detection.targets.filter(
            (t) => t !== player.id && t !== '__monster__'
          );
          if (playerTargets.length > 0) {
            return {
              actionType: detection.abilityType,
              targetId: this.randomChoice(playerTargets),
            };
          }
        }
      }

      // Use Spirit Guard when threatened
      if (player.hp < player.maxHp * 0.6) {
        const spiritGuard = this.findAction(availableActions, 'spiritGuard');
        if (spiritGuard) {
          return { actionType: spiritGuard.abilityType, targetId: player.id };
        }
      }
    }

    // Light combat, prefer monster
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);
      return {
        actionType: attack.abilityType,
        targetId: this.preferMonster(attack.targets),
      };
    }

    return this.randomFallback(availableActions, player);
  }
}

/**
 * Assassin AI - Stealth and burst damage
 * Theme: Use invisibility, high damage strikes on players
 */
class ThematicAssassinStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicAssassin');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Use stealth when available and not already invisible
    const stealthActions = availableActions.filter(
      (action) =>
        action.ability?.effect === 'invisible' ||
        action.abilityType === 'shadowVeil' ||
        action.abilityType === 'deathMark'
    );

    if (stealthActions.length > 0 && Math.random() < 0.4) {
      const stealth = this.randomChoice(stealthActions);
      if (stealth.abilityType === 'deathMark') {
        const playerTargets = stealth.targets.filter(
          (t) => t !== player.id && t !== '__monster__'
        );
        if (playerTargets.length > 0) {
          return {
            actionType: stealth.abilityType,
            targetId: this.randomChoice(playerTargets),
          };
        }
      } else {
        return { actionType: stealth.abilityType, targetId: player.id };
      }
    }

    // Prefer high-damage attacks on players
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);
      // 70% chance to attack players (assassin theme)
      const targetId =
        Math.random() < 0.7
          ? this.preferPlayers(attack.targets)
          : this.preferMonster(attack.targets);
      return { actionType: attack.abilityType, targetId: targetId };
    }

    return this.randomFallback(availableActions, player);
  }
}

/**
 * Wizard AI - Spell efficiency and area effects
 * Theme: Powerful but calculated spell usage
 */
class ThematicWizardStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicWizard');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Use defensive magic when threatened
    if (player.hp < player.maxHp * 0.5) {
      const arcaneShield = this.findAction(availableActions, 'arcaneShield');
      if (arcaneShield) {
        return { actionType: arcaneShield.abilityType, targetId: player.id };
      }
    }

    // Prefer high-impact AoE abilities
    const aoeAttacks = availableActions.filter(
      (action) =>
        action.ability?.target === 'Multi' &&
        action.ability?.category === 'Attack'
    );

    if (aoeAttacks.length > 0 && Math.random() < 0.5) {
      const aoe = this.randomChoice(aoeAttacks);
      return { actionType: aoe.abilityType, targetId: '__multi__' };
    }

    // Use Magic Missile for reliable damage
    const magicMissile = this.findAction(availableActions, 'magicMissile');
    if (magicMissile) {
      return {
        actionType: magicMissile.abilityType,
        targetId: this.preferMonster(magicMissile.targets),
      };
    }

    // Other attacks
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);
      return {
        actionType: attack.abilityType,
        targetId: this.preferMonster(attack.targets),
      };
    }

    return this.randomFallback(availableActions, player);
  }
}

/**
 * Satyr AI - Life Bond optimization
 * Theme: Keep monster alive for healing, support team
 */
class ThematicSatyrStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicSatyr');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // CRITICAL: Avoid killing the monster if it provides healing
    const monsterHp = gameState.monster?.hp || 0;
    const shouldAvoidMonster = monsterHp > 0 && monsterHp < 50; // Don't finish off low HP monster

    // Prioritize healing others (not warlock behavior)
    if (!isWarlock) {
      const healActions = this.findActionsByCategory(availableActions, 'Heal');
      if (healActions.length > 0) {
        const heal = this.randomChoice(healActions);
        const otherTargets = heal.targets.filter((t) => t !== player.id);
        if (otherTargets.length > 0) {
          return {
            actionType: heal.abilityType,
            targetId: this.randomChoice(otherTargets),
          };
        }
      }
    }

    // Attack players primarily, avoid monster if it's low HP
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);

      if (shouldAvoidMonster) {
        // Focus on players to preserve monster
        const targetId = this.preferPlayers(attack.targets);
        return { actionType: attack.abilityType, targetId: targetId };
      } else {
        // Normal targeting
        return {
          actionType: attack.abilityType,
          targetId: this.randomChoice(attack.targets),
        };
      }
    }

    return this.randomFallback(availableActions, player);
  }
}

/**
 * Druid AI - Nature magic and crowd control
 * Theme: Healing over time, crowd control, balanced approach
 */
class ThematicDruidStrategy extends BaseAIStrategy {
  constructor() {
    super('ThematicDruid');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Use Rejuvenation for team healing
    const rejuvenation = this.findAction(availableActions, 'rejuvenation');
    if (rejuvenation && Math.random() < 0.4) {
      return { actionType: rejuvenation.abilityType, targetId: '__multi__' };
    }

    // Use crowd control abilities
    const crowdControl = availableActions.filter(
      (action) =>
        action.ability?.effect === 'stunned' ||
        action.abilityType === 'entangle'
    );

    if (crowdControl.length > 0 && Math.random() < 0.3) {
      const cc = this.randomChoice(crowdControl);
      return { actionType: cc.abilityType, targetId: '__multi__' };
    }

    // Use Barkskin when threatened
    if (player.hp < player.maxHp * 0.6) {
      const barkskin = this.findAction(availableActions, 'barkskin');
      if (barkskin) {
        return { actionType: barkskin.abilityType, targetId: player.id };
      }
    }

    // Balanced combat
    const attacks = this.findActionsByCategory(availableActions, 'Attack');
    if (attacks.length > 0) {
      const attack = this.randomChoice(attacks);
      // 60% monster, 40% players
      const targetId =
        Math.random() < 0.6
          ? this.preferMonster(attack.targets)
          : this.preferPlayers(attack.targets);
      return { actionType: attack.abilityType, targetId: targetId };
    }

    return this.randomFallback(availableActions, player);
  }
}

/**
 * Warlock-specific behavior modifications
 * Warlocks should prioritize corruption opportunities
 */
class WarlockBehaviorMixin {
  /**
   * Modify strategy for warlock behavior
   * @param {Object} baseDecision - Base decision from class strategy
   * @param {Object} player - Player object
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Game state
   * @returns {Object} Modified decision
   */
  static modifyForWarlock(baseDecision, player, availableActions, gameState) {
    // Warlocks should prefer attacking players for corruption chances
    if (baseDecision && baseDecision.targetId === '__monster__') {
      const action = availableActions.find(
        (a) => a.abilityType === baseDecision.actionType
      );
      if (action && action.ability?.category === 'Attack') {
        const playerTargets = action.targets.filter(
          (t) => t !== player.id && t !== '__monster__'
        );
        if (playerTargets.length > 0 && Math.random() < 0.6) {
          // 60% chance to switch to player target for corruption
          return {
            ...baseDecision,
            targetId:
              playerTargets[Math.floor(Math.random() * playerTargets.length)],
          };
        }
      }
    }

    // Avoid healing other players as warlock
    if (baseDecision && baseDecision.actionType) {
      const action = availableActions.find(
        (a) => a.abilityType === baseDecision.actionType
      );
      if (
        action &&
        action.ability?.category === 'Heal' &&
        baseDecision.targetId !== player.id
      ) {
        // Switch to self-heal or different action
        if (action.targets.includes(player.id)) {
          return { ...baseDecision, targetId: player.id };
        } else {
          // Find a different action
          const attacks = availableActions.filter(
            (a) => a.ability?.category === 'Attack'
          );
          if (attacks.length > 0) {
            const attack = attacks[Math.floor(Math.random() * attacks.length)];
            const playerTargets = attack.targets.filter(
              (t) => t !== player.id && t !== '__monster__'
            );
            return {
              actionType: attack.abilityType,
              targetId:
                playerTargets.length > 0
                  ? playerTargets[
                      Math.floor(Math.random() * playerTargets.length)
                    ]
                  : attack.targets[
                      Math.floor(Math.random() * attack.targets.length)
                    ],
            };
          }
        }
      }
    }

    return baseDecision;
  }
}

/**
 * Enhanced AI strategy factory that creates thematic strategies
 * @param {string} race - Player race
 * @param {string} className - Player class
 * @returns {BaseAIStrategy} Appropriate thematic AI strategy
 */
function createThematicAIStrategy(race, className) {
  let strategy;

  // Class-based thematic strategies
  switch (className) {
    case 'Barbarian':
      strategy = new ThematicBarbarianStrategy();
      break;
    case 'Priest':
      strategy = new ThematicPriestStrategy();
      break;
    case 'Oracle':
      strategy = new ThematicOracleStrategy();
      break;
    case 'Assassin':
      strategy = new ThematicAssassinStrategy();
      break;
    case 'Wizard':
      strategy = new ThematicWizardStrategy();
      break;
    case 'Druid':
      strategy = new ThematicDruidStrategy();
      break;
    default:
      // Use existing balanced strategy for classes without thematic AI yet
      const { BalancedStrategy } = require('./ai-player');
      strategy = new BalancedStrategy(`${race}${className}`);
  }

  // Add race-specific modifications if needed
  if (race === 'Satyr') {
    const originalMakeDecision = strategy.makeDecision.bind(strategy);
    strategy.makeDecision = function (
      player,
      availableActions,
      gameState,
      isWarlock
    ) {
      // Use Satyr-specific logic, but fall back to class strategy
      const satyrStrategy = new ThematicSatyrStrategy();
      return (
        satyrStrategy.makeDecision(
          player,
          availableActions,
          gameState,
          isWarlock
        ) ||
        originalMakeDecision(player, availableActions, gameState, isWarlock)
      );
    };
  }

  // Enhance the strategy's makeDecision to handle warlock behavior
  const originalMakeDecision = strategy.makeDecision.bind(strategy);
  strategy.makeDecision = function (
    player,
    availableActions,
    gameState,
    isWarlock
  ) {
    let decision = originalMakeDecision(
      player,
      availableActions,
      gameState,
      isWarlock
    );

    if (isWarlock) {
      decision = WarlockBehaviorMixin.modifyForWarlock(
        decision,
        player,
        availableActions,
        gameState
      );
    }

    return decision;
  };

  return strategy;
}

// Add helper method to base strategy
BaseAIStrategy.prototype.randomFallback = function (availableActions, player) {
  if (availableActions.length > 0) {
    const action = this.randomChoice(availableActions);
    return {
      actionType: action.abilityType,
      targetId: this.randomChoice(action.targets),
    };
  }
  return null;
};

module.exports = {
  ThematicBarbarianStrategy,
  ThematicPriestStrategy,
  ThematicOracleStrategy,
  ThematicAssassinStrategy,
  ThematicWizardStrategy,
  ThematicSatyrStrategy,
  ThematicDruidStrategy,
  WarlockBehaviorMixin,
  createThematicAIStrategy,
};
