/**
 * @fileoverview Random game generator with all valid race/class combinations
 * Creates diverse game scenarios for comprehensive balance testing
 */

const { SimulatedGameRoom } = require('./game-adapter');
const { createAIStrategy } = require('./ai/ai-player');
const config = require('./config');

/**
 * Get all valid race/class combinations from server config
 * @returns {Array} Array of valid {race, class} combinations
 */
function getAllValidCombinations() {
  const validCombinations = [];

  // Import server config to get actual compatibility
  const serverConfig = require('@config');

  for (const race of config.AVAILABLE_RACES) {
    const raceData = serverConfig.raceAttributes[race];
    if (raceData && raceData.compatibleClasses) {
      for (const className of raceData.compatibleClasses) {
        validCombinations.push({ race, class: className });
      }
    }
  }

  return validCombinations;
}

/**
 * Generate a random game configuration
 * @param {number} minPlayers - Minimum number of players
 * @param {number} maxPlayers - Maximum number of players
 * @param {Object} options - Configuration options
 * @returns {Array} Array of player configurations
 */
function generateRandomGameConfig(
  minPlayers = 3,
  maxPlayers = 8,
  options = {}
) {
  const {
    allowDuplicateNames = false,
    preferBalancedSetup = true,
    ensureAllCategories = false,
  } = options;

  const validCombinations = getAllValidCombinations();
  const playerCount =
    Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;
  const players = [];
  const usedNames = new Set();

  // If we want balanced setup, try to get different class categories
  if (preferBalancedSetup) {
    const categorizedCombos = categorizeCombinations(validCombinations);
    return generateBalancedSetup(
      playerCount,
      categorizedCombos,
      usedNames,
      allowDuplicateNames
    );
  }

  // Pure random selection
  for (let i = 0; i < playerCount; i++) {
    const combo =
      validCombinations[Math.floor(Math.random() * validCombinations.length)];
    const baseName = `${combo.race}${combo.class}`;

    let playerName = baseName;
    let counter = 1;
    while (!allowDuplicateNames && usedNames.has(playerName)) {
      playerName = `${baseName}${counter}`;
      counter++;
    }

    players.push({
      name: playerName,
      race: combo.race,
      class: combo.class,
    });

    usedNames.add(playerName);
  }

  return players;
}

/**
 * Categorize combinations by class category
 * @param {Array} validCombinations - All valid race/class combinations
 * @returns {Object} Combinations organized by category
 */
function categorizeCombinations(validCombinations) {
  const serverConfig = require('@config');
  const categories = {
    Melee: [],
    Caster: [],
    Ranged: [],
  };

  validCombinations.forEach((combo) => {
    // Find which category this class belongs to
    for (const [category, classes] of Object.entries(
      serverConfig.classCategories
    )) {
      if (classes.includes(combo.class)) {
        categories[category].push(combo);
        break;
      }
    }
  });

  return categories;
}

/**
 * Generate a balanced setup with representation from different categories
 * @param {number} playerCount - Number of players needed
 * @param {Object} categorizedCombos - Combinations organized by category
 * @param {Set} usedNames - Set of already used names
 * @param {boolean} allowDuplicateNames - Whether to allow duplicate names
 * @returns {Array} Array of player configurations
 */
function generateBalancedSetup(
  playerCount,
  categorizedCombos,
  usedNames,
  allowDuplicateNames
) {
  const players = [];
  const categories = Object.keys(categorizedCombos);

  // Ensure at least one from each category if possible
  for (let i = 0; i < Math.min(playerCount, categories.length); i++) {
    const category = categories[i];
    const combos = categorizedCombos[category];

    if (combos.length > 0) {
      const combo = combos[Math.floor(Math.random() * combos.length)];
      const player = createPlayerFromCombo(
        combo,
        usedNames,
        allowDuplicateNames
      );
      players.push(player);
      usedNames.add(player.name);
    }
  }

  // Fill remaining slots randomly
  const allCombos = Object.values(categorizedCombos).flat();
  while (players.length < playerCount && allCombos.length > 0) {
    const combo = allCombos[Math.floor(Math.random() * allCombos.length)];
    const player = createPlayerFromCombo(combo, usedNames, allowDuplicateNames);
    players.push(player);
    usedNames.add(player.name);
  }

  return players;
}

