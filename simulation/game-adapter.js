/**
 * @fileoverview Game adapter that strips Socket.IO dependencies from server GameRoom
 * Creates a CLI-friendly version for simulation
 */

// Import core server components
const { GameRoom } = require('../server/models/GameRoom');
const Player = require('../server/models/Player');
const config = require('../server/config');

/**
 * SimulatedGameRoom extends GameRoom but removes Socket.IO dependencies
 * and adds AI player management
 */
class SimulatedGameRoom extends GameRoom {
  constructor(code = 'SIM1') {
    super(code);
    this.aiPlayers = new Map(); // Track AI players
    this.gameResult = null;
    this.totalRounds = 0;
    this.gameLog = []; // Minimal logging
  }

  /**
   * Add an AI player to the game
   * @param {string} name - Player name
   * @param {string} race - Player race
   * @param {string} className - Player class
   * @param {Object} aiStrategy - AI strategy object
   * @returns {boolean} Success status
   */
  addAIPlayer(name, race, className, aiStrategy) {
    // Generate a fake socket ID
    const playerId = `ai_${name.toLowerCase()}_${Date.now()}`;

    // Add player using parent method
    const success = this.addPlayer(playerId, name);
    if (!success) return false;

    // Set character class
    this.setPlayerClass(playerId, race, className);

    // Store AI strategy
    this.aiPlayers.set(playerId, {
      name,
      race,
      className,
      strategy: aiStrategy,
    });

    return true;
  }

  /**
   * Start the simulated game
   * @returns {boolean} Success status
   */
  startSimulatedGame() {
    if (this.players.size < 2) return false;

    this.started = true;
    this.round = 1;
    this.assignInitialWarlock();

    this.gameLog.push(`Game started with ${this.players.size} players`);
    this.logPlayerSetup();

    return true;
  }

  /**
   * Log initial player setup
   */
  logPlayerSetup() {
    for (const [id, player] of this.players.entries()) {
      const aiInfo = this.aiPlayers.get(id);
      const warlockStatus = player.isWarlock ? ' [WARLOCK]' : '';
      this.gameLog.push(
        `${player.name}: ${player.race} ${player.class}${warlockStatus}`
      );
    }
  }

  /**
   * Run the complete game simulation
   * @param {number} maxRounds - Maximum rounds before declaring draw
   * @returns {Object} Game result
   */
  async runSimulation(maxRounds = 50) {
    if (!this.started) {
      this.startSimulatedGame();
    }

    while (this.totalRounds < maxRounds) {
      // Check win conditions before round
      const winner = this.checkWinCondition();
      if (winner) {
        this.gameResult = {
          winner,
          rounds: this.totalRounds,
          survivors: this.getAlivePlayers().length,
          totalPlayers: this.players.size,
          warlocks: this.systems.warlockSystem.getWarlockCount(),
          finalLevel: this.level,
          gameSummary: this.getGameSummary(),
        };
        return this.gameResult;
      }

      // AI players make decisions
      await this.processAIDecisions();

      // Process the round
      const roundResult = this.processRound();
      this.totalRounds++;

      // Check win conditions after round
      const postRoundWinner = this.checkWinCondition();
      if (postRoundWinner) {
        this.gameResult = {
          winner: postRoundWinner,
          rounds: this.totalRounds,
          survivors: this.getAlivePlayers().length,
          totalPlayers: this.players.size,
          warlocks: this.systems.warlockSystem.getWarlockCount(),
          finalLevel: this.level,
          gameSummary: this.getGameSummary(),
        };
        return this.gameResult;
      }
    }

    // Game timed out
    this.gameResult = {
      winner: 'Draw',
      rounds: this.totalRounds,
      survivors: this.getAlivePlayers().length,
      totalPlayers: this.players.size,
      warlocks: this.systems.warlockSystem.getWarlockCount(),
      finalLevel: this.level,
      gameSummary: this.getGameSummary(),
    };
    return this.gameResult;
  }

  /**
   * Process AI player decisions for the current round
   */
  async processAIDecisions() {
    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive || player.hasSubmittedAction) continue;

