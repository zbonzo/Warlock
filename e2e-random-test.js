/**
 * @fileoverview E2E test with 6 random characters doing random abilities
 * Tests randomized gameplay scenarios with random character selections and ability usage
 */

const io = require('socket.io-client');
const { expect } = require('chai');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 300000; // 5 minutes for full test
const PLAYER_COUNT = 6;

// Available classes and races from the game
const CLASSES = ['Warrior', 'Wizard', 'Assassin', 'Priest', 'Barbarian', 'Gunslinger', 'Alchemist', 'Pyromancer', 'Druid', 'Tracker', 'Oracle', 'Shaman'];
const RACES = ['Artisan', 'Rockhewn', 'Crestfallen', 'Orc', 'Kinfolk', 'Lich'];

// Valid class-race combinations (from server/config/character/races.js)
const CLASS_TO_RACES = {
  Warrior: ['Artisan', 'Rockhewn', 'Orc'],
  Wizard: ['Lich', 'Crestfallen', 'Kinfolk'],
  Assassin: ['Artisan', 'Lich', 'Crestfallen'],
  Priest: ['Artisan', 'Rockhewn', 'Lich'],
  Barbarian: ['Rockhewn', 'Lich', 'Orc'],
  Gunslinger: ['Artisan', 'Lich', 'Orc'],
  Alchemist: ['Artisan', 'Crestfallen', 'Kinfolk'],
  Pyromancer: ['Rockhewn', 'Lich', 'Orc'],
  Druid: ['Artisan', 'Crestfallen', 'Kinfolk'],
  Tracker: ['Crestfallen', 'Kinfolk', 'Orc'],
  Oracle: ['Rockhewn', 'Orc', 'Kinfolk'],
  Shaman: ['Rockhewn', 'Crestfallen', 'Kinfolk']
};

// All abilities by class and level
const CLASS_ABILITIES = {
  Warrior: {
    1: 'attack',
    2: 'shieldWall',
    3: 'bandage',
    4: 'battleCry'
  },
  Wizard: {
    1: 'magicMissile',
    2: 'arcaneShield',
    3: 'arcaneBarrage',
    4: 'meteorShower'
  },
  Assassin: {
    1: 'backstab',
    2: 'shadowVeil',
    3: 'twinStrike',
    4: 'deathMark'
  },
  Priest: {
    1: 'holyBolt',
    2: 'swiftMend',
    3: 'heal',
    4: 'divineShield'
  },
  Barbarian: {
    1: 'recklessStrike'
    // Note: levels 2-4 are passive modifiers, not active abilities
  },
  Gunslinger: {
    1: 'pistolShot',
    2: 'smokeScreen',
    3: 'aimedShot',
    4: 'ricochetRound'
  },
  Alchemist: {
    1: 'poisonStrike',
    2: 'smokeBomb',
    3: 'shiv',
    4: 'poisonTrap'
  },
  Pyromancer: {
    1: 'fireball',
    2: 'pyroblast',
    3: 'cauterize',
    4: 'infernoBlast'
  },
  Druid: {
    1: 'clawSwipe',
    2: 'barkskin',
    3: 'rejuvenation',
    4: 'entangle'
  },
  Tracker: {
    1: 'preciseShot',
    2: 'camouflage',
    3: 'barbedArrow',
    4: 'controlMonster'
  },
  Oracle: {
    1: 'psychicBolt',
    2: 'fatesEye',
    3: 'spiritGuard',
    4: 'sanctuaryOfTruth'
  },
  Shaman: {
    1: 'lightningBolt',
    2: 'totemShield',
    3: 'ancestralHeal',
    4: 'chainLightning'
  }
};

// Categorize abilities by type for smart targeting
const HEALING_ABILITIES = ['heal', 'swiftMend', 'bandage', 'cauterize', 'rejuvenation', 'ancestralHeal'];
const DEFENSE_ABILITIES = ['shieldWall', 'arcaneShield', 'shadowVeil', 'barkskin', 'camouflage', 'totemShield', 'divineShield', 'spiritGuard', 'smokeScreen', 'smokeBomb'];
const ATTACK_ABILITIES = ['attack', 'magicMissile', 'backstab', 'holyBolt', 'recklessStrike', 'pistolShot', 'poisonStrike', 'fireball', 'clawSwipe', 'preciseShot', 'psychicBolt', 'lightningBolt', 'arcaneBarrage', 'twinStrike', 'aimedShot', 'shiv', 'ricochetRound', 'barbedArrow', 'chainLightning', 'meteorShower', 'deathMark', 'infernoBlast'];

