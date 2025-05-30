/**
 * @fileoverview Enhanced Thematic AI with Social Deduction
 * Combines class-specific strategies with warlock detection and reputation management
 */

/**
 * Player memory system for tracking suspicions and behavior
 */
class PlayerMemory {
  constructor() {
    this.suspicionScores = new Map(); // playerId -> suspicion level (0-100)
    this.behaviorHistory = new Map(); // playerId -> array of observed behaviors
    this.reputationScores = new Map(); // playerId -> reputation level (0-100)
    this.confirmedWarlocks = new Set(); // playerId set of confirmed warlocks
    this.confirmedGood = new Set(); // playerId set of confirmed good players
    this.lastSeenHP = new Map(); // playerId -> last known HP
    this.healingPattern = new Map(); // playerId -> healing behavior pattern
    this.aggressionLevel = new Map(); // playerId -> observed aggression
    this.lastKnownWarlockCount = 0; // Track warlock count for corruption detection
    this.lastCorruptionRound = 0; // Track when last corruption occurred
    this.trackerControlledMonster = false; // Track if Tracker is controlling monster
    this.monsterTargetingWarlocks = false; // Track if monster can target warlocks
  }

  /**
   * Update suspicion based on observed behavior
   * @param {string} playerId - Target player ID
   * @param {string} behavior - Observed behavior
   * @param {number} impact - Suspicion impact (-50 to +50)
   */
  updateSuspicion(playerId, behavior, impact) {
    if (!this.suspicionScores.has(playerId)) {
      this.suspicionScores.set(playerId, 50); // Start neutral
    }

    const current = this.suspicionScores.get(playerId);
    const newScore = Math.max(0, Math.min(100, current + impact));
    this.suspicionScores.set(playerId, newScore);

    // Track behavior history
    if (!this.behaviorHistory.has(playerId)) {
      this.behaviorHistory.set(playerId, []);
    }
    this.behaviorHistory.get(playerId).push({
      behavior,
      impact,
      round: Date.now(), // Simple timestamp
    });
  }

  /**
   * Check for new corruptions and invalidate confirmed good players
   * @param {number} currentWarlockCount - Current number of warlocks
   * @param {number} currentRound - Current game round
   */
  checkForNewCorruptions(currentWarlockCount, currentRound) {
    // Only check after the first round and if we have a previous count
    if (currentRound <= 1 || this.lastKnownWarlockCount === 0) {
      this.lastKnownWarlockCount = currentWarlockCount;
      return;
    }

    if (currentWarlockCount > this.lastKnownWarlockCount) {
      // New corruption detected! Clear all confirmed good players
      console.log(
        `[AI Memory] New corruption detected! Warlock count: ${this.lastKnownWarlockCount} -> ${currentWarlockCount}, clearing ${this.confirmedGood.size} confirmed good players`
      );

      // Move all confirmed good players back to high suspicion
      for (const playerId of this.confirmedGood) {
        this.suspicionScores.set(playerId, 70); // High suspicion due to potential corruption
        this.updateSuspicion(playerId, 'potential_new_corruption', 0); // Log the event
      }

      this.confirmedGood.clear();
      this.lastCorruptionRound = currentRound;

      // Increase general paranoia - everyone becomes more suspicious
      for (const [
        playerId,
        currentSuspicion,
      ] of this.suspicionScores.entries()) {
        if (!this.confirmedWarlocks.has(playerId)) {
          const paranoidIncrease = Math.min(20, 80 - currentSuspicion); // Don't exceed 80
          this.suspicionScores.set(
            playerId,
            currentSuspicion + paranoidIncrease
          );
        }
      }
    }

    this.lastKnownWarlockCount = currentWarlockCount;
  }

  /**
   * Update monster targeting information (Tracker ability)
   * @param {boolean} trackerControlled - Whether Tracker is controlling monster
   */
  updateMonsterControl(trackerControlled) {
    this.trackerControlledMonster = trackerControlled;
    this.monsterTargetingWarlocks = trackerControlled;
  }

