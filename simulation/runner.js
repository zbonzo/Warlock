/**
 * @fileoverview Fixed game runner for consistent 6-player games
 * Provides baseline testing with predetermined configurations
 */

const path = require('path');

// Set up module aliases
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

const { SimpleGameRoom } = require('./simple-simulator');

// Suppress logging for cleaner output
process.env.LOG_LEVEL = 'WARN';

/**
 * Fixed player configurations for consistent testing
 */
const FIXED_CONFIGURATIONS = [
  // Balanced team composition
  [
    { name: 'HolyPriest', race: 'Artisan', class: 'Priest' },
    { name: 'StoneWarrior', race: 'Rockhewn', class: 'Warrior' },
    { name: 'WiseOracle', race: 'Kinfolk', class: 'Oracle' },
    { name: 'FuriousBarbarian', race: 'Orc', class: 'Barbarian' },
    { name: 'ShadowAssassin', race: 'Crestfallen', class: 'Assassin' },
    { name: 'BonePyromancer', race: 'Lich', class: 'Pyromancer' },
  ],
  // Tank-heavy composition
  [
    { name: 'GuardianWarrior', race: 'Rockhewn', class: 'Warrior' },
    { name: 'DevoutPriest', race: 'Artisan', class: 'Priest' },
    { name: 'SacredOracle', race: 'Kinfolk', class: 'Oracle' },
    { name: 'BrutalBarbarian', race: 'Orc', class: 'Barbarian' },
    { name: 'SlyAlchemist', race: 'Crestfallen', class: 'Alchemist' },
    { name: 'FlameWizard', race: 'Lich', class: 'Wizard' },
  ],
  // DPS-heavy composition
  [
    { name: 'BlazePyromancer', race: 'Lich', class: 'Pyromancer' },
    { name: 'DeathAssassin', race: 'Crestfallen', class: 'Assassin' },
    { name: 'StormShaman', race: 'Orc', class: 'Shaman' },
    { name: 'QuickGunslinger', race: 'Artisan', class: 'Gunslinger' },
    { name: 'WildTracker', race: 'Kinfolk', class: 'Tracker' },
    { name: 'EarthDruid', race: 'Rockhewn', class: 'Druid' },
  ],
];

/**
 * Run a single fixed game with predetermined configuration
 * @param {number} configIndex - Which configuration to use (0-2)
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Game result
 */
async function runFixedGame(configIndex = 0, options = {}) {
  const { maxRounds = 50 } = options;

  const config =
    FIXED_CONFIGURATIONS[configIndex % FIXED_CONFIGURATIONS.length];
  const game = new SimpleGameRoom(`FIXED_${configIndex}_${Date.now()}`);

  // Add players with fixed configuration
  for (const player of config) {
    const success = game.addRandomPlayer(
      player.name,
      player.race,
      player.class
    );
    if (!success) {
      throw new Error(`Failed to add player: ${player.name}`);
    }
  }

  // Run simulation
  const result = await game.runSimulation(maxRounds);

  // Add configuration metadata
  result.configuration = configIndex;
  result.configType = 'fixed';
  result.gameSummary = {
    players: result.players,
    totalPlayers: result.players.length,
    gameType: 'fixed',
    configuration: config.map((p) => ({
      name: p.name,
      race: p.race,
      class: p.class,
    })),
  };

  return result;
}

/**
 * Run multiple fixed games cycling through configurations
 * @param {number} numGames - Number of games to run
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Results object
 */
