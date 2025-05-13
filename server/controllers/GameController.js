/**
 * @fileoverview Controller for game creation, management, and state transitions
 * Handles game-related socket events and operations
 */
const gameService = require('@services/gameService');
const { validatePlayerName } = require('@middleware/validation');
const { validateGameAction } = require('@shared/gameChecks');
const logger = require('@utils/logger');
const config = require('@config');
const { throwGameStateError } = require('@utils/errorHandler');
const classAbilities = require('@config/classAbilities');

/**
 * Handle game creation request
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} playerName - Name of the creating player
 * @returns {boolean} Success status
 */
function handleCreateGame(io, socket, playerName) {
  // Validate player name
  if (!validatePlayerName(socket, playerName)) return false;
  
  // Generate a unique game code
  const gameCode = gameService.generateGameCode();
  
  // Create a new game room
  const game = gameService.createGame(gameCode);
  if (!game) return false; // Handle case where game creation fails
  
  // Add this socket as a player (host) in the new game
  game.addPlayer(socket.id, playerName);
  socket.join(gameCode);
  logger.info(`Game created with code ${gameCode} by ${playerName}`);
  
  // Create timeout for the new game
  gameService.createGameTimeout(io, gameCode);
  
  // Send the game code back to the host
  socket.emit('gameCreated', { gameCode: gameCode });
  
  // Broadcast the updated player list
  gameService.broadcastPlayerList(io, gameCode);
  
  return true;
}

/**
 * Handle game start request
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Success status
 */
function handleStartGame(io, socket, gameCode) {
  // Use the combined validation to reduce redundancy
  const game = validateGameAction(socket, gameCode, false, true);
  
  // Check minimum player count
  if (game.players.size < config.minPlayers) {
    throwGameStateError(`Need at least ${config.minPlayers} players to start a game.`);
    return false;
  }
  
  // Check if all players have selected characters
  const allPlayersReady = Array.from(game.players.values()).every(p => p.race && p.class);
  if (!allPlayersReady) {
    throwGameStateError('All players must select a character before starting.');
    return false;
  }
  
  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);
  
  // Start the game
  game.started = true;
  game.round = 1;
  game.assignInitialWarlock();
  logger.info(`Game ${gameCode} started. Warlock assigned.`);
  
  // Inform all players that the game has started
  io.to(gameCode).emit('gameStarted', { 
    players: game.getPlayersInfo(),
    turn: game.round,
    monster: {
      hp: game.monster.hp,
      maxHp: game.monster.maxHp,
      nextDamage: game.monster.baseDmg * (game.monster.age + 1)
    }
  });
  
  return true;
}

/**
 * Handle player action submission
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Type of action
 * @param {string} targetId - Target of the action
 * @param {Object} options - Additional options
 * @returns {boolean} Success status
 */
function handlePerformAction(io, socket, gameCode, actionType, targetId, options = {}) {
  // Use the combined validation
  const game = validateGameAction(socket, gameCode, true, false);
  
  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);
  
  // Record the action with sanitized options
  const success = game.addAction(socket.id, actionType, targetId, options);
  
  if (success) {
    logger.info(`Player ${socket.id} performed ${actionType} on ${targetId} in game ${gameCode}`);
    
    // Check if all actions submitted
    if (game.allActionsSubmitted()) {
      gameService.processGameRound(io, gameCode);
    }
  }
  
  return success;
}

/**
 * Handle racial ability use
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} targetId - Target of the ability
 * @param {string} abilityType - Type of racial ability
 * @returns {boolean} Success status
 */
function handleRacialAbility(io, socket, gameCode, targetId, abilityType) {
  // Use the combined validation
  const game = validateGameAction(socket, gameCode, true, false);
 
  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);
  
  // Get player info
  const player = game.players.get(socket.id);
  