  /**
   * Check if monster can currently target warlocks
   * @returns {boolean} Whether monster can attack warlocks
   */
  canMonsterTargetWarlocks() {
    return this.monsterTargetingWarlocks;
  }

  /**
   * Get suspicion level for a player
   * @param {string} playerId - Player ID
   * @returns {number} Suspicion score (0-100)
   */
  getSuspicion(playerId) {
    return this.suspicionScores.get(playerId) || 50;
  }

  /**
   * Mark a player as confirmed warlock or good
   * @param {string} playerId - Player ID
   * @param {boolean} isWarlock - True if warlock, false if good
   * @param {boolean} fromDetection - Whether this confirmation is from detection ability
   */
  confirmAlignment(playerId, isWarlock, fromDetection = false) {
    if (isWarlock) {
      this.confirmedWarlocks.add(playerId);
      this.confirmedGood.delete(playerId);
      this.suspicionScores.set(playerId, 100);
    } else {
      // Only confirm as good if it's from recent detection or we're early in the game
      // After corruptions, we should be more cautious about confirming anyone as good
      const roundsSinceCorruption = Date.now() - this.lastCorruptionRound;
      const safeToConfirmGood =
        fromDetection &&
        (roundsSinceCorruption < 3 || this.lastCorruptionRound === 0);

      if (safeToConfirmGood) {
        this.confirmedGood.add(playerId);
        this.confirmedWarlocks.delete(playerId);
        this.suspicionScores.set(playerId, 0);
      } else {
        // Don't fully confirm as good, but reduce suspicion significantly
        this.suspicionScores.set(playerId, 20);
      }
    }
  }

  /**
   * Get most suspicious player
   * @param {Array} alivePlayers - List of alive player IDs
   * @returns {string|null} Most suspicious player ID
   */
  getMostSuspicious(alivePlayers) {
    let maxSuspicion = 60; // Only target if above moderate suspicion
    let mostSuspicious = null;

    for (const playerId of alivePlayers) {
      if (this.confirmedWarlocks.has(playerId)) {
        return playerId; // Always target confirmed warlocks first
      }

      const suspicion = this.getSuspicion(playerId);
      if (suspicion > maxSuspicion && !this.confirmedGood.has(playerId)) {
        maxSuspicion = suspicion;
        mostSuspicious = playerId;
      }
    }

    return mostSuspicious;
  }
}

/**
 * Enhanced base AI strategy with social deduction
 */
class EnhancedAIStrategy {
  constructor(name, playerClass, playerRace) {
    this.name = name;
    this.playerClass = playerClass;
    this.playerRace = playerRace;
    this.memory = new PlayerMemory();
    this.myReputationScore = 50; // How others might view me
    this.roundsSinceLastAggression = 0;
    this.hasUsedDetectionRecently = false;
  }

  /**
   * Main decision making with social deduction
   * @param {Player} player - The AI player
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Current game state
   * @param {boolean} isWarlock - Whether this player is a warlock
   * @returns {Object} Decision object
   */
  makeDecision(player, availableActions, gameState, isWarlock) {
    // Update memory based on observations FIRST
    this.updateMemoryFromGameState(gameState, player);

    // Check for new corruptions and update memory accordingly
    if (gameState.warlocks !== undefined) {
      this.memory.checkForNewCorruptions(
        gameState.warlocks,
        gameState.round || 0
      );
    }

    // Update monster control information - just store it in memory, don't call methods
    if (gameState.trackerControlActive !== undefined) {
      this.memory.updateMonsterControl(gameState.trackerControlActive);
    }

    // Determine strategy based on role and reputation
    if (isWarlock) {
      return this.makeWarlockDecision(player, availableActions, gameState);
    } else {
      return this.makeGoodPlayerDecision(player, availableActions, gameState);
    }
  }

