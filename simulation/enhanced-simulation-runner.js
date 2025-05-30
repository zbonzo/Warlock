/**
 * @fileoverview Enhanced simulation runner with thematic AI support
 * Integrates social deduction AI into the simulation system
 */

const {
  runThematicGame,
  ThematicSimulatedGameRoom,
} = require('./ai/thematic-ai-integration');
const { createThematicAIStrategy } = require('./ai/thematic-ai-strategies');

/**
 * Print usage information with thematic AI options
 */
function printUsage() {
  console.log('Warlock Game Simulator with Thematic AI');
  console.log('=======================================');
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
  console.log('  • Enhanced decision making based on game state');
  console.log('');
}

/**
 * Run batch of games with thematic AI
 * @param {number} numGames - Number of games to run
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Results with thematic AI data
 */
async function runThematicGameBatch(numGames = 50, options = {}) {
  console.log(`Running ${numGames} games with thematic AI strategies...`);
  console.log(
    'AI Features: Social deduction, reputation management, class-specific tactics'
  );
  console.log('');

  const results = [];
  const stats = {
    totalGames: numGames,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    averageLevel: 0,
    classWinRates: {},
    raceWinRates: {},
    suspicionAccuracy: { correct: 0, total: 0 },
    detectionAttempts: 0,
    aiInsights: {
      averageReputationSpread: 0,
      correctWarlockIdentifications: 0,
      falsePositives: 0,
      missedWarlocks: 0,
    },
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      if (i % Math.max(1, Math.floor(numGames / 10)) === 0) {
        console.log(`Running thematic game ${i + 1}/${numGames}...`);
      }

      const result = await runThematicGame({
        maxRounds: options.maxRounds || 50,
        playerConfigs: options.playerConfigs,
      });

      results.push(result);

      // Update basic statistics
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;
      stats.averageLevel += result.finalLevel;

      // Update AI-specific statistics
      if (result.aiInsights) {
        updateAIStatistics(stats, result.aiInsights);
      }

      // Update win rates if not a draw
      if (result.winner !== 'Draw' && result.gameSummary?.players) {
        updateWinRates(stats, result.gameSummary, result.winner);
      }
    } catch (error) {
      console.error(`Error in thematic game ${i + 1}:`, error.message);
      stats.errors.push({ game: i + 1, error: error.message });
    }
  }

  // Calculate averages
  const completedGames = results.length;
  if (completedGames > 0) {
    stats.averageRounds /= completedGames;
    stats.averageSurvivors /= completedGames;
    stats.averageLevel /= completedGames;
    calculateAIAverages(stats, completedGames);
  }

  // Convert counts to rates
  convertCountsToRates(stats, completedGames);

  return {
    results,
    stats,
    completedGames,
    gameType: 'thematic',
  };
}

/**
 * Run detective mode with detailed AI analysis
 * @param {number} numGames - Number of games to run
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Results with detailed analysis
 */
async function runDetectiveMode(numGames = 20, options = {}) {
  console.log(`Running ${numGames} games in DETECTIVE mode...`);
  console.log('Detailed social deduction analysis enabled');
  console.log('');

  const results = await runThematicGameBatch(numGames, {
    ...options,
    detailedAnalysis: true,
  });

  // Add detective-specific analysis
  results.detectiveInsights = analyzeDetectivePerformance(results.results);

  return results;
}

/**
 * Compare basic AI vs thematic AI performance
 * @param {number} numGames - Number of games per mode
 * @returns {Promise<Object>} Comparison results
 */
async function runComparisonMode(numGames = 50) {
  console.log(
    `Running comparison: ${numGames} basic AI vs ${numGames} thematic AI games...`
  );
  console.log('');

  // Run basic AI games (using existing runner)
  console.log('Phase 1: Running basic AI games...');
  const { runMultipleGames } = require('./runner');
  const basicResults = await runMultipleGames(numGames);

  console.log('Phase 2: Running thematic AI games...');
  const thematicResults = await runThematicGameBatch(numGames);

  // Compare results
  const comparison = compareAIPerformance(basicResults, thematicResults);

  return {
    basic: basicResults,
    thematic: thematicResults,
    comparison,
  };
}

/**
 * Update AI-specific statistics
 * @param {Object} stats - Statistics object
 * @param {Object} aiInsights - AI insights from game
 */
function updateAIStatistics(stats, aiInsights) {
  if (aiInsights.suspicionAccuracy) {
    stats.suspicionAccuracy.correct +=
      aiInsights.suspicionAccuracy.correctSuspicions;
    stats.suspicionAccuracy.total +=
      aiInsights.suspicionAccuracy.totalSuspicions;
  }

  if (aiInsights.detectionAttempts) {
    stats.detectionAttempts += aiInsights.detectionAttempts;
  }

  // Track reputation dynamics
  if (aiInsights.reputationScores) {
    const reputationValues = Object.values(aiInsights.reputationScores);
    if (reputationValues.length > 0) {
      const spread =
        Math.max(...reputationValues) - Math.min(...reputationValues);
      stats.aiInsights.averageReputationSpread += spread;
    }
  }
}

