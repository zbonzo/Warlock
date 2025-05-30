/**
 * @fileoverview Integration module for thematic AI strategies
 * Connects enhanced AI to the simulation system with proper game state handling
 */

const { createThematicAIStrategy } = require('./thematic-ai-strategies');
const { SimulatedGameRoom } = require('../game-adapter');

/**
 * Enhanced SimulatedGameRoom with better AI integration
 */
class ThematicSimulatedGameRoom extends SimulatedGameRoom {
  constructor(code = 'THEMATIC') {
    super(code);
    this.lastRoundActions = []; // Track actions for AI memory
    this.playerDetectionResults = new Map(); // Store detection results
    this.playerReputations = new Map(); // Track reputation scores
    this.lastMonsterTarget = null; // Track who monster attacked
    this.lastMonsterDamage = 0; // Track monster damage
    this.trackerControlRounds = 0; // Track how long Tracker has controlled monster
    this.activeTrackerControl = null; // Which Tracker is controlling monster
  }

  /**
   * Process AI decisions with enhanced game state information
   */
  async processAIDecisions() {
    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive || player.hasSubmittedAction) continue;

      const aiInfo = this.aiPlayers.get(playerId);
      if (!aiInfo) continue;

      try {
        // Get enhanced game state with AI-relevant information
        const enhancedGameState = this.getEnhancedGameState(playerId);
        const availableActions = this.getAvailableActions(player);

        // Let AI strategy decide with enhanced information
        const decision = aiInfo.strategy.makeDecision(
          player,
          availableActions,
          enhancedGameState,
          this.systems.warlockSystem.isPlayerWarlock(playerId)
        );

        if (decision && decision.actionType) {
          // Track the action for AI memory systems
          this.trackActionForAI(playerId, decision, player);

          // Submit the AI's action
          this.addAction(playerId, decision.actionType, decision.targetId);
        }
      } catch (error) {
        console.error(
          `Error processing AI decision for ${player.name}:`,
          error.message
        );
        // Don't let one AI error crash the whole simulation
        // The player will simply not submit an action this round
      }
    }
  }

  /**
   * Get enhanced game state with AI-relevant information
   * @param {string} currentPlayerId - The AI player making the decision
   * @returns {Object} Enhanced game state
   */
  getEnhancedGameState(currentPlayerId) {
    const baseState = this.getGameState();

    // Add player-specific information
    const players = {};
    for (const [id, player] of this.players.entries()) {
      // Handle statusEffects compatibility - it might be a Map, Object, or Array
      let statusEffectsArray = [];
      if (player.statusEffects) {
        if (typeof player.statusEffects.keys === 'function') {
          // It's a Map
          statusEffectsArray = Array.from(player.statusEffects.keys());
        } else if (Array.isArray(player.statusEffects)) {
          // It's already an array
          statusEffectsArray = player.statusEffects;
        } else if (typeof player.statusEffects === 'object') {
          // It's an object, get the keys
          statusEffectsArray = Object.keys(player.statusEffects);
        }
      }

      players[id] = {
        name: player.name,
        race: player.race,
        class: player.class,
        hp: player.hp,
        maxHp: player.maxHp,
        isAlive: player.isAlive,
        level: player.level,
        statusEffects: statusEffectsArray,
        // Don't reveal warlock status directly
        // AI must deduce this through behavior
      };
    }

    return {
      ...baseState,
      players,
      lastRoundActions: this.lastRoundActions,
      detectionResults: this.playerDetectionResults.get(currentPlayerId) || [],
      myReputation: this.playerReputations.get(currentPlayerId) || 50,
      warlocks: this.systems.warlockSystem.getWarlockCount(), // For corruption detection
      lastMonsterTarget: this.lastMonsterTarget,
      lastMonsterDamage: this.lastMonsterDamage,
      trackerControlActive: this.activeTrackerControl,
    };
  }

  /**
   * Track action for AI memory and reputation systems
   * @param {string} playerId - Player making the action
   * @param {Object} decision - The decision made
   * @param {Player} player - Player object
   */
  trackActionForAI(playerId, decision, player) {
    const actionInfo = {
      playerId,
      type: this.categorizeAction(decision.actionType),
      targetId: decision.targetId,
      round: this.round,
      playerHP: player.hp,
      playerMaxHP: player.maxHp,
    };

    this.lastRoundActions.push(actionInfo);

    // Update reputation based on action type
    this.updatePlayerReputation(playerId, actionInfo);

    // Limit action history size
    if (this.lastRoundActions.length > 50) {
      this.lastRoundActions = this.lastRoundActions.slice(-30);
    }
  }

  /**
   * Categorize action type for AI understanding
   * @param {string} actionType - Action type
   * @returns {string} Action category
   */
  categorizeAction(actionType) {
    // Map specific actions to categories AI can understand
    const attackActions = [
      'slash',
      'backstab',
      'arcaneBlast',
      'fireball',
      'recklessStrike',
    ];
    const healActions = ['heal', 'rejuvenation', 'regeneration'];
    const detectActions = ['eyeOfFate', 'keenSenses', 'detectEvil'];
    const defenseActions = ['shieldWall', 'battleCry', 'shadowVeil'];

    if (attackActions.includes(actionType)) return 'attack';
    if (healActions.includes(actionType)) return 'heal';
    if (detectActions.includes(actionType)) return 'detect';
    if (defenseActions.includes(actionType)) return 'defense';

    return 'special';
  }

  /**
   * Update player reputation based on their actions
   * @param {string} playerId - Player ID
   * @param {Object} actionInfo - Action information
   */
  updatePlayerReputation(playerId, actionInfo) {
    let currentRep = this.playerReputations.get(playerId) || 50;

    switch (actionInfo.type) {
      case 'heal':
        if (actionInfo.targetId !== playerId) {
          currentRep += 3; // Healing others improves reputation
        }
        break;
      case 'attack':
        if (actionInfo.targetId !== '__monster__') {
          currentRep -= 2; // Attacking players hurts reputation
        }
        break;
      case 'detect':
        currentRep += 1; // Using detection is seen as helpful
        break;
    }

    this.playerReputations.set(
      playerId,
      Math.max(0, Math.min(100, currentRep))
    );
  }

  /**
   * Process round with enhanced AI feedback
   */
  processRound() {
    const result = super.processRound();

    // Process detection results and update AI memories
    this.processDetectionResults();

    // Update AI strategies based on round results
    this.updateAIStrategiesPostRound(result);

    return result;
  }

  /**
   * Process detection ability results and inform AI strategies
   */
  processDetectionResults() {
    for (const [playerId, player] of this.players.entries()) {
      const aiInfo = this.aiPlayers.get(playerId);
      if (!aiInfo || !player.isAlive) continue;

      // Simulate detection results based on abilities used
      // In a real implementation, this would come from the actual game engine
      if (this.wasDetectionUsed(playerId)) {
        const detectionResults = this.simulateDetectionResults(playerId);

        if (!this.playerDetectionResults.has(playerId)) {
          this.playerDetectionResults.set(playerId, []);
        }

        this.playerDetectionResults.get(playerId).push(...detectionResults);

        // Update AI memory based on detection results
        this.updateAIMemoryFromDetection(playerId, detectionResults);
      }
    }
  }

  /**
   * Check if player used detection ability this round
   * @param {string} playerId - Player ID
   * @returns {boolean} Whether detection was used
   */
  wasDetectionUsed(playerId) {
    return this.lastRoundActions.some(
      (action) => action.playerId === playerId && action.type === 'detect'
    );
  }

  /**
   * Simulate detection results for AI learning
   * @param {string} detectingPlayerId - Player who used detection
   * @returns {Array} Detection results
   */
  simulateDetectionResults(detectingPlayerId) {
    const results = [];
    const detectingPlayer = this.players.get(detectingPlayerId);

    if (!detectingPlayer) return results;

    // Find the target of detection
    const detectionAction = this.lastRoundActions.find(
      (action) =>
        action.playerId === detectingPlayerId && action.type === 'detect'
    );

    if (detectionAction && detectionAction.targetId !== '__monster__') {
      const targetPlayer = this.players.get(detectionAction.targetId);
      if (targetPlayer) {
        const isTargetWarlock = this.systems.warlockSystem.isPlayerWarlock(
          detectionAction.targetId
        );

        // Simulate detection accuracy (not 100% reliable)
        const accuracy = this.getDetectionAccuracy(
          detectingPlayer.class,
          detectingPlayer.race
        );
        const detectionSuccess = Math.random() < accuracy;

        results.push({
          targetId: detectionAction.targetId,
          targetName: targetPlayer.name,
          result: detectionSuccess
            ? isTargetWarlock
              ? 'warlock'
              : 'good'
            : 'unclear',
          confidence: accuracy,
          round: this.round,
        });
      }
    }

    return results;
  }

  /**
   * Get detection accuracy based on class and race
   * @param {string} playerClass - Player class
   * @param {string} playerRace - Player race
   * @returns {number} Detection accuracy (0-1)
   */
  getDetectionAccuracy(playerClass, playerRace) {
    let baseAccuracy = 0.7; // 70% base accuracy

    // Class bonuses
    if (playerClass === 'Oracle') baseAccuracy += 0.2;
    if (playerClass === 'Priest') baseAccuracy += 0.1;

    // Race bonuses
    if (playerRace === 'Elf') baseAccuracy += 0.1;
    if (playerRace === 'Dwarf') baseAccuracy += 0.05;

    return Math.min(0.95, baseAccuracy); // Cap at 95%
  }

  /**
   * Update AI memory based on detection results
   * @param {string} detectingPlayerId - Player who detected
   * @param {Array} detectionResults - Detection results
   */
  updateAIMemoryFromDetection(detectingPlayerId, detectionResults) {
    const aiInfo = this.aiPlayers.get(detectingPlayerId);
    if (!aiInfo || !aiInfo.strategy.memory) return;

    for (const result of detectionResults) {
      if (result.result === 'warlock') {
        aiInfo.strategy.memory.confirmAlignment(result.targetId, true, true);
      } else if (result.result === 'good') {
        // Be cautious about confirming as good after corruptions
        aiInfo.strategy.memory.confirmAlignment(result.targetId, false, true);
      }
      // 'unclear' results don't update alignment but may increase suspicion
    }
  }

  /**
   * Update AI strategies based on round results
   * @param {Object} roundResult - Round processing result
   */
  updateAIStrategiesPostRound(roundResult) {
    // Process corruption events first
    this.processCorruptionEvents();

    // Update AI reputation tracking
    for (const [playerId, aiInfo] of this.aiPlayers.entries()) {
      if (!aiInfo.strategy.memory) continue;

      // Update aggression counters
      if (aiInfo.strategy.roundsSinceLastAggression !== undefined) {
        aiInfo.strategy.roundsSinceLastAggression++;
      }

      // Reset detection cooldown
      if (aiInfo.strategy.hasUsedDetectionRecently) {
        aiInfo.strategy.hasUsedDetectionRecently = false;
      }

      // Update reputation based on others' perceptions
      const myReputation = this.playerReputations.get(playerId) || 50;
      aiInfo.strategy.myReputationScore = myReputation;

      // Update Tracker-specific cooldowns
      if (
        aiInfo.strategy.controlMonsterCooldown !== undefined &&
        aiInfo.strategy.controlMonsterCooldown > 0
      ) {
        aiInfo.strategy.controlMonsterCooldown--;
      }
    }

    // Process healing rejection (warlocks reject healing)
    this.processHealingRejections();
  }

  /**
   * Process healing rejections to update AI suspicions
   */
  processHealingRejections() {
    // In a real game, warlocks would reject healing attempts
    // This simulates that behavior for AI learning
    const healingActions = this.lastRoundActions.filter(
      (action) => action.type === 'heal'
    );

    for (const healAction of healingActions) {
      if (healAction.targetId !== healAction.playerId) {
        const targetIsWarlock = this.systems.warlockSystem.isPlayerWarlock(
          healAction.targetId
        );

        // Warlocks reject healing 70% of the time
        if (targetIsWarlock && Math.random() < 0.7) {
          // Notify all AI that this player rejected healing
          for (const [playerId, aiInfo] of this.aiPlayers.entries()) {
            if (aiInfo.strategy.memory && playerId !== healAction.targetId) {
              aiInfo.strategy.memory.updateSuspicion(
                healAction.targetId,
                'rejected_healing',
                15 // High suspicion increase
              );
            }
          }
        }
      }
    }
  }

  /**
   * Process corruption events and notify AI systems
   */
  processCorruptionEvents() {
    const currentWarlockCount = this.systems.warlockSystem.getWarlockCount();

    // Notify all AI players about potential corruption changes
    for (const [playerId, aiInfo] of this.aiPlayers.entries()) {
      if (aiInfo.strategy.memory) {
        aiInfo.strategy.memory.checkForNewCorruptions(
          currentWarlockCount,
          this.round
        );
      }
    }
  }

  /**
   * Enhanced game summary with AI decision information
   */
  getGameSummary() {
    const baseSummary = super.getGameSummary();

    // Add AI-specific information
    const aiInsights = {
      suspicionAccuracy: this.calculateSuspicionAccuracy(),
      detectionAttempts: this.countDetectionAttempts(),
      reputationScores: Object.fromEntries(this.playerReputations),
      finalSuspicions: this.getFinalSuspicionScores(),
    };

    return {
      ...baseSummary,
      aiInsights,
    };
  }

  /**
   * Calculate how accurate AI suspicions were
   * @returns {Object} Accuracy metrics
   */
  calculateSuspicionAccuracy() {
    let correctSuspicions = 0;
    let totalSuspicions = 0;

    for (const [playerId, aiInfo] of this.aiPlayers.entries()) {
      if (!aiInfo.strategy.memory) continue;

      for (const [
        suspectedId,
        suspicion,
      ] of aiInfo.strategy.memory.suspicionScores.entries()) {
        if (suspectedId === playerId) continue; // Don't count self-suspicion

        const actualIsWarlock =
          this.systems.warlockSystem.isPlayerWarlock(suspectedId);
        const suspectedIsWarlock = suspicion > 60;

        if (suspectedIsWarlock === actualIsWarlock) {
          correctSuspicions++;
        }
        totalSuspicions++;
      }
    }

    return {
      accuracy: totalSuspicions > 0 ? correctSuspicions / totalSuspicions : 0,
      correctSuspicions,
      totalSuspicions,
    };
  }

  /**
   * Count detection attempts made during the game
   * @returns {number} Number of detection attempts
   */
  countDetectionAttempts() {
    return this.lastRoundActions.filter((action) => action.type === 'detect')
      .length;
  }

  /**
   * Get final suspicion scores from all AI players
   * @returns {Object} Suspicion scores by AI player
   */
  getFinalSuspicionScores() {
    const suspicions = {};

    for (const [playerId, aiInfo] of this.aiPlayers.entries()) {
      if (!aiInfo.strategy.memory) continue;

      suspicions[playerId] = {};
      for (const [
        suspectedId,
        score,
      ] of aiInfo.strategy.memory.suspicionScores.entries()) {
        if (suspectedId !== playerId) {
          suspicions[playerId][suspectedId] = score;
        }
      }
    }

    return suspicions;
  }
}