  /**
   * Update monster control information based on game state
   * @param {Object} gameState - Current game state
   */
  updateMonsterControlInfo(gameState) {
    // Check if any Tracker has used Control Monster ability
    let trackerControlActive = false;

    if (gameState.lastRoundActions) {
      for (const action of gameState.lastRoundActions) {
        if (
          action.type === 'special' &&
          action.abilityType === 'controlMonster'
        ) {
          trackerControlActive = true;
          break;
        }
      }
    }

    // Check if any players are Trackers at level 4+
    if (gameState.players) {
      for (const [playerId, playerData] of Object.entries(gameState.players)) {
        if (playerData.class === 'Tracker' && playerData.level >= 4) {
          // Tracker has the ability available, check if they might use it
          if (this.memory.confirmedWarlocks.size > 0) {
            // Likely to use it if warlocks are known
            trackerControlActive = true;
          }
        }
      }
    }

    // Use the game state's tracker control status if available
    if (gameState.trackerControlActive !== undefined) {
      trackerControlActive = gameState.trackerControlActive;
    }

    this.memory.updateMonsterControl(trackerControlActive);
  }

  /**
   * Update memory based on current game state observations
   * @param {Object} gameState - Current game state
   * @param {Player} myPlayer - This AI's player object
   */
  updateMemoryFromGameState(gameState, myPlayer) {
    // Look for healing patterns (warlocks avoid healing others)
    if (gameState.lastRoundActions) {
      for (const action of gameState.lastRoundActions) {
        if (action.type === 'heal' && action.targetId !== action.playerId) {
          // Someone healed another player - good sign (unless they're trying to maintain cover)
          const suspicionReduction =
            this.memory.lastCorruptionRound > 0 ? -3 : -5; // Less trust after corruptions
          this.memory.updateSuspicion(
            action.playerId,
            'healed_other',
            suspicionReduction
          );
        } else if (
          action.type === 'attack' &&
          action.targetId !== '__monster__'
        ) {
          // Someone attacked a player - suspicious (unless targeting known warlocks)
          const target = action.targetId;
          if (this.memory.confirmedWarlocks.has(target)) {
            // Attacking confirmed warlock is good
            this.memory.updateSuspicion(
              action.playerId,
              'attacked_confirmed_warlock',
              -8
            );
          } else {
            // Attacking unknown player is suspicious
            this.memory.updateSuspicion(action.playerId, 'attacked_player', +8);
          }
        } else if (action.type === 'detect') {
          // Using detection is generally good behavior
          this.memory.updateSuspicion(action.playerId, 'used_detection', -2);
        }
      }
    }

    // Monitor monster targeting patterns (KEY INSIGHT: Monster should only hit warlocks if Tracker controls it)
    if (gameState.lastMonsterTarget && gameState.lastMonsterDamage) {
      const targetId = gameState.lastMonsterTarget;
      const wasTargetWarlock = this.memory.confirmedWarlocks.has(targetId);
      const canMonsterTargetWarlocks = gameState.trackerControlActive || false;

      if (wasTargetWarlock && !canMonsterTargetWarlocks) {
        // Monster attacked a known warlock WITHOUT Tracker control - this shouldn't happen!
        // Either our warlock knowledge is wrong, or there's a bug
        console.log(
          `[AI Warning] Monster attacked suspected warlock ${targetId} without Tracker control`
        );

        // Reduce confidence in our warlock identification
        this.memory.suspicionScores.set(targetId, 85); // Still suspicious but not 100% confirmed
        this.memory.confirmedWarlocks.delete(targetId);
      } else if (!wasTargetWarlock && canMonsterTargetWarlocks) {
        // Monster attacked a non-warlock even though Tracker could target warlocks
        // This suggests the target is likely good (or Tracker made a mistake)
        this.memory.updateSuspicion(
          targetId,
          'monster_targeted_despite_tracker_control',
          -10
        );
      }
    }

    // Track HP changes to detect healing patterns and potential corruptions
    for (const [playerId, playerData] of Object.entries(
      gameState.players || {}
    )) {
      const lastHP = this.memory.lastSeenHP.get(playerId) || playerData.hp;

      // Check for mysterious healing (warlock self-healing)
      if (
        playerData.hp > lastHP &&
        !this.wasPlayerHealed(playerId, gameState.lastRoundActions)
      ) {
        // HP increased without visible healing - could be warlock self-healing or racial ability
        this.memory.updateSuspicion(playerId, 'mysterious_healing', +3);
      }

      // Check for corruption immunity (warlocks can't be corrupted)
      if (
        this.memory.confirmedGood.has(playerId) &&
        this.isPlayerActingSuspicious(playerId, gameState)
      ) {
        // Previously confirmed good player is acting suspicious - possible new corruption
        this.memory.updateSuspicion(
          playerId,
          'good_player_acting_suspicious',
          +15
        );
      }

      this.memory.lastSeenHP.set(playerId, playerData.hp);
    }
  }

