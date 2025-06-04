/**
 * @fileoverview Strategy Factory - Combines class + race into complete AI
 * Creates intelligent AI players that understand both their class role and racial traits
 */

const { createClassStrategy } = require('./class-strategies');
const { createRaceBehavior } = require('./race-strategies');

/**
 * Complete AI strategy that combines class strategy with race behavior
 */
class StrategicAI {
  constructor(playerName, race, className) {
    this.playerName = playerName;
    this.race = race;
    this.className = className;

    // Create class strategy and race behavior
    this.classStrategy = createClassStrategy(className, playerName);
    this.raceBehavior = createRaceBehavior(race);

    // Shared memory and state
    this.gameHistory = [];
    this.roundCount = 0;
    this.warlockSuspicions = new Map(); // playerId -> suspicion level (0-100)
    this.teamComposition = new Map(); // playerId -> { race, class }
  }

  /**
   * Make a strategic decision combining class and race considerations
   * @param {Array} availableActions - Valid actions player can take
   * @param {boolean} isWarlock - Whether this player is a Warlock (for debugging)
   * @param {string} playerName - Player name (for debugging)
   * @param {Object} gameState - Extended game state information
   * @returns {Object} Decision with actionType and targetId
   */
  makeDecision(
    availableActions,
    isWarlock = false,
    playerName = 'Unknown',
    gameState = null
  ) {
    if (availableActions.length === 0) return null;

    // Update internal state
    this.updateGameState(gameState);

    // Get base decision from class strategy
    const player = this.getPlayerFromGameState(gameState);
    if (!player) {
      // Fallback to random if we can't find player data
      return this.fallbackDecision(availableActions);
    }

    // Get class-based decision
    let decision = this.classStrategy.makeDecision(
      availableActions,
      gameState,
      player
    );

    // Apply race behavior modifications
    if (this.raceBehavior && decision) {
      decision = this.raceBehavior.modifyDecision(
        decision,
        availableActions,
        gameState,
        player
      );
    }

    // Apply Warlock-specific behavior if this player is a Warlock
    if (isWarlock) {
      decision = this.applyWarlockBehavior(
        decision,
        availableActions,
        gameState,
        player
      );
    } else {
      decision = this.applyGoodPlayerBehavior(
        decision,
        availableActions,
        gameState,
        player
      );
    }

    // Final validation and fallback
    if (!decision || !this.isValidDecision(decision, availableActions)) {
      decision = this.fallbackDecision(availableActions);
    }

    // Debug logging for complex decisions
    if (gameState?.round >= 3) {
      console.log(
        `    ${playerName} (${this.race} ${this.className}${
          isWarlock ? ' WARLOCK' : ''
        }) uses ${decision.actionType} on ${decision.targetId}`
      );
    }

    return decision;
  }

  /**
   * Update internal game state tracking
   * @param {Object} gameState - Current game state
   */
  updateGameState(gameState) {
    if (!gameState) return;

    this.roundCount = gameState.round || this.roundCount + 1;

    // Update team composition knowledge
    for (const [id, player] of gameState.players.entries()) {
      if (player.race && player.class) {
        this.teamComposition.set(id, {
          race: player.race,
          class: player.class,
          name: player.name,
        });
      }
    }

    // Update class strategy memory
    if (this.classStrategy.updateMemory && gameState.events) {
      this.classStrategy.updateMemory(gameState.events, gameState);
    }
  }

  /**
   * Get this player's object from game state
   * @param {Object} gameState - Current game state
   * @returns {Object|null} Player object
   */
  getPlayerFromGameState(gameState) {
    if (!gameState?.players) return null;

    for (const [id, player] of gameState.players.entries()) {
      if (player.name === this.playerName) {
        return { ...player, id };
      }
    }
    return null;
  }

