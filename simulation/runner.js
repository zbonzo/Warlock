/**
 * @fileoverview Main simulation runner
 * Runs the 6-player test scenario and basic statistics
 */

const { SimulatedGameRoom } = require('./game-adapter');
const { createAIStrategy } = require('./ai/ai-player');

// Import analytics if available
let analyzer = null;
try {
  analyzer = require('./reporting/analyzer');
} catch (e) {
  // Analytics not available
}

/**
 * Run a single game simulation with the specified 6-player setup
 * @returns {Promise<Object>} Game result
 */
async function runSingleGame() {
  const game = new SimulatedGameRoom('TEST');

  // Add the 6 specified players
  const players = [
    { name: 'Warrior', race: 'Human', class: 'Warrior' },
    { name: 'Priest', race: 'Dwarf', class: 'Priest' },
    { name: 'Wizard', race: 'Elf', class: 'Wizard' },
    { name: 'Barbarian', race: 'Orc', class: 'Barbarian' },
    { name: 'Oracle', race: 'Satyr', class: 'Oracle' },
    { name: 'Pyromancer', race: 'Skeleton', class: 'Pyromancer' },
  ];

  // Add players to game
  for (const playerConfig of players) {
    const strategy = createAIStrategy(playerConfig.race, playerConfig.class);
    const success = game.addAIPlayer(
      playerConfig.name,
      playerConfig.race,
      playerConfig.class,
      strategy
    );

    if (!success) {
      throw new Error(`Failed to add player: ${playerConfig.name}`);
    }
  }

  // Run the simulation
  const result = await game.runSimulation(50);

  return {
    ...result,
    gameId: Date.now() + Math.random(), // Simple unique ID
    setup: players,
  };
}

/**
 * Run multiple games and collect statistics
 * @param {number} numGames - Number of games to run
 * @returns {Promise<Object>} Aggregated results
 */
async function runMultipleGames(numGames = 10) {
  console.log(`Running ${numGames} simulations...`);

  const results = [];
  const stats = {
    totalGames: numGames,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    averageLevel: 0,
    classWinRates: {},
    raceWinRates: {},
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      console.log(`Running game ${i + 1}/${numGames}...`);
      const result = await runSingleGame();
      results.push(result);

      // Debug: Show individual game results for first few games
      if (i < 3) {
        console.log(
          `  Game ${i + 1} Result: ${result.winner}, Rounds: ${result.rounds}`
        );
        if (result.gameSummary && result.gameSummary.players) {
          console.log(`  Players:`);
          result.gameSummary.players.forEach((p) => {
            console.log(
              `    ${p.name} (${p.race} ${p.class}): ${
                p.isWarlock ? 'WARLOCK' : 'HERO'
              } - ${p.alive ? 'ALIVE' : 'DEAD'}`
            );
          });
        }
      }

      // Update statistics
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;
      stats.averageLevel += result.finalLevel;

      // Track which classes/races were on winning side
      if (result.winner !== 'Draw') {
        const gameSummary =
          result.gameSummary || (await getDetailedGameSummary(result));
        if (gameSummary && gameSummary.players) {
          updateWinRates(
            stats,
            gameSummary,
            result.winner,
            gameSummary.players
          );
        }
      }
    } catch (error) {
      console.error(`Error in game ${i + 1}:`, error.message);
      stats.errors.push({
        game: i + 1,
        error: error.message,
      });
    }
  }

  // Calculate averages
  const completedGames = results.length;
  if (completedGames > 0) {
    stats.averageRounds /= completedGames;
    stats.averageSurvivors /= completedGames;
    stats.averageLevel /= completedGames;
  }

  // Calculate win rates as percentages
  Object.keys(stats.classWinRates).forEach((key) => {
    stats.classWinRates[key] = {
      wins: stats.classWinRates[key],
      rate:
        ((stats.classWinRates[key] / completedGames) * 100).toFixed(1) + '%',
    };
  });

  Object.keys(stats.raceWinRates).forEach((key) => {
    stats.raceWinRates[key] = {
      wins: stats.raceWinRates[key],
      rate: ((stats.raceWinRates[key] / completedGames) * 100).toFixed(1) + '%',
    };
  });

  return {
    results,
    stats,
    completedGames,
  };
}

/**
 * Get detailed game summary including player warlock status
 * @param {Object} result - Game result
 * @returns {Promise<Object>} Detailed game summary
 */
async function getDetailedGameSummary(result) {
  // The result should include the game summary from SimulatedGameRoom
  return (
    result.gameSummary || {
      winner: result.winner,
      survivors: result.survivors,
      rounds: result.rounds,
      level: result.finalLevel,
      players: [],
    }
  );
}