  /**
   * Check if player was healed by someone else this round
   * @param {string} playerId - Player to check
   * @param {Array} lastRoundActions - Actions from last round
   * @returns {boolean} Whether player was visibly healed
   */
  wasPlayerHealed(playerId, lastRoundActions) {
    if (!lastRoundActions) return false;

    return lastRoundActions.some(
      (action) =>
        action.type === 'heal' &&
        action.targetId === playerId &&
        action.playerId !== playerId
    );
  }

  /**
   * Check if player is acting suspiciously
   * @param {string} playerId - Player to check
   * @param {Object} gameState - Current game state
   * @returns {boolean} Whether player is acting suspicious
   */
  isPlayerActingSuspicious(playerId, gameState) {
    // This is a simplified check - in a full implementation you'd look at recent behavior patterns
    const currentSuspicion = this.memory.getSuspicion(playerId);
    return currentSuspicion > 60;
  }

  /**
   * Make decision as a good player
   * @param {Player} player - Player object
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Game state
   * @returns {Object} Decision
   */
  makeGoodPlayerDecision(player, availableActions, gameState) {
    // Priority 1: Use detection abilities if available
    const detectionAction = this.findDetectionAction(availableActions);
    if (detectionAction && !this.hasUsedDetectionRecently) {
      const suspiciousTarget = this.memory.getMostSuspicious(
        this.getAlivePlayerIds(gameState)
      );
      if (suspiciousTarget) {
        this.hasUsedDetectionRecently = true;
        return {
          actionType: detectionAction.abilityType,
          targetId: suspiciousTarget,
        };
      }
    }

    // Priority 2: Target confirmed warlocks
    const confirmedWarlock = Array.from(this.memory.confirmedWarlocks).find(
      (id) => this.getAlivePlayerIds(gameState).includes(id)
    );
    if (confirmedWarlock) {
      const attackAction = this.findBestAttackAction(availableActions);
      if (attackAction && attackAction.targets.includes(confirmedWarlock)) {
        this.roundsSinceLastAggression = 0;
        return {
          actionType: attackAction.abilityType,
          targetId: confirmedWarlock,
        };
      }
    }

    // Priority 3: Self-preservation
    if (player.hp < player.maxHp * 0.3) {
      const healAction = this.findHealAction(availableActions);
      if (healAction) {
        return {
          actionType: healAction.abilityType,
          targetId: player.id,
        };
      }
    }

    // Priority 4: Careful aggressive action based on reputation
    if (this.shouldAttackSuspiciousPlayer(gameState)) {
      const suspiciousTarget = this.memory.getMostSuspicious(
        this.getAlivePlayerIds(gameState)
      );
      if (suspiciousTarget) {
        const attackAction = this.findBestAttackAction(availableActions);
        if (attackAction && attackAction.targets.includes(suspiciousTarget)) {
          this.roundsSinceLastAggression = 0;
          this.myReputationScore -= 5; // Attacking players hurts reputation
          return {
            actionType: attackAction.abilityType,
            targetId: suspiciousTarget,
          };
        }
      }
    }

    // Priority 5: Class-specific safe actions
    return this.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      false
    );
  }

  /**
   * Make decision as a warlock
   * @param {Player} player - Player object
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Game state
   * @returns {Object} Decision
   */
  makeWarlockDecision(player, availableActions, gameState) {
    // Priority 1: Self-preservation (warlocks need to survive)
    if (player.hp < player.maxHp * 0.4) {
      const healAction = this.findHealAction(availableActions);
      if (healAction) {
        return {
          actionType: healAction.abilityType,
          targetId: player.id,
        };
      }
    }

    // Priority 2: Maintain cover by occasionally helping
    if (Math.random() < 0.3 && this.myReputationScore < 70) {
      const aliveGoodPlayers = this.getAlivePlayerIds(gameState).filter(
        (id) => !this.memory.confirmedWarlocks.has(id) && id !== player.id
      );

      if (aliveGoodPlayers.length > 0) {
        const healAction = this.findHealAction(availableActions);
        if (healAction) {
          const target = this.randomChoice(aliveGoodPlayers);
          this.myReputationScore += 8; // Healing helps reputation
          return {
            actionType: healAction.abilityType,
            targetId: target,
          };
        }
      }
    }

    // Priority 3: Attack monster to appear helpful (safe choice)
    if (gameState.monster && gameState.monster.hp > 0) {
      const attackAction = this.findBestAttackAction(availableActions);
      if (attackAction && attackAction.targets.includes('__monster__')) {
        return {
          actionType: attackAction.abilityType,
          targetId: '__monster__',
        };
      }
    }

    // Priority 4: Carefully attack players (conversion attempts)
    if (this.shouldWarlockAttackPlayer(gameState)) {
      const goodTargets = this.getAlivePlayerIds(gameState).filter(
        (id) => !this.memory.confirmedWarlocks.has(id) && id !== player.id
      );

      if (goodTargets.length > 0) {
        const attackAction = this.findBestAttackAction(availableActions);
        if (attackAction) {
          const target = this.randomChoice(goodTargets);
          this.myReputationScore -= 3; // Small reputation hit
          return {
            actionType: attackAction.abilityType,
            targetId: target,
          };
        }
      }
    }

    // Fallback: Class-specific behavior (but more cautious)
    return this.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      true
    );
  }

  /**
   * Should good player attack suspicious player?
   * @param {Object} gameState - Game state
   * @returns {boolean} Whether to attack
   */
  shouldAttackSuspiciousPlayer(gameState) {
    // Don't attack too frequently (maintains reputation)
    if (this.roundsSinceLastAggression < 3) return false;

    // Need high suspicion to justify attack
    const maxSuspicion = Math.max(
      ...Array.from(this.memory.suspicionScores.values())
    );
    if (maxSuspicion < 75) return false;

    // Don't attack if our reputation is already poor
    if (this.myReputationScore < 30) return false;

    return true;
  }

  /**
   * Should warlock attack a player?
   * @param {Object} gameState - Game state
   * @returns {boolean} Whether to attack
   */
  shouldWarlockAttackPlayer(gameState) {
    // Be more cautious if Tracker might control monster to target warlocks
    const trackerThreat = gameState.trackerControlActive || false;
    if (trackerThreat) {
      // Much more cautious - avoid looking suspicious when monster could target us
      if (this.myReputationScore > 70) return Math.random() < 0.2;
      if (this.myReputationScore < 50) return Math.random() < 0.05; // Very cautious
    }

    // Normal warlock aggression logic
    if (this.myReputationScore > 60) return Math.random() < 0.4;
    if (this.myReputationScore < 40) return Math.random() < 0.1;

    return Math.random() < 0.2;
  }

  /**
   * Make class-specific decision (fallback behavior)
   * @param {Player} player - Player object
   * @param {Array} availableActions - Available actions
   * @param {Object} gameState - Game state
   * @param {boolean} isWarlock - Whether player is warlock
   * @returns {Object} Decision
   */
  makeClassSpecificDecision(player, availableActions, gameState, isWarlock) {
    // This will be overridden by specific class strategies
    const attackActions = this.findActionsByCategory(
      availableActions,
      'Attack'
    );
    if (attackActions.length > 0) {
      const action = this.randomChoice(attackActions);
      const targetId = isWarlock
        ? this.preferPlayers(action.targets)
        : this.preferMonster(action.targets);

      return {
        actionType: action.abilityType,
        targetId: targetId,
      };
    }

    // Ultimate fallback
    if (availableActions.length > 0) {
      const action = this.randomChoice(availableActions);
      return {
        actionType: action.abilityType,
        targetId: this.randomChoice(action.targets),
      };
    }

    return null;
  }

  // Utility methods
  findDetectionAction(actions) {
    return actions.find(
      (action) =>
        action.ability &&
        (action.ability.effect === 'detect' ||
          action.abilityType === 'eyeOfFate' ||
          action.abilityType === 'keenSenses')
    );
  }

  findHealAction(actions) {
    return actions.find(
      (action) => action.ability && action.ability.category === 'Heal'
    );
  }

  findBestAttackAction(actions) {
    const attackActions = actions.filter(
      (action) => action.ability && action.ability.category === 'Attack'
    );

    if (attackActions.length === 0) return null;

    // Prefer higher damage attacks
    return attackActions.reduce((best, current) =>
      (current.ability.damage || 0) > (best.ability.damage || 0)
        ? current
        : best
    );
  }

  findActionsByCategory(actions, category) {
    return actions.filter(
      (action) => action.ability && action.ability.category === category
    );
  }

  getAlivePlayerIds(gameState) {
    return Object.entries(gameState.players || {})
      .filter(([id, data]) => data.isAlive)
      .map(([id, data]) => id);
  }

  preferMonster(targets) {
    return targets.includes('__monster__')
      ? '__monster__'
      : this.randomChoice(targets);
  }

  preferPlayers(targets) {
    const playerTargets = targets.filter(
      (t) => t !== '__monster__' && t !== '__multi__'
    );
    return playerTargets.length > 0
      ? this.randomChoice(playerTargets)
      : this.randomChoice(targets);
  }

  randomChoice(array) {
    return array.length > 0
      ? array[Math.floor(Math.random() * array.length)]
      : null;
  }
}

