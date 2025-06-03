/**
 * @fileoverview Test runner comparing random AI vs strategic AI
 * Measures the effectiveness of strategic decision-making
 */

const path = require('path');
const fs = require('fs');

// Set up module aliases (same as simple-simulator.js)
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

// Import base components
const {
  SimpleGameRoom,
  RandomAI,
  generateRandomPlayers,
} = require('./simple-simulator');
const {
  createStrategicAI,
  createStrategicTeam,
} = require('./strategies/strategy-factory');

// Suppress logging for cleaner output
process.env.LOG_LEVEL = 'DEBUG';

/**
 * Strategic Game Room that uses intelligent AI
 */
class StrategicGameRoom extends SimpleGameRoom {
  constructor(code = 'STRAT') {
    super(code);
    this.strategicAI = new Map(); // Track strategic AI for each player
  }

  /**
   * Add a player with strategic AI
   * @param {string} name - Player name
   * @param {string} race - Player race
   * @param {string} className - Player class
   * @returns {boolean} Success
   */
  addStrategicPlayer(name, race, className) {
    const playerId = `player_${name}_${Date.now()}`;

    // Add player using parent method
    const success = this.addPlayer(playerId, name);
    if (!success) return false;

    // Set character class
    this.setPlayerClass(playerId, race, className);

    // Add strategic AI
    this.strategicAI.set(playerId, createStrategicAI(name, race, className));

    return true;
  }

  /**
   * Enhanced AI decision making with strategic intelligence
   */
  async processAIDecisions() {
    // Prepare enhanced game state for strategic AI
    const gameState = this.getEnhancedGameState();

    // Have all AI players make decisions
    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive || player.hasSubmittedAction) continue;

      const ai = this.strategicAI.get(playerId) || this.aiPlayers.get(playerId);
      if (!ai) continue;

      const availableActions = this.getAvailableActions(player);
      const isWarlock = this.systems.warlockSystem.isPlayerWarlock(playerId);

      let decision;
      if (ai.makeDecision && ai.makeDecision.length > 3) {
        // Strategic AI with enhanced parameters
        decision = ai.makeDecision(
          availableActions,
          isWarlock,
          player.name,
          gameState
        );
      } else {
        // Fallback to simple AI
        decision = ai.makeDecision(availableActions, isWarlock, player.name);
      }

      if (decision) {
        this.addAction(playerId, decision.actionType, decision.targetId);
      }
    }
  }

  /**
   * Create enhanced game state for strategic AI
   * @returns {Object} Enhanced game state
   */
  getEnhancedGameState() {
    return {
      players: this.players,
      monster: this.monster,
      round: this.round,
      level: this.level,
      systems: this.systems,
      events: this.gameEvents.slice(-5), // Recent events for pattern analysis
      alivePlayers: this.getAlivePlayers(),
      warlockCount: this.systems.warlockSystem.getWarlockCount(),
    };
  }
}

/**
 * Hybrid Game Room that mixes random and strategic AI
 */
class HybridGameRoom extends StrategicGameRoom {
  constructor(code = 'HYBRID', strategicRatio = 0.5) {
    super(code);
    this.strategicRatio = strategicRatio; // Ratio of strategic to random AI
  }

  /**
   * Add a player with either strategic or random AI based on ratio
   * @param {string} name - Player name
   * @param {string} race - Player race
   * @param {string} className - Player class
   * @returns {boolean} Success
   */
  addHybridPlayer(name, race, className) {
    const playerId = `player_${name}_${Date.now()}`;

    // Add player using parent method
    const success = this.addPlayer(playerId, name);
    if (!success) return false;

    // Set character class
    this.setPlayerClass(playerId, race, className);

    // Decide AI type based on ratio
    if (Math.random() < this.strategicRatio) {
      // Strategic AI
      this.strategicAI.set(playerId, createStrategicAI(name, race, className));
    } else {
      // Random AI
      this.aiPlayers.set(playerId, new RandomAI(name));
    }

    return true;
  }
}

/**
 * Run a comparison test between different AI types
 * @param {number} numGames - Number of games per test
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Comparison results
 */
async function runComparisonTest(numGames = 20, options = {}) {
  const { minPlayers = 3, maxPlayers = 20, maxRounds = 100 } = options;

  console.log('🧠 Strategic AI vs Random AI Comparison Test');
  console.log('='.repeat(50));

  const results = {
    randomAI: { games: [], stats: {} },
    strategicAI: { games: [], stats: {} },
    hybridAI: { games: [], stats: {} },
  };

  // Test 1: Pure Random AI
  console.log('\n📊 Testing Random AI...');
  for (let i = 0; i < numGames; i++) {
    if (i % 5 === 0) console.log(`  Game ${i + 1}/${numGames}`);

    const result = await runRandomGame(minPlayers, maxPlayers, maxRounds);
    results.randomAI.games.push(result);
  }
  results.randomAI.stats = calculateDetailedStats(
    results.randomAI.games,
    'Random AI'
  );

  // Test 2: Pure Strategic AI
  console.log('\n🧠 Testing Strategic AI...');
  for (let i = 0; i < numGames; i++) {
    if (i % 5 === 0) console.log(`  Game ${i + 1}/${numGames}`);

    const result = await runStrategicGame(minPlayers, maxPlayers, maxRounds);
    results.strategicAI.games.push(result);
  }
  results.strategicAI.stats = calculateDetailedStats(
    results.strategicAI.games,
    'Strategic AI'
  );

  // Test 3: Hybrid AI (50/50 mix)
  console.log('\n⚖️ Testing Hybrid AI (50% strategic)...');
  for (let i = 0; i < numGames; i++) {
    if (i % 5 === 0) console.log(`  Game ${i + 1}/${numGames}`);

    const result = await runHybridGame(minPlayers, maxPlayers, maxRounds, 0.5);
    results.hybridAI.games.push(result);
  }
  results.hybridAI.stats = calculateDetailedStats(
    results.hybridAI.games,
    'Hybrid AI'
  );

  return results;
}

/**
 * Run a single game with random AI
 */