/**
 * Create a player object from a race/class combination
 * @param {Object} combo - Race/class combination
 * @param {Set} usedNames - Set of used names
 * @param {boolean} allowDuplicateNames - Whether to allow duplicates
 * @returns {Object} Player configuration
 */
function createPlayerFromCombo(combo, usedNames, allowDuplicateNames) {
  const baseName = `${combo.race}${combo.class}`;

  let playerName = baseName;
  let counter = 1;
  while (!allowDuplicateNames && usedNames.has(playerName)) {
    playerName = `${baseName}${counter}`;
    counter++;
  }

  return {
    name: playerName,
    race: combo.race,
    class: combo.class,
  };
}

/**
 * Run a random game simulation
 * @param {Object} options - Game configuration options
 * @returns {Promise<Object>} Game result
 */
async function runRandomGame(options = {}) {
  const {
    minPlayers = 3,
    maxPlayers = 8,
    maxRounds = 50,
    gameOptions = {},
  } = options;

  const game = new SimulatedGameRoom(`RAND_${Date.now()}`);
  const playerConfigs = generateRandomGameConfig(
    minPlayers,
    maxPlayers,
    gameOptions
  );

  // Debug: Log player count for first few games
  if (Math.random() < 0.01) {
    // 1% of games
    console.log(`  Generated ${playerConfigs.length} players for this game`);
  }

  // Add players to game
  for (const playerConfig of playerConfigs) {
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
  const result = await game.runSimulation(maxRounds);

  return {
    ...result,
    gameId: Date.now() + Math.random(),
    setup: playerConfigs,
    playerCount: playerConfigs.length,
  };
}

/**
 * Run multiple random games with variety
 * @param {number} numGames - Number of games to run
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Aggregated results
 */
async function runRandomGameBatch(numGames = 50, options = {}) {
  console.log(`Running ${numGames} random games with varied setups...`);

  const results = [];
  const stats = {
    totalGames: numGames,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    playerCountDistribution: {},
    warlockWinRateByPlayerCount: {}, // Track warlock win % by game size
    averageRounds: 0,
    averageSurvivors: 0,
    averageLevel: 0,
    classWinRates: {},
    raceWinRates: {},
    combinationWinRates: {}, // Track race+class combinations
    categoryWinRates: {}, // Track category performance
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      if (i % Math.max(1, Math.floor(numGames / 10)) === 0) {
        console.log(`Running random game ${i + 1}/${numGames}...`);
      }

      const result = await runRandomGame(options);
      results.push(result);

      // Update basic statistics
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;
      stats.averageLevel += result.finalLevel;

      // Track player count distribution
      const playerCount = result.playerCount;
      stats.playerCountDistribution[playerCount] =
        (stats.playerCountDistribution[playerCount] || 0) + 1;

      // Track warlock win rate by player count
      if (!stats.warlockWinRateByPlayerCount[playerCount]) {
        stats.warlockWinRateByPlayerCount[playerCount] = {
          good: 0,
          evil: 0,
          draw: 0,
          total: 0,
          evilWinRate: 0,
        };
      }

      const playerCountStats = stats.warlockWinRateByPlayerCount[playerCount];
      playerCountStats.total++;

      if (result.winner === 'Good') {
        playerCountStats.good++;
      } else if (result.winner === 'Evil') {
        playerCountStats.evil++;
      } else {
        playerCountStats.draw++;
      }

      // Update win rates if not a draw
      if (result.winner !== 'Draw' && result.gameSummary?.players) {
        updateAdvancedWinRates(stats, result.gameSummary, result.winner);
      }
    } catch (error) {
      console.error(`Error in random game ${i + 1}:`, error.message);
      stats.errors.push({
        game: i + 1,
        error: error.message,
      });
    }
  }

  // Calculate averages and final rates
  const completedGames = results.length;
  if (completedGames > 0) {
    stats.averageRounds /= completedGames;
    stats.averageSurvivors /= completedGames;
    stats.averageLevel /= completedGames;

    // Calculate warlock win rates by player count
    Object.keys(stats.warlockWinRateByPlayerCount).forEach((playerCount) => {
      const data = stats.warlockWinRateByPlayerCount[playerCount];
      data.evilWinRate =
        data.total > 0 ? ((data.evil / data.total) * 100).toFixed(1) : '0.0';
    });
  }

  // Convert counts to rates
  convertCountsToRates(stats, completedGames);

  return {
    results,
    stats,
    completedGames,
    gameType: 'random',
  };
}