/**
 * Update win rates with proper team alignment
 * @param {Object} stats - Statistics object
 * @param {Object} gameSummary - Game summary
 * @param {string} winner - Winner (Good/Evil)
 */
function updateWinRates(stats, gameSummary, winner) {
  gameSummary.players.forEach((player) => {
    // Initialize if not exists
    if (!stats.classWinRates[player.class]) {
      stats.classWinRates[player.class] = 0;
    }
    if (!stats.raceWinRates[player.race]) {
      stats.raceWinRates[player.race] = 0;
    }

    // Credit wins based on actual team membership
    const playerWon =
      (winner === 'Good' && !player.isWarlock) ||
      (winner === 'Evil' && player.isWarlock);

    if (playerWon) {
      stats.classWinRates[player.class]++;
      stats.raceWinRates[player.race]++;
    }
  });
}

/**
 * Calculate AI-specific averages
 * @param {Object} stats - Statistics object
 * @param {number} completedGames - Number of completed games
 */
function calculateAIAverages(stats, completedGames) {
  if (stats.aiInsights.averageReputationSpread > 0) {
    stats.aiInsights.averageReputationSpread /= completedGames;
  }
}

/**
 * Convert win counts to rates
 * @param {Object} stats - Statistics object
 * @param {number} completedGames - Number of completed games
 */
function convertCountsToRates(stats, completedGames) {
  Object.keys(stats.classWinRates).forEach((key) => {
    const wins = stats.classWinRates[key];
    stats.classWinRates[key] = {
      wins: wins,
      rate: ((wins / completedGames) * 100).toFixed(1) + '%',
    };
  });

  Object.keys(stats.raceWinRates).forEach((key) => {
    const wins = stats.raceWinRates[key];
    stats.raceWinRates[key] = {
      wins: wins,
      rate: ((wins / completedGames) * 100).toFixed(1) + '%',
    };
  });
}

/**
 * Analyze detective performance in detail
 * @param {Array} results - Game results
 * @returns {Object} Detective analysis
 */
function analyzeDetectivePerformance(results) {
  let totalDetectionAccuracy = 0;
  let totalReputationAccuracy = 0;
  let gamesWithDetection = 0;

  const classDetectionRates = {};
  const suspicionPatterns = {};

  for (const result of results) {
    if (result.aiInsights) {
      if (
        result.aiInsights.suspicionAccuracy &&
        result.aiInsights.suspicionAccuracy.totalSuspicions > 0
      ) {
        totalDetectionAccuracy += result.aiInsights.suspicionAccuracy.accuracy;
        gamesWithDetection++;
      }

      // Analyze class-specific detection performance
      if (result.gameSummary?.players) {
        for (const player of result.gameSummary.players) {
          if (!classDetectionRates[player.class]) {
            classDetectionRates[player.class] = { attempts: 0, successes: 0 };
          }

          // This would need more detailed tracking in the actual implementation
          classDetectionRates[player.class].attempts++;
        }
      }
    }
  }

  return {
    averageDetectionAccuracy:
      gamesWithDetection > 0 ? totalDetectionAccuracy / gamesWithDetection : 0,
    gamesWithDetection,
    classDetectionRates,
    suspicionPatterns,
    recommendations: generateDetectiveRecommendations(
      totalDetectionAccuracy,
      gamesWithDetection
    ),
  };
}

/**
 * Generate recommendations for detective AI improvement
 * @param {number} totalAccuracy - Total detection accuracy
 * @param {number} gameCount - Number of games with detection
 * @returns {Array} Recommendations
 */
function generateDetectiveRecommendations(totalAccuracy, gameCount) {
  const avgAccuracy = gameCount > 0 ? totalAccuracy / gameCount : 0;
  const recommendations = [];

  if (avgAccuracy < 0.6) {
    recommendations.push(
      'Improve suspicion scoring algorithm - accuracy too low'
    );
    recommendations.push(
      'Add more behavioral indicators for warlock detection'
    );
  }

  if (avgAccuracy > 0.9) {
    recommendations.push(
      'Detection may be too accurate - consider adding uncertainty'
    );
    recommendations.push('Increase warlock deception capabilities');
  }

  if (gameCount === 0) {
    recommendations.push(
      'AI is not using detection abilities - check availability'
    );
  }

  return recommendations;
}

/**
 * Compare basic vs thematic AI performance
 * @param {Object} basicResults - Basic AI results
 * @param {Object} thematicResults - Thematic AI results
 * @returns {Object} Comparison analysis
 */
