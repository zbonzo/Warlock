/**
 * @fileoverview Simple Random Game Simulator - Back to Basics
 * Players are randomly chosen from valid combinations and perform random actions
 */

const path = require('path');
const fs = require('fs');

// Set up module aliases
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@config': path.resolve(__dirname, '../server/config'),
  '@models': path.resolve(__dirname, '../server/models'),
  '@utils': path.resolve(__dirname, '../server/utils'),
  '@services': path.resolve(__dirname, '../server/services'),
  '@shared': path.resolve(__dirname, '../server/shared'),
  '@messages': path.resolve(__dirname, '../server/config/messages'),
  '@controllers': path.resolve(__dirname, '../server/controllers'),
  '@middleware': path.resolve(__dirname, '../server/middleware'),
});
// Import server components
const { GameRoom } = require('../server/models/GameRoom');
const Player = require('../server/models/Player');
const config = require('../server/config');
process.env.LOG_LEVEL = 'WARN';
/**
 * Simple AI that just picks random valid actions
 */
class RandomAI {
  constructor(name) {
    this.name = name;
  }

  /**
   * Make a random decision from available actions
   * @param {Array} availableActions - Valid actions player can take
   * @param {boolean} isWarlock - Whether this player is a Warlock (for debugging)
   * @param {string} playerName - Player name (for debugging)
   * @returns {Object} Decision with actionType and targetId
   */
  makeDecision(availableActions, isWarlock = false, playerName = 'Unknown') {
    if (availableActions.length === 0) return null;

    // Pick a random action
    const action =
      availableActions[Math.floor(Math.random() * availableActions.length)];

    // Pick a random target from the action's valid targets
    const targetId =
      action.targets[Math.floor(Math.random() * action.targets.length)];

    // Debug logging for player vs player attacks
    if (
      action.ability.category === 'Attack' &&
      targetId !== '__monster__' &&
      targetId !== '__multi__'
    ) {
      console.log(
        `    ${playerName} (${
          isWarlock ? 'WARLOCK' : 'GOOD'
        }) attacking another player with ${action.abilityType}`
      );
    }

    return {
      actionType: action.abilityType,
      targetId: targetId,
    };
  }
}

/**
 * Simplified Game Room for simulation
 */
class SimpleGameRoom extends GameRoom {
  constructor(code = 'SIM') {
    super(code);
    this.aiPlayers = new Map(); // Track AI for each player
    this.gameEvents = []; // Track what happens each round
    this.roundCount = 0;
  }

  /**
   * Add a player with random AI
   * @param {string} name - Player name
   * @param {string} race - Player race
   * @param {string} className - Player class
   * @returns {boolean} Success
   */
  addRandomPlayer(name, race, className) {
    const playerId = `player_${name}_${Date.now()}`;

    // Add player using parent method
    const success = this.addPlayer(playerId, name);
    if (!success) return false;

    // Set character class
    this.setPlayerClass(playerId, race, className);

    // Add random AI
    this.aiPlayers.set(playerId, new RandomAI(name));

    return true;
  }

  /**
   * Get available actions for a player
   * @param {Player} player - Player object
   * @returns {Array} Available actions with targets
   */
  getAvailableActions(player) {
    const actions = [];

    // Add unlocked class abilities
    for (const ability of player.unlocked) {
      if (player.canUseAbility(ability.type)) {
        actions.push({
          abilityType: ability.type,
          ability: ability,
          targets: this.getValidTargets(ability, player),
        });
      }
    }

    // Add racial ability if available
    if (player.canUseRacialAbility()) {
      const racialAbility = player.racialAbility;
      actions.push({
        abilityType: racialAbility.type,
        ability: racialAbility,
        targets: this.getValidTargets(racialAbility, player),
      });
    }

    return actions;
  }

  /**
   * Get valid targets for an ability
   * @param {Object} ability - Ability object
   * @param {Player} actor - Player using ability
   * @returns {Array} Valid target IDs
   */
  getValidTargets(ability, actor) {
    const targets = [];

    if (ability.target === 'Self') {
      targets.push(actor.id);
    } else if (ability.target === 'Single' || ability.target === 'Multi') {
      // Both Single and Multi abilities target actual players
      // The difference is in how the server processes them, not in target validation

      // Add monster if alive
      if (this.monster && this.monster.hp > 0) {
        targets.push('__monster__');
      }

      // Add other alive players
      for (const [id, player] of this.players.entries()) {
        if (player.isAlive && id !== actor.id) {
          // Skip invisible players for attack abilities
          if (
            ability.category === 'Attack' &&
            player.hasStatusEffect &&
            player.hasStatusEffect('invisible')
          ) {
            continue;
          }
          targets.push(id);
        }
      }
    }

    return targets;
  }

  /**
   * Have all AI players make their decisions for this round
   */
  async processAIDecisions() {
    // Have all AI players make decisions
    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive || player.hasSubmittedAction) continue;

      const ai = this.aiPlayers.get(playerId);
      if (!ai) continue;

