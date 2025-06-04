/**
 * @fileoverview Abstract base class for AI strategies
 * Provides common game state analysis and decision-making framework
 */

/**
 * Abstract base class for all AI strategies
 * Provides common game state analysis and utility methods
 */
class BaseStrategy {
  constructor(playerName) {
    this.playerName = playerName;
    this.gameMemory = {
      suspectedWarlocks: new Set(),
      trustedPlayers: new Set(),
      lastActions: new Map(),
      healingRejections: new Set(),
      monsterAvoidance: new Map(),
      threatLevel: 'low', // low, medium, high, critical
    };
  }

  /**
   * Main decision-making method - must be implemented by subclasses
   * @param {Array} availableActions - Valid actions player can take
   * @param {Object} gameState - Current game state
   * @param {Player} player - This player's object
   * @returns {Object} Decision with actionType and targetId
   */
  makeDecision(availableActions, gameState, player) {
    throw new Error('makeDecision must be implemented by subclass');
  }

  /**
   * Update strategy memory based on game events
   * @param {Array} events - Recent game events
   * @param {Object} gameState - Current game state
   */
  updateMemory(events, gameState) {
    for (const event of events) {
      this.processEvent(event, gameState);
    }
    this.updateThreatLevel(gameState);
  }

  /**
   * Process individual game events for intelligence gathering
   * @param {Object} event - Game event
   * @param {Object} gameState - Current game state
   */
  processEvent(event, gameState) {
    // Track healing rejections (major Warlock tell)
    if (event.type === 'healingFailed' && event.reason === 'warlockImmune') {
      this.gameMemory.suspectedWarlocks.add(event.targetId);
      this.gameMemory.trustedPlayers.delete(event.targetId);
    }

    // Track monster avoidance patterns
    if (event.type === 'monsterAttack' && event.targetId) {
      const playerId = event.targetId;
      const avoidanceCount =
        this.gameMemory.monsterAvoidance.get(playerId) || 0;
      this.gameMemory.monsterAvoidance.set(playerId, avoidanceCount);

      // Track who the monster NEVER attacks
      for (const [id, player] of gameState.players.entries()) {
        if (player.isAlive && id !== playerId) {
          const count = this.gameMemory.monsterAvoidance.get(id) || 0;
          this.gameMemory.monsterAvoidance.set(id, count + 1);

          // If monster has avoided someone for 3+ rounds, very suspicious
          if (count >= 3) {
            this.gameMemory.suspectedWarlocks.add(id);
          }
        }
      }
    }

    // Track corruption events
    if (event.type === 'playerCorrupted') {
      this.gameMemory.suspectedWarlocks.add(event.corruptedId);
      this.gameMemory.trustedPlayers.delete(event.corruptedId);
    }

    // Track successful detections
    if (event.type === 'warlockDetected') {
      this.gameMemory.suspectedWarlocks.add(event.detectedId);
    }

    // Track last actions for pattern analysis
    if (event.type === 'actionUsed') {
      this.gameMemory.lastActions.set(event.playerId, event.actionType);
    }
  }

  /**
   * Update current threat level based on game state
   * @param {Object} gameState - Current game state
   */
  updateThreatLevel(gameState) {
    const myPlayer = gameState.players.get(this.getMyPlayerId(gameState));
    if (!myPlayer) return;

    const hpPercent = myPlayer.hp / myPlayer.maxHp;
    const warlockCount = this.getWarlockCount(gameState);
    const aliveCount = this.getAlivePlayers(gameState).length;

    if (hpPercent <= 0.2) {
      this.gameMemory.threatLevel = 'critical';
    } else if (hpPercent <= 0.4 || warlockCount >= aliveCount / 2) {
      this.gameMemory.threatLevel = 'high';
    } else if (hpPercent <= 0.7 || warlockCount > 1) {
      this.gameMemory.threatLevel = 'medium';
    } else {
      this.gameMemory.threatLevel = 'low';
    }
  }