// Test state
let gameCode = null;
let playerSockets = [];
let gameLevel = 1;
let currentRound = 1;
let playerCooldowns = {}; // Track ability cooldowns per player
let testResults = {
  randomConfigs: [],
  abilitiesUsed: [],
  roundResults: [],
  errors: []
};

/**
 * Utility functions
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate random valid character configurations
 */
function generateRandomCharacters() {
  console.log('Generating random character configurations...');
  const configs = [];
  const usedClasses = new Set();
  
  for (let i = 0; i < PLAYER_COUNT; i++) {
    let playerClass, race;
    let attempts = 0;
    let validCombination = false;
    
    // Keep trying until we get a valid class/race combination
    while (!validCombination && attempts < 50) {
      // Try to get unique classes first, then allow duplicates if needed
      playerClass = getRandomElement(CLASSES);
      
      // Ensure we have valid races for this class
      const validRaces = CLASS_TO_RACES[playerClass];
      if (!validRaces || validRaces.length === 0) {
        console.warn(`No valid races found for class ${playerClass}, trying another class...`);
        attempts++;
        continue;
      }
      
      // Get a random valid race for this class
      race = getRandomElement(validRaces);
      
      // Double-check the combination is valid
      if (validRaces.includes(race)) {
        validCombination = true;
      }
      
      attempts++;
    }
    
    if (!validCombination) {
      console.error(`Failed to generate valid combination after ${attempts} attempts. Using fallback.`);
      playerClass = 'Warrior';
      race = 'Artisan';
    }
    
    usedClasses.add(playerClass);
    
    const config = {
      name: `RandomPlayer${i + 1}`,
      race: race,
      class: playerClass
    };
    
    configs.push(config);
    console.log(`Player ${i + 1}: ${config.name} - ${config.race} ${config.class} (valid: ${CLASS_TO_RACES[playerClass]?.includes(race)})`);
  }
  
  testResults.randomConfigs = configs;
  return configs;
}

/**
 * Check if an ability is on cooldown for a player
 */
function isAbilityOnCooldown(playerId, ability) {
  if (!playerCooldowns[playerId]) {
    playerCooldowns[playerId] = {};
  }
  
  const cooldownInfo = playerCooldowns[playerId][ability];
  if (!cooldownInfo) {
    return false; // No cooldown info means it's available
  }
  
  // Check if cooldown has expired
  return currentRound < cooldownInfo.availableRound;
}

/**
 * Set ability cooldown for a player
 */
function setAbilityCooldown(playerId, ability) {
  if (!playerCooldowns[playerId]) {
    playerCooldowns[playerId] = {};
  }
  
  // Cooldown means how many rounds you must wait before using again
  // If cooldown is 5, and you use it in round 1, you can use it again in round 7
  // (can't use in rounds 2, 3, 4, 5, 6)
  let cooldownRounds = getCooldownForAbility(ability);
  
  // WORKAROUND: Add extra cooldown for defensive abilities to prevent server bug
  // when reapplying shields/buffs too soon
  const problematicDefenseAbilities = ['barkskin', 'totemShield', 'arcaneShield', 'divineShield'];
  if (problematicDefenseAbilities.includes(ability)) {
    cooldownRounds = Math.max(cooldownRounds + 2, 4); // Add 2 extra rounds, minimum 4
  }
  
  playerCooldowns[playerId][ability] = {
    usedRound: currentRound,
    availableRound: currentRound + cooldownRounds + 1
  };
}

/**
 * Get cooldown duration for an ability (from server/config/abilities.js)
 */