/**
 * Priest Strategy - Focus on healing and support, excellent warlock detection
 */
class PriestStrategy extends EnhancedAIStrategy {
  constructor() {
    super('Priest', 'Priest', null);
  }

  makeClassSpecificDecision(player, availableActions, gameState, isWarlock) {
    // Priests are excellent at identifying warlocks through healing patterns
    if (!isWarlock) {
      // Heal wounded allies (and observe who accepts/rejects healing)
      const healActions = this.findActionsByCategory(availableActions, 'Heal');
      if (healActions.length > 0) {
        const woundedAllies = this.getAlivePlayerIds(gameState).filter((id) => {
          const playerData = gameState.players[id];
          return (
            id !== player.id &&
            playerData &&
            playerData.hp < playerData.maxHp * 0.7 &&
            !this.memory.confirmedWarlocks.has(id)
          );
        });

        if (woundedAllies.length > 0) {
          const action = this.randomChoice(healActions);
          const target = this.randomChoice(woundedAllies);
          return {
            actionType: action.abilityType,
            targetId: target,
          };
        }
      }
    }

    // Fall back to parent behavior
    return super.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      isWarlock
    );
  }
}

/**
 * Oracle Strategy - Master of detection and information gathering
 */
class OracleStrategy extends EnhancedAIStrategy {
  constructor() {
    super('Oracle', 'Oracle', null);
  }

