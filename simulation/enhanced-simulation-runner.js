/**
 * @fileoverview Enhanced simulation runner with strategic AI
 * Uses intelligent AI strategies for realistic gameplay analysis
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

// Import strategic AI components
const { StrategicGameRoom } = require('./test-strategies');
const { generateRandomPlayers } = require('./simple-simulator');
const config = require('../server/config');

// Suppress logging for cleaner output
process.env.LOG_LEVEL = 'WARN';

/**
 * Thematic player configurations for realistic testing
 */
const THEMATIC_CONFIGURATIONS = {
  classicFantasy: [
    { name: 'Thorin', race: 'Rockhewn', class: 'Warrior' },
    { name: 'Elrond', race: 'Crestfallen', class: 'Wizard' },
    { name: 'Aragorn', race: 'Artisan', class: 'Tracker' },
    { name: 'Legolas', race: 'Crestfallen', class: 'Assassin' },
    { name: 'Gandalf', race: 'Artisan', class: 'Oracle' },
    { name: 'Gimli', race: 'Rockhewn', class: 'Barbarian' },
  ],
  balancedTeam: [
    { name: 'Guardian', race: 'Rockhewn', class: 'Warrior' },
    { name: 'Healer', race: 'Kinfolk', class: 'Priest' },
    { name: 'Seer', race: 'Crestfallen', class: 'Oracle' },
    { name: 'Destroyer', race: 'Lich', class: 'Pyromancer' },
    { name: 'Shadow', race: 'Crestfallen', class: 'Assassin' },
    { name: 'Sage', race: 'Artisan', class: 'Wizard' },
  ],
  chaosTeam: [
    { name: 'Berserker', race: 'Orc', class: 'Barbarian' },
    { name: 'Necromancer', race: 'Lich', class: 'Wizard' },
    { name: 'Wildman', race: 'Kinfolk', class: 'Druid' },
    { name: 'Gunner', race: 'Artisan', class: 'Gunslinger' },
    { name: 'Poisoner', race: 'Crestfallen', class: 'Alchemist' },
    { name: 'Stormcaller', race: 'Orc', class: 'Shaman' },
  ],
  defensiveTeam: [
    { name: 'Paladin', race: 'Artisan', class: 'Warrior' },
    { name: 'Cleric', race: 'Artisan', class: 'Priest' },
    { name: 'Prophet', race: 'Kinfolk', class: 'Oracle' },
    { name: 'Guardian', race: 'Rockhewn', class: 'Druid' },
    { name: 'Warden', race: 'Crestfallen', class: 'Tracker' },
    { name: 'Mystic', race: 'Lich', class: 'Wizard' },
  ],
};

/**
 * Run a single thematic game with strategic AI
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Game result
 */
async function runThematicGame(options = {}) {
  const {
    playerConfigs = null,
    minPlayers = 4,
    maxPlayers = 8,
    maxRounds = 50,
    useThematicNames = true,
    preferBalanced = true,
  } = options;

  let players;

  if (playerConfigs) {
    // Use provided configurations
    players = Array.isArray(playerConfigs)
      ? playerConfigs
      : playerConfigs.players;
  } else {
    // Generate strategic player setup
    const playerCount =
      Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;

    if (preferBalanced && useThematicNames) {
      // Use one of the thematic configurations
      const configNames = Object.keys(THEMATIC_CONFIGURATIONS);
      const configName =
        configNames[Math.floor(Math.random() * configNames.length)];
      const baseConfig = THEMATIC_CONFIGURATIONS[configName];

      // Adjust to player count
      if (playerCount <= baseConfig.length) {
        players = baseConfig.slice(0, playerCount);
      } else {
        players = [...baseConfig];
        // Add additional random players to reach desired count
        const additionalCount = playerCount - baseConfig.length;
        const additionalPlayers = generateRandomPlayers(additionalCount);
        players.push(...additionalPlayers);
      }
    } else {
      // Generate random but balanced players
      players = generateStrategicPlayers(playerCount, preferBalanced);
    }
  }

  const game = new StrategicGameRoom(`THEMATIC_${Date.now()}`);

  // Add players with strategic AI
  for (const player of players) {
    const success = game.addStrategicPlayer(
      player.name,
      player.race,
      player.class
    );
    if (!success) {
      throw new Error(`Failed to add strategic player: ${player.name}`);
    }
  }

  // Run simulation
  const result = await game.runSimulation(maxRounds);

  // Add thematic metadata
  result.gameType = 'thematic';
  result.aiType = 'strategic';
  result.playerCount = players.length;
  result.configuration = players.map((p) => ({
    name: p.name,
    race: p.race,
    class: p.class,
  }));
  result.gameSummary = {
    players: result.players,
    totalPlayers: result.players.length,
    gameType: 'thematic',
    aiType: 'strategic',
    strategicAnalysis: analyzeStrategicGame(result),
  };

  return result;
}

