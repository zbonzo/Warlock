/**
 * @fileoverview Enhanced simulation entry point with random game support
 * Supports both fixed 6-player games and random compositions
 */

const path = require('path');
const moduleAlias = require('module-alias');

process.env.LOG_LEVEL = 'ERROR';

// Set up module aliases to match server configuration
moduleAlias.addAliases({
  '@config': path.resolve(__dirname, '../server/config'),
  '@controllers': path.resolve(__dirname, '../server/controllers'),
  '@middleware': path.resolve(__dirname, '../server/middleware'),
  '@models': path.resolve(__dirname, '../server/models'),
  '@services': path.resolve(__dirname, '../server/services'),
  '@utils': path.resolve(__dirname, '../server/utils'),
  '@shared': path.resolve(__dirname, '../server/shared'),
  '@messages': path.resolve(__dirname, '../server/config/messages'),
});

// Import simulation modules
const { runMultipleGames, printResults } = require('./runner');
const {
  runRandomGameBatch,
  printRandomGameResults,
  getCombinationStats,
  getAllValidCombinations,
} = require('./random-game-generator');

/**
 * Print usage information
 */
function printUsage() {
  console.log('Warlock Game Simulator');
  console.log('======================');
  console.log('');
  console.log('Usage:');
  console.log('  node index.js [mode] [number_of_games] [options]');
  console.log('');
  console.log('Modes:');
  console.log('  fixed   - Run fixed 6-player setup (default)');
  console.log('  random  - Run random race/class combinations');
  console.log('  stats   - Show valid race/class combination statistics');
  console.log('');
  console.log('Examples:');
  console.log('  node index.js fixed 10     # 10 fixed games');
  console.log('  node index.js random 50    # 50 random games');
  console.log('  node index.js stats        # Show combination stats');
  console.log('  node index.js              # 10 fixed games (default)');
  console.log('');
}

/**
 * Print combination statistics
 */
function printCombinationStats() {
  console.log('Valid Race/Class Combination Statistics');
  console.log('========================================');

  const stats = getCombinationStats();
  const validCombos = getAllValidCombinations();

  console.log(`\nTotal Valid Combinations: ${stats.totalCombinations}`);

  console.log('\nBy Category:');
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} combinations`);
  });

  console.log('\nBy Race:');
  Object.entries(stats.byRace).forEach(([race, count]) => {
    console.log(`  ${race}: ${count} combinations`);
  });

  console.log('\nBy Class:');
  Object.entries(stats.byClass).forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count} combinations`);
  });

  console.log('\nSample Valid Combinations (first 20):');
  validCombos.slice(0, 20).forEach((combo, i) => {
    console.log(`  ${i + 1}. ${combo.race} ${combo.class}`);
  });

  if (validCombos.length > 20) {
    console.log(`  ... and ${validCombos.length - 20} more`);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let mode = 'fixed';
  let numGames = 10;

  if (args.length === 0) {
    // Default: 10 fixed games
  } else if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  } else if (args[0] === 'stats') {
    printCombinationStats();
    return;
  } else if (['fixed', 'random'].includes(args[0])) {
    mode = args[0];
    if (args[1]) {
      numGames = parseInt(args[1]);
      if (isNaN(numGames) || numGames < 1) {
        console.error('Error: Number of games must be a positive integer');
        printUsage();
        process.exit(1);
      }
    }
  } else {
    // First argument is number of games (fixed mode)
    numGames = parseInt(args[0]);
    if (isNaN(numGames) || numGames < 1) {
      console.error('Error: Invalid arguments');
      printUsage();
      process.exit(1);
    }
  }

  console.log('Warlock Game Simulator');
  console.log('======================');

  if (mode === 'fixed') {
    console.log('Fixed 6-Player Test Configuration:');
    console.log('  Human Alchemist, Dwarf Oracle, Elf Wizard');
    console.log('  Orc Druid, Satyr Shaman, Skeleton Assassin');
  } else {
    console.log('Random Game Configuration:');
    console.log('  Variable player counts (3-8 players)');
    console.log('  All valid race/class combinations');
    console.log('  Balanced category representation');
  }
  console.log('');

  try {
    const startTime = Date.now();
    let results;

    if (mode === 'fixed') {
      results = await runMultipleGames(numGames);
      printResults(results);
    } else {
      // Random mode with options
      const options = {
        minPlayers: 10,
        maxPlayers: 10,
        maxRounds: 500,
        gameOptions: {
          preferBalancedSetup: false,
          allowDuplicateNames: false,
        },
      };

      results = await runRandomGameBatch(numGames, options);
      printRandomGameResults(results);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\nSimulation completed in ${duration.toFixed(2)} seconds`);
    console.log(
      `Average game time: ${(duration / results.completedGames).toFixed(
        3
      )} seconds`
    );

    // Show balance summary
    const goodWinRate =
      (results.stats.winners.Good / results.completedGames) * 100;
    const evilWinRate =
      (results.stats.winners.Evil / results.completedGames) * 100;

    console.log('\nBALANCE SUMMARY:');
    console.log(
      `  Good vs Evil: ${goodWinRate.toFixed(1)}% vs ${evilWinRate.toFixed(1)}%`
    );

    const balanceScore = Math.abs(50 - goodWinRate);
    let balanceRating;
    if (balanceScore < 5) balanceRating = 'Excellent';
    else if (balanceScore < 10) balanceRating = 'Good';
    else if (balanceScore < 15) balanceRating = 'Fair';
    else balanceRating = 'Poor';

    console.log(
      `  Balance Rating: ${balanceRating} (${balanceScore.toFixed(
        1
      )}% deviation from 50/50)`
    );

    if (mode === 'random') {
      console.log('\nTo run fixed games: node index.js fixed [number]');
      console.log('To see combination stats: node index.js stats');
    } else {
      console.log('\nTo run random games: node index.js random [number]');
      console.log('To see combination stats: node index.js stats');
    }
  } catch (error) {
    console.error('Simulation failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Export for testing
module.exports = { main };

// Run the simulation
if (require.main === module) {
  main().catch(console.error);
}