  makeClassSpecificDecision(player, availableActions, gameState, isWarlock) {
    if (!isWarlock) {
      // Prioritize detection abilities
      const detectionAction = this.findDetectionAction(availableActions);
      if (detectionAction) {
        const suspiciousTargets = this.getAlivePlayerIds(gameState)
          .filter((id) => this.memory.getSuspicion(id) > 60)
          .filter((id) => !this.memory.confirmedGood.has(id));

        if (suspiciousTargets.length > 0) {
          return {
            actionType: detectionAction.abilityType,
            targetId: this.randomChoice(suspiciousTargets),
          };
        }
      }

      // Use sanctuary abilities to protect confirmed good players
      const sanctuaryAction = availableActions.find(
        (a) => a.abilityType === 'sanctuaryOfTruth'
      );
      if (sanctuaryAction) {
        const goodPlayers = this.getAlivePlayerIds(gameState).filter((id) =>
          this.memory.confirmedGood.has(id)
        );
        if (goodPlayers.length > 0) {
          return {
            actionType: sanctuaryAction.abilityType,
            targetId: this.randomChoice(goodPlayers),
          };
        }
      }
    }

    return super.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      isWarlock
    );
  }
}

/**
 * Barbarian Strategy - Aggressive but focuses on monsters for self-healing
 */