  /**
   * Apply Warlock-specific behavioral modifications
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  applyWarlockBehavior(decision, availableActions, gameState, player) {
    const aliveCount = Array.from(gameState.players.values()).filter(
      (p) => p.isAlive
    ).length;
    const warlockCount = this.estimateWarlockCount(gameState);

    // Early game: Act normal, avoid suspicion
    if (this.roundCount <= 2) {
      return this.mimicGoodPlayer(
        decision,
        availableActions,
        gameState,
        player
      );
    }

    // Mid game: Start being selective, avoid obvious good actions
    if (this.roundCount <= 4) {
      return this.subtleWarlockBehavior(
        decision,
        availableActions,
        gameState,
        player
      );
    }

    // Late game: More aggressive if Warlocks are close to majority
    if (warlockCount >= aliveCount * 0.4) {
      return this.aggressiveWarlockBehavior(
        decision,
        availableActions,
        gameState,
        player
      );
    }

    return decision;
  }

  /**
   * Apply good player behavioral modifications
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  applyGoodPlayerBehavior(decision, availableActions, gameState, player) {
    // Focus on monster when threat is low
    if (this.classStrategy.gameMemory?.threatLevel === 'low') {
      return this.focusMonster(decision, availableActions, gameState, player);
    }

    // Use detection abilities more aggressively in mid-late game
    if (this.roundCount >= 3) {
      return this.enhanceDetection(
        decision,
        availableActions,
        gameState,
        player
      );
    }

    return decision;
  }

  /**
   * Mimic good player behavior for early-game Warlocks
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  mimicGoodPlayer(decision, availableActions, gameState, player) {
    // Generate some threat to avoid suspicion - attack monster occasionally
    if (Math.random() < 0.7 && decision?.targetId !== '__monster__') {
      const action = availableActions.find(
        (a) => a.abilityType === decision.actionType
      );
      if (action?.targets.includes('__monster__')) {
        return {
          actionType: decision.actionType,
          targetId: '__monster__',
        };
      }
    }

    // Occasionally heal allies to appear helpful (but not too much)
    if (Math.random() < 0.3) {
      const healActions = availableActions.filter(
        (a) => a.ability.category === 'Heal'
      );
      if (healActions.length > 0) {
        const mostInjured = this.findMostInjuredGoodPlayer(
          gameState,
          player.id
        );
        if (mostInjured) {
          return {
            actionType: healActions[0].abilityType,
            targetId: mostInjured,
          };
        }
      }
    }

    return decision;
  }

  /**
   * Subtle Warlock behavior for mid-game
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  subtleWarlockBehavior(decision, availableActions, gameState, player) {
    // Avoid healing other players (they might reject and reveal us)
    if (
      decision?.actionType?.includes('heal') &&
      decision.targetId !== player.id
    ) {
      const attackActions = availableActions.filter(
        (a) => a.ability.category === 'Attack'
      );
      if (attackActions.length > 0) {
        return {
          actionType: attackActions[0].abilityType,
          targetId: attackActions[0].targets.includes('__monster__')
            ? '__monster__'
            : attackActions[0].targets[0],
        };
      }
    }

    // Prioritize survival and positioning
    if (player.hp <= player.maxHp * 0.5) {
      const defenseActions = availableActions.filter(
        (a) => a.ability.category === 'Defense'
      );
      if (defenseActions.length > 0) {
        return {
          actionType: defenseActions[0].abilityType,
          targetId: player.id,
        };
      }
    }

    return decision;
  }

  /**
   * Aggressive Warlock behavior for late-game
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  aggressiveWarlockBehavior(decision, availableActions, gameState, player) {
    // Target good players more aggressively
    const goodPlayers = this.identifyLikelyGoodPlayers(gameState, player.id);
    if (goodPlayers.length > 0) {
      const attackActions = availableActions.filter(
        (a) => a.ability.category === 'Attack'
      );
      if (attackActions.length > 0) {
        const action = attackActions[0];
        for (const goodPlayer of goodPlayers) {
          if (action.targets.includes(goodPlayer)) {
            return {
              actionType: action.abilityType,
              targetId: goodPlayer,
            };
          }
        }
      }
    }

    return decision;
  }

  /**
   * Focus on monster when appropriate
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  focusMonster(decision, availableActions, gameState, player) {
    if (decision?.targetId !== '__monster__') {
      const action = availableActions.find(
        (a) => a.abilityType === decision.actionType
      );
      if (action?.targets.includes('__monster__')) {
        return {
          actionType: decision.actionType,
          targetId: '__monster__',
        };
      }
    }
    return decision;
  }

  /**
   * Enhance detection efforts
   * @param {Object} decision - Base decision
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {Object} player - Player object
   * @returns {Object} Modified decision
   */
  enhanceDetection(decision, availableActions, gameState, player) {
    // Use detection abilities more aggressively
    const detectionActions = availableActions.filter(
      (a) =>
        a.ability.effect === 'detect' ||
        a.abilityType.includes('eye') ||
        a.abilityType.includes('sanctuary')
    );

    if (detectionActions.length > 0 && Math.random() < 0.4) {
      const suspects = this.identifyTopSuspects(gameState, player.id);
      if (suspects.length > 0) {
        const action = detectionActions[0];
        const target = suspects.find((s) => action.targets.includes(s));
        if (target) {
          return {
            actionType: action.abilityType,
            targetId: target,
          };
        }
      }
    }

    return decision;
  }