async function runMultipleGames(numGames = 10, options = {}) {
  console.log(`Running ${numGames} fixed configuration games...`);

  const results = [];
  const stats = {
    totalGames: numGames,
    completedGames: 0,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    configurationResults: {},
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      if (i % Math.max(1, Math.floor(numGames / 10)) === 0) {
        console.log(`  Running game ${i + 1}/${numGames}...`);
      }

      const configIndex = i % FIXED_CONFIGURATIONS.length;
      const result = await runFixedGame(configIndex, options);

      results.push(result);
      stats.completedGames++;

      // Update stats
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;

      // Track by configuration
      if (!stats.configurationResults[configIndex]) {
        stats.configurationResults[configIndex] = {
          games: 0,
          wins: { Good: 0, Evil: 0, Draw: 0 },
          avgRounds: 0,
          avgSurvivors: 0,
        };
      }

      const configStats = stats.configurationResults[configIndex];
      configStats.games++;
      configStats.wins[result.winner]++;
      configStats.avgRounds += result.rounds;
      configStats.avgSurvivors += result.survivors;
    } catch (error) {
      console.error(`Error in game ${i + 1}:`, error.message);
      stats.errors.push({ game: i + 1, error: error.message });
    }
  }

  // Calculate averages
  if (stats.completedGames > 0) {
    stats.averageRounds /= stats.completedGames;
    stats.averageSurvivors /= stats.completedGames;
  }

  // Calculate configuration averages
  for (const configStats of Object.values(stats.configurationResults)) {
    if (configStats.games > 0) {
      configStats.avgRounds /= configStats.games;
      configStats.avgSurvivors /= configStats.games;
    }
  }

  return {
    results,
    stats,
    metadata: {
      gameType: 'fixed',
      configurations: FIXED_CONFIGURATIONS.length,
      totalGames: numGames,
      completedGames: stats.completedGames,
    },
  };
}

/**
 * Get available fixed configurations
 * @returns {Array} Array of configuration descriptions
 */
function getAvailableConfigurations() {
  return [
    'Balanced Team (Tank, Healer, DPS, Utility)',
    'Tank-Heavy Team (Multiple defenders)',
    'DPS-Heavy Team (High damage output)',
  ];
}

/**
 * Print fixed game results
 * @param {Object} results - Results from runMultipleGames
 */
function printFixedResults(results) {
  const { stats } = results;

  console.log('\n' + '='.repeat(50));
  console.log('FIXED CONFIGURATION GAME RESULTS');
  console.log('='.repeat(50));

  console.log(`\nGames: ${stats.completedGames}/${stats.totalGames}`);

  console.log('\nOverall Win Distribution:');
  Object.entries(stats.winners).forEach(([team, wins]) => {
    const percentage = ((wins / stats.completedGames) * 100).toFixed(1);
    console.log(`  ${team}: ${wins} (${percentage}%)`);
  });

  console.log('\nAverages:');
  console.log(`  Rounds: ${stats.averageRounds.toFixed(1)}`);
  console.log(`  Survivors: ${stats.averageSurvivors.toFixed(1)}`);

  console.log('\nResults by Configuration:');
  const configNames = ['Balanced Team', 'Tank-Heavy Team', 'DPS-Heavy Team'];

  Object.entries(stats.configurationResults).forEach(
    ([configIndex, configStats]) => {
      const configName =
        configNames[parseInt(configIndex)] || `Config ${configIndex}`;
      console.log(`\n  ${configName}:`);
      console.log(`    Games: ${configStats.games}`);
      console.log(
        `    Good wins: ${configStats.wins.Good} (${(
          (configStats.wins.Good / configStats.games) *
          100
        ).toFixed(1)}%)`
      );
      console.log(
        `    Evil wins: ${configStats.wins.Evil} (${(
          (configStats.wins.Evil / configStats.games) *
          100
        ).toFixed(1)}%)`
      );
      console.log(`    Avg rounds: ${configStats.avgRounds.toFixed(1)}`);
      console.log(`    Avg survivors: ${configStats.avgSurvivors.toFixed(1)}`);
    }
  );

  console.log('\n' + '='.repeat(50));
}

module.exports = {
  runFixedGame,
  runMultipleGames,
  getAvailableConfigurations,
  printFixedResults,
  FIXED_CONFIGURATIONS,
};