      const availableActions = this.getAvailableActions(player);
      const isWarlock = this.systems.warlockSystem.isPlayerWarlock(playerId);
      const decision = ai.makeDecision(
        availableActions,
        isWarlock,
        player.name
      );

      if (decision) {
        this.addAction(playerId, decision.actionType, decision.targetId);
      }
    }
  }

  /**
   * Process one complete round
   * @returns {Object} Round result
   */
  async processGameRound() {
    this.roundCount++;

    // Track Warlocks before the round
    const warlocksBefore = this.systems.warlockSystem.getWarlockCount();

    // Have AI make decisions
    await this.processAIDecisions();

    // Process the round using parent method
    const result = super.processRound();

    // Track Warlocks after the round
    const warlocksAfter = this.systems.warlockSystem.getWarlockCount();
    const corruptions = warlocksAfter - warlocksBefore;

    // Track events
    this.gameEvents.push({
      round: this.roundCount,
      alivePlayers: this.getAlivePlayers().length,
      monsterHp: this.monster ? this.monster.hp : 0,
      level: this.level,
      warlocksBefore,
      warlocksAfter,
      corruptions,
    });

    // Debug: Log corruptions
    if (corruptions > 0) {
      console.log(
        `  Round ${this.roundCount}: ${corruptions} player(s) corrupted! (${warlocksBefore} → ${warlocksAfter} Warlocks)`
      );
    }

    return result;
  }

  /**
   * Run complete simulation
   * @param {number} maxRounds - Maximum rounds
   * @returns {Object} Game result
   */
  async runSimulation(maxRounds = 50) {
    // Start the game
    this.started = true;
    this.round = 1;
    this.assignInitialWarlock();

    console.log(`Game started with ${this.players.size} players`);

    let rounds = 0;
    while (rounds < maxRounds) {
      // Check win conditions
      const winner = this.checkWinCondition();
      if (winner) {
        return this.getGameResult(winner, rounds);
      }

      // Process round
      await this.processGameRound();
      rounds++;

      // Check win conditions again
      const postRoundWinner = this.checkWinCondition();
      if (postRoundWinner) {
        return this.getGameResult(postRoundWinner, rounds);
      }
    }

    // Game timed out
    return this.getGameResult('Draw', rounds);
  }

  /**
   * Check win conditions
   * @returns {string|null} Winner or null
   */
  checkWinCondition() {
    const aliveCount = this.getAlivePlayers().length;
    const warlockCount = this.systems.warlockSystem.countAliveWarlocks();

    if (aliveCount === 0) return 'Draw';
    if (warlockCount === 0) return 'Good';
    if (warlockCount === aliveCount) return 'Evil';

    return null;
  }

  /**
   * Get final game result
   * @param {string} winner - Winner
   * @param {number} rounds - Rounds played
   * @returns {Object} Game result
   */
  getGameResult(winner, rounds) {
    const alivePlayers = this.getAlivePlayers();

    return {
      winner,
      rounds,
      survivors: alivePlayers.length,
      totalPlayers: this.players.size,
      finalLevel: this.level,
      warlocks: this.systems.warlockSystem.getWarlockCount(),
      players: Array.from(this.players.values()).map((p) => ({
        name: p.name,
        race: p.race,
        class: p.class,
        alive: p.isAlive,
        isWarlock: p.isWarlock,
        hp: p.hp,
        maxHp: p.maxHp,
      })),
      events: this.gameEvents,
    };
  }
}

/**
 * Get all valid race/class combinations
 * @returns {Array} Valid combinations
 */
function getValidCombinations() {
  const combinations = [];

  for (const race of config.races) {
    const raceData = config.raceAttributes[race];
    if (raceData && raceData.compatibleClasses) {
      for (const className of raceData.compatibleClasses) {
        combinations.push({ race, class: className });
      }
    }
  }

  return combinations;
}

/**
 * Generate random player setup
 * @param {number} playerCount - Number of players
 * @returns {Array} Player configurations
 */
function generateRandomPlayers(playerCount = 6) {
  const validCombinations = getValidCombinations();
  const players = [];
  const usedNames = new Set();

  for (let i = 0; i < playerCount; i++) {
    const combo =
      validCombinations[Math.floor(Math.random() * validCombinations.length)];

    let name = `${combo.race}${combo.class}`;
    let counter = 1;
    while (usedNames.has(name)) {
      name = `${combo.race}${combo.class}${counter}`;
      counter++;
    }

    players.push({
      name,
      race: combo.race,
      class: combo.class,
    });

    usedNames.add(name);
  }

  return players;
}

/**
 * Run a single random game
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Game result
 */
async function runRandomGame(options = {}) {
  const { minPlayers = 6, maxPlayers = 14, maxRounds = 100 } = options;

  const playerCount =
    Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;
  const players = generateRandomPlayers(playerCount);

  const game = new SimpleGameRoom(`RANDOM_${Date.now()}`);

  // Add players
  for (const player of players) {
    const success = game.addRandomPlayer(
      player.name,
      player.race,
      player.class
    );
    if (!success) {
      throw new Error(`Failed to add player: ${player.name}`);
    }
  }

  // Run simulation
  const result = await game.runSimulation(maxRounds);
  return result;
}