// Special handling for Human Adaptability
if (abilityType === 'adaptability' && player.race === 'Human') {
  console.log(`Player ${player.name} (${socket.id}) is using Human Adaptability`);
  
  // First check if they have uses left
  if (player.racialUsesLeft <= 0) {
    console.log(`Player ${player.name} has no Adaptability uses left`);
    socket.emit('racialAbilityUsed', { 
      success: false, 
      message: 'No uses left for Adaptability ability' 
    });
    return false;
  }
  
  // Mark the ability as used
  const success = game.addRacialAction(socket.id, targetId);
  
  if (success) {
    // Get the player's current abilities and level for the modal
    const abilities = player.abilities;
    //const maxLevel = player.level;
    const maxLevel = 1;

    console.log("=== ADAPTABILITY DEBUG ===");
    console.log(`Player: ${player.name} (${socket.id})`);
    console.log(`Level: ${maxLevel}`);
    console.log("Abilities Data Structure:");
    console.log(JSON.stringify(abilities, null, 2));
    console.log("=== END DEBUG ===");
    
    // If abilities is not properly formatted, convert it
    let formattedAbilities = abilities;
    
    // Check if abilities is an array instead of expected object format
    if (Array.isArray(abilities)) {
      console.log("Converting abilities array to object by level...");
      formattedAbilities = abilities.reduce((acc, ability) => {
        const level = ability.unlockAt || 1;
        acc[level] = acc[level] || [];
        acc[level].push(ability);
        return acc;
      }, {});
      console.log("Formatted abilities:", JSON.stringify(formattedAbilities, null, 2));
    }
    
    // Send the adaptability modal data
    socket.emit('adaptabilityChooseAbility', {
      abilities: formattedAbilities,
      maxLevel
    });
    
    // Update all players with new player state
    io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
    socket.emit('racialAbilityUsed', { 
      success: true, 
      message: 'Adaptability ability triggered' 
    });
  } else {
    console.log(`Failed to use Adaptability for player ${player.name}`);
    socket.emit('racialAbilityUsed', { 
      success: false, 
      message: 'Failed to use Adaptability ability' 
    });
  }
  
  return success;
}



  // Handle other racial abilities
  const success = game.addRacialAction(socket.id, targetId);
 
  if (success) {
    // Update all players with new player state
    io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
    socket.emit('racialAbilityUsed', { 
      success: true, 
      message: 'Racial ability used successfully' 
    });
  } else {
    socket.emit('racialAbilityUsed', { 
      success: false, 
      message: 'Failed to use racial ability' 
    });
  }
 
  return success;
}

/**
 * Handle ability replacement from Human Adaptability racial
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} oldAbilityType - Ability being replaced
 * @param {string} newAbilityType - New ability
 * @param {number} level - Ability level
 * @returns {boolean} Success status
 */
function handleAdaptabilityReplace(io, socket, gameCode, oldAbilityType, newAbilityType, level, newClassName) {
  // Validate game and player
  const game = validateGameAction(socket, gameCode, true, false);
  gameService.refreshGameTimeout(io, gameCode);
  
  // Get player
  const player = game.players.get(socket.id);
  if (!player || player.race !== 'Human') {
    socket.emit('adaptabilityComplete', { 
      success: false, 
      message: 'Only Humans can use Adaptability' 
    });
    return false;
  }
  
  console.log(`Player ${player.name} trying to replace ${oldAbilityType} with ${newAbilityType} from ${newClassName} at level ${level}`);
  
  // Load class abilities
  const classAbilities = require('../config/classAbilities');
  
  // Find the old ability
  const oldAbilityIndex = player.abilities.findIndex(a => a.type === oldAbilityType);
  if (oldAbilityIndex === -1) {
    console.error(`Old ability ${oldAbilityType} not found for player ${player.name}`);
    socket.emit('adaptabilityComplete', { success: false, message: 'Original ability not found' });
    return false;
  }
  
  // Find the new ability in the target class
  const targetClassAbilities = classAbilities[newClassName];
  if (!targetClassAbilities) {
    console.error(`Class ${newClassName} not found in abilities config`);
    socket.emit('adaptabilityComplete', { success: false, message: `Class ${newClassName} not found` });
    return false;
  }
  
  const newAbilityTemplate = targetClassAbilities.find(a => a.type === newAbilityType && a.unlockAt === parseInt(level, 10));
  if (!newAbilityTemplate) {
    console.error(`Ability ${newAbilityType} at level ${level} not found for class ${newClassName}`);
    socket.emit('adaptabilityComplete', { success: false, message: 'Ability not found at specified level' });
    return false;
  }
  
  // Create a deep copy to avoid reference issues
  const newAbility = JSON.parse(JSON.stringify(newAbilityTemplate));
  
  // Replace in both arrays
  player.abilities[oldAbilityIndex] = newAbility;
  
  const unlockedIndex = player.unlocked.findIndex(a => a.type === oldAbilityType);
  if (unlockedIndex !== -1) {
    player.unlocked[unlockedIndex] = newAbility;
  }
  
  console.log(`Successfully replaced ${oldAbilityType} with ${newAbilityType} for player ${player.name}`);
  
  // Update clients
  io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
  socket.emit('adaptabilityComplete', {
    success: true,
    message: 'Ability replacement successful',
    oldAbility: oldAbilityType,
    newAbility: newAbilityType
  });
  
  return true;
}
/**
 * Handle class abilities request for Adaptability
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} className - Selected class name
 * @param {number} level - Ability level to fetch
 * @returns {boolean} Success status
 */
