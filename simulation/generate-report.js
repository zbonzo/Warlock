#!/usr/bin/env node
/**
 * @fileoverview Simplified CLI script for generating CSV game balance reports
 * Usage: node generate-report.js [options]
 */

const path = require('path');
const { performance } = require('perf_hooks');

// Import our new modular components
const DataCollector = require('./reporting/data-collector');
const CSVExporter = require('./reporting/csv-exporter');
const DataAnalyzer = require('./reporting/data-analyzer');

// Import simulation runners
let simulationRunners = {};

try {
  const { runMultipleGames } = require('./runner');
  simulationRunners.fixed = runMultipleGames;
} catch (e) {
  console.warn('⚠️  Fixed game runner not available');
}

try {
  const { runRandomGameBatch } = require('./random-game-generator');
  simulationRunners.random = runRandomGameBatch;
} catch (e) {
  console.warn('⚠️  Random game runner not available');
}

try {
  const { runThematicGameBatch } = require('./enhanced-simulation-runner');
  simulationRunners.thematic = runThematicGameBatch;
} catch (e) {
  console.warn('⚠️  Thematic AI runner not available');
}

try {
  const { runComparisonTest } = require('./test-strategies');
  simulationRunners.comparison = runComparisonTest;
} catch (e) {
  console.warn('⚠️  Strategy comparison runner not available');
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
    output: null,
    verbose: false,
    help: false,
    exportAll: true,
    reportsDir: './web-interface/reports',
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

      case '--output':
      case '-o':
        config.output = args[++i];
        break;

      case '--reports-dir':
        config.reportsDir = args[++i];
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--no-export-all':
        config.exportAll = false;
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
🎮 Warlock Game Balance Report Generator (CSV Output)
====================================================

Generate CSV-based game balance reports for web interface viewing.

USAGE:
  node generate-report.js [options]

OPTIONS:
  --games, -g <number>     Number of games to simulate (default: 50)
  --mode, -m <mode>        Simulation mode (default: fixed)
  --focus, -f <focus>      Analysis focus area (balance, races, classes, etc.)
  --output, -o <file>      Custom output filename (without extension)
  --reports-dir <dir>      Reports directory (default: ./reports)
  --verbose, -v            Verbose output during generation
  --no-export-all          Only export focused analysis (not all report types)
  --help, -h               Show this help message

SIMULATION MODES:
  fixed                    Fixed 6-player configuration for baseline testing
  random                   Random race/class combinations for broad analysis
  thematic                 Enhanced AI strategies for realistic gameplay
  comparison               Compare multiple AI strategies

FOCUS AREAS:
  balance                  Overall game balance assessment
  races                    Race performance and synergy analysis
  classes                  Class effectiveness and role analysis
  gameflow                 Game length and progression patterns
  recommendations          Balance suggestions and priority fixes
  all                      Generate all report types (default)

EXAMPLES:
  # Generate comprehensive analysis from 50 thematic AI games
  node generate-report.js --mode thematic --games 50

  # Focus on race balance with random compositions
  node generate-report.js --mode random --focus races --games 100

  # Generate all reports from comparison test
  node generate-report.js --mode comparison --games 30 --verbose

  # Quick balance check
  node generate-report.js --focus balance --games 25

OUTPUT:
  • CSV files generated in reports/ directory
  • Timestamped filenames for version tracking
  • Auto-updated reports-index.json for web interface
  • Compatible with static HTML viewer

WEB INTERFACE:
  Open web-interface/index.html in your browser to view reports interactively.
`);
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 * @returns {boolean} Whether configuration is valid
 */
function validateConfig(config) {
  if (config.games < 1 || config.games > 1000) {
    console.error('❌ Error: Number of games must be between 1 and 1000');
    return false;
  }

  if (!simulationRunners[config.mode]) {
    console.error(
      `❌ Error: Simulation mode '${config.mode}' is not available`
    );
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
  console.log('');

  let results;
  const options = {
    maxRounds: 50,
    focus: config.focus,
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
 * Process simulation results into analyzable format
 * @param {Object} simulationResults - Raw simulation results
 * @param {Object} config - Configuration object
 * @returns {Array} Processed results for analysis
 */
function processResults(simulationResults, config) {
  console.log('\n📋 Processing simulation results...');

  const dataCollector = new DataCollector();

  // Extract results array from different result formats
  let rawResults = [];
  if (simulationResults.results) {
    rawResults = simulationResults.results;
  } else if (Array.isArray(simulationResults)) {
    rawResults = simulationResults;
  } else if (simulationResults.games) {
    rawResults = simulationResults.games;
  } else {
    rawResults = [simulationResults];
  }

  // Collect and structure the data
  const collectedData = dataCollector.collectFromResults(rawResults, {
    gameType: config.mode,
    aiType: config.mode === 'thematic' ? 'strategic' : 'basic',
    focus: config.focus,
  });

  if (config.verbose) {
    const summary = dataCollector.getSummary();
    console.log(`   Games: ${summary.games.total}`);
    console.log(`   Players: ${summary.players.total}`);
    console.log(
      `   Win Distribution: Good ${summary.games.winDistribution.Good}, Evil ${summary.games.winDistribution.Evil}, Draw ${summary.games.winDistribution.Draw}`
    );
    console.log(`   Average Rounds: ${summary.games.averageRounds.toFixed(1)}`);
  }

  return collectedData;
}

/**
 * Generate and export CSV reports
 * @param {Object} collectedData - Processed data from collector
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Exported file paths
 */
async function generateReports(collectedData, config) {
  const startTime = performance.now();

  console.log('\n📝 Generating CSV reports...');

  const dataAnalyzer = new DataAnalyzer();
  const csvExporter = new CSVExporter(config.reportsDir);

  // Analyze the collected data
  const analysis = dataAnalyzer.analyzeResults(collectedData.games, {
    gameType: collectedData.metadata.gameType,
    aiType: collectedData.metadata.aiType,
    focus: config.focus,
  });

  let exportedFiles = {};

  try {
    if (config.focus) {
      // Export only the focused analysis
      switch (config.focus) {
        case 'balance':
          exportedFiles.balance = await csvExporter.exportBalanceReport(
            analysis
          );
          break;
        case 'races':
          exportedFiles.race = await csvExporter.exportRaceAnalysis(analysis);
          break;
        case 'classes':
          exportedFiles.class = await csvExporter.exportClassAnalysis(analysis);
          break;
        case 'gameflow':
          exportedFiles.gameflow = await csvExporter.exportGameFlowAnalysis(
            analysis
          );
          break;
        case 'recommendations':
          exportedFiles.recommendations =
            await csvExporter.exportRecommendations(analysis);
          break;
        default:
          console.warn(
            `Unknown focus area: ${config.focus}, generating all reports`
          );
          exportedFiles = await csvExporter.exportComprehensiveAnalysis(
            analysis,
            collectedData.games
          );
      }
    } else if (config.exportAll) {
      // Export all report types
      exportedFiles = await csvExporter.exportComprehensiveAnalysis(
        analysis,
        collectedData.games
      );
    } else {
      // Export just balance report as default
      exportedFiles.balance = await csvExporter.exportBalanceReport(analysis);
    }

    // Also export raw game results for detailed analysis
    if (collectedData.games.length > 0) {
      exportedFiles.raw = await csvExporter.exportRawResults(
        collectedData.games,
        collectedData.metadata
      );
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(
      `\n✅ Reports generated successfully in ${duration.toFixed(2)} seconds`
    );
    console.log(`📄 Files exported: ${Object.keys(exportedFiles).length}`);

    return { exportedFiles, analysis };
  } catch (error) {
    console.error(`\n❌ Report generation failed: ${error.message}`);
    if (config.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * Print summary of generated reports
 * @param {Object} exportedFiles - Exported file paths
 * @param {Object} analysis - Analysis results
 * @param {Object} config - Configuration object
 */
function printSummary(exportedFiles, analysis, config) {
  console.log('\n📈 REPORT GENERATION SUMMARY');
  console.log('═'.repeat(50));

  // Analysis overview
  console.log(`📊 Analysis Overview:`);
  console.log(`   Games Analyzed: ${analysis.metadata.totalGames}`);
  console.log(`   Game Type: ${analysis.metadata.gameType}`);
  console.log(`   AI Type: ${analysis.metadata.aiType}`);
  console.log(`   Data Quality: ${analysis.metadata.dataQuality}`);

  // Balance summary
  if (analysis.balance) {
    console.log(`\n⚖️ Balance Summary:`);
    console.log(
      `   Good Win Rate: ${analysis.balance.goodWinRate.toFixed(1)}%`
    );
    console.log(
      `   Evil Win Rate: ${analysis.balance.evilWinRate.toFixed(1)}%`
    );
    console.log(`   Balance Rating: ${analysis.balance.balanceRating}`);
    console.log(
      `   Average Rounds: ${analysis.balance.averageRounds.toFixed(1)}`
    );
  }

  // Exported files
  console.log(`\n📄 Generated Files:`);
  Object.entries(exportedFiles).forEach(([type, filepath]) => {
    const filename = filepath.split('/').pop();
    console.log(`   ${type.padEnd(15)}: ${filename}`);
  });

  // Recommendations summary
  if (analysis.recommendations && analysis.recommendations.priorityActions) {
    const highPriority = analysis.recommendations.priorityActions.length;
    const totalRecommendations = analysis.recommendations.detailed?.length || 0;

    console.log(`\n💡 Recommendations:`);
    console.log(`   High Priority: ${highPriority}`);
    console.log(`   Total Issues: ${totalRecommendations}`);

    if (highPriority > 0) {
      console.log(`   ⚠️  Critical balance issues detected!`);
    }
  }

  // Instructions
  console.log(`\n🌐 Next Steps:`);
  console.log(`   1. Open web-interface/index.html in your browser`);
  console.log(`   2. Select the generated report from the dropdown`);
  console.log(`   3. Explore interactive charts and analysis`);

  console.log('\n' + '═'.repeat(50));
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

  console.log('🎯 Warlock Game Balance Report Generator (CSV Mode)');
  console.log('═'.repeat(55));

  try {
    // Run simulations
    const simulationResults = await runSimulations(config);

    // Process results
    const collectedData = processResults(simulationResults, config);

    // Generate CSV reports
    const { exportedFiles, analysis } = await generateReports(
      collectedData,
      config
    );

    // Print summary
    printSummary(exportedFiles, analysis, config);

    // Final success message
    console.log('\n🎉 SUCCESS!');
    console.log('📋 CSV reports ready for web interface');
    console.log(
      `💻 View reports: Open web-interface/index.html in your browser`
    );
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
    console.error('  • Ensure reports directory is writable');

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
    console.log(
      'No arguments provided. Generating default balance report...\n'
    );
    args.push('--games', '25', '--mode', 'fixed', '--focus', 'balance');
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
  processResults,
  generateReports,
  printSummary,
};

// CLI execution
if (require.main === module) {
  enhancedMain();
}