/**
 * Run thematic AI simulation with enhanced social deduction
 * @param {Object} options - Simulation options
 * @returns {Promise<Object>} Enhanced game result
 */
async function runThematicGame(options = {}) {
  const game = new ThematicSimulatedGameRoom(`THEMATIC_${Date.now()}`);

  // Create diverse player setup - use simpler default if no config provided
  const playerConfigs = options.playerConfigs || [
    { name: 'HolyPriest', race: 'Dwarf', class: 'Priest' },
    { name: 'WiseOracle', race: 'Satyr', class: 'Oracle' },
    { name: 'FuriousBarbarian', race: 'Orc', class: 'Barbarian' },
    { name: 'ShadowAssassin', race: 'Elf', class: 'Assassin' },
    { name: 'NobleWarrior', race: 'Human', class: 'Warrior' },
    { name: 'BonePyromancer', race: 'Skeleton', class: 'Pyromancer' },
  ];

  try {
    // Add players with thematic AI
    for (const config of playerConfigs) {
      const strategy = createThematicAIStrategy(config.race, config.class);
      const success = game.addAIPlayer(
        config.name,
        config.race,
        config.class,
        strategy
      );

      if (!success) {
        throw new Error(`Failed to add player: ${config.name}`);
      }
    }

    // Run enhanced simulation
    const result = await game.runSimulation(options.maxRounds || 50);

    return {
      ...result,
      gameType: 'thematic',
      playerCount: playerConfigs.length,
      setup: playerConfigs,
    };
  } catch (error) {
    console.error('Error in runThematicGame:', error.message);
    // Return a failure result instead of crashing
    return {
      winner: 'Draw',
      rounds: 0,
      survivors: 0,
      totalPlayers: playerConfigs.length,
      warlocks: 0,
      finalLevel: 1,
      gameSummary: {
        winner: 'Draw',
        players: playerConfigs.map((config) => ({
          name: config.name,
          race: config.race,
          class: config.class,
          alive: false,
          isWarlock: false,
          hp: 0,
          maxHp: 100,
        })),
      },
      gameType: 'thematic',
      playerCount: playerConfigs.length,
      setup: playerConfigs,
      error: error.message,
    };
  }
}

/**
 * Factory function to create thematic AI game rooms
 * @param {string} code - Game room code
 * @returns {ThematicSimulatedGameRoom} Enhanced game room
 */
function createThematicGameRoom(code) {
  return new ThematicSimulatedGameRoom(code);
}

module.exports = {
  ThematicSimulatedGameRoom,
  runThematicGame,
  createThematicGameRoom,
};