async function runRandomGame(minPlayers, maxPlayers, maxRounds) {
  const playerCount =
    Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;
  const players = generateRandomPlayers(playerCount);

  const game = new SimpleGameRoom(`RANDOM_${Date.now()}`);

  for (const player of players) {
    game.addRandomPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(maxRounds);
}

/**
 * Run a single game with strategic AI
 */
async function runStrategicGame(minPlayers, maxPlayers, maxRounds) {
  const playerCount =
    Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;
  const players = generateRandomPlayers(playerCount);

  const game = new StrategicGameRoom(`STRATEGIC_${Date.now()}`);

  for (const player of players) {
    game.addStrategicPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(maxRounds);
}

/**
 * Run a single game with hybrid AI
 */
async function runHybridGame(
  minPlayers,
  maxPlayers,
  maxRounds,
  strategicRatio
) {
  const playerCount =
    Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;
  const players = generateRandomPlayers(playerCount);

  const game = new HybridGameRoom(`HYBRID_${Date.now()}`, strategicRatio);

  for (const player of players) {
    game.addHybridPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(maxRounds);
}

/**
 * Calculate detailed statistics for a set of games
 * @param {Array} games - Game results
 * @param {string} label - Label for the test
 * @returns {Object} Detailed statistics
 */
function calculateDetailedStats(games, label) {
  const stats = {
    label,
    totalGames: games.length,
    completedGames: games.filter((g) => g.winner !== 'Draw').length,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    averageLevel: 0,
    quickGames: 0, // Games under 5 rounds
    longGames: 0, // Games over 15 rounds
    corruptionEvents: 0,
    classPerformance: {},
    racePerformance: {},
    teamCompositionAnalysis: {
      startingTeams: {}, // race/class combinations by starting team size
      endingTeams: {}, // race/class combinations by ending team size
      warlockRaceStats: {}, // Warlock performance by race
      goodRaceStats: {}, // Good player performance by race
    },
  };

  // Basic aggregation
  for (const game of games) {
    stats.winners[game.winner]++;
    stats.averageRounds += game.rounds;
    stats.averageSurvivors += game.survivors;
    stats.averageLevel += game.finalLevel;

    if (game.rounds <= 5) stats.quickGames++;
    if (game.rounds >= 15) stats.longGames++;

    const gameCorruptions =
      game.events?.reduce((sum, event) => sum + (event.corruptions || 0), 0) ||
      0;
    stats.corruptionEvents += gameCorruptions;

    // Analyze starting and ending team compositions
    analyzeTeamComposition(game, stats.teamCompositionAnalysis);

    // Track class and race performance
    for (const player of game.players) {
      // Initialize if needed
      if (!stats.classPerformance[player.class]) {
        stats.classPerformance[player.class] = {
          total: 0,
          wins: 0,
          survived: 0,
          asWarlock: 0,
          warlockWins: 0,
          warlockSurvived: 0,
          asGood: 0,
          goodWins: 0,
          goodSurvived: 0,
        };
      }
      if (!stats.racePerformance[player.race]) {
        stats.racePerformance[player.race] = {
          total: 0,
          wins: 0,
          survived: 0,
          asWarlock: 0,
          warlockWins: 0,
          warlockSurvived: 0,
          asGood: 0,
          goodWins: 0,
          goodSurvived: 0,
          averageHpPercent: 0,
          gamesPlayed: 0,
        };
      }

      stats.classPerformance[player.class].total++;
      stats.racePerformance[player.race].total++;
      stats.racePerformance[player.race].gamesPlayed++;

      // Track HP percentage at end
      const hpPercent = player.alive ? player.hp / player.maxHp : 0;
      stats.racePerformance[player.race].averageHpPercent += hpPercent;

      if (player.alive) {
        stats.classPerformance[player.class].survived++;
        stats.racePerformance[player.race].survived++;
      }

      // Track Warlock vs Good performance separately
      if (player.isWarlock) {
        stats.classPerformance[player.class].asWarlock++;
        stats.racePerformance[player.race].asWarlock++;

        if (player.alive) {
          stats.classPerformance[player.class].warlockSurvived++;
          stats.racePerformance[player.race].warlockSurvived++;
        }

        if (game.winner === 'Evil') {
          stats.classPerformance[player.class].warlockWins++;
          stats.racePerformance[player.race].warlockWins++;
        }
      } else {
        stats.classPerformance[player.class].asGood++;
        stats.racePerformance[player.race].asGood++;

        if (player.alive) {
          stats.classPerformance[player.class].goodSurvived++;
          stats.racePerformance[player.race].goodSurvived++;
        }

        if (game.winner === 'Good') {
          stats.classPerformance[player.class].goodWins++;
          stats.racePerformance[player.race].goodWins++;
        }
      }

      // Count wins (player on winning team)
      const playerWon =
        (game.winner === 'Good' && !player.isWarlock) ||
        (game.winner === 'Evil' && player.isWarlock);
      if (playerWon) {
        stats.classPerformance[player.class].wins++;
        stats.racePerformance[player.race].wins++;
      }
    }
  }

  // Calculate averages
  if (stats.totalGames > 0) {
    stats.averageRounds /= stats.totalGames;
    stats.averageSurvivors /= stats.totalGames;
    stats.averageLevel /= stats.totalGames;
    stats.averageCorruptions = stats.corruptionEvents / stats.totalGames;
  }

  // Calculate win and survival rates
  for (const classStats of Object.values(stats.classPerformance)) {
    classStats.winRate =
      classStats.total > 0 ? (classStats.wins / classStats.total) * 100 : 0;
    classStats.survivalRate =
      classStats.total > 0 ? (classStats.survived / classStats.total) * 100 : 0;

    // Warlock-specific rates
    classStats.warlockWinRate =
      classStats.asWarlock > 0
        ? (classStats.warlockWins / classStats.asWarlock) * 100
        : 0;
    classStats.warlockSurvivalRate =
      classStats.asWarlock > 0
        ? (classStats.warlockSurvived / classStats.asWarlock) * 100
        : 0;

    // Good player rates
    classStats.goodWinRate =
      classStats.asGood > 0
        ? (classStats.goodWins / classStats.asGood) * 100
        : 0;
    classStats.goodSurvivalRate =
      classStats.asGood > 0
        ? (classStats.goodSurvived / classStats.asGood) * 100
        : 0;
  }

  for (const raceStats of Object.values(stats.racePerformance)) {
    raceStats.winRate =
      raceStats.total > 0 ? (raceStats.wins / raceStats.total) * 100 : 0;
    raceStats.survivalRate =
      raceStats.total > 0 ? (raceStats.survived / raceStats.total) * 100 : 0;

    // Average HP percentage at game end
    if (raceStats.gamesPlayed > 0) {
      raceStats.averageHpPercent =
        (raceStats.averageHpPercent / raceStats.gamesPlayed) * 100;
    }

    // Warlock-specific rates
    raceStats.warlockWinRate =
      raceStats.asWarlock > 0
        ? (raceStats.warlockWins / raceStats.asWarlock) * 100
        : 0;
    raceStats.warlockSurvivalRate =
      raceStats.asWarlock > 0
        ? (raceStats.warlockSurvived / raceStats.asWarlock) * 100
        : 0;

    // Good player rates
    raceStats.goodWinRate =
      raceStats.asGood > 0 ? (raceStats.goodWins / raceStats.asGood) * 100 : 0;
    raceStats.goodSurvivalRate =
      raceStats.asGood > 0
        ? (raceStats.goodSurvived / raceStats.asGood) * 100
        : 0;
  }

  return stats;
}

/**
 * Analyze team composition at start and end of game
 * @param {Object} game - Game result
 * @param {Object} teamAnalysis - Team composition analysis object
 */
function analyzeTeamComposition(game, teamAnalysis) {
  const totalPlayers = game.players.length;
  const survivors = game.players.filter((p) => p.alive).length;
  const warlocks = game.players.filter((p) => p.isWarlock);
  const goodPlayers = game.players.filter((p) => !p.isWarlock);

  // Starting team composition
  const startingKey = `${totalPlayers}players`;
  if (!teamAnalysis.startingTeams[startingKey]) {
    teamAnalysis.startingTeams[startingKey] = {
      totalGames: 0,
      raceDistribution: {},
      classDistribution: {},
      winsByRace: {},
      winsByClass: {},
      avgSurvivors: 0,
      avgRounds: 0,
    };
  }

  const startingTeam = teamAnalysis.startingTeams[startingKey];
  startingTeam.totalGames++;
  startingTeam.avgSurvivors += survivors;
  startingTeam.avgRounds += game.rounds;

  // Track race and class distributions in starting teams
  for (const player of game.players) {
    // Race distribution
    if (!startingTeam.raceDistribution[player.race]) {
      startingTeam.raceDistribution[player.race] = {
        total: 0,
        wins: 0,
        survived: 0,
      };
    }
    startingTeam.raceDistribution[player.race].total++;

    if (player.alive) {
      startingTeam.raceDistribution[player.race].survived++;
    }

    const playerWon =
      (game.winner === 'Good' && !player.isWarlock) ||
      (game.winner === 'Evil' && player.isWarlock);
    if (playerWon) {
      startingTeam.raceDistribution[player.race].wins++;

      if (!startingTeam.winsByRace[player.race]) {
        startingTeam.winsByRace[player.race] = 0;
      }
      startingTeam.winsByRace[player.race]++;
    }

    // Class distribution
    if (!startingTeam.classDistribution[player.class]) {
      startingTeam.classDistribution[player.class] = {
        total: 0,
        wins: 0,
        survived: 0,
      };
    }
    startingTeam.classDistribution[player.class].total++;

    if (player.alive) {
      startingTeam.classDistribution[player.class].survived++;
    }

    if (playerWon) {
      startingTeam.classDistribution[player.class].wins++;

      if (!startingTeam.winsByClass[player.class]) {
        startingTeam.winsByClass[player.class] = 0;
      }
      startingTeam.winsByClass[player.class]++;
    }
  }

  // Ending team composition (survivors only)
  if (survivors > 0) {
    const endingKey = `${survivors}survivors`;
    if (!teamAnalysis.endingTeams[endingKey]) {
      teamAnalysis.endingTeams[endingKey] = {
        totalGames: 0,
        raceComposition: {},
        classComposition: {},
        winnerBreakdown: { Good: 0, Evil: 0, Draw: 0 },
        avgStartingSize: 0,
        avgRounds: 0,
      };
    }

    const endingTeam = teamAnalysis.endingTeams[endingKey];
    endingTeam.totalGames++;
    endingTeam.winnerBreakdown[game.winner]++;
    endingTeam.avgStartingSize += totalPlayers;
    endingTeam.avgRounds += game.rounds;

    const survivingPlayers = game.players.filter((p) => p.alive);
    for (const player of survivingPlayers) {
      // Race composition of survivors
      if (!endingTeam.raceComposition[player.race]) {
        endingTeam.raceComposition[player.race] = {
          count: 0,
          asWarlock: 0,
          asGood: 0,
        };
      }
      endingTeam.raceComposition[player.race].count++;

      if (player.isWarlock) {
        endingTeam.raceComposition[player.race].asWarlock++;
      } else {
        endingTeam.raceComposition[player.race].asGood++;
      }

      // Class composition of survivors
      if (!endingTeam.classComposition[player.class]) {
        endingTeam.classComposition[player.class] = {
          count: 0,
          asWarlock: 0,
          asGood: 0,
        };
      }
      endingTeam.classComposition[player.class].count++;

      if (player.isWarlock) {
        endingTeam.classComposition[player.class].asWarlock++;
      } else {
        endingTeam.classComposition[player.class].asGood++;
      }
    }
  }

  // Warlock and Good player race-specific performance
  for (const warlock of warlocks) {
    if (!teamAnalysis.warlockRaceStats[warlock.race]) {
      teamAnalysis.warlockRaceStats[warlock.race] = {
        total: 0,
        wins: 0,
        survived: 0,
        corruptedOthers: 0,
        avgRounds: 0,
        gamesPlayed: 0,
      };
    }

    const warlockRaceStats = teamAnalysis.warlockRaceStats[warlock.race];
    warlockRaceStats.total++;
    warlockRaceStats.gamesPlayed++;
    warlockRaceStats.avgRounds += game.rounds;

    if (warlock.alive) {
      warlockRaceStats.survived++;
    }

    if (game.winner === 'Evil') {
      warlockRaceStats.wins++;
    }
  }

  for (const goodPlayer of goodPlayers) {
    if (!teamAnalysis.goodRaceStats[goodPlayer.race]) {
      teamAnalysis.goodRaceStats[goodPlayer.race] = {
        total: 0,
        wins: 0,
        survived: 0,
        avgRounds: 0,
        gamesPlayed: 0,
        resistedCorruption: 0,
      };
    }

    const goodRaceStats = teamAnalysis.goodRaceStats[goodPlayer.race];
    goodRaceStats.total++;
    goodRaceStats.gamesPlayed++;
    goodRaceStats.avgRounds += game.rounds;

    if (goodPlayer.alive) {
      goodRaceStats.survived++;
    }

    if (game.winner === 'Good') {
      goodRaceStats.wins++;
    }

    // Track if they stayed good (resisted corruption)
    if (!goodPlayer.isWarlock) {
      goodRaceStats.resistedCorruption++;
    }
  }
}

/**
 * Print comprehensive comparison results
 * @param {Object} results - Comparison results
 */
function printComparisonResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🏆 AI STRATEGY COMPARISON RESULTS');
  console.log('='.repeat(60));

  const { randomAI, strategicAI, hybridAI } = results;

  // Summary table
  console.log('\n📊 SUMMARY COMPARISON');
  console.log('-'.repeat(60));
  console.log(
    'Metric'.padEnd(20) +
      'Random'.padEnd(12) +
      'Strategic'.padEnd(12) +
      'Hybrid'.padEnd(12)
  );
  console.log('-'.repeat(60));

  const metrics = [
    ['Win Rate (Good)', 'winners.Good', 'completedGames'],
    ['Win Rate (Evil)', 'winners.Evil', 'completedGames'],
    ['Avg Rounds', 'averageRounds', null],
    ['Avg Survivors', 'averageSurvivors', null],
    ['Avg Level', 'averageLevel', null],
    ['Quick Games (%)', 'quickGames', 'totalGames'],
    ['Long Games (%)', 'longGames', 'totalGames'],
    ['Corruptions/Game', 'averageCorruptions', null],
  ];

  for (const [label, prop, denominator] of metrics) {
    const getValue = (stats) => {
      const value = prop
        .split('.')
        .reduce((obj, key) => obj?.[key] ?? 0, stats);
      if (denominator) {
        const denom = denominator
          .split('.')
          .reduce((obj, key) => obj?.[key] ?? 1, stats);
        return denom > 0 ? ((value / denom) * 100).toFixed(1) + '%' : '0%';
      }
      return typeof value === 'number' ? value.toFixed(1) : value;
    };

    console.log(
      label.padEnd(20) +
        getValue(randomAI.stats).padEnd(12) +
        getValue(strategicAI.stats).padEnd(12) +
        getValue(hybridAI.stats).padEnd(12)
    );
  }

  // Detailed analysis
  console.log('\n🔍 DETAILED ANALYSIS');
  console.log('-'.repeat(60));

  // Race performance breakdown
  console.log('\n🧬 RACE PERFORMANCE BREAKDOWN');
  console.log('-'.repeat(40));
  console.log(
    'Race'.padEnd(12) +
      'Games'.padEnd(8) +
      'Win%'.padEnd(8) +
      'Surv%'.padEnd(8) +
      'AvgHP%'.padEnd(8)
  );
  console.log('-'.repeat(40));

  const raceOrder = [
    'Artisan',
    'Rockhewn',
    'Crestfallen',
    'Orc',
    'Kinfolk',
    'Lich',
  ];
  for (const race of raceOrder) {
    const raceStats = strategicAI.stats.racePerformance[race];
    if (raceStats && raceStats.total > 0) {
      console.log(
        race.padEnd(12) +
          raceStats.total.toString().padEnd(8) +
          raceStats.winRate.toFixed(1).padEnd(8) +
          raceStats.survivalRate.toFixed(1).padEnd(8) +
          raceStats.averageHpPercent.toFixed(1).padEnd(8)
      );
    }
  }

  // Race performance as Warlock vs Good
  console.log('\n👹 RACE PERFORMANCE: WARLOCK vs GOOD');
  console.log('-'.repeat(60));
  console.log(
    'Race'.padEnd(12) +
      'Warlock Win%'.padEnd(14) +
      'Warlock Surv%'.padEnd(15) +
      'Good Win%'.padEnd(12) +
      'Good Surv%'.padEnd(12)
  );
  console.log('-'.repeat(60));

  for (const race of raceOrder) {
    const raceStats = strategicAI.stats.racePerformance[race];
    if (raceStats && raceStats.total > 0) {
      console.log(
        race.padEnd(12) +
          (raceStats.asWarlock > 0
            ? raceStats.warlockWinRate.toFixed(1)
            : 'N/A'
          ).padEnd(14) +
          (raceStats.asWarlock > 0
            ? raceStats.warlockSurvivalRate.toFixed(1)
            : 'N/A'
          ).padEnd(15) +
          (raceStats.asGood > 0
            ? raceStats.goodWinRate.toFixed(1)
            : 'N/A'
          ).padEnd(12) +
          (raceStats.asGood > 0
            ? raceStats.goodSurvivalRate.toFixed(1)
            : 'N/A'
          ).padEnd(12)
      );
    }
  }

  // Starting team composition analysis
  console.log('\n🏁 STARTING TEAM SIZE ANALYSIS');
  console.log('-'.repeat(50));
  const startingTeams = strategicAI.stats.teamCompositionAnalysis.startingTeams;

  for (const [teamSize, data] of Object.entries(startingTeams)) {
    if (data.totalGames < 3) continue;

    console.log(`\n📊 ${teamSize.toUpperCase()}:`);
    console.log(
      `  Games: ${data.totalGames}, Avg Survivors: ${(
        data.avgSurvivors / data.totalGames
      ).toFixed(1)}, Avg Rounds: ${(data.avgRounds / data.totalGames).toFixed(
        1
      )}`
    );

    // Top performing races in this team size
    const racePerf = Object.entries(data.raceDistribution)
      .map(([race, stats]) => ({
        race,
        winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        survivalRate:
          stats.total > 0 ? (stats.survived / stats.total) * 100 : 0,
        count: stats.total,
      }))
      .filter((r) => r.count >= 3)
      .sort((a, b) => b.winRate - a.winRate);

    if (racePerf.length > 0) {
      console.log('  Top Races:');
      racePerf.slice(0, 3).forEach((r) => {
        console.log(
          `    ${r.race}: ${r.winRate.toFixed(
            1
          )}% win, ${r.survivalRate.toFixed(1)}% survival (${
            r.count
          } instances)`
        );
      });
    }
  }

  // Ending team composition analysis
  console.log('\n🏆 SURVIVOR TEAM ANALYSIS');
  console.log('-'.repeat(50));
  const endingTeams = strategicAI.stats.teamCompositionAnalysis.endingTeams;

  for (const [survivorCount, data] of Object.entries(endingTeams)) {
    if (data.totalGames < 3) continue;

    const avgStarting = (data.avgStartingSize / data.totalGames).toFixed(1);
    const goodWinRate =
      data.totalGames > 0
        ? ((data.winnerBreakdown.Good / data.totalGames) * 100).toFixed(1)
        : 0;
    const evilWinRate =
      data.totalGames > 0
        ? ((data.winnerBreakdown.Evil / data.totalGames) * 100).toFixed(1)
        : 0;

    console.log(`\n🎯 ${survivorCount.toUpperCase()}:`);
    console.log(
      `  Games: ${data.totalGames}, Avg Starting Size: ${avgStarting}, Good Win: ${goodWinRate}%, Evil Win: ${evilWinRate}%`
    );

    // Most common survivor races
    const survivorRaces = Object.entries(data.raceComposition)
      .map(([race, stats]) => ({
        race,
        frequency: (stats.count / data.totalGames).toFixed(1),
        warlockRate:
          stats.count > 0
            ? ((stats.asWarlock / stats.count) * 100).toFixed(1)
            : 0,
        count: stats.count,
      }))
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.count - a.count);

    if (survivorRaces.length > 0) {
      console.log('  Common Survivor Races:');
      survivorRaces.slice(0, 3).forEach((r) => {
        console.log(
          `    ${r.race}: ${r.frequency} per game, ${r.warlockRate}% as Warlock`
        );
      });
    }
  }

  // Game length distribution
  console.log('\n⏱️ Game Length Distribution:');
  const analyzeLengths = (stats) => {
    const quick = ((stats.quickGames / stats.totalGames) * 100).toFixed(1);
    const long = ((stats.longGames / stats.totalGames) * 100).toFixed(1);
    const normal = (100 - parseFloat(quick) - parseFloat(long)).toFixed(1);
    return `${quick}% quick, ${normal}% normal, ${long}% long`;
  };

  console.log(`Random AI:    ${analyzeLengths(randomAI.stats)}`);
  console.log(`Strategic AI: ${analyzeLengths(strategicAI.stats)}`);
  console.log(`Hybrid AI:    ${analyzeLengths(hybridAI.stats)}`);

  // Win condition analysis
  console.log('\n🏅 Win Condition Analysis:');
  [randomAI, strategicAI, hybridAI].forEach((test) => {
    const stats = test.stats;
    const total = stats.completedGames;
    if (total > 0) {
      const goodWin = ((stats.winners.Good / total) * 100).toFixed(1);
      const evilWin = ((stats.winners.Evil / total) * 100).toFixed(1);
      console.log(
        `${stats.label}: Good ${goodWin}% | Evil ${evilWin}% | Draw ${(
          (stats.winners.Draw / stats.totalGames) *
          100
        ).toFixed(1)}%`
      );
    }
  });

  // Top performing classes
  console.log('\n🏆 Top Performing Classes (by win rate):');
  const allClasses = new Set();
  [randomAI, strategicAI, hybridAI].forEach((test) => {
    Object.keys(test.stats.classPerformance).forEach((cls) =>
      allClasses.add(cls)
    );
  });

  for (const className of Array.from(allClasses).slice(0, 5)) {
    const randomRate =
      randomAI.stats.classPerformance[className]?.winRate?.toFixed(1) || '0.0';
    const strategicRate =
      strategicAI.stats.classPerformance[className]?.winRate?.toFixed(1) ||
      '0.0';
    const hybridRate =
      hybridAI.stats.classPerformance[className]?.winRate?.toFixed(1) || '0.0';

    console.log(
      `${className.padEnd(12)}: ${randomRate.padStart(
        5
      )}% | ${strategicRate.padStart(5)}% | ${hybridRate.padStart(5)}%`
    );
  }

  // Strategic advantages
  console.log('\n🧠 Strategic AI Advantages:');
  const advantages = [];

  if (strategicAI.stats.winners.Good > randomAI.stats.winners.Good) {
    const diff = strategicAI.stats.winners.Good - randomAI.stats.winners.Good;
    advantages.push(`+${diff} more Good victories`);
  }

  if (strategicAI.stats.averageSurvivors > randomAI.stats.averageSurvivors) {
    const diff = (
      strategicAI.stats.averageSurvivors - randomAI.stats.averageSurvivors
    ).toFixed(1);
    advantages.push(`+${diff} more survivors per game`);
  }

  if (strategicAI.stats.averageLevel > randomAI.stats.averageLevel) {
    const diff = (
      strategicAI.stats.averageLevel - randomAI.stats.averageLevel
    ).toFixed(1);
    advantages.push(`+${diff} higher average level reached`);
  }

  if (strategicAI.stats.averageRounds < randomAI.stats.averageRounds) {
    const diff = (
      randomAI.stats.averageRounds - strategicAI.stats.averageRounds
    ).toFixed(1);
    advantages.push(`-${diff} fewer rounds (more decisive games)`);
  }

  if (advantages.length > 0) {
    advantages.forEach((advantage) => console.log(`  ✓ ${advantage}`));
  } else {
    console.log('  → No significant advantages detected');
  }

  // Race-specific insights
  console.log('\n🧬 RACE-SPECIFIC INSIGHTS:');
  const raceInsights = analyzeRaceInsights(strategicAI.stats.racePerformance);
  raceInsights.forEach((insight) => console.log(`  ${insight}`));

  // Team composition insights
  console.log('\n👥 TEAM COMPOSITION INSIGHTS:');
  const teamInsights = analyzeTeamInsights(
    strategicAI.stats.teamCompositionAnalysis
  );
  teamInsights.forEach((insight) => console.log(`  ${insight}`));

  // Key insights
  console.log('\n💡 KEY INSIGHTS:');

  const goodWinDiff =
    strategicAI.stats.winners.Good - randomAI.stats.winners.Good;
  if (goodWinDiff > 2) {
    console.log(
      `  ✓ Strategic AI significantly improves Good team coordination (+${goodWinDiff} wins)`
    );
  } else if (goodWinDiff < -2) {
    console.log(
      `  ⚠ Strategic AI may be too predictable (-${Math.abs(goodWinDiff)} wins)`
    );
  }

  const roundDiff =
    strategicAI.stats.averageRounds - randomAI.stats.averageRounds;
  if (roundDiff < -2) {
    console.log(
      `  ✓ Strategic AI creates more decisive games (${Math.abs(
        roundDiff
      ).toFixed(1)} fewer rounds)`
    );
  } else if (roundDiff > 2) {
    console.log(
      `  ⚠ Strategic AI may overcomplicate gameplay (+${roundDiff.toFixed(
        1
      )} more rounds)`
    );
  }

  const corruptionDiff =
    strategicAI.stats.averageCorruptions - randomAI.stats.averageCorruptions;
  if (corruptionDiff > 0.5) {
    console.log(
      `  ⚠ Strategic AI enables more Warlock corruptions (+${corruptionDiff.toFixed(
        1
      )} per game)`
    );
  } else if (corruptionDiff < -0.5) {
    console.log(
      `  ✓ Strategic AI better prevents Warlock corruptions (${Math.abs(
        corruptionDiff
      ).toFixed(1)} fewer per game)`
    );
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Analyze race-specific insights from performance data
 * @param {Object} racePerformance - Race performance statistics
 * @returns {Array} Array of insight strings
 */
function analyzeRaceInsights(racePerformance) {
  const insights = [];

  // Find strongest and weakest races overall
  const racesByWinRate = Object.entries(racePerformance)
    .filter(([race, stats]) => stats.total >= 5) // Minimum sample size
    .sort((a, b) => b[1].winRate - a[1].winRate);

  if (racesByWinRate.length > 0) {
    const strongest = racesByWinRate[0];
    const weakest = racesByWinRate[racesByWinRate.length - 1];

    insights.push(
      `🏆 Strongest Race: ${strongest[0]} (${strongest[1].winRate.toFixed(
        1
      )}% win rate)`
    );
    insights.push(
      `📉 Weakest Race: ${weakest[0]} (${weakest[1].winRate.toFixed(
        1
      )}% win rate)`
    );
  }

  // Find races that perform very differently as Warlock vs Good
  for (const [race, stats] of Object.entries(racePerformance)) {
    if (stats.asWarlock >= 3 && stats.asGood >= 3) {
      const warlockAdvantage = stats.warlockWinRate - stats.goodWinRate;

      if (warlockAdvantage > 15) {
        insights.push(
          `👹 ${race} excels as Warlock (+${warlockAdvantage.toFixed(
            1
          )}% vs Good role)`
        );
      } else if (warlockAdvantage < -15) {
        insights.push(
          `😇 ${race} performs better as Good (+${Math.abs(
            warlockAdvantage
          ).toFixed(1)}% vs Warlock role)`
        );
      }
    }
  }

  // Find races with exceptional survival rates
  for (const [race, stats] of Object.entries(racePerformance)) {
    if (stats.total >= 5) {
      if (stats.survivalRate > 70) {
        insights.push(
          `🛡️ ${race} has exceptional survival (${stats.survivalRate.toFixed(
            1
          )}%)`
        );
      } else if (stats.survivalRate < 30) {
        insights.push(
          `💀 ${race} struggles with survival (${stats.survivalRate.toFixed(
            1
          )}%)`
        );
      }

      if (stats.averageHpPercent > 60) {
        insights.push(
          `❤️ ${race} maintains high HP (${stats.averageHpPercent.toFixed(
            1
          )}% avg)`
        );
      } else if (stats.averageHpPercent < 20) {
        insights.push(
          `🩸 ${race} often ends games badly wounded (${stats.averageHpPercent.toFixed(
            1
          )}% avg HP)`
        );
      }
    }
  }

  return insights;
}

/**
 * Analyze team composition insights
 * @param {Object} teamAnalysis - Team composition analysis
 * @returns {Array} Array of insight strings
 */
function analyzeTeamInsights(teamAnalysis) {
  const insights = [];

  // Analyze starting team sizes
  const startingSizes = Object.entries(teamAnalysis.startingTeams)
    .filter(([size, data]) => data.totalGames >= 3)
    .map(([size, data]) => ({
      size: parseInt(size.replace('players', '')),
      avgSurvivors: data.avgSurvivors / data.totalGames,
      avgRounds: data.avgRounds / data.totalGames,
      games: data.totalGames,
    }))
    .sort((a, b) => a.size - b.size);

  if (startingSizes.length > 1) {
    const smallest = startingSizes[0];
    const largest = startingSizes[startingSizes.length - 1];

    const survivalRate = (
      (smallest.avgSurvivors / smallest.size) *
      100
    ).toFixed(1);
    const largeSurvivalRate = (
      (largest.avgSurvivors / largest.size) *
      100
    ).toFixed(1);

    insights.push(
      `👥 ${
        smallest.size
      }-player games: ${survivalRate}% survival rate, ${smallest.avgRounds.toFixed(
        1
      )} avg rounds`
    );
    insights.push(
      `👥 ${
        largest.size
      }-player games: ${largeSurvivalRate}% survival rate, ${largest.avgRounds.toFixed(
        1
      )} avg rounds`
    );

    if (smallest.avgRounds < largest.avgRounds - 2) {
      insights.push(
        `⚡ Smaller games are more decisive (${(
          largest.avgRounds - smallest.avgRounds
        ).toFixed(1)} fewer rounds)`
      );
    }
  }

  // Analyze ending team compositions
  const commonSurvivorCounts = Object.entries(teamAnalysis.endingTeams)
    .filter(([count, data]) => data.totalGames >= 3)
    .map(([count, data]) => ({
      survivors: parseInt(count.replace('survivors', '')),
      goodWinRate: (data.winnerBreakdown.Good / data.totalGames) * 100,
      evilWinRate: (data.winnerBreakdown.Evil / data.totalGames) * 100,
      games: data.totalGames,
    }))
    .sort((a, b) => b.games - a.games);

  if (commonSurvivorCounts.length > 0) {
    const mostCommon = commonSurvivorCounts[0];
    insights.push(
      `🎯 Most common outcome: ${mostCommon.survivors} survivors (${mostCommon.games} games)`
    );

    if (mostCommon.goodWinRate > 70) {
      insights.push(
        `✅ ${
          mostCommon.survivors
        } survivors strongly favors Good (${mostCommon.goodWinRate.toFixed(
          1
        )}% win rate)`
      );
    } else if (mostCommon.evilWinRate > 70) {
      insights.push(
        `👹 ${
          mostCommon.survivors
        } survivors strongly favors Evil (${mostCommon.evilWinRate.toFixed(
          1
        )}% win rate)`
      );
    }
  }

  // Analyze Warlock performance by race
  const warlockRaceStats = Object.entries(teamAnalysis.warlockRaceStats)
    .filter(([race, stats]) => stats.total >= 3)
    .map(([race, stats]) => ({
      race,
      winRate: (stats.wins / stats.total) * 100,
      survivalRate: (stats.survived / stats.total) * 100,
      avgRounds: stats.avgRounds / stats.gamesPlayed,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  if (warlockRaceStats.length > 0) {
    const bestWarlockRace = warlockRaceStats[0];
    const worstWarlockRace = warlockRaceStats[warlockRaceStats.length - 1];

    insights.push(
      `👹 Best Warlock race: ${
        bestWarlockRace.race
      } (${bestWarlockRace.winRate.toFixed(1)}% win rate)`
    );
    if (worstWarlockRace.winRate < bestWarlockRace.winRate - 20) {
      insights.push(
        `💔 Struggling Warlock race: ${
          worstWarlockRace.race
        } (${worstWarlockRace.winRate.toFixed(1)}% win rate)`
      );
    }
  }

  return insights;
}

/**
 * Run dedicated race performance analysis
 * @param {number} numGames - Number of games to test
 * @returns {Promise<Object>} Race analysis results
 */
async function runRaceAnalysis(numGames = 50) {
  console.log('\n🧬 COMPREHENSIVE RACE ANALYSIS');
  console.log('='.repeat(50));

  const raceResults = {};
  const crossRaceComparisons = {};

  // Test each race individually with larger sample sizes
  const availableRaces = [
    'Artisan',
    'Rockhewn',
    'Crestfallen',
    'Orc',
    'Kinfolk',
    'Lich',
  ];

  for (const race of availableRaces) {
    console.log(`\n🔬 Deep-testing ${race}...`);

    const games = [];
    for (let i = 0; i < Math.floor(numGames / 6); i++) {
      if (i % 3 === 0)
        console.log(`  Game ${i + 1}/${Math.floor(numGames / 6)}`);
      const result = await runRaceDeepTest(race);
      games.push(result);
    }

    raceResults[race] = analyzeRaceInDepth(games, race);
  }

  // Cross-race team compositions
  console.log('\n🤝 Testing mixed-race teams...');
  for (let i = 0; i < Math.floor(numGames / 3); i++) {
    const result = await runMixedRaceGame();
    if (!crossRaceComparisons.mixed) crossRaceComparisons.mixed = [];
    crossRaceComparisons.mixed.push(result);
  }

  return {
    individualRaces: raceResults,
    mixedTeams: crossRaceComparisons.mixed
      ? analyzeTeamDiversity(crossRaceComparisons.mixed)
      : null,
  };
}

/**
 * Run a deep test focusing on a specific race
 */
async function runRaceDeepTest(targetRace) {
  const players = generateRandomPlayers(6);

  // Ensure 2-3 players have the target race for better sample
  players[0].race = targetRace;
  players[1].race = targetRace;
  if (Math.random() < 0.5) {
    players[2].race = targetRace;
  }

  const game = new StrategicGameRoom(`RACEDEEP_${targetRace}_${Date.now()}`);

  for (const player of players) {
    game.addStrategicPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(40);
}

/**
 * Run a game with maximum race diversity
 */
async function runMixedRaceGame() {
  const races = [
    'Artisan',
    'Rockhewn',
    'Crestfallen',
    'Orc',
    'Kinfolk',
    'Lich',
  ];
  const players = generateRandomPlayers(6);

  // Assign each player a different race
  for (let i = 0; i < players.length && i < races.length; i++) {
    players[i].race = races[i];
  }

  const game = new StrategicGameRoom(`MIXED_${Date.now()}`);

  for (const player of players) {
    game.addStrategicPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(40);
}

/**
 * Analyze a race in depth from focused games
 */
function analyzeRaceInDepth(games, race) {
  const analysis = {
    race,
    totalGames: games.length,
    raceInstances: 0,
    asWarlock: { count: 0, wins: 0, survived: 0, avgRounds: 0, avgFinalHp: 0 },
    asGood: { count: 0, wins: 0, survived: 0, avgRounds: 0, avgFinalHp: 0 },
    racialAbilityUsage: {
      used: 0,
      effective: 0, // Subjective measure
      gameChanging: 0,
    },
    teamSynergy: {
      withTanks: { games: 0, wins: 0 },
      withHealer: { games: 0, wins: 0 },
      withDetection: { games: 0, wins: 0 },
      diverse: { games: 0, wins: 0 },
    },
    performanceByGameLength: {
      short: { games: 0, performance: 0 }, // Under 8 rounds
      medium: { games: 0, performance: 0 }, // 8-15 rounds
      long: { games: 0, performance: 0 }, // Over 15 rounds
    },
  };

  for (const game of games) {
    const racePlayers = game.players.filter((p) => p.race === race);
    analysis.raceInstances += racePlayers.length;

    // Categorize game length
    let lengthCategory;
    if (game.rounds < 8) lengthCategory = 'short';
    else if (game.rounds <= 15) lengthCategory = 'medium';
    else lengthCategory = 'long';

    for (const player of racePlayers) {
      const playerWon =
        (game.winner === 'Good' && !player.isWarlock) ||
        (game.winner === 'Evil' && player.isWarlock);
      const performance = playerWon ? 1 : player.alive ? 0.5 : 0;

      analysis.performanceByGameLength[lengthCategory].games++;
      analysis.performanceByGameLength[lengthCategory].performance +=
        performance;

      if (player.isWarlock) {
        analysis.asWarlock.count++;
        analysis.asWarlock.avgRounds += game.rounds;
        analysis.asWarlock.avgFinalHp += player.alive
          ? player.hp / player.maxHp
          : 0;

        if (player.alive) analysis.asWarlock.survived++;
        if (game.winner === 'Evil') analysis.asWarlock.wins++;
      } else {
        analysis.asGood.count++;
        analysis.asGood.avgRounds += game.rounds;
        analysis.asGood.avgFinalHp += player.alive
          ? player.hp / player.maxHp
          : 0;

        if (player.alive) analysis.asGood.survived++;
        if (game.winner === 'Good') analysis.asGood.wins++;
      }

      // Analyze team synergy
      const teamClasses = game.players.map((p) => p.class);
      const hasTank =
        teamClasses.includes('Warrior') || teamClasses.includes('Priest');
      const hasHealer =
        teamClasses.includes('Priest') || teamClasses.includes('Shaman');
      const hasDetection = teamClasses.includes('Oracle');
      const raceCount = new Set(game.players.map((p) => p.race)).size;

      if (hasTank) {
        analysis.teamSynergy.withTanks.games++;
        if (playerWon) analysis.teamSynergy.withTanks.wins++;
      }

      if (hasHealer) {
        analysis.teamSynergy.withHealer.games++;
        if (playerWon) analysis.teamSynergy.withHealer.wins++;
      }

      if (hasDetection) {
        analysis.teamSynergy.withDetection.games++;
        if (playerWon) analysis.teamSynergy.withDetection.wins++;
      }

      if (raceCount >= 5) {
        analysis.teamSynergy.diverse.games++;
        if (playerWon) analysis.teamSynergy.diverse.wins++;
      }
    }
  }

  // Calculate averages
  if (analysis.asWarlock.count > 0) {
    analysis.asWarlock.avgRounds /= analysis.asWarlock.count;
    analysis.asWarlock.avgFinalHp /= analysis.asWarlock.count;
    analysis.asWarlock.winRate =
      (analysis.asWarlock.wins / analysis.asWarlock.count) * 100;
    analysis.asWarlock.survivalRate =
      (analysis.asWarlock.survived / analysis.asWarlock.count) * 100;
  }

  if (analysis.asGood.count > 0) {
    analysis.asGood.avgRounds /= analysis.asGood.count;
    analysis.asGood.avgFinalHp /= analysis.asGood.count;
    analysis.asGood.winRate =
      (analysis.asGood.wins / analysis.asGood.count) * 100;
    analysis.asGood.survivalRate =
      (analysis.asGood.survived / analysis.asGood.count) * 100;
  }

  // Calculate performance by game length
  for (const category of Object.values(analysis.performanceByGameLength)) {
    if (category.games > 0) {
      category.avgPerformance = (category.performance / category.games) * 100;
    }
  }

  // Calculate team synergy rates
  for (const synergy of Object.values(analysis.teamSynergy)) {
    if (synergy.games > 0) {
      synergy.winRate = (synergy.wins / synergy.games) * 100;
    }
  }

  return analysis;
}

/**
 * Analyze team diversity effects
 */
function analyzeTeamDiversity(games) {
  const analysis = {
    totalGames: games.length,
    diversityEffects: {
      lowDiversity: { games: 0, goodWins: 0, avgRounds: 0, avgSurvivors: 0 }, // 2-3 races
      mediumDiversity: { games: 0, goodWins: 0, avgRounds: 0, avgSurvivors: 0 }, // 4-5 races
      highDiversity: { games: 0, goodWins: 0, avgRounds: 0, avgSurvivors: 0 }, // 6 races
    },
    raceInteractions: {},
  };

  for (const game of games) {
    const uniqueRaces = new Set(game.players.map((p) => p.race)).size;
    let diversityLevel;

    if (uniqueRaces <= 3) diversityLevel = 'lowDiversity';
    else if (uniqueRaces <= 5) diversityLevel = 'mediumDiversity';
    else diversityLevel = 'highDiversity';

    const diversity = analysis.diversityEffects[diversityLevel];
    diversity.games++;
    diversity.avgRounds += game.rounds;
    diversity.avgSurvivors += game.survivors;

    if (game.winner === 'Good') diversity.goodWins++;
  }

  // Calculate averages
  for (const diversity of Object.values(analysis.diversityEffects)) {
    if (diversity.games > 0) {
      diversity.avgRounds /= diversity.games;
      diversity.avgSurvivors /= diversity.games;
      diversity.goodWinRate = (diversity.goodWins / diversity.games) * 100;
    }
  }

  return analysis;
}

/**
 * Print comprehensive race analysis results
 */
function printRaceAnalysis(results) {
  console.log('\n' + '='.repeat(70));
  console.log('🧬 COMPREHENSIVE RACE ANALYSIS RESULTS');
  console.log('='.repeat(70));

  const { individualRaces, mixedTeams } = results;

  // Individual race performance
  console.log('\n📊 INDIVIDUAL RACE DEEP ANALYSIS');
  console.log('-'.repeat(50));

  for (const [race, analysis] of Object.entries(individualRaces)) {
    console.log(`\n🔬 ${race.toUpperCase()} ANALYSIS:`);
    console.log(
      `  Sample: ${analysis.raceInstances} instances across ${analysis.totalGames} games`
    );

    if (analysis.asWarlock.count > 0) {
      console.log(
        `  As Warlock: ${analysis.asWarlock.winRate.toFixed(
          1
        )}% win, ${analysis.asWarlock.survivalRate.toFixed(1)}% survival`
      );
      console.log(
        `    Avg game length: ${analysis.asWarlock.avgRounds.toFixed(1)} rounds`
      );
      console.log(
        `    Avg final HP: ${(analysis.asWarlock.avgFinalHp * 100).toFixed(1)}%`
      );
    }

    if (analysis.asGood.count > 0) {
      console.log(
        `  As Good: ${analysis.asGood.winRate.toFixed(
          1
        )}% win, ${analysis.asGood.survivalRate.toFixed(1)}% survival`
      );
      console.log(
        `    Avg game length: ${analysis.asGood.avgRounds.toFixed(1)} rounds`
      );
      console.log(
        `    Avg final HP: ${(analysis.asGood.avgFinalHp * 100).toFixed(1)}%`
      );
    }

    // Performance by game length
    console.log(`  Performance by Game Length:`);
    for (const [length, data] of Object.entries(
      analysis.performanceByGameLength
    )) {
      if (data.games > 0) {
        console.log(
          `    ${length}: ${data.avgPerformance.toFixed(1)}% (${
            data.games
          } games)`
        );
      }
    }

    // Team synergy
    console.log(`  Team Synergy:`);
    for (const [synergyType, data] of Object.entries(analysis.teamSynergy)) {
      if (data.games > 0) {
        console.log(
          `    With ${synergyType}: ${data.winRate.toFixed(1)}% win rate (${
            data.games
          } games)`
        );
      }
    }
  }

  // Mixed team analysis
  if (mixedTeams) {
    console.log('\n🤝 TEAM DIVERSITY ANALYSIS');
    console.log('-'.repeat(40));

    for (const [diversityLevel, data] of Object.entries(
      mixedTeams.diversityEffects
    )) {
      if (data.games > 0) {
        console.log(
          `${diversityLevel}: ${data.goodWinRate.toFixed(
            1
          )}% Good wins, ${data.avgRounds.toFixed(
            1
          )} avg rounds, ${data.avgSurvivors.toFixed(1)} survivors`
        );
      }
    }
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Run the class/race performance test
 * @param {number} numGames - Number of games to test
 * @returns {Promise<Object>} Results for classes and races
 */
async function runClassRacePerformanceTest(numGames = 20) {
  console.log('\n🕹️ CLASS & RACE PERFORMANCE TEST');
  console.log('='.repeat(50));

  const classResults = {};
  const raceResults = {};

  // Test a handful of classes
  const classesToTest = ['Warrior', 'Pyromancer', 'Wizard', 'Assassin'];
  for (const cls of classesToTest) {
    console.log(`\n🧪 Testing class: ${cls}...`);

    const games = [];
    for (let i = 0; i < Math.min(8, numGames); i++) {
      const result = await runClassFocusedGame(cls);
      games.push(result);
    }

    classResults[cls] = calculateClassPerformance(games, cls);
  }

  // Test a handful of races
  const racesToTest = ['Artisan', 'Rockhewn', 'Crestfallen', 'Orc'];
  for (const race of racesToTest) {
    console.log(`\n🔬 Testing ${race}...`);

    const games = [];
    for (let i = 0; i < Math.min(8, numGames); i++) {
      const result = await runRaceFocusedGame(race);
      games.push(result);
    }

    raceResults[race] = calculateRacePerformance(games, race);
  }

  return { classResults, raceResults };
}

/**
 * Run a game focused on testing a specific class
 */
async function runClassFocusedGame(targetClass) {
  const players = generateRandomPlayers(5);

  // Ensure at least one player has the target class
  players[0].class = targetClass;

  const game = new StrategicGameRoom(`CLASS_${targetClass}_${Date.now()}`);

  for (const player of players) {
    game.addStrategicPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(35);
}

/**
 * Run a game focused on testing a specific race
 */
async function runRaceFocusedGame(targetRace) {
  const players = generateRandomPlayers(5);

  // Ensure at least one player has the target race
  players[0].race = targetRace;

  const game = new StrategicGameRoom(`RACE_${targetRace}_${Date.now()}`);

  for (const player of players) {
    game.addStrategicPlayer(player.name, player.race, player.class);
  }

  return await game.runSimulation(35);
}

/**
 * Calculate performance metrics for a specific class
 */
function calculateClassPerformance(games, className) {
  let totalPlayers = 0;
  let wins = 0;
  let survivals = 0;
  let gamesWithClass = 0;

  for (const game of games) {
    const classPlayers = game.players.filter((p) => p.class === className);
    if (classPlayers.length === 0) continue;

    gamesWithClass++;
    totalPlayers += classPlayers.length;

    for (const player of classPlayers) {
      if (player.alive) survivals++;

      const playerWon =
        (game.winner === 'Good' && !player.isWarlock) ||
        (game.winner === 'Evil' && player.isWarlock);
      if (playerWon) wins++;
    }
  }

  return {
    className,
    gamesPlayed: gamesWithClass,
    totalInstances: totalPlayers,
    winRate: totalPlayers > 0 ? (wins / totalPlayers) * 100 : 0,
    survivalRate: totalPlayers > 0 ? (survivals / totalPlayers) * 100 : 0,
    avgPerformance:
      totalPlayers > 0 ? ((wins + survivals) / (totalPlayers * 2)) * 100 : 0,
  };
}

/**
 * Calculate performance metrics for a specific race
 */
function calculateRacePerformance(games, race) {
  let totalPlayers = 0;
  let wins = 0;
  let survivals = 0;
  let gamesWithRace = 0;

  for (const game of games) {
    const racePlayers = game.players.filter((p) => p.race === race);
    if (racePlayers.length === 0) continue;

    gamesWithRace++;
    totalPlayers += racePlayers.length;

    for (const player of racePlayers) {
      if (player.alive) survivals++;

      const playerWon =
        (game.winner === 'Good' && !player.isWarlock) ||
        (game.winner === 'Evil' && player.isWarlock);
      if (playerWon) wins++;
    }
  }

  return {
    race,
    gamesPlayed: gamesWithRace,
    totalInstances: totalPlayers,
    winRate: totalPlayers > 0 ? (wins / totalPlayers) * 100 : 0,
    survivalRate: totalPlayers > 0 ? (survivals / totalPlayers) * 100 : 0,
    avgPerformance:
      totalPlayers > 0 ? ((wins + survivals) / (totalPlayers * 2)) * 100 : 0,
  };
}

/**
 * Main test execution
 */
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'comparison';
  const numGames = parseInt(args[1]) || 20;

  console.log('🎮 Warlock Strategy Analysis Tool');
  console.log('='.repeat(40));

  try {
    const startTime = Date.now();

    if (testType === 'comparison') {
      const results = await runComparisonTest(numGames);
      printComparisonResults(results);
    } else if (testType === 'performance') {
      const results = await runClassRacePerformanceTest(numGames);
      console.log('\n📊 Class/Race Performance Results');
      console.log(JSON.stringify(results, null, 2));
    } else if (testType === 'race' || testType === 'races') {
      const results = await runRaceAnalysis(numGames);
      printRaceAnalysis(results);
    } else {
      console.log(
        'Usage: node test-strategies.js [comparison|performance|race] [num_games]'
      );
      console.log('');
      console.log('Commands:');
      console.log(
        '  comparison  - Compare Random vs Strategic vs Hybrid AI (default)'
      );
      console.log('  performance - Test individual class and race strategies');
      console.log(
        '  race        - Deep analysis of race performance and synergies'
      );
      console.log('');
      console.log('Examples:');
      console.log('  node test-strategies.js comparison 30');
      console.log('  node test-strategies.js race 50');
      process.exit(1);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`\n⏱️ Analysis completed in ${duration.toFixed(2)} seconds`);
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  StrategicGameRoom,
  HybridGameRoom,
  runComparisonTest,
  runClassRacePerformanceTest,
  runRaceAnalysis,
  printComparisonResults,
  printRaceAnalysis,
  analyzeRaceInsights,
  analyzeTeamInsights,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
