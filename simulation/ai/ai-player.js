/**
 * @fileoverview AI Player strategies for simulation
 * Simple KISS strategies based on class/race combinations
 */

/**
 * Base AI strategy class
 */
class BaseAIStrategy {
  constructor(name) {
    this.name = name;
  }

  /**
   * Make a decision for this turn
   * @param {Player} player - The AI player
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {boolean} isWarlock - Whether this player is a warlock
   * @returns {Object} Decision object with actionType and targetId
   */
  makeDecision(player, availableActions, gameState, isWarlock) {
    throw new Error('makeDecision must be implemented by subclass');
  }

  /**
   * Helper to get a random element from array
   * @param {Array} array - Array to choose from
   * @returns {*} Random element
   */
  randomChoice(array) {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Helper to find actions of a specific type
   * @param {Array} actions - Available actions
   * @param {string} abilityType - Ability type to find
   * @returns {Object|null} Found action or null
   */
  findAction(actions, abilityType) {
    return actions.find((action) => action.abilityType === abilityType) || null;
  }

  /**
   * Helper to find actions by category
   * @param {Array} actions - Available actions
   * @param {string} category - Category to find (Attack, Heal, Defense, Special)
   * @returns {Array} Actions in category
   */
  findActionsByCategory(actions, category) {
    return actions.filter(
      (action) => action.ability && action.ability.category === category
    );
  }

  /**
   * Prefer monster targets over player targets
   * @param {Array} targets - Available targets
   * @returns {string} Preferred target
   */
  preferMonster(targets) {
    if (targets.includes('__monster__')) {
      return '__monster__';
    }
    return this.randomChoice(targets);
  }

  /**
   * Prefer player targets over monster targets
   * @param {Array} targets - Available targets
   * @returns {string} Preferred target
   */
  preferPlayers(targets) {
    const playerTargets = targets.filter(
      (t) => t !== '__monster__' && t !== '__multi__'
    );
    if (playerTargets.length > 0) {
      return this.randomChoice(playerTargets);
    }
    return this.randomChoice(targets);
  }
}

/**
 * Barbarian Strategy: Always attack monster (needs healing from self-damage)
 * Focuses on damage and staying alive
 */
class BarbarianStrategy extends BaseAIStrategy {
  constructor() {
    super('Barbarian');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Priority 1: Use Blood Frenzy if available (passive boost)
    const bloodFrenzy = this.findAction(availableActions, 'bloodFrenzy');
    if (bloodFrenzy) {
      return {
        actionType: bloodFrenzy.abilityType,
        targetId: player.id,
      };
    }

    // Priority 2: Use Unstoppable Rage if low on health and not already active
    if (player.hp < player.maxHp * 0.4) {
      const unstoppableRage = this.findAction(
        availableActions,
        'unstoppableRage'
      );
      if (unstoppableRage) {
        return {
          actionType: unstoppableRage.abilityType,
          targetId: player.id,
        };
      }
    }

    // Priority 3: Always prefer attacking monster (for safety)
    const attackActions = this.findActionsByCategory(
      availableActions,
      'Attack'
    );
    if (attackActions.length > 0) {
      const action = this.randomChoice(attackActions);
      return {
        actionType: action.abilityType,
        targetId: this.preferMonster(action.targets),
      };
    }

    // Fallback: Any available action
    if (availableActions.length > 0) {
      const action = this.randomChoice(availableActions);
      return {
        actionType: action.abilityType,
        targetId: this.randomChoice(action.targets),
      };
    }

    return null;
  }
}

/**
 * Elf Strategy: Prefer attacking players (benefits from Moonbeam when wounded)
 * Focuses on player elimination and detection
 */
class ElfStrategy extends BaseAIStrategy {
  constructor() {
    super('Elf');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Priority 1: Use stealth abilities when low on health
    if (player.hp < player.maxHp * 0.5) {
      const stealthActions = availableActions.filter(
        (action) =>
          action.ability &&
          (action.ability.effect === 'invisible' ||
            action.abilityType === 'shadowVeil')
      );
      if (stealthActions.length > 0) {
        const action = this.randomChoice(stealthActions);
        return {
          actionType: action.abilityType,
          targetId: action.targets.includes(player.id)
            ? player.id
            : this.randomChoice(action.targets),
        };
      }
    }

    // Priority 2: Attack players (to potentially trigger Moonbeam detection)
    const attackActions = this.findActionsByCategory(
      availableActions,
      'Attack'
    );
    if (attackActions.length > 0) {
      const action = this.randomChoice(attackActions);
      return {
        actionType: action.abilityType,
        targetId: this.preferPlayers(action.targets),
      };
    }

    // Priority 3: Healing if wounded
    if (player.hp < player.maxHp * 0.7) {
      const healActions = this.findActionsByCategory(availableActions, 'Heal');
      if (healActions.length > 0) {
        const action = this.randomChoice(healActions);
        return {
          actionType: action.abilityType,
          targetId: action.targets.includes(player.id)
            ? player.id
            : this.randomChoice(action.targets),
        };
      }
    }

    // Fallback: Any available action
    if (availableActions.length > 0) {
      const action = this.randomChoice(availableActions);
      return {
        actionType: action.abilityType,
        targetId: this.randomChoice(action.targets),
      };
    }

    return null;
  }
}

/**
 * Satyr Strategy: Prefer keeping monster alive (Life Bond healing)
 * Focuses on support and player combat
 */
class SatyrStrategy extends BaseAIStrategy {
  constructor() {
    super('Satyr');
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Priority 1: Heal others if they're wounded
    const healActions = this.findActionsByCategory(availableActions, 'Heal');
    if (healActions.length > 0 && !isWarlock) {
      // Warlocks shouldn't heal others
      const action = this.randomChoice(healActions);
      // Prefer healing others over self
      const otherTargets = action.targets.filter((t) => t !== player.id);
      if (otherTargets.length > 0) {
        return {
          actionType: action.abilityType,
          targetId: this.randomChoice(otherTargets),
        };
      }
    }

    // Priority 2: Use Oracle abilities for detection
    const detectionActions = availableActions.filter(
      (action) =>
        action.ability &&
        (action.ability.effect === 'detect' ||
          action.abilityType === 'fatesEye')
    );
    if (detectionActions.length > 0) {
      const action = this.randomChoice(detectionActions);
      return {
        actionType: action.abilityType,
        targetId: this.preferPlayers(action.targets),
      };
    }

    // Priority 3: Attack players (avoid killing monster for Life Bond)
    const attackActions = this.findActionsByCategory(
      availableActions,
      'Attack'
    );
    if (attackActions.length > 0) {
      const action = this.randomChoice(attackActions);
      return {
        actionType: action.abilityType,
        targetId: this.preferPlayers(action.targets),
      };
    }

    // Fallback: Any available action
    if (availableActions.length > 0) {
      const action = this.randomChoice(availableActions);
      return {
        actionType: action.abilityType,
        targetId: this.randomChoice(action.targets),
      };
    }

    return null;
  }
}

/**
 * Balanced Strategy: Good mix of attack, defense, and healing
 * Used for Warrior, Priest, Wizard, Pyromancer
 */
class BalancedStrategy extends BaseAIStrategy {
  constructor(name = 'Balanced') {
    super(name);
  }

