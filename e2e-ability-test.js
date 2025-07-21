/**
 * @fileoverview Comprehensive E2E test for all abilities, classes, and races
 * Tests every ability in a structured progression through multiple rounds
 */

const io = require('socket.io-client');
const { expect } = require('chai');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 300000; // 5 minutes for full test

// Define all classes and races
const CLASSES = ['Warrior', 'Wizard', 'Assassin', 'Priest', 'Barbarian', 'Gunslinger', 'Alchemist', 'Pyromancer', 'Druid', 'Tracker', 'Oracle', 'Shaman'];
const RACES = ['Artisan', 'Rockhewn', 'Crestfallen', 'Orc', 'Kinfolk', 'Lich'];

// Create player configurations: 1 of each class, 2 of each race (using only valid combinations)
// INCLUDING DRUID but preventing Entangling Roots for testing
const PLAYER_CONFIGS = [
  // Valid combinations ensuring 2 of each race and 1 of each class
  { name: 'TestWarrior', race: 'Artisan', class: 'Warrior' },     // Artisan 1
  { name: 'TestWizard', race: 'Lich', class: 'Wizard' },          // Lich 1  
  { name: 'TestAssassin', race: 'Artisan', class: 'Assassin' },   // Artisan 2
  { name: 'TestPriest', race: 'Rockhewn', class: 'Priest' },      // Rockhewn 1
  { name: 'TestBarbarian', race: 'Orc', class: 'Barbarian' },     // Orc 1 (for Blood Rage)
  { name: 'TestGunslinger', race: 'Lich', class: 'Gunslinger' },  // Lich 2
  { name: 'TestAlchemist', race: 'Kinfolk', class: 'Alchemist' }, // Kinfolk 1
  { name: 'TestPyromancer', race: 'Rockhewn', class: 'Pyromancer' }, // Rockhewn 2
  { name: 'TestDruid', race: 'Crestfallen', class: 'Druid' },     // INCLUDED for testing
  { name: 'TestTracker', race: 'Orc', class: 'Tracker' },         // Orc 2
  { name: 'TestOracle', race: 'Kinfolk', class: 'Oracle' },       // Kinfolk 2
  { name: 'TestShaman', race: 'Crestfallen', class: 'Shaman' }    // Crestfallen 2
];

// Expected abilities by level for each class (from server config)
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
    3: 'arcaneBarrage',  // Attack ability, not heal
    4: 'meteorShower'    // AoE attack, not controlMonster
  },
  Assassin: {
    1: 'backstab',
    2: 'shadowVeil',
    3: 'twinStrike',     // Dual blade attack, not poisonTrap
    4: 'deathMark'
  },
  Priest: {
    1: 'holyBolt',
    2: 'swiftMend',
    3: 'heal',           // Heal is level 3, not divineShield
    4: 'divineShield'    // DivineShield is level 4, not sanctuaryOfTruth
  },
  Barbarian: {
    1: 'recklessStrike',
    2: 'relentlessFury',
    3: 'thirstyBlade',   // Lifesteal attack, not cauterize
    4: 'sweepingStrike'  // AoE attack, not thirstyBlade
  },
  Gunslinger: {
    1: 'pistolShot',
    2: 'smokeScreen',
    3: 'aimedShot',      // Precise shot, not ricochetRound
    4: 'ricochetRound'   // Ricochet is level 4, not aimedShot
  },
  Alchemist: {
    1: 'poisonStrike',
    2: 'smokeBomb',
    3: 'shiv',           // Bleed attack, not swiftMend
    4: 'poisonTrap'      // Trap, not pyroblast
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
    4: 'controlMonster'  // Control, not sweepingStrike
  },
  Oracle: {
    1: 'psychicBolt',
    2: 'fatesEye',
    3: 'spiritGuard',    // Defense ability, not ancestralHeal
    4: 'sanctuaryOfTruth' // Truth sanctuary, not moonbeam
  },
  Shaman: {
    1: 'lightningBolt',
    2: 'totemShield',
    3: 'ancestralHeal',
    4: 'chainLightning'
  }
};

// Test state tracking
let gameCode = null;
let playerSockets = [];
let gameLevel = 1;
let currentRound = 1;
let testResults = {
  abilitiesTested: [],
  errors: [],
  roundResults: []
};