function compareAIPerformance(basicResults, thematicResults) {
  const basicWinRate =
    basicResults.stats.winners.Good / basicResults.completedGames;
  const thematicWinRate =
    thematicResults.stats.winners.Good / thematicResults.completedGames;

  return {
    winRateComparison: {
      basic: (basicWinRate * 100).toFixed(1) + '%',
      thematic: (thematicWinRate * 100).toFixed(1) + '%',
      improvement: ((thematicWinRate - basicWinRate) * 100).toFixed(1) + '%',
    },
    gameLength: {
      basic: basicResults.stats.averageRounds.toFixed(1),
      thematic: thematicResults.stats.averageRounds.toFixed(1),
    },
    survivability: {
      basic: basicResults.stats.averageSurvivors.toFixed(1),
      thematic: thematicResults.stats.averageSurvivors.toFixed(1),
    },
    aiAdvantages: {
      detectionAttempts: thematicResults.stats.detectionAttempts,
      suspicionAccuracy:
        thematicResults.stats.suspicionAccuracy.total > 0
          ? (
              (thematicResults.stats.suspicionAccuracy.correct /
                thematicResults.stats.suspicionAccuracy.total) *
              100
            ).toFixed(1) + '%'
          : 'N/A',
    },
    recommendation: generateComparisonRecommendation(
      basicWinRate,
      thematicWinRate
    ),
  };
}

/**
 * Generate recommendation based on AI comparison
 * @param {number} basicWinRate - Basic AI win rate
 * @param {number} thematicWinRate - Thematic AI win rate
 * @returns {string} Recommendation
 */
function generateComparisonRecommendation(basicWinRate, thematicWinRate) {
  const improvement = thematicWinRate - basicWinRate;

  if (Math.abs(improvement) < 0.05) {
    return 'Minimal difference - both AI strategies are similarly balanced';
  } else if (improvement > 0.1) {
    return 'Thematic AI shows significant improvement - social deduction is effective';
  } else if (improvement < -0.1) {
    return 'Basic AI performs better - thematic AI may be over-thinking decisions';
  } else {
    return 'Moderate improvement with thematic AI - fine-tuning recommended';
  }
}

/**
 * Print thematic game results with AI insights
 * @param {Object} aggregatedResults - Results from thematic games
 */
function printThematicGameResults(aggregatedResults) {
  const { stats, completedGames } = aggregatedResults;

  console.log('\n' + '='.repeat(70));
  console.log('THEMATIC AI SIMULATION RESULTS');
  console.log('='.repeat(70));

  console.log(`\nGames Completed: ${completedGames}/${stats.totalGames}`);

  console.log('\nWIN DISTRIBUTION:');
  const goodWinRate = ((stats.winners.Good / completedGames) * 100).toFixed(1);
  const evilWinRate = ((stats.winners.Evil / completedGames) * 100).toFixed(1);
  console.log(`  Good (Heroes): ${stats.winners.Good} (${goodWinRate}%)`);
  console.log(`  Evil (Warlocks): ${stats.winners.Evil} (${evilWinRate}%)`);
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

  console.log('\nAI INTELLIGENCE METRICS:');
  if (stats.suspicionAccuracy.total > 0) {
    const accuracy = (
      (stats.suspicionAccuracy.correct / stats.suspicionAccuracy.total) *
      100
    ).toFixed(1);
    console.log(
      `  Suspicion Accuracy: ${accuracy}% (${stats.suspicionAccuracy.correct}/${stats.suspicionAccuracy.total})`
    );
  }
  console.log(`  Detection Attempts: ${stats.detectionAttempts}`);
  console.log(
    `  Average Reputation Spread: ${stats.aiInsights.averageReputationSpread.toFixed(
      1
    )}`
  );

  console.log('\nCLASS PERFORMANCE:');
  Object.entries(stats.classWinRates)
    .sort((a, b) => b[1].wins - a[1].wins)
    .forEach(([className, data]) => {
      console.log(`  ${className}: ${data.wins} wins (${data.rate})`);
    });

  console.log('\nRACE PERFORMANCE:');
  Object.entries(stats.raceWinRates)
    .sort((a, b) => b[1].wins - a[1].wins)
    .forEach(([raceName, data]) => {
      console.log(`  ${raceName}: ${data.wins} wins (${data.rate})`);
    });

  if (stats.errors.length > 0) {
    console.log('\nERRORS:');
    stats.errors.forEach((error) => {
      console.log(`  Game ${error.game}: ${error.error}`);
    });
  }

  console.log('\nTHEMATIC AI FEATURES DEMONSTRATED:');
  console.log('  ✓ Social deduction and warlock identification');
  console.log('  ✓ Reputation management and strategic lying');
  console.log('  ✓ Class-specific tactical behaviors');
  console.log('  ✓ Dynamic suspicion tracking and memory');
  console.log('  ✓ Coordinated detection and elimination strategies');

  console.log('\n' + '='.repeat(70));
}

