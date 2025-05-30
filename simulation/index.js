/**
 * @fileoverview Enhanced simulation entry point with thematic AI support
 * Supports both fixed 6-player games and random compositions with social deduction
 */

const path = require('path');
const moduleAlias = require('module-alias');

// Set environment to reduce logging
process.env.LOG_LEVEL = 'INFO';

// Set up module aliases BEFORE any other imports
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

// Import simulation modules AFTER setting up aliases
const { runMultipleGames, printResults } = require('./runner');

// Only require thematic AI modules if the mode is thematic/detective/compare
let thematicModules = null;

function getThematicModules() {
  if (!thematicModules) {
    try {
      const {
        runThematicGameBatch,
        runDetectiveMode,
        runComparisonMode,
        printThematicGameResults,
        printDetectiveResults,
        printComparisonResults,
      } = require('./enhanced-simulation-runner');
      thematicModules = {
        runThematicGameBatch,
        runDetectiveMode,
        runComparisonMode,
        printThematicGameResults,
        printDetectiveResults,
        printComparisonResults,
      };
    } catch (error) {
      console.error('Failed to load thematic AI modules:', error.message);
      console.error(
        'Make sure thematic-ai-strategies.js and thematic-ai-integration.js are in the ai/ directory'
      );
      process.exit(1);
    }
  }
  return thematicModules;
}

/**
 * Print usage information with thematic AI options
 */
function printUsage() {
  console.log('Enhanced Warlock Game Simulator');
  console.log('==============================');
  console.log('');
  console.log('Usage:');
  console.log('  node index.js [mode] [number_of_games] [options]');
  console.log('');
  console.log('Modes:');
  console.log(
    '  fixed      - Run fixed 6-player setup with basic AI (default)'
  );
  console.log(
    '  random     - Run random race/class combinations with basic AI'
  );
  console.log('  thematic   - Run games with enhanced thematic AI strategies');
  console.log(
    '  detective  - Run thematic AI with detailed social deduction analysis'
  );
  console.log('  compare    - Compare basic vs thematic AI performance');
  console.log('  stats      - Show valid race/class combination statistics');
  console.log('');
  console.log('Examples:');
  console.log('  node index.js thematic 50     # 50 games with thematic AI');
  console.log(
    '  node index.js detective 20    # 20 games with detailed AI analysis'
  );
  console.log('  node index.js compare 100     # Compare AI strategies');
  console.log('  node index.js fixed 10        # 10 fixed games, basic AI');
  console.log('');
  console.log('Thematic AI Features:');
  console.log('  • Social deduction and warlock detection');
  console.log('  • Reputation management and lying');
  console.log('  • Class-specific strategies and behaviors');
  console.log('  • Dynamic suspicion tracking');
  console.log('  • Enhanced decision making');
  console.log('');
}

/**
 * Print combination statistics
 */
function printCombinationStats() {
  try {
    const {
      getCombinationStats,
      getAllValidCombinations,
    } = require('./random-game-generator');

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
  } catch (error) {
    console.error('Failed to load random game generator:', error.message);
  }
}