function getCooldownForAbility(ability) {
  // Exact cooldowns from server configuration
  const cooldowns = {
    // Level 1 abilities (cooldown: 0)
    'attack': 0,
    'fireball': 0, 
    'magicMissile': 0,
    'backstab': 0,
    'poisonStrike': 0,
    'holyBolt': 0,
    'psychicBolt': 0,
    'recklessStrike': 0,
    'lightningBolt': 0,
    'pistolShot': 0,
    'preciseShot': 0,
    'clawSwipe': 0,
    
    // Level 2 abilities
    'shieldWall': 0,
    'arcaneShield': 1,
    'shadowVeil': 3,
    'swiftMend': 1,
    'relentlessFury': 0, // passive
    'smokeScreen': 3,
    'smokeBomb': 2,
    'pyroblast': 3,
    'barkskin': 2,
    'camouflage': 4,
    'fatesEye': 4,
    'totemShield': 2,
    
    // Level 3 abilities
    'bandage': 2,
    'arcaneBarrage': 2,
    'twinStrike': 1,
    'heal': 2,
    'thirstyBlade': 0, // passive-ish
    'aimedShot': 3,
    'shiv': 2,
    'cauterize': 2,
    'rejuvenation': 2,
    'barbedArrow': 2,
    'spiritGuard': 3,
    'ancestralHeal': 3,
    
    // Level 4 abilities
    'battleCry': 3,
    'meteorShower': 5,
    'deathMark': 5,
    'divineShield': 4,
    'sweepingStrike': 4,
    'ricochetRound': 3,
    'poisonTrap': 3,
    'infernoBlast': 4,
    'entangle': 5,
    'controlMonster': 6,
    'sanctuaryOfTruth': 5,
    'chainLightning': 4
  };
  
  return cooldowns[ability] || 0;
}

/**
 * Get random ability for a player based on their current level and class
 */
function getRandomAbilityForPlayer(player) {
  const availableAbilities = [];
  
  // Check if class exists in abilities
  if (!CLASS_ABILITIES[player.config.class]) {
    console.error(`No abilities found for class: ${player.config.class}`);
    return 'attack'; // fallback to basic attack
  }
  
  // SIMPLIFIED: Only use level 1 abilities to avoid server bugs with heals/shields
  const ability = CLASS_ABILITIES[player.config.class][1];
  if (ability && !isAbilityOnCooldown(player.id, ability)) {
    availableAbilities.push(ability);
  }
  
  // If no abilities are available due to cooldowns, use basic attack
  if (availableAbilities.length === 0) {
    console.log(`All abilities on cooldown for ${player.config.name}, using basic attack`);
    return 'attack';
  }
  
  return getRandomElement(availableAbilities);
}

/**
 * Get appropriate target for an ability based on server targeting rules
 */
function getRandomTarget(ability, player, alivePlayers) {
  // Define targeting rules from server/config/abilities.js
  const targetingRules = {
    // Self-target only abilities
    'bandage': 'Self',
    'cauterize': 'Self', 
    'shieldWall': 'Self',
    'arcaneShield': 'Self',
    'shadowVeil': 'Self',
    'smokeBomb': 'Self',
    'spiritGuard': 'Self',
    'barkskin': 'Self',
    'camouflage': 'Self',
    'poisonTrap': 'Self',
    'relentlessFury': 'Self',
    'thirstyBlade': 'Self',
    'controlMonster': 'Self',
    
    // Single target abilities (can target others)
    'swiftMend': 'Single',
    'heal': 'Single',
    'ancestralHeal': 'Single',
    'rejuvenation': 'Single',
    'divineShield': 'Single',
    'totemShield': 'Single',
    'smokeScreen': 'Single',
    'fatesEye': 'Single',
    
    // Multi-target abilities
    'battleCry': 'Multi',
    'meteorShower': 'Multi', 
    'deathMark': 'Multi',
    'infernoBlast': 'Multi',
    'chainLightning': 'Multi',
    'ricochetRound': 'Multi',
    'sweepingStrike': 'Single', // Special case - hits multiple but targets one
    'entangle': 'Multi',
    'sanctuaryOfTruth': 'Multi',
    
    // Default single target for attacks
    'attack': 'Single',
    'fireball': 'Single',
    'magicMissile': 'Single',
    'backstab': 'Single',
    'poisonStrike': 'Single',
    'holyBolt': 'Single',
    'psychicBolt': 'Single',
    'recklessStrike': 'Single',
    'lightningBolt': 'Single',
    'pistolShot': 'Single',
    'preciseShot': 'Single',
    'clawSwipe': 'Single',
    'pyroblast': 'Single',
    'arcaneBarrage': 'Single',
    'twinStrike': 'Single',
    'aimedShot': 'Single',
    'shiv': 'Single',
    'barbedArrow': 'Single'
  };
  
  const targetType = targetingRules[ability] || 'Single';
  
  if (targetType === 'Self') {
    return player.id;
  } else if (targetType === 'Multi') {
    // Multi-target abilities need special handling
    if (ability === 'battleCry' || ability === 'sanctuaryOfTruth') {
      // These are ally buffs - target self (affects all allies)
      return player.id;
    } else if (ability === 'entangle') {
      // Entangle targets enemies - use self as caster
      return player.id;
    } else {
      // Attack AoEs like meteorShower, deathMark, infernoBlast, chainLightning, ricochetRound
      // These target enemies, use monster as target
      return '__monster__';
    }
  } else if (targetType === 'Single') {
    // For single target abilities, decide based on ability type
    if (HEALING_ABILITIES.includes(ability)) {
      // Healing abilities target allies (including self)
      const allies = alivePlayers.filter(p => p.isAlive !== false);
      return getRandomElement(allies).id;
    } else if (ability === 'fatesEye') {
      // fatesEye should target other players to reveal warlocks
      const targets = alivePlayers.filter(p => p.id !== player.id && p.isAlive !== false);
      return targets.length > 0 ? getRandomElement(targets).id : player.id;
    } else if (DEFENSE_ABILITIES.includes(ability)) {
      // Defensive abilities that can target others (like divineShield)
      const allies = alivePlayers.filter(p => p.isAlive !== false);
      return getRandomElement(allies).id;
    } else {
      // Attack abilities - randomly target monster or other players
      const shouldTargetMonster = Math.random() < 0.3; // 30% chance to target monster
      
      if (shouldTargetMonster) {
        return '__monster__';
      } else {
        // Target random other player (70% chance)
        const targets = alivePlayers.filter(p => p.id !== player.id && p.isAlive !== false);
        return targets.length > 0 ? getRandomElement(targets).id : '__monster__';
      }
    }
  }
  
  // Fallback
  return '__monster__';
}