/**
 * Print detective mode results with detailed analysis
 * @param {Object} results - Detective mode results
 */
function printDetectiveResults(results) {
  printThematicGameResults(results);

  const insights = results.detectiveInsights;
  if (!insights) return;

  console.log('\n' + '='.repeat(70));
  console.log('DETECTIVE MODE ANALYSIS');
  console.log('='.repeat(70));

  console.log(`\nDetection Performance:`);
  console.log(
    `  Average Accuracy: ${(insights.averageDetectionAccuracy * 100).toFixed(
      1
    )}%`
  );
  console.log(
    `  Games with Detection: ${insights.gamesWithDetection}/${results.completedGames}`
  );

  if (Object.keys(insights.classDetectionRates).length > 0) {
    console.log('\nClass Detection Performance:');
    Object.entries(insights.classDetectionRates).forEach(
      ([className, data]) => {
        const rate =
          data.attempts > 0
            ? ((data.successes / data.attempts) * 100).toFixed(1)
            : '0.0';
        console.log(
          `  ${className}: ${data.successes}/${data.attempts} (${rate}%)`
        );
      }
    );
  }

  if (insights.recommendations.length > 0) {
    console.log('\nRecommendations:');
    insights.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Print comparison results
 * @param {Object} comparisonResults - Comparison results
 */
function printComparisonResults(comparisonResults) {
  const { basic, thematic, comparison } = comparisonResults;

  console.log('\n' + '='.repeat(80));
  console.log('AI STRATEGY COMPARISON RESULTS');
  console.log('='.repeat(80));

  console.log('\nWIN RATE COMPARISON:');
  console.log(`  Basic AI (Good):    ${comparison.winRateComparison.basic}`);
  console.log(`  Thematic AI (Good): ${comparison.winRateComparison.thematic}`);
  console.log(
    `  Improvement:        ${comparison.winRateComparison.improvement}`
  );

  console.log('\nGAME LENGTH COMPARISON:');
  console.log(`  Basic AI:    ${comparison.gameLength.basic} rounds`);
  console.log(`  Thematic AI: ${comparison.gameLength.thematic} rounds`);

  console.log('\nSURVIVABILITY COMPARISON:');
  console.log(`  Basic AI:    ${comparison.survivability.basic} survivors`);
  console.log(`  Thematic AI: ${comparison.survivability.thematic} survivors`);

  console.log('\nTHEMATIC AI ADVANTAGES:');
  console.log(
    `  Detection Attempts: ${comparison.aiAdvantages.detectionAttempts}`
  );
  console.log(
    `  Suspicion Accuracy: ${comparison.aiAdvantages.suspicionAccuracy}`
  );

  console.log('\nCONCLUSION:');
  console.log(`  ${comparison.recommendation}`);

  console.log('\nDETAILED CLASS PERFORMANCE:');
  console.log('\n  BASIC AI:');
  Object.entries(basic.stats.classWinRates)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 8)
    .forEach(([className, data]) => {
      console.log(`    ${className}: ${data.wins} wins (${data.rate})`);
    });

  console.log('\n  THEMATIC AI:');
  Object.entries(thematic.stats.classWinRates)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 8)
    .forEach(([className, data]) => {
      console.log(`    ${className}: ${data.wins} wins (${data.rate})`);
    });

  console.log('\n' + '='.repeat(80));
}

/**
 * Enhanced main function with thematic AI support
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
    const { printCombinationStats } = require('./random-game-generator');
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
      const { runMultipleGames, printResults } = require('./runner');
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
      results = await runThematicGameBatch(numGames, {
        maxRounds: 50,
        // Can specify custom player configurations here
      });
      printThematicGameResults(results);
    } else if (mode === 'detective') {
      results = await runDetectiveMode(numGames, {
        maxRounds: 50,
      });
      printDetectiveResults(results);
    } else if (mode === 'compare') {
      results = await runComparisonMode(numGames);
      printComparisonResults(results);
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
        if (results.stats.suspicionAccuracy.total > 0) {
          const accuracy = (
            (results.stats.suspicionAccuracy.correct /
              results.stats.suspicionAccuracy.total) *
            100
          ).toFixed(1);
          console.log(`  AI Detection Accuracy: ${accuracy}%`);
        }
        console.log(
          `  AI Made ${results.stats.detectionAttempts} detection attempts`
        );
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
module.exports = {
  main,
  runThematicGameBatch,
  runDetectiveMode,
  runComparisonMode,
  printThematicGameResults,
  printDetectiveResults,
  printComparisonResults,
};

// Run the simulation if this is the main module
if (require.main === module) {
  main().catch(console.error);
}