  makeDecision(player, availableActions, gameState, isWarlock) {
    // Priority 1: Self-preservation - heal if very low
    if (player.hp < player.maxHp * 0.3) {
      const healActions = this.findActionsByCategory(availableActions, 'Heal');
      if (healActions.length > 0) {
        const action = this.randomChoice(healActions);
        return {
          actionType: action.abilityType,
          targetId: action.targets.includes(player.id)
            ? player.id
            : this.randomChoice(action.targets),
        };
      }
    }

    // Priority 2: Use defensive abilities if wounded
    if (player.hp < player.maxHp * 0.5) {
      const defenseActions = this.findActionsByCategory(
        availableActions,
        'Defense'
      );
      if (defenseActions.length > 0) {
        const action = this.randomChoice(defenseActions);
        return {
          actionType: action.abilityType,
          targetId: action.targets.includes(player.id)
            ? player.id
            : this.randomChoice(action.targets),
        };
      }
    }

    // Priority 3: Attack based on warlock status
    const attackActions = this.findActionsByCategory(
      availableActions,
      'Attack'
    );
    if (attackActions.length > 0) {
      const action = this.randomChoice(attackActions);
      let targetId;

      if (isWarlock) {
        // Warlocks prefer attacking players for conversion chances
        targetId = this.preferPlayers(action.targets);
      } else {
        // Good players balance between monster and players
        targetId =
          Math.random() < 0.6
            ? this.preferMonster(action.targets)
            : this.preferPlayers(action.targets);
      }

      return {
        actionType: action.abilityType,
        targetId: targetId,
      };
    }

    // Priority 4: Use special abilities
    const specialActions = this.findActionsByCategory(
      availableActions,
      'Special'
    );
    if (specialActions.length > 0) {
      const action = this.randomChoice(specialActions);
      return {
        actionType: action.abilityType,
        targetId: this.randomChoice(action.targets),
      };
    }

    // Fallback: Any available action
    if (availableActions.length > 0) {
      const action = this.randomChoice(availableActions);
      return {
        actionType: action.abilityType,
        targetId: this.randomChoice(action.targets),
      };
    }

    return null;
  }
}

/**
 * Factory function to create appropriate AI strategy based on race/class
 * @param {string} race - Player race
 * @param {string} className - Player class
 * @returns {BaseAIStrategy} AI strategy instance
 */
function createAIStrategy(race, className) {
  if (race === 'Elf') {
    return new ElfStrategy();
  }
  if (race === 'Satyr') {
    return new SatyrStrategy();
  }

  // Class-based strategies
  if (className === 'Barbarian') {
    return new BarbarianStrategy();
  }

  // Default balanced strategy for most combinations
  return new BalancedStrategy(`${race}${className}`);
}

module.exports = {
  BaseAIStrategy,
  BarbarianStrategy,
  ElfStrategy,
  SatyrStrategy,
  BalancedStrategy,
  createAIStrategy,
};