class BarbarianStrategy extends EnhancedAIStrategy {
  constructor() {
    super('Barbarian', 'Barbarian', null);
  }

  makeClassSpecificDecision(player, availableActions, gameState, isWarlock) {
    // Activate Blood Frenzy when possible
    const bloodFrenzy = availableActions.find(
      (a) => a.abilityType === 'bloodFrenzy'
    );
    if (bloodFrenzy) {
      return {
        actionType: bloodFrenzy.abilityType,
        targetId: player.id,
      };
    }

    // Use Unstoppable Rage when low on health
    if (player.hp < player.maxHp * 0.4) {
      const unstoppableRage = availableActions.find(
        (a) => a.abilityType === 'unstoppableRage'
      );
      if (unstoppableRage) {
        return {
          actionType: unstoppableRage.abilityType,
          targetId: player.id,
        };
      }
    }

    // Prefer monster attacks for healing (unless confirmed warlock target)
    const attackActions = this.findActionsByCategory(
      availableActions,
      'Attack'
    );
    if (attackActions.length > 0) {
      const confirmedWarlock = Array.from(this.memory.confirmedWarlocks).find(
        (id) => this.getAlivePlayerIds(gameState).includes(id)
      );

      if (confirmedWarlock) {
        const action = this.randomChoice(attackActions);
        if (action.targets.includes(confirmedWarlock)) {
          return {
            actionType: action.abilityType,
            targetId: confirmedWarlock,
          };
        }
      }

      // Default to monster for self-healing
      const action = this.randomChoice(attackActions);
      return {
        actionType: action.abilityType,
        targetId: this.preferMonster(action.targets),
      };
    }

    return super.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      isWarlock
    );
  }
}

/**
 * Assassin Strategy - Stealth and precision strikes
 */
class AssassinStrategy extends EnhancedAIStrategy {
  constructor() {
    super('Assassin', 'Assassin', null);
  }