function handleGetClassAbilities(io, socket, gameCode, className, level) {
  // Validation
  const game = validateGameAction(socket, gameCode, true, false);
  gameService.refreshGameTimeout(io, gameCode);
 
  console.log(`Getting ${className} abilities for level ${level}`);
 
  try {
    // Find abilities for the requested class and level
    let matchingAbilities = [];
   
    // Check if class abilities exist
    if (classAbilities[className]) {
      // Filter abilities by level
      matchingAbilities = classAbilities[className]
        .filter(ability => ability.unlockAt === parseInt(level, 10));
      
      console.log(`Found ${matchingAbilities.length} abilities for ${className} at level ${level}`);
      console.log(JSON.stringify(matchingAbilities, null, 2));
    } else {
      console.log(`No abilities found for class: ${className}`);
    }
   
    // Send the response with the matching abilities
    socket.emit('classAbilitiesResponse', {
      success: true,
      abilities: matchingAbilities,
      className,
      level
    });
   
    return true;
  } catch (error) {
    console.error(`Error getting abilities: ${error.message}`, error);
    socket.emit('classAbilitiesResponse', {
      success: false,
      abilities: [],
      className,
      level,
      error: error.message
    });
    return false;
  }
}

/**
 * Handle player readiness for next round
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Success status
 */
function handlePlayerNextReady(io, socket, gameCode) {
  logger.info(`Player ${socket.id} clicked ready for next round in game ${gameCode}`);
  
  try {
    // Use the combined validation
    const game = validateGameAction(socket, gameCode, true, false);
    
    // Refresh game timeout
    gameService.refreshGameTimeout(io, gameCode);
    
    // Initialize the set if missing
    if (!game.nextReady) {
      game.nextReady = new Set();
      logger.debug(`Initialized nextReady set for game ${gameCode}`);
    }
    
    // Check if player already marked ready
    if (game.nextReady.has(socket.id)) {
      logger.debug(`Player ${socket.id} already marked ready for game ${gameCode}`);
      return false; // Already marked ready
    }
    
    // Mark this player ready for the next round
    game.nextReady.add(socket.id);
    
    const alivePlayers = game.getAlivePlayers();
    const readyPlayers = Array.from(game.nextReady);
    
    // Emit updated ready player list
    io.to(gameCode).emit('readyPlayersUpdate', { 
      readyPlayers,
      total: alivePlayers.length
    });
    
    // Check if majority are ready
    if (readyPlayers.length > alivePlayers.length / 2) {
      // Resume game
      io.to(gameCode).emit('resumeGame');
      game.nextReady.clear();
      logger.info(`Game ${gameCode}: Resuming next round by majority vote`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error in handlePlayerNextReady: ${error.message}`, error);
    return false;
  }
}

module.exports = {
  handleCreateGame,
  handleStartGame,
  handlePerformAction,
  handleRacialAbility,
  handlePlayerNextReady,
  handleGetClassAbilities,
  handleAdaptabilityReplace
};