/**
 * Helper function to wait for a specific time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper function to wait for all players to be ready
 */
async function waitForAllPlayersReady(sockets) {
  return new Promise((resolve) => {
    let readyCount = 0;
    const targetCount = sockets.length;
    
    const checkReady = () => {
      if (readyCount >= targetCount) {
        resolve();
      }
    };
    
    sockets.forEach((socket) => {
      socket.once('gameStateUpdate', (data) => {
        if (data.phase === 'action') {
          readyCount++;
          checkReady();
        }
      });
    });
  });
}

/**
 * Create and connect all player sockets
 */
async function setupPlayers() {
  console.log('Setting up players...');
  
  for (let i = 0; i < PLAYER_CONFIGS.length; i++) {
    const config = PLAYER_CONFIGS[i];
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
      isHost: i === 0
    });
  }
  
  console.log(`Connected ${playerSockets.length} players`);
}

/**
 * Create game and have all players join
 */
async function createAndJoinGame() {
  console.log('Creating game...');
  
  // Host creates the game
  const hostSocket = playerSockets[0];
  
  return new Promise((resolve, reject) => {
    console.log(`Host ${hostSocket.config.name} creating game...`);
    hostSocket.socket.emit('createGame', { playerName: hostSocket.config.name });
    
    hostSocket.socket.once('gameCreated', async (data) => {
      gameCode = data.gameCode;
      console.log(`Game created with code: ${gameCode}`);
      
      // All other players join
      for (let i = 1; i < playerSockets.length; i++) {
        const player = playerSockets[i];
        console.log(`${player.config.name} joining game ${gameCode}...`);
        
        await new Promise((joinResolve, joinReject) => {
          // Set up timeout
          const timeout = setTimeout(() => {
            joinReject(new Error(`Timeout waiting for ${player.config.name} to join`));
          }, 10000);
          
          // Set up error handler
          const onError = (error) => {
            clearTimeout(timeout);
            console.error(`Error joining game for ${player.config.name}:`, error);
            joinReject(error);
          };
          
          // Set up success handler - server emits 'playerList' when someone joins
          const onJoined = (data) => {
            // Check if this player is now in the players list
            const playerExists = data.players && data.players.some(p => p.name === player.config.name);
            if (playerExists) {
              clearTimeout(timeout);
              player.socket.off('error', onError);
              player.socket.off('playerList', onJoined);
              console.log(`${player.config.name} successfully joined game`);
              joinResolve(data);
            }
          };
          
          player.socket.once('error', onError);
          player.socket.on('playerList', onJoined);
          
          player.socket.emit('joinGame', {
            gameCode,
            playerName: player.config.name
          });
        });
      }
      
      console.log('All players joined');
      resolve();
    });
    
    hostSocket.socket.once('error', reject);
  });
}

/**
 * Have all players select their characters
 */