/**
 * Update win rates with proper tracking of wins vs total appearances
 * @param {Object} stats - Statistics object
 * @param {Object} gameSummary - Game summary
 * @param {string} winner - Winner (Good/Evil)
 */
function updateAdvancedWinRates(stats, gameSummary, winner) {
  const serverConfig = require('@config');

  gameSummary.players.forEach((player) => {
    const isWinner =
      (winner === 'Good' && !player.isWarlock) ||
      (winner === 'Evil' && player.isWarlock);

    // Initialize tracking objects if they don't exist
    if (!stats.classWinRates[player.class]) {
      stats.classWinRates[player.class] = { wins: 0, total: 0 };
    }
    if (!stats.raceWinRates[player.race]) {
      stats.raceWinRates[player.race] = { wins: 0, total: 0 };
    }

    const combo = `${player.race} ${player.class}`;
    if (!stats.combinationWinRates[combo]) {
      stats.combinationWinRates[combo] = { wins: 0, total: 0 };
    }

    // Find and initialize category
    let playerCategory = null;
    for (const [category, classes] of Object.entries(
      serverConfig.classCategories
    )) {
      if (classes.includes(player.class)) {
        playerCategory = category;
        if (!stats.categoryWinRates[category]) {
          stats.categoryWinRates[category] = { wins: 0, total: 0 };
        }
        break;
      }
    }

    // Update totals for everyone
    stats.classWinRates[player.class].total++;
    stats.raceWinRates[player.race].total++;
    stats.combinationWinRates[combo].total++;
    if (playerCategory) {
      stats.categoryWinRates[playerCategory].total++;
    }

    // Update wins only for winners
    if (isWinner) {
      stats.classWinRates[player.class].wins++;
      stats.raceWinRates[player.race].wins++;
      stats.combinationWinRates[combo].wins++;
      if (playerCategory) {
        stats.categoryWinRates[playerCategory].wins++;
      }
    }
  });
}

/**
 * Convert win counts to proper win rates
 * @param {Object} stats - Statistics object
 * @param {number} completedGames - Number of completed games
 */
function convertCountsToRates(stats, completedGames) {
  // Convert all win rate objects to show actual win percentages
  const winRateCategories = [
    'classWinRates',
    'raceWinRates',
    'combinationWinRates',
    'categoryWinRates',
  ];

  winRateCategories.forEach((category) => {
    Object.keys(stats[category]).forEach((key) => {
      const data = stats[category][key];
      const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;

      stats[category][key] = {
        wins: data.wins,
        total: data.total,
        rate: winRate.toFixed(1) + '%',
        winRate: winRate, // For sorting
      };
    });
  });
}

/**
 * Analyze warlock performance by game size
 * @param {Object} warlockStats - Warlock win rate stats by player count
 * @returns {Object} Analysis results
 */
