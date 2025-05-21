/**
 * @fileoverview Controller for player-related operations
 * Handles player joining, character selection, and disconnection
 */
const gameService = require('@services/gameService');
const { validatePlayerName } = require('@middleware/validation');
const { validateGame } = require('@middleware/validation')
const { validateGameAction } = require('@shared/gameChecks');
const logger = require('@utils/logger');
const { throwGameStateError, throwValidationError } = require('@utils/errorHandler');
const playerSessionManager = require('@services/PlayerSessionManager');
const config = require('@config');

/**
 * Handle player joining a game
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code to join
 * @param {string} playerName - Player's display name
 * @returns {boolean} Success status
 */
function handlePlayerJoin(io, socket, gameCode, playerName) {
  const game = validateGameAction(socket, gameCode, false, false, false);
  
  // Validate player name
  if (!validatePlayerName(socket, playerName)) return false;
  
  // Validate game capacity and player eligibility
  if (!gameService.canPlayerJoinGame(game, socket.id)) return false;
  
  // Add player and update game state
  const sanitizedName = playerName || config.defaultPlayerName || 'Player';
  const success = game.addPlayer(socket.id, sanitizedName);
  if (!success) {
    throwGameStateError(config.messages.errors.joinFailed || 'Could not join game.');
    return false;
  }
  
  // Register session with PlayerSessionManager
  playerSessionManager.registerSession(gameCode, sanitizedName, socket.id);
  
  // Join socket to game room and update clients
  socket.join(gameCode);
  logger.info(`Player ${sanitizedName} joined game ${gameCode}`);
  gameService.refreshGameTimeout(io, gameCode);
  gameService.broadcastPlayerList(io, gameCode);
  
  return true;
}

/**
 * Handle player reconnection attempt
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} playerName - Player name
 * @returns {boolean} Success status
 */
function handlePlayerReconnection(io, socket, gameCode, playerName) {
  try {
    // First, validate that the game exists
    if (!validateGame(socket, gameCode)) {
      return false;
    }
    
    // Attempt to process the reconnection
    const reconnectionData = gameService.processReconnection(gameCode, playerName, socket.id);
    
    if (reconnectionData) {
      const { game, players, monster, turn, level, started, host } = reconnectionData;
      
      // Join socket to game room
      socket.join(gameCode);
      
      // Send game state to reconnecting player
      socket.emit('gameReconnected', {
        players,
        monster,
        turn,
        level,
        started,
        host
      });
      
      // Inform other players of the reconnection
      socket.to(gameCode).emit('playerReconnected', { 
        playerId: socket.id,
        playerName
      });
      
      // Refresh game timeout
      gameService.refreshGameTimeout(io, gameCode);
      
      logger.info(`Player ${playerName} successfully reconnected to game ${gameCode}`);
      return true;
    }
    
    // Important: If the game has started, we DON'T want to call handlePlayerJoin
    // because that will fail. Instead, inform the player they can't join.
    const game = gameService.games.get(gameCode);
    if (game && game.started) {
      throw new Error(config.messages.errors.gameStarted || "Cannot join a game that has already started.");
    }
    
    // If reconnection failed and game hasn't started, handle as new join attempt
    return handlePlayerJoin(io, socket, gameCode, playerName);
  } catch (error) {
    socket.emit('errorMessage', { 
      message: error.message || config.messages.errors.reconnectionFailed || "Failed to reconnect to game."
    });
    return false;
  }
}

/**
 * Handle player character selection
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} race - Selected race
 * @param {string} className - Selected class
 * @returns {boolean} Success status
 */
function handleSelectCharacter(io, socket, gameCode, race, className) {
  // Use consolidated validation
  const game = validateGameAction(socket, gameCode, false, false);
  
  // Validate race and class
  validateCharacterRaceClass(race, className, socket);
  
  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);
  
  // Set player class
  game.setPlayerClass(socket.id, race, className);
  logger.info(`Player ${socket.id} selected ${race} ${className} in game ${gameCode}`);
  
  // Broadcast updated player list
  gameService.broadcastPlayerList(io, gameCode);
  
  return true;
}

/**
 * Helper function for character selection validation
 * @param {string} race - Race to validate
 * @param {string} className - Class to validate
 * @param {Object} socket - Client socket
 * @returns {boolean} Whether the combination is valid
 * @private
 */
