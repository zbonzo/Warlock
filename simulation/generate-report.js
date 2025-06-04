#!/usr/bin/env node
/**
 * @fileoverview CLI script for generating comprehensive game balance reports
 * Usage: node generate-report.js [options]
 */

const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import simulation and reporting modules
const ReportGenerator = require('./reporting/report-generator');

// Import simulation runners based on available modes
let simulationRunners = {};

try {
  const { runMultipleGames } = require('./runner');
  simulationRunners.fixed = runMultipleGames;
} catch (e) {
  console.warn('Fixed game runner not available');
}

try {
  const { runRandomGameBatch } = require('./random-game-generator');
  simulationRunners.random = runRandomGameBatch;
} catch (e) {
  console.warn('Random game runner not available');
}

try {
  const { runThematicGameBatch } = require('./enhanced-simulation-runner');
  simulationRunners.thematic = runThematicGameBatch;
} catch (e) {
  console.warn('Thematic AI runner not available');
}

try {
  const { runComparisonTest } = require('./test-strategies');
  simulationRunners.comparison = runComparisonTest;
} catch (e) {
  console.warn('Strategy comparison runner not available');
}

/**
 * Parse command line arguments
 * @param {Array} args - Command line arguments
 * @returns {Object} Parsed configuration
 */
function parseArguments(args) {
  const config = {
    mode: 'fixed',
    games: 50,
    focus: null,
    compareAI: false,
    classes: null,
    races: null,
    output: null,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        config.help = true;
        break;

      case '--games':
      case '-g':
        config.games = parseInt(args[++i]) || 50;
        break;

      case '--mode':
      case '-m':
        config.mode = args[++i] || 'fixed';
        break;

      case '--focus':
      case '-f':
        config.focus = args[++i];
        break;

      case '--compare-ai':
        config.compareAI = true;
        break;

      case '--classes':
        config.classes = args[++i]?.split(',');
        break;

      case '--races':
        config.races = args[++i]?.split(',');
        break;

      case '--output':
      case '-o':
        config.output = args[++i];
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      default:
        // Handle positional arguments
        if (!isNaN(parseInt(arg))) {
          config.games = parseInt(arg);
        } else if (
          ['fixed', 'random', 'thematic', 'comparison'].includes(arg)
        ) {
          config.mode = arg;
        }
        break;
    }
  }

  return config;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Warlock Game Balance Report Generator
====================================

Generate comprehensive HTML reports with interactive visualizations and detailed
balance analysis from game simulations.

USAGE:
  node generate-report.js [options]

OPTIONS:
  --games, -g <number>     Number of games to simulate (default: 50)
  --mode, -m <mode>        Simulation mode (default: fixed)
  --focus, -f <focus>      Analysis focus area
  --compare-ai             Compare different AI strategies
  --classes <list>         Comma-separated list of classes to focus on
  --races <list>           Comma-separated list of races to focus on
  --output, -o <file>      Output file path (auto-generated if not specified)
  --verbose, -v            Verbose output during generation
  --help, -h               Show this help message

SIMULATION MODES:
  fixed                    Run fixed 6-player configuration
  random                   Run random race/class combinations  
  thematic                 Run with enhanced thematic AI strategies
  comparison               Compare multiple AI strategies

FOCUS AREAS:
  races                    Deep analysis of race balance and performance
  classes                  Detailed class performance and role analysis
  abilities                Ability usage and effectiveness analysis
  balance                  Overall game balance assessment
  warlocks                 Warlock mechanics and corruption analysis

EXAMPLES:
  # Generate report from 50 thematic AI games
  node generate-report.js --mode thematic --games 50

  # Focus on race balance with random compositions
  node generate-report.js --mode random --focus races --games 100

  # Compare AI strategies with detailed analysis
  node generate-report.js --compare-ai --games 30

  # Analyze specific classes with verbose output
  node generate-report.js --classes Warrior,Pyromancer,Oracle --verbose

  # Generate report for specific races
  node generate-report.js --races Artisan,Rockhewn,Lich --games 75

OUTPUT:
  • Generates self-contained HTML report with embedded CSS/JS
  • Interactive charts using Chart.js
  • Exportable data in CSV/JSON formats
  • Mobile-responsive design
  • Print-friendly layouts