/**
 * Generate strategic players with good team composition
 * @param {number} playerCount - Number of players
 * @param {boolean} preferBalanced - Whether to prefer balanced compositions
 * @returns {Array} Strategic player array
 */
function generateStrategicPlayers(playerCount, preferBalanced = true) {
  const players = [];
  const usedNames = new Set();

  if (preferBalanced && playerCount >= 4) {
    // Ensure core roles are covered
    const coreRoles = [
      { race: 'Rockhewn', class: 'Warrior', name: 'Tank' },
      { race: 'Artisan', class: 'Priest', name: 'Healer' },
      { race: 'Kinfolk', class: 'Oracle', name: 'Seer' },
      { race: 'Lich', class: 'Pyromancer', name: 'Blaster' },
    ];

    // Add core roles
    for (let i = 0; i < Math.min(coreRoles.length, playerCount); i++) {
      const role = coreRoles[i];
      const name = generateThematicName(role.race, role.class, usedNames);
      players.push({ name, race: role.race, class: role.class });
      usedNames.add(name);
    }

    // Fill remaining slots with compatible combinations
    while (players.length < playerCount) {
      const combo = selectStrategicCombination(players);
      const name = generateThematicName(combo.race, combo.class, usedNames);
      players.push({ name, race: combo.race, class: combo.class });
      usedNames.add(name);
    }
  } else {
    // Pure random selection but with thematic names
    const validCombinations = getValidCombinations();

    for (let i = 0; i < playerCount; i++) {
      const combo =
        validCombinations[Math.floor(Math.random() * validCombinations.length)];
      const name = generateThematicName(combo.race, combo.class, usedNames);
      players.push({ name, race: combo.race, class: combo.class });
      usedNames.add(name);
    }
  }

  return players;
}

/**
 * Select a strategic race/class combination that complements existing team
 * @param {Array} existingPlayers - Current team composition
 * @returns {Object} Race/class combination
 */