/**
 * Run multiple games and collect statistics
 * @param {number} numGames - Number of games
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Results
 */
async function runSimulation(numGames = 10, options = {}) {
  console.log(`Running ${numGames} random games...`);

  const results = [];
  const stats = {
    totalGames: numGames,
    completedGames: 0,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    averageLevel: 0,
    classStats: {},
    raceStats: {},
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      if (i % Math.max(1, Math.floor(numGames / 10)) === 0) {
        console.log(`Running game ${i + 1}/${numGames}...`);
      }

      const result = await runRandomGame(options);
      results.push(result);
      stats.completedGames++;

      // Update stats
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;
      stats.averageLevel += result.finalLevel;

      // Track corruption events
      const gameCorruptions = result.events.reduce(
        (sum, event) => sum + (event.corruptions || 0),
        0
      );
      if (!stats.corruptionEvents) stats.corruptionEvents = 0;
      stats.corruptionEvents += gameCorruptions;
      result.players.forEach((player) => {
        // Initialize if needed
        if (!stats.classStats[player.class]) {
          stats.classStats[player.class] = { total: 0, wins: 0, survived: 0 };
        }
        if (!stats.raceStats[player.race]) {
          stats.raceStats[player.race] = { total: 0, wins: 0, survived: 0 };
        }

        stats.classStats[player.class].total++;
        stats.raceStats[player.race].total++;

        if (player.alive) {
          stats.classStats[player.class].survived++;
          stats.raceStats[player.race].survived++;
        }

        // Count wins (player on winning team)
        const playerWon =
          (result.winner === 'Good' && !player.isWarlock) ||
          (result.winner === 'Evil' && player.isWarlock);
        if (playerWon) {
          stats.classStats[player.class].wins++;
          stats.raceStats[player.race].wins++;
        }
      });
    } catch (error) {
      console.error(`Error in game ${i + 1}:`, error.message);
      stats.errors.push({ game: i + 1, error: error.message });
    }
  }

  // Calculate averages
  if (stats.completedGames > 0) {
    stats.averageRounds /= stats.completedGames;
    stats.averageSurvivors /= stats.completedGames;
    stats.averageLevel /= stats.completedGames;
  }

  return { results, stats };
}

/**
 * Print simple results
 * @param {Object} simulation - Simulation results
 */
function printResults(simulation) {
  const { stats } = simulation;

  console.log('\n' + '='.repeat(50));
  console.log('SIMPLE WARLOCK SIMULATION RESULTS');
  console.log('='.repeat(50));

  console.log(`\nGames: ${stats.completedGames}/${stats.totalGames}`);

  console.log('\nWin Distribution:');
  Object.entries(stats.winners).forEach(([team, wins]) => {
    const percentage = ((wins / stats.completedGames) * 100).toFixed(1);
    console.log(`  ${team}: ${wins} (${percentage}%)`);
  });

  console.log('\nAverages:');
  console.log(`  Rounds: ${stats.averageRounds.toFixed(1)}`);
  console.log(`  Survivors: ${stats.averageSurvivors.toFixed(1)}`);
  console.log(`  Final Level: ${stats.averageLevel.toFixed(1)}`);

  console.log('\nTop Classes (by win rate):');
  const sortedClasses = Object.entries(stats.classStats)
    .map(([name, data]) => ({
      name,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      survivalRate: data.total > 0 ? (data.survived / data.total) * 100 : 0,
      games: data.total,
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 10);

  sortedClasses.forEach((cls) => {
    console.log(
      `  ${cls.name}: ${cls.winRate.toFixed(
        1
      )}% wins, ${cls.survivalRate.toFixed(1)}% survival (${cls.games} games)`
    );
  });

  console.log('\nCorruption Summary:');
  const totalCorruptions = stats.corruptionEvents || 0;
  console.log(`  Total corruptions: ${totalCorruptions}`);
  console.log(
    `  Corruption rate: ${(totalCorruptions / stats.completedGames).toFixed(
      1
    )} per game`
  );

  console.log('\n' + '='.repeat(50));
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const numGames = args.length > 0 ? parseInt(args[0]) : 10;

  if (isNaN(numGames) || numGames < 1) {
    console.error('Usage: node simple-simulator.js [number_of_games]');
    process.exit(1);
  }

  console.log('Simple Warlock Simulator');
  console.log('========================');
  console.log('Random players, random actions\n');

  try {
    const startTime = Date.now();
    const simulation = await runSimulation(numGames);
    const endTime = Date.now();

    printResults(simulation);

    const duration = (endTime - startTime) / 1000;
    console.log(`\nCompleted in ${duration.toFixed(2)} seconds`);
    console.log(
      `Average: ${(duration / simulation.stats.completedGames).toFixed(
        3
      )}s per game`
    );
  } catch (error) {
    console.error('Simulation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  SimpleGameRoom,
  RandomAI,
  runRandomGame,
  runSimulation,
  printResults,
  getValidCombinations,
  generateRandomPlayers,
};
