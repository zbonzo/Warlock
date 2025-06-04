/**
 * @fileoverview Random game generator for broad balance testing
 * Creates games with random player counts, races, and classes
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

const {
  SimpleGameRoom,
  generateRandomPlayers,
  getValidCombinations,
} = require('./simple-simulator');

// Suppress logging for cleaner output
process.env.LOG_LEVEL = 'WARN';

/**
 * Run a single random game with random parameters
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Game result
 */
async function runRandomGame(options = {}) {
  const {
    minPlayers = 3,
    maxPlayers = 8,
    maxRounds = 50,
    gameOptions = {},
  } = options;

  const {
    preferBalancedSetup = false,
    allowDuplicateNames = false,
    forceRaceDistribution = null,
  } = gameOptions;

  // Generate random player count
  const playerCount =
    Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;

  let players;
  if (preferBalancedSetup) {
    players = generateBalancedPlayers(playerCount);
  } else if (forceRaceDistribution) {
    players = generatePlayersWithRaceDistribution(
      playerCount,
      forceRaceDistribution
    );
  } else {
    players = generateRandomPlayers(playerCount);
  }

  // Ensure unique names if required
  if (!allowDuplicateNames) {
    players = ensureUniqueNames(players);
  }

  const game = new SimpleGameRoom(`RANDOM_${Date.now()}`);

  // Add players
  for (const player of players) {
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

  // Add metadata
  result.gameType = 'random';
  result.playerCount = playerCount;
  result.setupType = preferBalancedSetup ? 'balanced' : 'random';
  result.gameSummary = {
    players: result.players,
    totalPlayers: result.players.length,
    gameType: 'random',
    setupType: result.setupType,
    playerDistribution: analyzePlayerDistribution(result.players),
  };

  return result;
}

/**
 * Generate balanced players ensuring good role distribution
 * @param {number} playerCount - Number of players
 * @returns {Array} Balanced player array
 */
function generateBalancedPlayers(playerCount) {
  const validCombinations = getValidCombinations();
  const players = [];
  const usedNames = new Set();

  // Define role priorities for balanced teams
  const rolePriorities = [
    { role: 'Tank', classes: ['Warrior'], races: ['Rockhewn', 'Artisan'] },
    {
      role: 'Healer',
      classes: ['Priest', 'Shaman', 'Druid'],
      races: ['Artisan', 'Kinfolk'],
    },
    {
      role: 'Detection',
      classes: ['Oracle'],
      races: ['Crestfallen', 'Kinfolk'],
    },
    {
      role: 'DPS',
      classes: ['Pyromancer', 'Wizard', 'Assassin', 'Barbarian', 'Gunslinger'],
      races: ['Lich', 'Orc', 'Crestfallen'],
    },
    {
      role: 'Utility',
      classes: ['Alchemist', 'Tracker'],
      races: ['Artisan', 'Crestfallen'],
    },
  ];

  // First, ensure we have key roles
  const guaranteedRoles =
    playerCount >= 4 ? ['Tank', 'Healer', 'Detection'] : ['Tank', 'Healer'];

  for (const roleType of guaranteedRoles) {
    if (players.length >= playerCount) break;

    const role = rolePriorities.find((r) => r.role === roleType);
    const availableClasses = role.classes.filter((cls) =>
      validCombinations.some((combo) => combo.class === cls)
    );

    if (availableClasses.length > 0) {
      const className =
        availableClasses[Math.floor(Math.random() * availableClasses.length)];
      const compatibleRaces = role.races.filter((race) =>
        validCombinations.some(
          (combo) => combo.race === race && combo.class === className
        )
      );

      if (compatibleRaces.length > 0) {
        const race =
          compatibleRaces[Math.floor(Math.random() * compatibleRaces.length)];
        const name = generateUniqueName(race, className, usedNames);

        players.push({ name, race, class: className });
        usedNames.add(name);
      }
    }
  }

  // Fill remaining slots with random valid combinations
  while (players.length < playerCount) {
    const combo =
      validCombinations[Math.floor(Math.random() * validCombinations.length)];
    const name = generateUniqueName(combo.race, combo.class, usedNames);

    players.push({
      name,
      race: combo.race,
      class: combo.class,
    });
    usedNames.add(name);
  }

  return players;
}

/**
 * Generate players with specific race distribution
 * @param {number} playerCount - Number of players
 * @param {Object} raceDistribution - Desired race distribution
 * @returns {Array} Player array with specific race distribution
 */
function generatePlayersWithRaceDistribution(playerCount, raceDistribution) {
  const validCombinations = getValidCombinations();
  const players = [];
  const usedNames = new Set();

  // Convert distribution to actual player assignments
  const raceAssignments = [];
  for (const [race, count] of Object.entries(raceDistribution)) {
    for (let i = 0; i < Math.min(count, playerCount); i++) {
      raceAssignments.push(race);
    }
  }

  // Fill remaining slots with random races if needed
  while (raceAssignments.length < playerCount) {
    const availableRaces = [
      'Artisan',
      'Rockhewn',
      'Crestfallen',
      'Orc',
      'Kinfolk',
      'Lich',
    ];
    const randomRace =
      availableRaces[Math.floor(Math.random() * availableRaces.length)];
    raceAssignments.push(randomRace);
  }

  // Shuffle race assignments
  for (let i = raceAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raceAssignments[i], raceAssignments[j]] = [
      raceAssignments[j],
      raceAssignments[i],
    ];
  }

  // Generate players with assigned races
  for (let i = 0; i < playerCount; i++) {
    const race = raceAssignments[i];
    const compatibleClasses = validCombinations
      .filter((combo) => combo.race === race)
      .map((combo) => combo.class);

    if (compatibleClasses.length > 0) {
      const className =
        compatibleClasses[Math.floor(Math.random() * compatibleClasses.length)];
      const name = generateUniqueName(race, className, usedNames);

      players.push({ name, race, class: className });
      usedNames.add(name);
    }
  }

  return players;
}

