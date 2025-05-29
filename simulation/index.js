/**
 * @fileoverview Simulation entry point with module alias setup
 * Sets up module resolution for server dependencies
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

// Now require and run the simulation
const { runMultipleGames, printResults } = require('./runner');

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const numGames = args.length > 0 ? parseInt(args[0]) : 10;

  if (isNaN(numGames) || numGames < 1) {
    console.error('Usage: node index.js [number_of_games]');
    console.error('Example: node index.js 10');
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
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the simulation
main().catch(console.error);