  /**
   * Get this player's ID from game state
   * @param {Object} gameState - Current game state
   * @returns {string} Player ID
   */
  getMyPlayerId(gameState) {
    for (const [id, player] of gameState.players.entries()) {
      if (player.name === this.playerName) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get alive players from game state
   * @param {Object} gameState - Current game state
   * @returns {Array} Alive players
   */
  getAlivePlayers(gameState) {
    return Array.from(gameState.players.values()).filter((p) => p.isAlive);
  }

  /**
   * Get estimated Warlock count
   * @param {Object} gameState - Current game state
   * @returns {number} Estimated Warlock count
   */
  getWarlockCount(gameState) {
    // Use known Warlocks if available, otherwise estimate
    if (gameState.systems?.warlockSystem) {
      return gameState.systems.warlockSystem.getWarlockCount();
    }

    // Fallback estimate based on suspicions
    return this.gameMemory.suspectedWarlocks.size;
  }

  /**
   * Check if a player is suspected of being a Warlock
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether player is suspected
   */
  isSuspectedWarlock(playerId) {
    return this.gameMemory.suspectedWarlocks.has(playerId);
  }

  /**
   * Check if a player is trusted (known good)
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether player is trusted
   */
  isTrustedPlayer(playerId) {
    return (
      this.gameMemory.trustedPlayers.has(playerId) &&
      !this.gameMemory.suspectedWarlocks.has(playerId)
    );
  }

  /**
   * Get the most injured ally that can be healed
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @returns {string|null} Player ID of most injured ally
   */
  getMostInjuredAlly(gameState, myId) {
    let mostInjured = null;
    let lowestHpPercent = 1.0;

    for (const [id, player] of gameState.players.entries()) {
      if (id === myId || !player.isAlive || this.isSuspectedWarlock(id)) {
        continue;
      }

      const hpPercent = player.hp / player.maxHp;
      if (hpPercent < lowestHpPercent) {
        lowestHpPercent = hpPercent;
        mostInjured = id;
      }
    }

    return mostInjured;
  }

  /**
   * Get the most suspicious player for targeting
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @returns {string|null} Player ID of most suspicious target
   */
  getMostSuspiciousTarget(gameState, myId) {
    let bestTarget = null;
    let highestSuspicion = 0;

    for (const [id, player] of gameState.players.entries()) {
      if (id === myId || !player.isAlive) continue;

      let suspicionLevel = 0;

      // Known Warlock
      if (this.isSuspectedWarlock(id)) {
        suspicionLevel += 100;
      }

      // Monster avoidance
      const avoidanceCount = this.gameMemory.monsterAvoidance.get(id) || 0;
      suspicionLevel += avoidanceCount * 20;

      // Healing rejection
      if (this.gameMemory.healingRejections.has(id)) {
        suspicionLevel += 80;
      }

      if (suspicionLevel > highestSuspicion) {
        highestSuspicion = suspicionLevel;
        bestTarget = id;
      }
    }

    return bestTarget;
  }

  /**
   * Filter actions by category
   * @param {Array} availableActions - All available actions
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered actions
   */
  getActionsByCategory(availableActions, category) {
    return availableActions.filter(
      (action) => action.ability.category === category
    );
  }

  /**
   * Find action by type
   * @param {Array} availableActions - All available actions
   * @param {string} actionType - Action type to find
   * @returns {Object|null} Action or null
   */
  findAction(availableActions, actionType) {
    return (
      availableActions.find((action) => action.abilityType === actionType) ||
      null
    );
  }

  /**
   * Check if player can afford to use a high-risk ability
   * @param {Object} player - Player object
   * @param {number} riskDamage - Potential self-damage
   * @returns {boolean} Whether the risk is acceptable
   */
  canAffordRisk(player, riskDamage = 0) {
    if (this.gameMemory.threatLevel === 'critical') return false;
    return player.hp - riskDamage > player.maxHp * 0.3;
  }

  /**
   * Prioritize targets based on strategy
   * @param {Array} targets - Available targets
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @param {string} preference - 'monster', 'warlock', 'weakest', 'strongest'
   * @returns {string} Best target ID
   */
  prioritizeTarget(targets, gameState, myId, preference = 'monster') {
    // Validate targets array
    if (!targets || targets.length === 0) {
      return null;
    }

    // Always prefer monster if available and preference allows
    if (
      targets.includes('__monster__') &&
      (preference === 'monster' || this.gameMemory.threatLevel === 'low')
    ) {
      return '__monster__';
    }

    // Player targets based on preference
    const playerTargets = targets.filter(
      (id) => id !== '__monster__' && id !== myId
    );

    if (playerTargets.length === 0) {
      return targets[0]; // Return any available target
    }

    switch (preference) {
      case 'warlock':
        const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
        return playerTargets.includes(suspiciousTarget)
          ? suspiciousTarget
          : playerTargets[0];

      case 'weakest':
        return this.getMostInjuredAlly(gameState, myId) || playerTargets[0];

      case 'strongest':
        // Target highest HP non-suspected player
        let strongestTarget = null;
        let highestHp = 0;
        for (const id of playerTargets) {
          const player = gameState.players.get(id);
          if (player && player.hp > highestHp && !this.isSuspectedWarlock(id)) {
            highestHp = player.hp;
            strongestTarget = id;
          }
        }
        return strongestTarget || playerTargets[0];

      case 'any':
        // For multi-target abilities, just pick any valid target
        return playerTargets[0];

      default:
        return playerTargets[0];
    }
  }

  /**
   * Safely choose a target for an action, with fallback logic
   * @param {Object} action - Action object with targets array
   * @param {Object} gameState - Current game state
   * @param {string} myId - This player's ID
   * @param {string} preference - Target preference
   * @returns {string|null} Valid target ID or null
   */
  safeTargetSelection(action, gameState, myId, preference = 'monster') {
    if (!action || !action.targets || action.targets.length === 0) {
      return null;
    }

    // Try preferred targeting
    const preferredTarget = this.prioritizeTarget(
      action.targets,
      gameState,
      myId,
      preference
    );
    if (action.targets.includes(preferredTarget)) {
      return preferredTarget;
    }

    // Fallback to first available target
    return action.targets[0];
  }

  /**
   * Check if an action supports multi-targeting
   * @param {Object} action - Action object
   * @returns {boolean} Whether action supports __multi__
   */
  supportsMultiTarget(action) {
    return action && action.targets && action.targets.includes('__multi__');
  }
  /*
   * @param {Object} action - Action to evaluate
   * @param {string} targetId - Target for the action
   * @param {Object} gameState - Current game state
   * @returns {number} Expected value score
   */
  calculateActionValue(action, targetId, gameState) {
    let value = 0;
    const ability = action.ability;

    // Base value from ability category
    switch (ability.category) {
      case 'Attack':
        value += ability.params?.damage || 25;
        if (targetId === '__monster__') value += 10; // Bonus for monster focus
        if (this.isSuspectedWarlock(targetId)) value += 30; // Bonus for Warlock targeting
        break;

      case 'Heal':
        const target = gameState.players.get(targetId);
        if (target) {
          const missingHp = target.maxHp - target.hp;
          const healAmount = Math.min(missingHp, ability.params?.amount || 50);
          value += healAmount * 0.8; // Healing is valuable but not as much as damage
        }
        break;

      case 'Defense':
        if (
          this.gameMemory.threatLevel === 'high' ||
          this.gameMemory.threatLevel === 'critical'
        ) {
          value += 40; // Defense is very valuable when threatened
        } else {
          value += 15; // Still useful but lower priority
        }
        break;

      case 'Special':
        value += 25; // Base value for utility
        if (ability.effect === 'detect') value += 20; // Detection is valuable
        break;
    }

    // Cooldown penalty - avoid using abilities with long cooldowns early
    if (ability.cooldown > 2) {
      value -= ability.cooldown * 3;
    }

    return value;
  }
}

module.exports = BaseStrategy;