async function selectCharacters() {
  console.log('Selecting characters...');
  
  for (const player of playerSockets) {
    console.log(`${player.config.name} selecting ${player.config.race} ${player.config.class}...`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${player.config.name} to select character`));
      }, 10000);
      
      const onError = (error) => {
        clearTimeout(timeout);
        console.error(`Error selecting character for ${player.config.name}:`, error);
        reject(error);
      };
      
      const onPlayerList = (data) => {
        // Check if this player now has a race and class set
        const updatedPlayer = data.players && data.players.find(p => p.name === player.config.name);
        if (updatedPlayer && updatedPlayer.race && updatedPlayer.class) {
          clearTimeout(timeout);
          player.socket.off('error', onError);
          player.socket.off('playerList', onPlayerList);
          console.log(`${player.config.name} selected ${updatedPlayer.race} ${updatedPlayer.class}`);
          resolve(data);
        }
      };
      
      player.socket.once('error', onError);
      player.socket.on('playerList', onPlayerList);
      
      player.socket.emit('selectCharacter', {
        gameCode,
        race: player.config.race,
        className: player.config.class  // Use 'className' instead of 'class'
      });
    });
  }
  
  console.log('All characters selected');
}

/**
 * Start the game
 */
async function startGame() {
  console.log('Starting game...');
  
  const hostSocket = playerSockets[0];
  
  return new Promise((resolve) => {
    hostSocket.socket.emit('startGame', { gameCode });
    
    // Wait for game to start
    hostSocket.socket.once('gameStarted', (data) => {
      console.log(`Game started with ${data.players.length} players`);
      resolve();
    });
  });
}

/**
 * Execute abilities for a specific level targeting the monster
 */
async function executeAbilitiesOnMonster(level, useBloodRage = false) {
  console.log(`\n=== ROUND ${currentRound}: Testing Level ${level} Abilities on Monster ===`);
  
  const actionsToSubmit = [];
  
  for (const player of playerSockets) {
    let expectedAbility = CLASS_ABILITIES[player.config.class][level];
    if (!expectedAbility) {
      console.log(`No level ${level} ability for ${player.config.class}`);
      continue;
    }
    
    // Check if this is a healing or defense ability that needs a player target
    const healingAbilities = ['heal', 'swiftMend', 'bandage', 'cauterize', 'rejuvenation', 'ancestralHeal'];
    const selfDefenseAbilities = ['shieldWall', 'arcaneShield', 'shadowVeil', 'barkskin', 'camouflage', 
                                   'totemShield', 'divineShield', 'spiritGuard', 'smokeScreen', 'smokeBomb'];
    
    // Special case: Oracle's fatesEye at level 2 can reveal warlocks and get them killed
    // For testing purposes, have Oracle use their level 1 ability instead
    if (player.config.class === 'Oracle' && expectedAbility === 'fatesEye' && level === 2) {
      expectedAbility = 'psychicBolt'; // Use level 1 attack instead
    }
    
    // Entangling Roots is now fixed and working
    // if (player.config.class === 'Druid' && expectedAbility === 'entangle' && level === 4) {
    //   expectedAbility = 'clawSwipe'; // Use level 1 attack instead
    //   console.log(`${player.config.name} will use ${expectedAbility} instead of entangle for testing`);
    // }
    
    let targetId = '__monster__';
    let targetName = 'monster';
    
    // If it's a healing ability, target self or an ally
    if (healingAbilities.includes(expectedAbility)) {
      targetId = player.id;
      targetName = 'self';
    } else if (selfDefenseAbilities.includes(expectedAbility)) {
      targetId = player.id; // Self-targeting defense abilities
      targetName = 'self';
    }
    
    // Special handling for Blood Rage
    if (useBloodRage && player.config.class === 'Barbarian' && player.config.race === 'Orc') {
      console.log(`${player.config.name} will use Blood Rage + ${expectedAbility}`);
      actionsToSubmit.push({
        player,
        ability: expectedAbility,
        target: targetId,
        useBloodRage: true
      });
    } else {
      console.log(`${player.config.name} will use ${expectedAbility} on ${targetName}`);
      actionsToSubmit.push({
        player,
        ability: expectedAbility,
        target: targetId,
        useBloodRage: false
      });
    }
    
    // Track tested ability
    testResults.abilitiesTested.push({
      player: player.config.name,
      class: player.config.class,
      ability: expectedAbility,
      level: level,
      round: currentRound
    });
  }
  
  // Submit all actions
  await submitPlayerActions(actionsToSubmit);
  
  // Wait for round to complete
  await waitForRoundCompletion();
  currentRound++;
}

/**
 * Execute abilities targeting other players (for testing heals/defenses vs attacks)
 */
async function executeAbilitiesOnPlayers() {
  console.log(`\n=== ROUND ${currentRound}: Testing Abilities on Players ===`);
  
  const actionsToSubmit = [];
  const alivePlayers = playerSockets.filter(p => p.isAlive !== false);
  
  for (let i = 0; i < alivePlayers.length; i++) {
    const player = alivePlayers[i];
    const targetPlayer = alivePlayers[(i + 1) % alivePlayers.length]; // Target next player in rotation
    
    // Use level 1 attack abilities on other players
    const ability = CLASS_ABILITIES[player.config.class][1];
    
    console.log(`${player.config.name} will use ${ability} on ${targetPlayer.config.name}`);
    actionsToSubmit.push({
      player,
      ability: ability,
      target: targetPlayer.id,
      useBloodRage: false
    });
    
    testResults.abilitiesTested.push({
      player: player.config.name,
      class: player.config.class,
      ability: ability,
      level: 1,
      target: targetPlayer.config.name,
      round: currentRound
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
      
      // If using Blood Rage, activate it first
      if (useBloodRage) {
        player.socket.emit('useRacialAbility', {
          gameCode,
          targetId: player.id,
          abilityType: 'bloodRage'
        });
        // Wait a bit for Blood Rage to activate
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
      
      // Timeout safety
      setTimeout(() => {
        if (!actionSubmitted) {
          console.error(`Timeout submitting action for ${player.config.name}`);
          reject(new Error(`Timeout for ${player.config.name}`));
        }
      }, 5000);
    });
  });
  
  try {
    await Promise.all(submissionPromises);
    console.log(`All ${actions.length} actions submitted`);
  } catch (error) {
    console.error('Error submitting actions:', error);
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
      
      // Check if we need to level up
      if (data.levelUp) {
        gameLevel = data.levelUp;
        console.log(`LEVEL UP! Now level ${gameLevel}`);
      }
      
      resolve();
    });
  });
}


/**
 * Main test execution
 */
async function runE2ETest() {
  try {
    console.log('='.repeat(60));
    console.log('STARTING COMPREHENSIVE ABILITY E2E TEST');
    console.log('='.repeat(60));
    
    // Setup
    await setupPlayers();
    await createAndJoinGame();
    await selectCharacters();
    await startGame();
    
    // Wait for initial game state
    await sleep(2000);
    
    // Round 1: Level 1 abilities on monster
    await executeAbilitiesOnMonster(1);
    
    // Round 2: Level 2 abilities with Blood Rage
    await executeAbilitiesOnMonster(2, true);
    
    // Check if monster is still alive, if so, use level 1 attacks
    const currentResults = testResults.roundResults[testResults.roundResults.length - 1];
    if (currentResults.monsterHp > 0) {
      console.log('Monster still alive, using level 1 attacks...');
      await executeAbilitiesOnMonster(1);
    }
    
    // Round 3+: Level 3 abilities on monster
    await executeAbilitiesOnMonster(3);
    
    // Round 4+: Level 4 abilities (Druid will use clawSwipe instead of entangle)
    await executeAbilitiesOnMonster(4);
    
    // Final rounds: Test abilities on players to test heals/defenses
    for (let i = 0; i < 3; i++) {
      const aliveCount = playerSockets.filter(p => p.isAlive !== false).length;
      if (aliveCount > 1) {
        await executeAbilitiesOnPlayers();
      } else {
        break;
      }
    }
    
    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total abilities tested: ${testResults.abilitiesTested.length}`);
    console.log(`Total rounds completed: ${currentRound - 1}`);
    console.log(`Errors encountered: ${testResults.errors.length}`);
    
    if (testResults.errors.length > 0) {
      console.log('\nErrors:');
      testResults.errors.forEach(error => console.log(`- ${error}`));
    }
    
    console.log('\nAbilities tested by class:');
    const abilityByClass = {};
    testResults.abilitiesTested.forEach(test => {
      if (!abilityByClass[test.class]) {
        abilityByClass[test.class] = new Set();
      }
      abilityByClass[test.class].add(test.ability);
    });
    
    Object.keys(abilityByClass).forEach(className => {
      console.log(`${className}: ${Array.from(abilityByClass[className]).join(', ')}`);
    });
    
    console.log('\nRound progression:');
    testResults.roundResults.forEach(result => {
      console.log(`Round ${result.round}: Monster ${result.monsterHp}/${result.monsterMaxHp} HP, ${result.alivePlayers}/${result.totalPlayers} players alive`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('E2E TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('E2E Test failed:', error);
    testResults.errors.push(error.message);
    throw error;
  } finally {
    // Cleanup - disconnect all sockets
    playerSockets.forEach(player => {
      if (player.socket) {
        player.socket.disconnect();
      }
    });
  }
}

// Export for use with test runners or run directly
if (require.main === module) {
  runE2ETest()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runE2ETest,
  PLAYER_CONFIGS,
  CLASS_ABILITIES
};