  makeClassSpecificDecision(player, availableActions, gameState, isWarlock) {
    // Use stealth when vulnerable
    if (player.hp < player.maxHp * 0.5) {
      const stealthAction = availableActions.find(
        (a) =>
          a.abilityType === 'shadowVeil' || a.ability?.effect === 'invisible'
      );
      if (stealthAction) {
        return {
          actionType: stealthAction.abilityType,
          targetId: player.id,
        };
      }
    }

    // Assassins are good at targeting specific threats
    const backstab = availableActions.find((a) => a.abilityType === 'backstab');
    if (backstab) {
      const priorityTarget = isWarlock
        ? this.findStrongestGoodPlayer(gameState)
        : this.memory.getMostSuspicious(this.getAlivePlayerIds(gameState));

      if (priorityTarget && backstab.targets.includes(priorityTarget)) {
        return {
          actionType: backstab.abilityType,
          targetId: priorityTarget,
        };
      }
    }

    return super.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      isWarlock
    );
  }

  findStrongestGoodPlayer(gameState) {
    return this.getAlivePlayerIds(gameState)
      .filter((id) => !this.memory.confirmedWarlocks.has(id))
      .reduce((strongest, current) => {
        const currentPlayer = gameState.players[current];
        const strongestPlayer = gameState.players[strongest];
        return (currentPlayer?.hp || 0) > (strongestPlayer?.hp || 0)
          ? current
          : strongest;
      }, null);
  }
}

/**
 * Tracker Strategy - Master of monster control and warlock hunting
 */
class TrackerStrategy extends EnhancedAIStrategy {
  constructor() {
    super('Tracker', 'Tracker', null);
    this.hasUsedControlMonster = false;
    this.controlMonsterCooldown = 0;
  }

  makeClassSpecificDecision(player, availableActions, gameState, isWarlock) {
    if (!isWarlock && player.level >= 4) {
      // Check if we should use Control Monster to target warlocks
      const controlMonster = availableActions.find(
        (a) => a.abilityType === 'controlMonster'
      );

      if (controlMonster && this.controlMonsterCooldown <= 0) {
        const confirmedWarlocks = Array.from(
          this.memory.confirmedWarlocks
        ).filter((id) => this.getAlivePlayerIds(gameState).includes(id));

        if (confirmedWarlocks.length > 0) {
          // Use Control Monster to force monster to attack a confirmed warlock
          this.hasUsedControlMonster = true;
          this.controlMonsterCooldown = 3; // Cooldown rounds

          // The actual targeting would be handled by the monster, but we signal our intent
          return {
            actionType: controlMonster.abilityType,
            targetId: '__monster__', // We control the monster
            monsterTarget: this.randomChoice(confirmedWarlocks), // Suggested target
          };
        }
      }
    }

    // Reduce cooldown
    if (this.controlMonsterCooldown > 0) {
      this.controlMonsterCooldown--;
    }

    // Use other tracking abilities
    const trackingAbilities = availableActions.filter(
      (a) =>
        a.abilityType === 'huntersVision' ||
        a.abilityType === 'markTarget' ||
        a.abilityType === 'tracking'
    );

    if (trackingAbilities.length > 0) {
      const suspiciousTargets = this.getAlivePlayerIds(gameState).filter(
        (id) => this.memory.getSuspicion(id) > 65
      );

      if (suspiciousTargets.length > 0) {
        const ability = this.randomChoice(trackingAbilities);
        return {
          actionType: ability.abilityType,
          targetId: this.randomChoice(suspiciousTargets),
        };
      }
    }

    return super.makeClassSpecificDecision(
      player,
      availableActions,
      gameState,
      isWarlock
    );
  }
}
/*
 * @param {string} race - Player race
 * @param {string} className - Player class
 * @returns {EnhancedAIStrategy} Appropriate strategy
 */
function createThematicAIStrategy(race, className) {
  switch (className) {
    case 'Priest':
      return new PriestStrategy();
    case 'Oracle':
      return new OracleStrategy();
    case 'Barbarian':
      return new BarbarianStrategy();
    case 'Assassin':
      return new AssassinStrategy();
    default:
      // Use enhanced base strategy for other classes
      return new EnhancedAIStrategy(`${race}${className}`, className, race);
  }
}

module.exports = {
  EnhancedAIStrategy,
  PriestStrategy,
  OracleStrategy,
  BarbarianStrategy,
  AssassinStrategy,
  createThematicAIStrategy,
  PlayerMemory,
};