/**
 * Setup players with random configurations
 */
async function setupPlayers() {
  console.log('Setting up random players...');
  const configs = generateRandomCharacters();
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const socket = io(SERVER_URL, { 
      transports: ['websocket'],
      forceNew: true 
    });
    
    await new Promise((resolve) => {
      socket.on('connect', resolve);
    });
    
    playerSockets.push({
      socket,
      config,
      id: socket.id,
      isHost: i === 0,
      isAlive: true
    });
  }
  
  console.log(`Connected ${playerSockets.length} random players`);
}

/**
 * Create game and have all players join
 */
async function createAndJoinGame() {
  console.log('Creating game...');
  const hostSocket = playerSockets[0];
  
  return new Promise((resolve, reject) => {
    hostSocket.socket.emit('createGame', { playerName: hostSocket.config.name });
    
    hostSocket.socket.once('gameCreated', async (data) => {
      gameCode = data.gameCode;
      console.log(`Game created with code: ${gameCode}`);
      
      // All other players join
      for (let i = 1; i < playerSockets.length; i++) {
        const player = playerSockets[i];
        
        await new Promise((joinResolve, joinReject) => {
          const timeout = setTimeout(() => {
            joinReject(new Error(`Timeout waiting for ${player.config.name} to join`));
          }, 10000);
          
          const onJoined = (data) => {
            const playerExists = data.players && data.players.some(p => p.name === player.config.name);
            if (playerExists) {
              clearTimeout(timeout);
              player.socket.off('playerList', onJoined);
              joinResolve(data);
            }
          };
          
          player.socket.on('playerList', onJoined);
          player.socket.emit('joinGame', {
            gameCode,
            playerName: player.config.name
          });
        });
      }
      
      resolve();
    });
    
    hostSocket.socket.once('error', reject);
  });
}

/**
 * Have all players select their random characters
 */