      const aiInfo = this.aiPlayers.get(playerId);
      if (!aiInfo) continue;

      // Get available actions for this player
      const availableActions = this.getAvailableActions(player);

      // Let AI strategy decide
      const decision = aiInfo.strategy.makeDecision(
        player,
        availableActions,
        this.getGameState(),
        this.systems.warlockSystem.isPlayerWarlock(playerId)
      );

      if (decision && decision.actionType) {
        // Submit the AI's action
        this.addAction(playerId, decision.actionType, decision.targetId);
      }
    }
  }

  /**
   * Get available actions for a player
   * @param {Player} player - Player object
   * @returns {Array} Available actions
   */
  getAvailableActions(player) {
    const actions = [];

    // Add class abilities that are available (not on cooldown, unlocked)
    for (const ability of player.unlocked) {
      if (player.canUseAbility(ability.type)) {
        actions.push({
          type: 'ability',
          abilityType: ability.type,
          ability: ability,
          targets: this.getValidTargets(ability, player),
        });
      }
    }

    // Add racial ability if available
    if (player.canUseRacialAbility()) {
      actions.push({
        type: 'racial',
        abilityType: player.racialAbility.type,
        ability: player.racialAbility,
        targets: this.getValidTargets(player.racialAbility, player),
      });
    }

    return actions;
  }

  /**
   * Get valid targets for an ability
   * @param {Object} ability - Ability object
   * @param {Player} actor - Player using the ability
   * @returns {Array} Valid target IDs
   */
  getValidTargets(ability, actor) {
    const targets = [];

    if (ability.target === 'Self') {
      targets.push(actor.id);
    } else if (ability.target === 'Single') {
      // Add monster if alive
      if (this.monster.hp > 0) {
        targets.push('__monster__');
      }
      // Add alive players (except self for attacks)
      for (const [id, player] of this.players.entries()) {
        if (player.isAlive && id !== actor.id) {
          // Skip invisible players for attack abilities
          if (
            ability.category === 'Attack' &&
            player.hasStatusEffect('invisible')
          ) {
            continue;
          }
          targets.push(id);
        }
      }
    } else if (ability.target === 'Multi') {
      targets.push('__multi__'); // Multi-target abilities don't need specific targets
    }

    return targets;
  }

  /**
   * Get current game state for AI decision making
   * @returns {Object} Game state
   */
  getGameState() {
    return {
      round: this.round,
      level: this.level,
      monster: {
        hp: this.monster.hp,
        maxHp: this.monster.maxHp,
        alive: this.monster.hp > 0,
      },
      alivePlayers: this.getAlivePlayers().length,
      totalPlayers: this.players.size,
      warlocks: this.systems.warlockSystem.getWarlockCount(),
    };
  }

  /**
   * Check win conditions
   * @returns {string|null} Winner or null if game continues
   */
  checkWinCondition() {
    const aliveCount = this.getAlivePlayers().length;
    const warlockCount = this.systems.warlockSystem.countAliveWarlocks();

    // No players left
    if (aliveCount === 0) return 'Draw';

    // All warlocks dead
    if (warlockCount === 0) return 'Good';

    // Only warlocks left
    if (warlockCount === aliveCount) return 'Evil';

    return null;
  }

  /**
   * Get game summary for logging
   * @returns {Object} Game summary
   */
  getGameSummary() {
    const result = this.gameResult || this.checkWinCondition() || 'Ongoing';
    return {
      winner: result.winner || result,
      rounds: this.totalRounds,
      players: Array.from(this.players.values()).map((p) => {
        const aiInfo = this.aiPlayers.get(p.id);
        return {
          name: p.name,
          race: p.race,
          class: p.class,
          alive: p.isAlive,
          isWarlock: p.isWarlock,
          hp: p.hp,
          maxHp: p.maxHp,
          // Add AI info for tracking
          aiStrategy: aiInfo ? aiInfo.strategy.name : 'Unknown',
        };
      }),
      finalLevel: this.level,
      log: this.gameLog,
    };
  }
}

module.exports = { SimulatedGameRoom };