function selectStrategicCombination(existingPlayers) {
  const validCombinations = getValidCombinations();

  // Analyze current team composition
  const existingClasses = existingPlayers.map((p) => p.class);
  const existingRaces = existingPlayers.map((p) => p.race);

  // Prefer missing roles
  const missingRoles = [];
  if (
    !existingClasses.some((c) =>
      ['Assassin', 'Barbarian', 'Gunslinger'].includes(c)
    )
  ) {
    missingRoles.push('DPS');
  }
  if (!existingClasses.some((c) => ['Shaman', 'Druid'].includes(c))) {
    missingRoles.push('Support');
  }
  if (!existingClasses.some((c) => ['Alchemist', 'Tracker'].includes(c))) {
    missingRoles.push('Utility');
  }

  // Prefer missing races for diversity
  const allRaces = [
    'Artisan',
    'Rockhewn',
    'Crestfallen',
    'Orc',
    'Kinfolk',
    'Lich',
  ];
  const missingRaces = allRaces.filter((race) => !existingRaces.includes(race));

  // Filter combinations based on preferences
  let preferredCombinations = validCombinations;

  if (missingRaces.length > 0) {
    preferredCombinations = preferredCombinations.filter((combo) =>
      missingRaces.includes(combo.race)
    );
  }

  if (missingRoles.length > 0 && preferredCombinations.length > 5) {
    const roleClasses = {
      DPS: ['Assassin', 'Barbarian', 'Gunslinger', 'Pyromancer', 'Wizard'],
      Support: ['Shaman', 'Druid'],
      Utility: ['Alchemist', 'Tracker', 'Oracle'],
    };

    const desiredClasses = missingRoles.flatMap(
      (role) => roleClasses[role] || []
    );
    if (desiredClasses.length > 0) {
      const roleFilteredCombos = preferredCombinations.filter((combo) =>
        desiredClasses.includes(combo.class)
      );
      if (roleFilteredCombos.length > 0) {
        preferredCombinations = roleFilteredCombos;
      }
    }
  }

  return preferredCombinations[
    Math.floor(Math.random() * preferredCombinations.length)
  ];
}

/**
 * Generate thematic name for race/class combination
 * @param {string} race - Player race
 * @param {string} className - Player class
 * @param {Set} usedNames - Set of used names
 * @returns {string} Thematic name
 */
function generateThematicName(race, className, usedNames) {
  const nameTemplates = {
    Artisan: {
      Warrior: ['Gareth', 'Marcus', 'Roland', 'Arthur', 'Duncan'],
      Priest: ['Benedict', 'Matthias', 'Gabriel', 'Raphael', 'Michael'],
      Oracle: ['Merlin', 'Nostradamus', 'Cassandra', 'Pythia', 'Delphi'],
      Wizard: ['Prospero', 'Gandalf', 'Radagast', 'Elminster', 'Mordenkainen'],
      Gunslinger: ['McCready', 'Eastwood', 'Django', 'Trinity', 'Vash'],
      Druid: ['Silvanus', 'Oberon', 'Titania', 'Cernunnos', 'Gaia'],
    },
    Rockhewn: {
      Warrior: ['Thorin', 'Gimli', 'Balin', 'Dain', 'Thrain'],
      Barbarian: ['Conan', 'Grommash', 'Magni', 'Muradin', 'Falstad'],
      Oracle: ['Borin', 'Nain', 'Oin', 'Gloin', 'Bifur'],
      Shaman: ['Thrall', "Drek'Thar", 'Nobundo', 'Farseer', 'Earthmother'],
      Pyromancer: ['Ragnaros', 'Sulfuras', 'Flamewaker', 'Molten', 'Ember'],
      Priest: ['Moira', 'Bronzebeard', 'Ironforge', 'Khaz', 'Modgud'],
    },
    Crestfallen: {
      Assassin: ['Legolas', 'Thranduil', 'Elrond', 'Celeborn', 'Gil-galad'],
      Alchemist: [
        'Elaria',
        'Silvermoon',
        'Nightbane',
        'Starweaver',
        'Moonwhisper',
      ],
      Wizard: ['Elminster', 'Khelben', 'Laeral', 'Alustriel', 'Dove'],
      Tracker: ['Drizzt', 'Artemis', 'Jarlaxle', 'Entreri', 'Cattibrie'],
      Druid: ['Ellesime', 'Jaheira', 'Faldorn', 'Cernd', 'Verthan'],
      Shaman: ['Akama', 'Maiev', 'Illidan', 'Tyrande', 'Malfurion'],
    },
    Orc: {
      Barbarian: ['Grommash', 'Garrosh', 'Thrall', 'Durotan', 'Orgrim'],
      Warrior: ['Blackhand', 'Kilrogg', 'Kargath', "Ner'zhul", "Gul'dan"],
      Oracle: ["Drek'Thar", "Ner'zhul", "Cho'gall", 'Teron', 'Dentarg'],
      Tracker: ['Rexxar', 'Misha', 'Rokhan', "Vol'jin", "Sen'jin"],
      Gunslinger: [
        'Gazlowe',
        'Mekkatorque',
        'Gallywix',
        'Noggenfogger',
        'Steamwheedle',
      ],
      Pyromancer: ["Gul'dan", "Cho'gall", 'Teron', 'Dentarg', 'Shadowmoon'],
    },
    Kinfolk: {
      Oracle: ['Pan', 'Faunus', 'Silvanus', 'Cernunnos', 'Dionysus'],
      Shaman: [
        'Cenarius',
        'Malfurion',
        'Nordrassil',
        'Teldrassil',
        'Darnassus',
      ],
      Tracker: ['Orion', 'Diana', 'Artemis', 'Actaeon', 'Atalanta'],
      Druid: ['Radagast', 'Bombadil', 'Treebeard', 'Quickbeam', 'Fangorn'],
      Alchemist: ['Paracelsus', 'Hermes', 'Zosimos', 'Jabir', 'Flamel'],
      Wizard: ['Radagast', 'Saruman', 'Pallando', 'Alatar', 'Morinehtar'],
    },
    Lich: {
      Assassin: [
        'Arthas',
        "Kel'Thuzad",
        "Anub'arak",
        "Mal'Ganis",
        'Tichondrius',
      ],
      Priest: ['Benedictus', 'Natalie', 'Whitemane', 'Mograine', 'Isillien'],
      Wizard: ["Kel'Thuzad", 'Archimonde', "Kil'jaeden", 'Sargeras', 'Medivh'],
      Gunslinger: ['Forsaken', 'Sylvanas', 'Nathanos', 'Derek', 'Calia'],
      Barbarian: [
        'Arthas',
        'Sindragosa',
        'Marrowgar',
        'Deathwhisper',
        'Saurfang',
      ],
      Pyromancer: ['Ragnaros', 'Geddon', 'Sulfuron', 'Golemagg', 'Domo'],
    },
  };

  const templates = nameTemplates[race]?.[className] || [`${race}${className}`];
  let baseName = templates[Math.floor(Math.random() * templates.length)];

  // Ensure uniqueness
  let name = baseName;
  let counter = 1;
  while (usedNames.has(name)) {
    name = `${baseName}${counter}`;
    counter++;
  }

  return name;
}