/**
 * Enhanced main function
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
  } else if (
    ['fixed', 'random', 'thematic', 'detective', 'compare'].includes(args[0])
  ) {
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

  console.log('Enhanced Warlock Game Simulator');
  console.log('==============================');

  // Mode-specific descriptions
  if (mode === 'fixed') {
    console.log('Fixed 6-Player Configuration (Basic AI):');
    console.log('  Human Warrior, Dwarf Priest, Elf Wizard');
    console.log('  Orc Barbarian, Satyr Oracle, Skeleton Pyromancer');
    console.log('  Using generic balanced AI strategies');
  } else if (mode === 'random') {
    console.log('Random Game Configuration (Basic AI):');
    console.log('  Variable player counts (3-8 players)');
    console.log('  All valid race/class combinations');
    console.log('  Using generic balanced AI strategies');
  } else if (mode === 'thematic') {
    console.log('Thematic AI Configuration:');
    console.log('  Enhanced AI with social deduction capabilities');
    console.log('  • Priests excel at healing and warlock detection');
    console.log('  • Oracles master information gathering and sanctuary');
    console.log('  • Barbarians focus on monster combat for self-healing');
    console.log('  • Assassins use stealth and precision targeting');
    console.log('  • Trackers use monster control against confirmed warlocks');
    console.log('  • All classes manage reputation and suspicion dynamically');
  } else if (mode === 'detective') {
    console.log('Detective Mode Configuration:');
    console.log('  Thematic AI with detailed social deduction analysis');
    console.log('  • Tracks suspicion accuracy and detection patterns');
    console.log('  • Analyzes reputation management effectiveness');
    console.log('  • Provides AI improvement recommendations');
  } else if (mode === 'compare') {
    console.log('AI Comparison Mode:');
    console.log('  Direct comparison between basic and thematic AI');
    console.log('  • Measures strategic improvement');
    console.log('  • Analyzes social deduction effectiveness');
    console.log('  • Provides balance recommendations');
  }
  console.log('');

  try {
    const startTime = Date.now();
    let results;

    if (mode === 'fixed') {
      results = await runMultipleGames(numGames);
      printResults(results);
    } else if (mode === 'random') {
      const {
        runRandomGameBatch,
        printRandomGameResults,
      } = require('./random-game-generator');
      const options = {
        minPlayers: 3,
        maxPlayers: 8,
        maxRounds: 50,
        gameOptions: { preferBalancedSetup: true, allowDuplicateNames: false },
      };
      results = await runRandomGameBatch(numGames, options);
      printRandomGameResults(results);
    } else if (mode === 'thematic') {
      const thematic = getThematicModules();
      results = await thematic.runThematicGameBatch(numGames, {
        maxRounds: 50,
      });
      thematic.printThematicGameResults(results);
    } else if (mode === 'detective') {
      const thematic = getThematicModules();
      results = await thematic.runDetectiveMode(numGames, {
        maxRounds: 50,
      });
      thematic.printDetectiveResults(results);
    } else if (mode === 'compare') {
      const thematic = getThematicModules();
      results = await thematic.runComparisonMode(numGames);
      thematic.printComparisonResults(results);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\nSimulation completed in ${duration.toFixed(2)} seconds`);

    if (mode === 'compare') {
      console.log(
        `Average game time: ${(
          duration /
          (results.basic.completedGames + results.thematic.completedGames)
        ).toFixed(3)} seconds`
      );
    } else {
      console.log(
        `Average game time: ${(duration / results.completedGames).toFixed(
          3
        )} seconds`
      );
    }

    // Show balance summary for single-mode runs
    if (mode !== 'compare' && results.stats) {
      const goodWinRate =
        (results.stats.winners.Good / results.completedGames) * 100;
      const evilWinRate =
        (results.stats.winners.Evil / results.completedGames) * 100;

      console.log('\nBALANCE SUMMARY:');
      console.log(
        `  Good vs Evil: ${goodWinRate.toFixed(1)}% vs ${evilWinRate.toFixed(
          1
        )}%`
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

      // AI-specific insights
      if (mode === 'thematic' || mode === 'detective') {
        if (
          results.stats.suspicionAccuracy &&
          results.stats.suspicionAccuracy.total > 0
        ) {
          const accuracy = (
            (results.stats.suspicionAccuracy.correct /
              results.stats.suspicionAccuracy.total) *
            100
          ).toFixed(1);
          console.log(`  AI Detection Accuracy: ${accuracy}%`);
        }
        if (results.stats.detectionAttempts !== undefined) {
          console.log(
            `  AI Made ${results.stats.detectionAttempts} detection attempts`
          );
        }
      }
    }

    // Mode-specific suggestions
    if (mode === 'fixed' || mode === 'random') {
      console.log('\nTry enhanced AI modes:');
      console.log('  node index.js thematic [number]   # Social deduction AI');
      console.log('  node index.js detective [number]  # Detailed AI analysis');
      console.log(
        '  node index.js compare [number]    # Compare AI strategies'
      );
    } else if (mode === 'thematic') {
      console.log('\nExplore more AI options:');
      console.log('  node index.js detective [number]  # Detailed analysis');
      console.log(
        '  node index.js compare [number]    # Compare with basic AI'
      );
    } else if (mode === 'detective') {
      console.log('\nTry other modes:');
      console.log('  node index.js thematic [number]   # Run thematic AI');
      console.log('  node index.js compare [number]    # Compare strategies');
    }
  } catch (error) {
    console.error('Simulation failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Export for testing and integration
module.exports = { main };

// Run the simulation if this is the main module
if (require.main === module) {
  main().catch(console.error);
}