function validateCharacterRaceClass(race, className, socket) {
  const validRaces = config.races || ['Human', 'Dwarf', 'Elf', 'Orc', 'Satyr', 'Skeleton'];
  const validClasses = config.classes || [
    'Warrior', 'Pyromancer', 'Wizard', 'Assassin', 'Rogue', 'Priest',
    'Oracle', 'Seer', 'Shaman', 'Gunslinger', 'Tracker', 'Druid'
  ];
  
  if (!validRaces.includes(race)) {
    throwValidationError(config.messages.errors.invalidRace || 'Invalid race selection.');
  }
  
  if (!validClasses.includes(className)) {
    throwValidationError(config.messages.errors.invalidClass || 'Invalid class selection.');
  }
  
  // Use class-race compatibility from config if available
  const classToRaces = config.classRaceCompatibility || {
    Warrior: ['Human', 'Dwarf', 'Skeleton'],
    Pyromancer: ['Dwarf', 'Skeleton', 'Orc'],
    Wizard: ['Human', 'Elf', 'Skeleton'],
    Assassin: ['Human', 'Elf', 'Skeleton'],
    Rogue: ['Human', 'Elf', 'Satyr'],
    Priest: ['Human', 'Dwarf', 'Skeleton'],
    Oracle: ['Dwarf', 'Satyr', 'Orc'],
    Seer: ['Elf', 'Satyr', 'Orc'],
    Shaman: ['Dwarf', 'Satyr', 'Orc'],
    Gunslinger: ['Human', 'Dwarf', 'Skeleton'],
    Tracker: ['Elf', 'Satyr', 'Orc'],
    Druid: ['Elf', 'Satyr', 'Orc']
  };
  
  if (!classToRaces[className] || !classToRaces[className].includes(race)) {
    throwValidationError(config.messages.errors.invalidCombination || 'Invalid race and class combination.');
  }
  
  return true;
}

/**
 * Handle player disconnect
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 */
function handlePlayerDisconnect(io, socket) {
  logger.info(`Player disconnected: ${socket.id}`);
  
  // Get the session info (if any)
  const sessionInfo = playerSessionManager.handleDisconnect(socket.id);
  
  // If no session info, just log the disconnection
  if (!sessionInfo) {
    logger.info(`Player disconnected: ${socket.id} (no active sessions)`);
    return;
  }
  
  const { gameCode, playerName } = sessionInfo;
  logger.info(`Player ${playerName} temporarily disconnected from game ${gameCode}`);
  
  // Find any game this player was in
  const game = gameService.games.get(gameCode);
  if (!game) return;
  
  // IMPORTANT: Don't remove the player from the game right away!
  // Notify other players of temporary disconnection
  io.to(gameCode).emit('playerTemporaryDisconnect', {
    playerId: socket.id,
    playerName,
    isHost: (socket.id === game.hostId)
  });
  
  // Get reconnection window from config or use default
  const reconnectionWindow = config.player?.reconnectionWindow || 60 * 1000; // Default: 60 seconds
  
  // Schedule a delayed check - if player doesn't reconnect in the window
  // then consider them permanently disconnected
  setTimeout(() => {
    // If the session is gone (expired or player properly removed), then
    // the player didn't reconnect in time
    const currentSession = playerSessionManager.getSession(gameCode, playerName);
    
    if (!currentSession || currentSession.socketId === socket.id) {
      // The player didn't reconnect, so now we can properly remove them
      logger.info(`Player ${playerName} did not reconnect within window, removing from game ${gameCode}`);
      
      // Now handle as permanent disconnection
      handlePermanentDisconnection(io, gameCode, socket.id, playerName);
    }
  }, reconnectionWindow);
}

/**
 * Handle permanent player disconnection (after timeout window)
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 * @param {string} socketId - Socket ID
 * @param {string} playerName - Player name
 */
function handlePermanentDisconnection(io, gameCode, socketId, playerName) {
  // Find the game
  const game = gameService.games.get(gameCode);
  if (!game) return;
  
  // Check if the player is still in the game (they might have reconnected with a new socket)
  if (!game.players.has(socketId)) return;
  
  const wasHost = (socketId === game.hostId);
  
  // Now we can remove the player from the game
  game.removePlayer(socketId);
  
  // Clean up session
  playerSessionManager.removeSession(gameCode, playerName);
  
  // If game is in progress, check win conditions
  if (game.started) {
    if (gameService.checkGameWinConditions(io, gameCode, playerName)) {
      // Game ended, already handled in the helper
      return;
    }
  }
  
  // Broadcast updated player list
  gameService.broadcastPlayerList(io, gameCode);
  
  // Reassign host if needed
  if (wasHost && game.players.size > 0) {
    const newHostId = Array.from(game.players.keys())[0];
    game.hostId = newHostId;
    logger.info(`New host assigned in game ${gameCode}: ${newHostId}`);
    io.to(gameCode).emit('hostChanged', { hostId: newHostId });
  }
}

module.exports = {
  handlePlayerJoin,
  handleSelectCharacter,
  handlePlayerDisconnect,
  handlePlayerReconnection
};