/**
 * Get valid race/class combinations from config
 * @returns {Array} Valid combinations
 */
function getValidCombinations() {
  const combinations = [];

  for (const race of config.races) {
    const raceData = config.raceAttributes[race];
    if (raceData && raceData.compatibleClasses) {
      for (const className of raceData.compatibleClasses) {
        combinations.push({ race, class: className });
      }
    }
  }

  return combinations;
}

/**
 * Analyze strategic aspects of a completed game
 * @param {Object} gameResult - Game result
 * @returns {Object} Strategic analysis
 */
function analyzeStrategicGame(gameResult) {
  const analysis = {
    teamComposition: analyzeTeamComposition(gameResult.players),
    gameLength: categorizeGameLength(gameResult.rounds),
    winCondition: analyzeWinCondition(gameResult),
    corruption: analyzeCorruption(gameResult),
    survival: analyzeSurvival(gameResult.players),
    balance: analyzeBalance(gameResult),
  };

  return analysis;
}

/**
 * Analyze team composition balance
 * @param {Array} players - Players in the game
 * @returns {Object} Composition analysis
 */
function analyzeTeamComposition(players) {
  const roles = { Tank: 0, DPS: 0, Healer: 0, Utility: 0 };
  const races = {};
  const classes = {};

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
    const role = roleMap[player.class] || 'Utility';
    roles[role]++;

    races[player.race] = (races[player.race] || 0) + 1;
    classes[player.class] = (classes[player.class] || 0) + 1;
  }

  return {
    roles,
    races,
    classes,
    diversity: {
      raceCount: Object.keys(races).length,
      classCount: Object.keys(classes).length,
      balanced: roles.Tank >= 1 && roles.Healer >= 1 && roles.DPS >= 1,
    },
  };
}