/**
 * Ensure all player names are unique
 * @param {Array} players - Player array
 * @returns {Array} Players with unique names
 */
function ensureUniqueNames(players) {
  const usedNames = new Set();

  return players.map((player) => {
    let name = player.name;
    let counter = 1;

    while (usedNames.has(name)) {
      name = `${player.name}${counter}`;
      counter++;
    }

    usedNames.add(name);
    return { ...player, name };
  });
}

/**
 * Generate a unique name for a race/class combination
 * @param {string} race - Player race
 * @param {string} className - Player class
 * @param {Set} usedNames - Set of already used names
 * @returns {string} Unique name
 */
function generateUniqueName(race, className, usedNames) {
  let name = `${race}${className}`;
  let counter = 1;

  while (usedNames.has(name)) {
    name = `${race}${className}${counter}`;
    counter++;
  }

  return name;
}

/**
 * Analyze player distribution in a game
 * @param {Array} players - Player array
 * @returns {Object} Distribution analysis
 */
function analyzePlayerDistribution(players) {
  const distribution = {
    raceCount: {},
    classCount: {},
    roleCount: { Tank: 0, DPS: 0, Healer: 0, Utility: 0 },
    totalPlayers: players.length,
  };

  // Role mappings
  const roleMap = {
    Warrior: 'Tank',
    Priest: 'Healer',
    Shaman: 'Healer',
    Druid: 'Healer',
    Pyromancer: 'DPS',
    Wizard: 'DPS',
    Assassin: 'DPS',
    Barbarian: 'DPS',
    Gunslinger: 'DPS',
    Oracle: 'Utility',
    Alchemist: 'Utility',
    Tracker: 'Utility',
  };

  for (const player of players) {
    // Count races
    distribution.raceCount[player.race] =
      (distribution.raceCount[player.race] || 0) + 1;

    // Count classes
    distribution.classCount[player.class] =
      (distribution.classCount[player.class] || 0) + 1;

    // Count roles
    const role = roleMap[player.class] || 'Utility';
    distribution.roleCount[role]++;
  }

  return distribution;
}