function analyzeWarlockPerformanceBySize(warlockStats) {
  const analysis = {
    bestSize: null,
    worstSize: null,
    sizeRecommendations: [],
    balanceBySize: {},
  };

  let bestRate = -1;
  let worstRate = 101;

  Object.entries(warlockStats).forEach(([size, data]) => {
    const evilRate = parseFloat(data.evilWinRate);
    const balanceScore = Math.abs(50 - evilRate);

    analysis.balanceBySize[size] = {
      evilRate: evilRate,
      balanceScore: balanceScore,
      rating:
        balanceScore < 5
          ? 'Excellent'
          : balanceScore < 10
          ? 'Good'
          : balanceScore < 15
          ? 'Fair'
          : 'Poor',
      games: data.total,
    };

    if (evilRate > bestRate) {
      bestRate = evilRate;
      analysis.bestSize = size;
    }

    if (evilRate < worstRate) {
      worstRate = evilRate;
      analysis.worstSize = size;
    }

    // Generate recommendations
    if (balanceScore > 10) {
      if (evilRate < 40) {
        analysis.sizeRecommendations.push({
          size: size,
          issue: 'Warlocks severely underpowered',
          suggestion:
            'Consider increasing corruption chances or reducing good team coordination at this size',
        });
      } else if (evilRate > 60) {
        analysis.sizeRecommendations.push({
          size: size,
          issue: 'Warlocks overpowered',
          suggestion:
            'Consider reducing corruption chances or improving good team abilities at this size',
        });
      }
    }
  });

  return analysis;
}
/*
 * @param {Object} aggregatedResults - Results from runRandomGameBatch
 */
function printRandomGameResults(aggregatedResults) {
  const { stats, completedGames } = aggregatedResults;

  console.log('\n' + '='.repeat(60));
  console.log('RANDOM WARLOCK SIMULATION RESULTS');
  console.log('='.repeat(60));

  console.log(`\nGames Completed: ${completedGames}/${stats.totalGames}`);
  if (stats.errors.length > 0) {
    console.log(`Errors: ${stats.errors.length}`);
  }

  // Player count distribution
  console.log('\nPLAYER COUNT DISTRIBUTION:');
  const sortedPlayerCounts = Object.entries(stats.playerCountDistribution).sort(
    (a, b) => parseInt(a[0]) - parseInt(b[0])
  );

  sortedPlayerCounts.forEach(([count, games]) => {
    const percentage = ((games / completedGames) * 100).toFixed(1);
    console.log(`  ${count} players: ${games} games (${percentage}%)`);
  });
}

/**
 * Print comprehensive random game results
 * @param {Object} aggregatedResults - Results from runRandomGameBatch
 */