/**
 * Categorize game length
 * @param {number} rounds - Number of rounds
 * @returns {string} Length category
 */
function categorizeGameLength(rounds) {
  if (rounds <= 5) return 'very_short';
  if (rounds <= 10) return 'short';
  if (rounds <= 20) return 'medium';
  if (rounds <= 30) return 'long';
  return 'very_long';
}

/**
 * Analyze win condition
 * @param {Object} gameResult - Game result
 * @returns {Object} Win analysis
 */
function analyzeWinCondition(gameResult) {
  return {
    winner: gameResult.winner,
    decisive: gameResult.survivors <= 2,
    close: gameResult.survivors >= 4,
    rounds: gameResult.rounds,
    finalLevel: gameResult.finalLevel || 1,
  };
}

/**
 * Analyze corruption events
 * @param {Object} gameResult - Game result
 * @returns {Object} Corruption analysis
 */
function analyzeCorruption(gameResult) {
  const events = gameResult.events || [];
  const totalCorruptions = events.reduce(
    (sum, event) => sum + (event.corruptions || 0),
    0
  );

  return {
    totalCorruptions,
    corruptionRate:
      gameResult.rounds > 0 ? totalCorruptions / gameResult.rounds : 0,
    peakRound: findPeakCorruptionRound(events),
    successful: gameResult.winner === 'Evil',
  };
}

/**
 * Find round with most corruptions
 * @param {Array} events - Game events
 * @returns {number} Round number
 */
function findPeakCorruptionRound(events) {
  let maxCorruptions = 0;
  let peakRound = 0;

  for (const event of events) {
    if ((event.corruptions || 0) > maxCorruptions) {
      maxCorruptions = event.corruptions;
      peakRound = event.round;
    }
  }

  return peakRound;
}

/**
 * Analyze survival patterns
 * @param {Array} players - Players in the game
 * @returns {Object} Survival analysis
 */
function analyzeSurvival(players) {
  const alive = players.filter((p) => p.alive);
  const dead = players.filter((p) => !p.alive);
  const warlocks = players.filter((p) => p.isWarlock);

  return {
    totalSurvivors: alive.length,
    survivalRate: (alive.length / players.length) * 100,
    warlockSurvival: warlocks.filter((w) => w.alive).length,
    goodSurvival: alive.filter((p) => !p.isWarlock).length,
    avgFinalHp:
      alive.length > 0
        ? (alive.reduce((sum, p) => sum + p.hp / p.maxHp, 0) / alive.length) *
          100
        : 0,
  };
}

/**
 * Analyze game balance
 * @param {Object} gameResult - Game result
 * @returns {Object} Balance analysis
 */
function analyzeBalance(gameResult) {
  const players = gameResult.players || [];
  const warlockCount = players.filter((p) => p.isWarlock).length;
  const totalPlayers = players.length;

  return {
    warlockRatio: totalPlayers > 0 ? (warlockCount / totalPlayers) * 100 : 0,
    expectedRatio:
      (Math.max(1, Math.floor(totalPlayers / 4)) / totalPlayers) * 100,
    balanceScore:
      gameResult.winner === 'Draw'
        ? 100
        : (gameResult.survivors / totalPlayers) * 100,
    competitive: gameResult.rounds >= 8 && gameResult.survivors >= 2,
  };
}

/**
 * Run multiple thematic games
 * @param {number} numGames - Number of games to run
 * @param {Object} options - Game options
 * @returns {Promise<Object>} Results object
 */