REPORT FEATURES:
  📊 Executive Summary        High-level balance overview and key metrics
  ⚖️ Balance Analysis         Win rates, confidence intervals, statistical tests
  🔥 Ability Performance      Damage, healing, and utility effectiveness
  🧬 Race Analysis            Racial ability impact and synergy analysis  
  ⚔️ Class Analysis           Role effectiveness and tier rankings
  🎮 Game Flow Analysis       Round progression and timing patterns
  👹 Warlock Analysis         Corruption mechanics and Evil team performance
  💡 Recommendations          Data-driven balance suggestions with priorities
  📈 Statistical Details      Sample sizes, confidence levels, significance tests
  💾 Raw Data Export          Full dataset export in multiple formats

The generated report includes interactive visualizations, expandable sections,
and comprehensive statistical analysis to help identify balance issues and
guide development decisions.
`);
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 * @returns {boolean} Whether configuration is valid
 */
function validateConfig(config) {
  if (config.games < 1 || config.games > 1000) {
    console.error('Error: Number of games must be between 1 and 1000');
    return false;
  }

  if (!simulationRunners[config.mode]) {
    console.error(`Error: Simulation mode '${config.mode}' is not available`);
    console.error(
      'Available modes:',
      Object.keys(simulationRunners).join(', ')
    );
    return false;
  }

  return true;
}

/**
 * Run simulations based on configuration
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Simulation results
 */
async function runSimulations(config) {
  const startTime = performance.now();

  console.log(`\n🎮 Starting ${config.mode} simulation...`);
  console.log(`📊 Target: ${config.games} games`);
  if (config.focus) console.log(`🔍 Focus: ${config.focus}`);
  if (config.classes) console.log(`⚔️ Classes: ${config.classes.join(', ')}`);
  if (config.races) console.log(`🧬 Races: ${config.races.join(', ')}`);
  console.log('');

  let results;
  const options = {
    maxRounds: 50,
    focus: config.focus,
    classes: config.classes,
    races: config.races,
    verbose: config.verbose,
  };

  try {
    switch (config.mode) {
      case 'fixed':
        results = await simulationRunners.fixed(config.games);
        break;

      case 'random':
        const randomOptions = {
          minPlayers: 3,
          maxPlayers: 8,
          maxRounds: 50,
          gameOptions: {
            preferBalancedSetup: true,
            allowDuplicateNames: false,
          },
        };
        results = await simulationRunners.random(config.games, randomOptions);
        break;

      case 'thematic':
        results = await simulationRunners.thematic(config.games, {
          maxRounds: 50,
          playerConfigs: generatePlayerConfigs(config),
        });
        break;

      case 'comparison':
        results = await simulationRunners.comparison(config.games);
        // For comparison mode, we'll use the thematic results
        if (results.thematic) {
          results = results.thematic;
        }
        break;

      default:
        throw new Error(`Unknown simulation mode: ${config.mode}`);
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n✅ Simulation completed in ${duration.toFixed(2)} seconds`);
    console.log(
      `📈 Analyzed ${
        results.completedGames || results.results?.length || 0
      } games`
    );

    return results;
  } catch (error) {
    console.error(`\n❌ Simulation failed: ${error.message}`);
    if (config.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * Generate player configurations based on config
 * @param {Object} config - Configuration object
 * @returns {Array} Player configurations
 */
function generatePlayerConfigs(config) {
  const defaultConfigs = [
    { name: 'HolyPriest', race: 'Artisan', class: 'Priest' },
    { name: 'WiseOracle', race: 'Kinfolk', class: 'Oracle' },
    { name: 'FuriousBarbarian', race: 'Orc', class: 'Barbarian' },
    { name: 'ShadowAssassin', race: 'Crestfallen', class: 'Assassin' },
    { name: 'NobleWarrior', race: 'Rockhewn', class: 'Warrior' },
    { name: 'BonePyromancer', race: 'Lich', class: 'Pyromancer' },
  ];

  if (!config.classes && !config.races) {
    return defaultConfigs;
  }

  // Filter or customize based on specific classes/races
  let configs = defaultConfigs;

  if (config.classes) {
    configs = configs.filter((c) => config.classes.includes(c.class));
    // Add more if needed
    config.classes.forEach((className) => {
      if (!configs.find((c) => c.class === className)) {
        configs.push({
          name: `Test${className}`,
          race: 'Artisan', // Default race
          class: className,
        });
      }
    });
  }

  if (config.races) {
    configs = configs.map((c) => ({
      ...c,
      race: config.races.includes(c.race) ? c.race : config.races[0],
    }));
  }

  return configs.slice(0, 8); // Limit to reasonable number
}

/**
 * Process simulation results into report format
 * @param {Object} simulationResults - Raw simulation results
 * @param {Object} config - Configuration object
 * @returns {Array} Processed results for analysis
 */
function processResults(simulationResults, config) {
  // Handle different result formats from different runners
  let results = [];

  if (simulationResults.results) {
    // Standard format from most runners
    results = simulationResults.results;
  } else if (Array.isArray(simulationResults)) {
    // Direct array of results
    results = simulationResults;
  } else if (simulationResults.games) {
    // Some runners wrap in games property
    results = simulationResults.games;
  } else {
    console.warn('Warning: Unexpected result format, attempting to process...');
    results = [simulationResults]; // Treat as single result
  }

  // Validate and clean results
  const validResults = results.filter(
    (result) => result && result.winner && result.rounds && result.rounds > 0
  );

  if (validResults.length !== results.length) {
    console.warn(
      `Warning: Filtered out ${
        results.length - validResults.length
      } invalid results`
    );
  }

  if (validResults.length === 0) {
    throw new Error('No valid simulation results to analyze');
  }

  if (config.verbose) {
    console.log(`\n📋 Processing ${validResults.length} valid results`);
    console.log(`   Winners: ${this.countWinners(validResults)}`);
    console.log(
      `   Avg rounds: ${this.calculateAverageRounds(validResults).toFixed(1)}`
    );
  }

  return validResults;
}

/**
 * Count winners in results
 * @param {Array} results - Simulation results
 * @returns {Object} Winner counts
 */
function countWinners(results) {
  const counts = { Good: 0, Evil: 0, Draw: 0 };
  results.forEach((result) => {
    if (counts.hasOwnProperty(result.winner)) {
      counts[result.winner]++;
    }
  });
  return `Good: ${counts.Good}, Evil: ${counts.Evil}, Draw: ${counts.Draw}`;
}

/**
 * Calculate average rounds
 * @param {Array} results - Simulation results
 * @returns {number} Average rounds
 */
function calculateAverageRounds(results) {
  if (results.length === 0) return 0;
  return (
    results.reduce((sum, result) => sum + (result.rounds || 0), 0) /
    results.length
  );
}

/**
 * Generate the report
 * @param {Array} results - Processed simulation results
 * @param {Object} config - Configuration object
 * @returns {Promise<string>} Report file path
 */
async function generateReport(results, config) {
  const startTime = performance.now();

  console.log('\n📝 Generating comprehensive report...');

  const reportGenerator = new ReportGenerator();

  const reportOptions = {
    gameType: config.mode,
    aiType: config.mode === 'thematic' ? 'strategic' : 'basic',
    focus: config.focus,
    classes: config.classes,
    races: config.races,
  };

  try {
    const { html, reportId, analysis } = await reportGenerator.generateReport(
      results,
      reportOptions
    );

    // Determine output path
    let outputPath;
    if (config.output) {
      outputPath = config.output;
      if (!outputPath.endsWith('.html')) {
        outputPath += '.html';
      }
    } else {
      outputPath = await reportGenerator.saveReport(html, reportId);
    }

    // Save the report if custom output path specified
    if (config.output && config.output !== outputPath) {
      await fs.promises.writeFile(config.output, html, 'utf8');
      outputPath = config.output;
      console.log(`Report saved to custom location: ${outputPath}`);
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(
      `\n✅ Report generated successfully in ${duration.toFixed(2)} seconds`
    );
    console.log(`📄 File: ${outputPath}`);
    console.log(
      `📊 Analysis: ${analysis.metadata.totalGames} games, ${analysis.balance.balanceRating} balance`
    );

    if (analysis.recommendations.priorityActions.length > 0) {
      console.log(
        `⚠️  ${analysis.recommendations.priorityActions.length} high-priority recommendations found`
      );
    }

    return outputPath;
  } catch (error) {
    console.error(`\n❌ Report generation failed: ${error.message}`);
    if (config.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * Print summary statistics
 * @param {Array} results - Simulation results
 * @param {Object} config - Configuration object
 */
function printSummary(results, config) {
  console.log('\n📈 SIMULATION SUMMARY');
  console.log('═'.repeat(50));

  const winCounts = { Good: 0, Evil: 0, Draw: 0 };
  let totalRounds = 0;
  let totalSurvivors = 0;

  results.forEach((result) => {
    if (winCounts.hasOwnProperty(result.winner)) {
      winCounts[result.winner]++;
    }
    totalRounds += result.rounds || 0;
    totalSurvivors += result.survivors || 0;
  });

  const totalGames = results.length;
  const goodWinRate = totalGames > 0 ? (winCounts.Good / totalGames) * 100 : 0;
  const evilWinRate = totalGames > 0 ? (winCounts.Evil / totalGames) * 100 : 0;
  const avgRounds = totalGames > 0 ? totalRounds / totalGames : 0;
  const avgSurvivors = totalGames > 0 ? totalSurvivors / totalGames : 0;

  console.log(`Mode: ${config.mode.toUpperCase()}`);
  console.log(`Games: ${totalGames}`);
  console.log(`Good Team: ${winCounts.Good} wins (${goodWinRate.toFixed(1)}%)`);
  console.log(`Evil Team: ${winCounts.Evil} wins (${evilWinRate.toFixed(1)}%)`);
  console.log(
    `Draws: ${winCounts.Draw} (${
      totalGames > 0 ? ((winCounts.Draw / totalGames) * 100).toFixed(1) : 0
    }%)`
  );
  console.log(`Avg Rounds: ${avgRounds.toFixed(1)}`);
  console.log(`Avg Survivors: ${avgSurvivors.toFixed(1)}`);

  // Balance assessment
  const balanceScore = Math.abs(50 - goodWinRate);
  let balanceRating;
  if (balanceScore < 5) balanceRating = 'Excellent';
  else if (balanceScore < 10) balanceRating = 'Good';
  else if (balanceScore < 15) balanceRating = 'Fair';
  else balanceRating = 'Poor';

  console.log(
    `Balance: ${balanceRating} (${balanceScore.toFixed(1)}% deviation)`
  );
  console.log('═'.repeat(50));
}

/**
 * Main execution function
 * @param {Array} args - Command line arguments
 */
async function main(args = []) {
  const config = parseArguments(args);

  if (config.help) {
    printUsage();
    return;
  }

  if (!validateConfig(config)) {
    process.exit(1);
  }

  console.log('🎯 Warlock Game Balance Report Generator');
  console.log('═'.repeat(50));

  try {
    // Run simulations
    const simulationResults = await runSimulations(config);

    // Process results
    const processedResults = processResults(simulationResults, config);

    // Print summary
    printSummary(processedResults, config);

    // Generate report
    const reportPath = await generateReport(processedResults, config);

    // Final success message
    console.log('\n🎉 SUCCESS!');
    console.log(`📋 Report ready: ${reportPath}`);
    console.log(
      '💡 Open the HTML file in your browser to view the interactive report'
    );

    if (process.platform === 'darwin') {
      console.log(`💻 Quick open: open "${reportPath}"`);
    } else if (process.platform === 'win32') {
      console.log(`💻 Quick open: start "${reportPath}"`);
    } else {
      console.log(`💻 Quick open: xdg-open "${reportPath}"`);
    }
  } catch (error) {
    console.error('\n💥 FAILED!');
    console.error(`Error: ${error.message}`);

    if (config.verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\n🔧 Troubleshooting:');
    console.error('  • Check that all simulation dependencies are installed');
    console.error('  • Verify the simulation mode is available');
    console.error(
      '  • Try reducing the number of games if memory issues occur'
    );
    console.error('  • Use --verbose flag for detailed error information');

    process.exit(1);
  }
}

/**
 * Enhanced main function with better error handling
 */
async function enhancedMain() {
  const args = process.argv.slice(2);

  // Handle special cases
  if (args.length === 0) {
    console.log('No arguments provided. Generating default report...\n');
    args.push('--games', '25', '--mode', 'fixed');
  }

  try {
    await main(args);
  } catch (error) {
    // Final error handler
    console.error('\n💀 CRITICAL ERROR');
    console.error('The report generator encountered an unrecoverable error.');
    console.error(
      'This may indicate a problem with the simulation system or dependencies.'
    );
    console.error('\nError details:', error.message);
    process.exit(2);
  }
}

// Export for testing and module use
module.exports = {
  main,
  parseArguments,
  validateConfig,
  runSimulations,
  generateReport,
  processResults,
  printSummary,
};

// CLI execution
if (require.main === module) {
  enhancedMain();
}