function printRandomGameResults(aggregatedResults) {
  const { stats, completedGames } = aggregatedResults;

  console.log('\n' + '='.repeat(60));
  console.log('RANDOM WARLOCK SIMULATION RESULTS');
  console.log('='.repeat(60));

  console.log(`\nGames Completed: ${completedGames}/${stats.totalGames}`);
  if (stats.errors.length > 0) {
    console.log(`Errors: ${stats.errors.length}`);
  }

  // Player count distribution
  console.log('\nPLAYER COUNT DISTRIBUTION:');
  const sortedPlayerCounts = Object.entries(stats.playerCountDistribution).sort(
    (a, b) => parseInt(a[0]) - parseInt(b[0])
  );

  sortedPlayerCounts.forEach(([count, games]) => {
    const percentage = ((games / completedGames) * 100).toFixed(1);
    console.log(`  ${count} players: ${games} games (${percentage}%)`);
  });

  // Warlock win rate by player count
  console.log('\nWARLOCK WIN RATE BY GAME SIZE:');
  const sortedWarlockStats = Object.entries(
    stats.warlockWinRateByPlayerCount
  ).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  sortedWarlockStats.forEach(([playerCount, data]) => {
    const goodRate = ((data.good / data.total) * 100).toFixed(1);
    const evilRate = data.evilWinRate;
    const drawRate = ((data.draw / data.total) * 100).toFixed(1);
    console.log(
      `  ${playerCount} players: Good ${goodRate}% | Evil ${evilRate}% | Draw ${drawRate}% (${data.total} games)`
    );
  });

  // Analyze warlock performance by size
  if (Object.keys(stats.warlockWinRateByPlayerCount).length > 1) {
    const analysis = analyzeWarlockPerformanceBySize(
      stats.warlockWinRateByPlayerCount
    );

    console.log('\nGAME SIZE BALANCE ANALYSIS:');
    Object.entries(analysis.balanceBySize).forEach(([size, data]) => {
      console.log(
        `  ${size} players: ${data.evilRate.toFixed(1)}% evil win rate - ${
          data.rating
        } balance (${data.balanceScore.toFixed(1)}% deviation)`
      );
    });

    if (analysis.sizeRecommendations.length > 0) {
      console.log('\nGAME SIZE RECOMMENDATIONS:');
      analysis.sizeRecommendations.forEach((rec) => {
        console.log(`  ${rec.size} players: ${rec.issue}`);
        console.log(`    Suggestion: ${rec.suggestion}`);
      });
    }
  }

  console.log('\nOVERALL WIN DISTRIBUTION:');
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

  // Category performance
  console.log('\nCATEGORY PERFORMANCE:');
  const sortedCategories = Object.entries(stats.categoryWinRates).sort(
    (a, b) => b[1].winRate - a[1].winRate
  );

  sortedCategories.forEach(([category, data]) => {
    console.log(`  ${category}: ${data.wins}/${data.total} (${data.rate})`);
  });

  // Top performing classes
  console.log('\nTOP PERFORMING CLASSES:');
  const sortedClasses = Object.entries(stats.classWinRates)
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 12);

  sortedClasses.forEach(([className, data]) => {
    console.log(`  ${className}: ${data.wins}/${data.total} (${data.rate})`);
  });

  // Top performing races
  console.log('\nTOP PERFORMING RACES:');
  const sortedRaces = Object.entries(stats.raceWinRates).sort(
    (a, b) => b[1].winRate - a[1].winRate
  );

  sortedRaces.forEach(([raceName, data]) => {
    console.log(`  ${raceName}: ${data.wins}/${data.total} (${data.rate})`);
  });

  // Top combinations
  console.log('\nTOP RACE/CLASS COMBINATIONS:');
  const sortedCombos = Object.entries(stats.combinationWinRates)
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 20);

  sortedCombos.forEach(([combo, data]) => {
    console.log(`  ${combo}: ${data.wins}/${data.total} (${data.rate})`);
  });

  if (stats.errors.length > 0) {
    console.log('\nERRORS:');
    stats.errors.forEach((error) => {
      console.log(`  Game ${error.game}: ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Get statistics about all valid combinations
 * @returns {Object} Combination statistics
 */
function getCombinationStats() {
  const validCombinations = getAllValidCombinations();
  const serverConfig = require('@config');

  const stats = {
    totalCombinations: validCombinations.length,
    byCategory: {},
    byRace: {},
    byClass: {},
  };

  // Count by category
  validCombinations.forEach((combo) => {
    // Find category
    for (const [category, classes] of Object.entries(
      serverConfig.classCategories
    )) {
      if (classes.includes(combo.class)) {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        break;
      }
    }

    // Count by race and class
    stats.byRace[combo.race] = (stats.byRace[combo.race] || 0) + 1;
    stats.byClass[combo.class] = (stats.byClass[combo.class] || 0) + 1;
  });

  return stats;
}

module.exports = {
  getAllValidCombinations,
  generateRandomGameConfig,
  runRandomGame,
  runRandomGameBatch,
  printRandomGameResults,
  getCombinationStats,
};