async function runThematicGameBatch(numGames = 20, options = {}) {
  console.log(`Running ${numGames} thematic AI games...`);

  const results = [];
  const stats = {
    totalGames: numGames,
    completedGames: 0,
    winners: { Good: 0, Evil: 0, Draw: 0 },
    averageRounds: 0,
    averageSurvivors: 0,
    averagePlayerCount: 0,
    gameLength: { very_short: 0, short: 0, medium: 0, long: 0, very_long: 0 },
    teamComposition: { balanced: 0, unbalanced: 0 },
    corruptionStats: { total: 0, successful: 0, avgRate: 0 },
    errors: [],
  };

  for (let i = 0; i < numGames; i++) {
    try {
      if (i % Math.max(1, Math.floor(numGames / 10)) === 0) {
        console.log(`  Running thematic game ${i + 1}/${numGames}...`);
      }

      const result = await runThematicGame(options);
      results.push(result);
      stats.completedGames++;

      // Update stats
      stats.winners[result.winner]++;
      stats.averageRounds += result.rounds;
      stats.averageSurvivors += result.survivors;
      stats.averagePlayerCount += result.playerCount;

      // Strategic analysis stats
      if (result.gameSummary?.strategicAnalysis) {
        const analysis = result.gameSummary.strategicAnalysis;

        stats.gameLength[analysis.gameLength]++;
        stats.teamComposition[
          analysis.teamComposition.diversity.balanced
            ? 'balanced'
            : 'unbalanced'
        ]++;
        stats.corruptionStats.total += analysis.corruption.totalCorruptions;
        stats.corruptionStats.avgRate += analysis.corruption.corruptionRate;
        if (analysis.corruption.successful) {
          stats.corruptionStats.successful++;
        }
      }
    } catch (error) {
      console.error(`Error in thematic game ${i + 1}:`, error.message);
      stats.errors.push({ game: i + 1, error: error.message });
    }
  }

  // Calculate averages
  if (stats.completedGames > 0) {
    stats.averageRounds /= stats.completedGames;
    stats.averageSurvivors /= stats.completedGames;
    stats.averagePlayerCount /= stats.completedGames;
    stats.corruptionStats.avgRate /= stats.completedGames;
  }

  return {
    results,
    stats,
    metadata: {
      gameType: 'thematic',
      aiType: 'strategic',
      totalGames: numGames,
      completedGames: stats.completedGames,
      options,
    },
  };
}

/**
 * Print thematic game results
 * @param {Object} results - Results from runThematicGameBatch
 */
function printThematicResults(results) {
  const { stats } = results;

  console.log('\n' + '='.repeat(50));
  console.log('THEMATIC AI GAME RESULTS');
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

  console.log('\nGame Length Distribution:');
  Object.entries(stats.gameLength).forEach(([length, count]) => {
    const percentage = ((count / stats.completedGames) * 100).toFixed(1);
    console.log(`  ${length.replace('_', ' ')}: ${count} (${percentage}%)`);
  });

  console.log('\nTeam Composition:');
  Object.entries(stats.teamComposition).forEach(([type, count]) => {
    const percentage = ((count / stats.completedGames) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${percentage}%)`);
  });

  console.log('\nCorruption Analysis:');
  console.log(`  Total corruptions: ${stats.corruptionStats.total}`);
  console.log(`  Successful Evil wins: ${stats.corruptionStats.successful}`);
  console.log(
    `  Avg corruption rate: ${stats.corruptionStats.avgRate.toFixed(
      2
    )} per round`
  );

  if (stats.errors.length > 0) {
    console.log(`\nErrors: ${stats.errors.length}`);
    stats.errors.slice(0, 3).forEach((error) => {
      console.log(`  Game ${error.game}: ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(50));
}

module.exports = {
  runThematicGame,
  runThematicGameBatch,
  generateStrategicPlayers,
  printThematicResults,
  THEMATIC_CONFIGURATIONS,
  analyzeStrategicGame,
};