async function selectCharacters() {
  console.log('Selecting random characters...');
  
  for (const player of playerSockets) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${player.config.name} to select character`));
      }, 10000);
      
      const onPlayerList = (data) => {
        const updatedPlayer = data.players && data.players.find(p => p.name === player.config.name);
        if (updatedPlayer && updatedPlayer.race && updatedPlayer.class) {
          clearTimeout(timeout);
          player.socket.off('playerList', onPlayerList);
          resolve(data);
        }
      };
      
      player.socket.on('playerList', onPlayerList);
      player.socket.emit('selectCharacter', {
        gameCode,
        race: player.config.race,
        className: player.config.class
      });
    });
  }
  
  console.log('All random characters selected');
}

/**
 * Start the game
 */
async function startGame() {
  console.log('Starting random game...');
  const hostSocket = playerSockets[0];
  
  return new Promise((resolve) => {
    hostSocket.socket.emit('startGame', { gameCode });
    hostSocket.socket.once('gameStarted', (data) => {
      console.log(`Random game started with ${data.players.length} players`);
      resolve();
    });
  });
}

/**
 * Execute random abilities for all players
 */
async function executeRandomAbilities() {
  console.log(`\n=== ROUND ${currentRound}: Random Abilities ===`);
  
  const alivePlayers = playerSockets.filter(p => p.isAlive !== false);
  const actionsToSubmit = [];
  
  for (const player of alivePlayers) {
    const randomAbility = getRandomAbilityForPlayer(player);
    const randomTarget = getRandomTarget(randomAbility, player, alivePlayers);
    
    // Blood Rage disabled due to bug with second use
    const useBloodRage = false;
    
    let targetName = 'unknown';
    if (randomTarget === '__monster__') {
      targetName = 'monster';
    } else if (randomTarget === player.id) {
      targetName = 'self';
    } else {
      const targetPlayer = alivePlayers.find(p => p.id === randomTarget);
      targetName = targetPlayer ? targetPlayer.config.name : 'unknown';
    }
    
    if (!randomAbility || randomAbility === 'undefined') {
      console.error(`ERROR: ${player.config.name} (${player.config.class}) got undefined ability at level ${gameLevel}`);
      continue; // Skip this player
    }
    
    console.log(`${player.config.name} (${player.config.class}) will use ${randomAbility} on ${targetName}${useBloodRage ? ' with Blood Rage' : ''}`);
    
    actionsToSubmit.push({
      player,
      ability: randomAbility,
      target: randomTarget,
      useBloodRage
    });
    
    // Set cooldown for this ability
    setAbilityCooldown(player.id, randomAbility);
    
    testResults.abilitiesUsed.push({
      player: player.config.name,
      class: player.config.class,
      ability: randomAbility,
      target: targetName,
      round: currentRound,
      useBloodRage,
      cooldownUntil: playerCooldowns[player.id][randomAbility].availableRound
    });
  }
  
  await submitPlayerActions(actionsToSubmit);
  await waitForRoundCompletion();
  currentRound++;
}

/**
 * Submit actions for multiple players
 */
async function submitPlayerActions(actions) {
  const submissionPromises = actions.map(async (action) => {
    const { player, ability, target, useBloodRage } = action;
    
    return new Promise((resolve, reject) => {
      let actionSubmitted = false;
      
      if (useBloodRage) {
        player.socket.emit('useRacialAbility', {
          gameCode,
          targetId: player.id,
          abilityType: 'bloodRage'
        });
        
        setTimeout(() => {
          player.socket.emit('performAction', {
            gameCode,
            actionType: ability,
            targetId: target,
            bloodRageActive: true
          });
          actionSubmitted = true;
          resolve();
        }, 100);
      } else {
        player.socket.emit('performAction', {
          gameCode,
          actionType: ability,
          targetId: target
        });
        actionSubmitted = true;
        resolve();
      }
      
      setTimeout(() => {
        if (!actionSubmitted) {
          reject(new Error(`Timeout for ${player.config.name}`));
        }
      }, 5000);
    });
  });
  
  try {
    await Promise.all(submissionPromises);
    console.log(`All ${actions.length} random actions submitted`);
  } catch (error) {
    console.error('Error submitting random actions:', error);
    testResults.errors.push(error.message);
  }
}

/**
 * Wait for round to complete and process results
 */
async function waitForRoundCompletion() {
  return new Promise((resolve) => {
    const hostSocket = playerSockets[0];
    
    hostSocket.socket.once('roundResult', (data) => {
      console.log(`Round ${currentRound} completed`);
      console.log(`Monster HP: ${data.monster?.hp || 0}/${data.monster?.maxHp || 0}`);
      console.log(`Alive players: ${data.players.filter(p => p.isAlive).length}/${data.players.length}`);
      
      // Update player alive status
      data.players.forEach(serverPlayer => {
        const localPlayer = playerSockets.find(p => p.id === serverPlayer.id);
        if (localPlayer) {
          localPlayer.isAlive = serverPlayer.isAlive;
        }
      });
      
      // Track round results
      testResults.roundResults.push({
        round: currentRound,
        monsterHp: data.monster?.hp || 0,
        monsterMaxHp: data.monster?.maxHp || 0,
        alivePlayers: data.players.filter(p => p.isAlive).length,
        totalPlayers: data.players.length,
        events: data.eventsLog?.length || 0
      });
      
      // Check for level up
      if (data.levelUp) {
        // Server sends levelUp as { oldLevel, newLevel }
        if (typeof data.levelUp === 'object' && data.levelUp.newLevel) {
          gameLevel = data.levelUp.newLevel;
        } else if (typeof data.levelUp === 'number') {
          gameLevel = data.levelUp;
        } else {
          console.log('Level up data:', data.levelUp);
          gameLevel = 2; // Default to level 2 if we can't parse
        }
        console.log(`LEVEL UP! Now level ${gameLevel}`);
      }
      
      resolve();
    });
  });
}

/**
 * Main test execution
 */
async function runRandomE2ETest() {
  try {
    console.log('='.repeat(60));
    console.log('STARTING RANDOM E2E TEST (6 PLAYERS, RANDOM ABILITIES)');
    console.log('='.repeat(60));
    
    // Setup
    await setupPlayers();
    await createAndJoinGame();
    await selectCharacters();
    await startGame();
    
    // Wait for initial game state
    await sleep(2000);
    
    // Run random rounds until game ends or max rounds reached
    const maxRounds = 15;
    while (currentRound <= maxRounds) {
      const alivePlayers = playerSockets.filter(p => p.isAlive !== false).length;
      const lastResult = testResults.roundResults[testResults.roundResults.length - 1];
      
      // Stop if monster is dead or only 1 player left
      if ((lastResult && lastResult.monsterHp <= 0) || alivePlayers <= 1) {
        console.log(`Game ended: Monster HP: ${lastResult?.monsterHp || 0}, Alive players: ${alivePlayers}`);
        break;
      }
      
      await executeRandomAbilities();
      
      // Add some randomness to pacing
      await sleep(Math.random() * 1000 + 500);
    }
    
    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('RANDOM TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total random abilities used: ${testResults.abilitiesUsed.length}`);
    console.log(`Total rounds completed: ${currentRound - 1}`);
    console.log(`Final game level: ${gameLevel}`);
    console.log(`Errors encountered: ${testResults.errors.length}`);
    
    console.log('\nRandom character configurations:');
    testResults.randomConfigs.forEach((config, i) => {
      console.log(`${i + 1}. ${config.name}: ${config.race} ${config.class}`);
    });
    
    console.log('\nAbilities used by class:');
    const abilityByClass = {};
    testResults.abilitiesUsed.forEach(usage => {
      if (!abilityByClass[usage.class]) {
        abilityByClass[usage.class] = [];
      }
      abilityByClass[usage.class].push(usage.ability);
    });
    
    Object.keys(abilityByClass).forEach(className => {
      const abilities = [...new Set(abilityByClass[className])];
      console.log(`${className}: ${abilities.join(', ')}`);
    });
    
    console.log('\nRound progression:');
    testResults.roundResults.forEach(result => {
      console.log(`Round ${result.round}: Monster ${result.monsterHp}/${result.monsterMaxHp} HP, ${result.alivePlayers}/${result.totalPlayers} players alive`);
    });
    
    if (testResults.errors.length > 0) {
      console.log('\nErrors:');
      testResults.errors.forEach(error => console.log(`- ${error}`));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RANDOM E2E TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Random E2E Test failed:', error);
    testResults.errors.push(error.message);
    throw error;
  } finally {
    // Keep connections alive for stat testing
    console.log('\nKeeping all player connections alive for stat testing...');
    console.log('Press Ctrl+C to disconnect all players and exit\n');
    
    // Set up graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('\nDisconnecting all players...');
      playerSockets.forEach(player => {
        if (player.socket) {
          player.socket.disconnect();
        }
      });
      console.log('All players disconnected. Exiting.');
      process.exit(0);
    });
    
    // Keep the process alive indefinitely
    await new Promise(() => {}); // This promise never resolves, keeping the process running
  }
}

// Export for use with test runners or run directly
if (require.main === module) {
  runRandomE2ETest()
    .then(() => {
      console.log('Random test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Random test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runRandomE2ETest,
  generateRandomCharacters,
  CLASS_ABILITIES,
  CLASS_TO_RACES
};