/**
 * Update win rate statistics - FIXED VERSION
 * @param {Object} stats - Statistics object to update
 * @param {Object} summary - Game summary
 * @param {string} winner - Winner (Good/Evil)
 * @param {Array} players - Array of player objects with warlock status
 */
function updateWinRates(stats, summary, winner, players) {
  players.forEach((player) => {
    // Initialize if not exists
    if (!stats.classWinRates[player.class]) {
      stats.classWinRates[player.class] = 0;
    }
    if (!stats.raceWinRates[player.race]) {
      stats.raceWinRates[player.race] = 0;
    }

    // Only credit wins based on actual team membership
    if (winner === 'Good' && !player.isWarlock) {
      // Good team won and this player was not a warlock
      stats.classWinRates[player.class]++;
      stats.raceWinRates[player.race]++;
    } else if (winner === 'Evil' && player.isWarlock) {
      // Evil team won and this player was a warlock
      stats.classWinRates[player.class]++;
      stats.raceWinRates[player.race]++;
    }
    // Draws don't count as wins for anyone
  });
}

/**
 * Print detailed results
 * @param {Object} aggregatedResults - Results from runMultipleGames
 */
function printResults(aggregatedResults) {
  const { stats, completedGames } = aggregatedResults;

  console.log('\n' + '='.repeat(50));
  console.log('WARLOCK SIMULATION RESULTS');
  console.log('='.repeat(50));

  console.log(`\nGames Completed: ${completedGames}/${stats.totalGames}`);
  if (stats.errors.length > 0) {
    console.log(`Errors: ${stats.errors.length}`);
  }

  console.log('\nWIN DISTRIBUTION:');
  console.log(
    `  Good (Heroes): ${stats.winners.Good} (${(
      (stats.winners.Good / completedGames) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `  Evil (Warlocks): ${stats.winners.Evil} (${(
      (stats.winners.Evil / completedGames) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `  Draws: ${stats.winners.Draw} (${(
      (stats.winners.Draw / completedGames) *
      100
    ).toFixed(1)}%)`
  );

  console.log('\nGAME METRICS:');
  console.log(`  Average Rounds: ${stats.averageRounds.toFixed(1)}`);
  console.log(`  Average Survivors: ${stats.averageSurvivors.toFixed(1)}`);
  console.log(`  Average Final Level: ${stats.averageLevel.toFixed(1)}`);

  console.log('\nCLASS PERFORMANCE:');
  Object.entries(stats.classWinRates).forEach(([className, data]) => {
    console.log(`  ${className}: ${data.wins} wins (${data.rate})`);
  });

  console.log('\nRACE PERFORMANCE:');
  Object.entries(stats.raceWinRates).forEach(([raceName, data]) => {
    console.log(`  ${raceName}: ${data.wins} wins (${data.rate})`);
  });

  // Add debugging info about warlock assignments
  console.log('\nDEBUG INFO:');
  console.log(
    `  Total class win entries: ${Object.keys(stats.classWinRates).length}`
  );
  console.log(
    `  Total race win entries: ${Object.keys(stats.raceWinRates).length}`
  );

  if (stats.errors.length > 0) {
    console.log('\nERRORS:');
    stats.errors.forEach((error) => {
      console.log(`  Game ${error.game}: ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(50));
}

/**
 * Main entry point - moved to index.js
 */
async function main() {
  const args = process.argv.slice(2);
  const numGames = args.length > 0 ? parseInt(args[0]) : 10;

  if (isNaN(numGames) || numGames < 1) {
    console.error('Usage: node runner.js [number_of_games]');
    console.error('Example: node runner.js 10');
    process.exit(1);
  }

  console.log('Warlock Game Simulator');
  console.log('======================');
  console.log('6-Player Test Configuration:');
  console.log('  Human Warrior, Dwarf Priest, Elf Wizard');
  console.log('  Orc Barbarian, Satyr Oracle, Skeleton Pyromancer');
  console.log('');

  try {
    const startTime = Date.now();
    const results = await runMultipleGames(numGames);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    printResults(results);

    console.log(`\nSimulation completed in ${duration.toFixed(2)} seconds`);
    console.log(
      `Average game time: ${(duration / results.completedGames).toFixed(
        3
      )} seconds`
    );
  } catch (error) {
    console.error('Simulation failed:', error);
    process.exit(1);
  }
}

// Export functions for use by index.js
module.exports = {
  runSingleGame,
  runMultipleGames,
  printResults,
  main,
};