/**
 * Run multiple random games
 * @param {number} numGames - Number of games to run
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Results object
 */
async function runRandomGameBatch(numGames = 20, options = {}) {
  console.log(`Running ${numGames} random games...`);

  const results = [];
  const stats = {
    totalGames: numGames,
    completedGames: 0,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    averagePlayerCount: 0,
    playerCountDistribution: {},
    roleDistribution: { Tank: 0, DPS: 0, Healer: 0, Utility: 0 },
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      if (i % Math.max(1, Math.floor(numGames / 10)) === 0) {
        console.log(`  Running game ${i + 1}/${numGames}...`);
      }

      const result = await runRandomGame(options);
      results.push(result);
      stats.completedGames++;

      // Update stats
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;
      stats.averagePlayerCount += result.playerCount;

      // Track player count distribution
      const countKey = `${result.playerCount}players`;
      stats.playerCountDistribution[countKey] =
        (stats.playerCountDistribution[countKey] || 0) + 1;

      // Track role distribution
      if (result.gameSummary?.playerDistribution?.roleCount) {
        const roleCount = result.gameSummary.playerDistribution.roleCount;
        for (const [role, count] of Object.entries(roleCount)) {
          stats.roleDistribution[role] += count;
        }
      }
    } catch (error) {
      console.error(`Error in game ${i + 1}:`, error.message);
      stats.errors.push({ game: i + 1, error: error.message });
    }
  }

  // Calculate averages
  if (stats.completedGames > 0) {
    stats.averageRounds /= stats.completedGames;
    stats.averageSurvivors /= stats.completedGames;
    stats.averagePlayerCount /= stats.completedGames;
  }

  return {
    results,
    stats,
    metadata: {
      gameType: 'random',
      totalGames: numGames,
      completedGames: stats.completedGames,
      options,
    },
  };
}

/**
 * Print random game results
 * @param {Object} results - Results from runRandomGameBatch
 */
function printRandomResults(results) {
  const { stats } = results;

  console.log('\n' + '='.repeat(50));
  console.log('RANDOM GAME GENERATION RESULTS');
  console.log('='.repeat(50));

  console.log(`\nGames: ${stats.completedGames}/${stats.totalGames}`);

  console.log('\nWin Distribution:');
  Object.entries(stats.winners).forEach(([team, wins]) => {
    const percentage = ((wins / stats.completedGames) * 100).toFixed(1);
    console.log(`  ${team}: ${wins} (${percentage}%)`);
  });

  console.log('\nAverages:');
  console.log(`  Rounds: ${stats.averageRounds.toFixed(1)}`);
  console.log(`  Survivors: ${stats.averageSurvivors.toFixed(1)}`);
  console.log(`  Player Count: ${stats.averagePlayerCount.toFixed(1)}`);

  console.log('\nPlayer Count Distribution:');
  Object.entries(stats.playerCountDistribution)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([count, games]) => {
      const percentage = ((games / stats.completedGames) * 100).toFixed(1);
      console.log(`  ${count}: ${games} games (${percentage}%)`);
    });

  console.log('\nRole Distribution (Total):');
  Object.entries(stats.roleDistribution).forEach(([role, count]) => {
    const avgPerGame = (count / stats.completedGames).toFixed(1);
    console.log(`  ${role}: ${count} total (${avgPerGame} per game)`);
  });

  if (stats.errors.length > 0) {
    console.log(`\nErrors: ${stats.errors.length}`);
    stats.errors.slice(0, 3).forEach((error) => {
      console.log(`  Game ${error.game}: ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(50));
}

module.exports = {
  runRandomGame,
  runRandomGameBatch,
  generateBalancedPlayers,
  generatePlayersWithRaceDistribution,
  analyzePlayerDistribution,
  printRandomResults,
};