  /**
   * Find most injured good player for healing
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @returns {string|null} Player ID
   */
  findMostInjuredGoodPlayer(gameState, myId) {
    let mostInjured = null;
    let lowestHpPercent = 1.0;

    for (const [id, player] of gameState.players.entries()) {
      if (id === myId || !player.isAlive) continue;

      const hpPercent = player.hp / player.maxHp;
      if (hpPercent < lowestHpPercent && hpPercent < 0.7) {
        lowestHpPercent = hpPercent;
        mostInjured = id;
      }
    }

    return mostInjured;
  }

  /**
   * Identify likely good players
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @returns {Array} Array of likely good player IDs
   */
  identifyLikelyGoodPlayers(gameState, myId) {
    const goodPlayers = [];

    for (const [id, player] of gameState.players.entries()) {
      if (id === myId || !player.isAlive) continue;

      // Players who have been healing others are likely good
      // Players who attack the monster frequently are likely good
      // This would be enhanced with actual behavioral analysis
      goodPlayers.push(id);
    }

    return goodPlayers;
  }

  /**
   * Identify top suspects for detection
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @returns {Array} Array of suspected player IDs
   */
  identifyTopSuspects(gameState, myId) {
    const suspects = [];

    // Use class strategy's suspicion system
    if (this.classStrategy.gameMemory?.suspectedWarlocks) {
      for (const suspectId of this.classStrategy.gameMemory.suspectedWarlocks) {
        if (suspectId !== myId) {
          suspects.push(suspectId);
        }
      }
    }

    return suspects;
  }

  /**
   * Estimate current Warlock count
   * @param {Object} gameState - Current game state
   * @returns {number} Estimated Warlock count
   */
  estimateWarlockCount(gameState) {
    // Use game systems if available
    if (gameState.systems?.warlockSystem) {
      return gameState.systems.warlockSystem.getWarlockCount();
    }

    // Fallback estimate
    const aliveCount = Array.from(gameState.players.values()).filter(
      (p) => p.isAlive
    ).length;
    return Math.max(1, Math.floor(aliveCount * 0.2));
  }

  /**
   * Validate that a decision is legal
   * @param {Object} decision - Decision to validate
   * @param {Array} availableActions - Available actions
   * @returns {boolean} Whether decision is valid
   */
  isValidDecision(decision, availableActions) {
    if (!decision || !decision.actionType || !decision.targetId) return false;

    const action = availableActions.find(
      (a) => a.abilityType === decision.actionType
    );
    if (!action) return false;

    const isValidTarget = action.targets.includes(decision.targetId);

    // Enhanced debugging for multi-target abilities
    if (!isValidTarget && action.ability && action.ability.target === 'Multi') {
      console.warn(`[MULTI-TARGET DEBUG] ${decision.actionType}:`);
      console.warn(`  Attempted target: ${decision.targetId}`);
      console.warn(`  Available targets: [${action.targets.join(', ')}]`);
      console.warn(`  Ability target type: ${action.ability.target}`);
    }

    return isValidTarget;
  }

  /**
   * Fallback to random decision when strategy fails
   * @param {Array} availableActions - Available actions
   * @returns {Object} Random valid decision
   */
  fallbackDecision(availableActions) {
    if (availableActions.length === 0) return null;

    const action =
      availableActions[Math.floor(Math.random() * availableActions.length)];
    const targetId =
      action.targets[Math.floor(Math.random() * action.targets.length)];

    return {
      actionType: action.abilityType,
      targetId: targetId,
    };
  }
}

/**
 * Factory function to create strategic AI
 * @param {string} playerName - Player name
 * @param {string} race - Player race
 * @param {string} className - Player class
 * @returns {StrategicAI} Strategic AI instance
 */
function createStrategicAI(playerName, race, className) {
  return new StrategicAI(playerName, race, className);
}

/**
 * Create multiple strategic AIs for a game
 * @param {Array} players - Array of {name, race, class} objects
 * @returns {Map} Map of playerName -> StrategicAI
 */
function createStrategicTeam(players) {
  const team = new Map();

  for (const player of players) {
    const ai = createStrategicAI(player.name, player.race, player.class);
    team.set(player.name, ai);
  }

  return team;
}

module.exports = {
  StrategicAI,
  createStrategicAI,
  createStrategicTeam,
};
