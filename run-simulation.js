
/**
 * @fileoverview Command line script to run the game balance simulation
 * 
 * Usage: node run-simulation.js [options]
 * 
 * Options:
 *   --games=N           Total number of games to simulate (default: 1000)
 *   --sizes=N,N,N       Player counts to test, comma separated (default: 4,6,8,10)
 *   --output=FILE       File to write results to (default: ./simulation-results.json)
 *   --poolSize=N        Number of players in the pool (default: 36)
 *   --maxRounds=N       Maximum rounds per game (default: 50)
 *   --verbose           Enable detailed logging (default: false)
 */

const { runAndReport } = require('./simulation');
const ConfigManager = require('./simulation/config');

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Game Balance Simulation Tool
---------------------------

This script runs automated simulations of the Warlock game to test balance
between different race and class combinations.

Usage: node run-simulation.js [options]

Options:
  --games=N           Total number of games to simulate (default: 1000)
  --sizes=N,N,N       Player counts to test, comma separated (default: 4,6,8,10)
  --output=FILE       File to write results to (default: ./simulation-results.json)
  --poolSize=N        Number of players in the pool (default: 36)
  --maxRounds=N       Maximum rounds per game (default: 50)
  --verbose           Enable detailed logging (default: false)
  --help, -h          Show this help message

Example:
  node run-simulation.js --games=2000 --sizes=4,6,8 --output=./results.json
  `);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Game Balance Simulation Tool');
    console.log('---------------------------');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      process.exit(0);
    }
    
    // Parse configuration
    const config = ConfigManager.parseCommandLineArgs(args);
    
    console.log(`Configuration:`);
    console.log(`- Total games: ${config.totalGames}`);
    console.log(`- Player counts: ${config.playerCounts.join(', ')}`);
    console.log(`- Games per player count: ${config.gamesPerPlayerCount}`);
    console.log(`- Player pool size: ${config.playerPoolSize}`);
    console.log(`- Output file: ${config.outputPath}`);
    console.log(`- Verbose mode: ${config.verbose ? 'Enabled' : 'Disabled'}`);
    console.log();
    
    // Run the simulation
    console.log('Starting simulation...');
    const results = await runAndReport(config);
    
    console.log('\nSimulation completed successfully!');
    console.log(`Detailed results saved to: ${config.outputPath}`);
    
  } catch (error) {
    console.error('Error running simulation:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);