/**
 * @fileoverview Game service for managing game rooms and game state
 * Provides utilities for creating, joining, and managing games
 */
const { GameRoom } = require('@models/GameRoom');
const config = require('@config');
const {
  throwGameStateError,
  throwValidationError,
} = require('@utils/errorHandler');
const logger = require('@utils/logger');

// In-memory storage
const games = new Map();
const gameTimers = new Map();

/**
 * Function to create a game timeout
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 */
function createGameTimeout(io, gameCode) {
  // Clear any existing timer for this game
  if (gameTimers.has(gameCode)) {
    clearTimeout(gameTimers.get(gameCode));
  }

  const timerId = setTimeout(() => {
    logger.info('GameTimedOut', { gameCode });
    // Notify any connected players before deleting
    if (games.has(gameCode)) {
      io.to(gameCode).emit(messages.getError('gameTimeout'));
    }
    // Clean up the game
    games.delete(gameCode);
    gameTimers.delete(gameCode);
  }, config.gameTimeout);

  // Store the timer
  gameTimers.set(gameCode, timerId);
}

/**
 * Function to refresh the timeout (call this whenever there's activity in a game)
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 */
function refreshGameTimeout(io, gameCode) {
  if (games.has(gameCode)) {
    createGameTimeout(io, gameCode);
  }
}

/**
 * Create a new game
 * @param {string} gameCode - Game code
 * @returns {GameRoom|null} New game room or null if creation failed
 */
function createGame(gameCode) {
  // Check if we already have too many games
  const maxGames = config.maxGames || 100; // Default max games
  if (games.size >= maxGames) {
    // Prevent server overload
    throwGameStateError(
      'Server is too busy right now. Please try again later.'
    );
    return null;
  }

  const game = new GameRoom(gameCode);
  games.set(gameCode, game);
  return game;
}

/**
 * Generate a unique game code
 * @returns {string} Four-digit game code
 */
function generateGameCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (games.has(code));

  return code;
}

/**
 * Check if a player can join a game
 * @param {GameRoom} game - Game room to check
 * @param {string} playerId - Player's socket ID
 * @returns {boolean} Whether the player can join
 */
function canPlayerJoinGame(game, playerId) {
  // Check if game is full based on config max players
  if (game.players.size >= config.maxPlayers) {
    throwGameStateError(`Game is full (${config.maxPlayers} players max).`);
    return false;
  }

  // Check if player is already in this game
  if (game.players.has(playerId)) {
    throwValidationError('You are already in this game.');
    return false;
  }

  return true;
}

/**
 * Helper to broadcast updated player list to a game room
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 */
function broadcastPlayerList(io, gameCode) {
  const game = games.get(gameCode);
  if (game) {
    io.to(gameCode).emit('playerList', {
      players: game.getPlayersInfo(),
      host: game.hostId,
    });
  }
}

/**
 * Process game round with proper phase management
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 * @returns {Object|null} Round result or null if game not found
 */
function processGameRound(io, gameCode) {
  const game = games.get(gameCode);
  if (!game) return null;

  // Set phase to results before processing
  game.phase = 'results';

  // Process the round
  const result = game.processRound();

  // Broadcast the results with phase information
  io.to(gameCode).emit('roundResult', {
    ...result,
    phase: game.phase, // Include current phase
  });

  // Broadcast phase update specifically
  io.to(gameCode).emit('gamePhaseUpdate', {
    phase: game.phase,
    round: result.turn,
  });

  // If there was a level-up, emit a specific event
  if (result.levelUp) {
    io.to(gameCode).emit('levelUp', {
      level: result.level,
      oldLevel: result.levelUp.oldLevel,
      players: result.players,
      phase: game.phase,
    });
  }

  // Check if game is over
  if (result.winner) {
    logger.info('GameEnded', { gameCode, winner: result.winner });
    // Clean up the game
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
    games.delete(gameCode);
  }

  return result;
}

module.exports = { processGameRound };

/**
 * Check win conditions (for disconnects)
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 * @param {string} disconnectedPlayerName - Name of disconnected player
 * @returns {boolean} Whether the game ended
 */
function checkGameWinConditions(io, gameCode, disconnectedPlayerName) {
  const game = games.get(gameCode);
  if (!game) return false;

  const pendingResurrections =
    game.systems.gameStateUtils.countPendingResurrections();
  if (pendingResurrections > 0) {
    logger.debug(
      `Disconnect win check: ${pendingResurrections} pending resurrections, not ending game`
    );
    return false; // Don't end game, resurrections are coming
  }
  // Check if all warlocks are gone
  if (game.systems.warlockSystem.getWarlockCount() <= 0) {
    io.to(gameCode).emit('roundResult', {
      eventsLog: [
        `${disconnectedPlayerName} left the game. All Warlocks are gone.`,
      ],
      players: game.getPlayersInfo(),
      winner: 'Good',
    });

    // Clean up the game
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
    games.delete(gameCode);
    return true;
  }
  // Check if only warlocks remain
  else if (
    game.systems.warlockSystem.getWarlockCount() ===
    game.getAlivePlayers().length
  ) {
    io.to(gameCode).emit('roundResult', {
      eventsLog: [`${disconnectedPlayerName} left the game.`],
      players: game.getPlayersInfo(),
      winner: 'Evil',
    });

    // Clean up the game
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
    games.delete(gameCode);
    return true;
  }
  return false;
}

/**
 * Determine if players are waiting for actions
 * @param {GameRoom} game - Game room
 * @returns {boolean} Whether the game is waiting for player actions
 */
function isWaitingForActions(game) {
  if (!game.started) return false;

  const alivePlayers = game.getAlivePlayers();
  const unstunnedPlayers = alivePlayers.filter(
    (p) => !game.systems.statusEffectManager.isPlayerStunned(p.id)
  );

  return game.pendingActions.length < unstunnedPlayers.length;
}

/**
 * Determine if the game is currently showing round results
 * @param {GameRoom} game - Game room
 * @returns {boolean} Whether the game is in round results phase
 */
function isInRoundResults(game) {
  if (!game.started) return false;

  // This is tricky to determine without additional state
  // For now, we'll assume if actions are submitted but not processed, we're in results
  const alivePlayers = game.getAlivePlayers();
  const unstunnedPlayers = alivePlayers.filter(
    (p) => !game.systems.statusEffectManager.isPlayerStunned(p.id)
  );

  // If we have all actions, we might be processing or showing results
  return game.pendingActions.length >= unstunnedPlayers.length;
}

/**
 * Get game statistics for debugging
 * @returns {Object} Game statistics
 */
function getGameStats() {
  return {
    totalGames: games.size,
    activeTimers: gameTimers.size,
    gameList: Array.from(games.keys()),
  };
}

/**
 * Force cleanup a game (for testing/debugging)
 * @param {string} gameCode - Game code to cleanup
 * @returns {boolean} Whether cleanup was successful
 */
function forceCleanupGame(gameCode) {
  const hasGame = games.has(gameCode);
  const hasTimer = gameTimers.has(gameCode);

  if (hasTimer) {
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
  }

  if (hasGame) {
    games.delete(gameCode);
  }

  logger.info(
    `Force cleaned up game ${gameCode} (had game: ${hasGame}, had timer: ${hasTimer})`
  );
  return hasGame || hasTimer;
}

/**
 * Create a new game with a specific code (for play again functionality)
 * @param {string} gameCode - Specific game code to use
 * @returns {GameRoom|null} New game room or null if creation failed
 */
function createGameWithCode(gameCode) {
  // Check if code is already in use
  if (games.has(gameCode)) {
    return null; // Code already exists
  }

  // Check if we already have too many games
  const maxGames = config.maxGames || 100;
  if (games.size >= maxGames) {
    throwGameStateError(messages.getError('serverBusy'));
    return null;
  }

  const game = new GameRoom(gameCode);
  games.set(gameCode, game);
  logger.info(`Created replay game with code ${gameCode}`);
  return game;
}

/**
 * Cleanup expired disconnected players across all games
 * @param {Object} io - Socket.IO instance for notifications
 */
function cleanupExpiredDisconnectedPlayers(io) {
  let totalCleaned = 0;
  
  for (const [gameCode, game] of games.entries()) {
    const cleanedPlayerNames = game.cleanupDisconnectedPlayers();
    totalCleaned += cleanedPlayerNames.length;
    
    if (cleanedPlayerNames.length > 0) {
      logger.info('CleanedUpDisconnectedPlayers', {
        gameCode,
        cleanedPlayers: cleanedPlayerNames,
        count: cleanedPlayerNames.length
      });
    }
  }
  
  if (totalCleaned > 0) {
    logger.info('DisconnectedPlayersCleanupComplete', {
      totalCleaned,
      activeGames: games.size
    });
  }
}

// Run cleanup every 5 minutes
setInterval(() => {
  cleanupExpiredDisconnectedPlayers();
}, 5 * 60 * 1000);

module.exports = {
  games,
  gameTimers,
  createGameTimeout,
  refreshGameTimeout,
  createGame,
  generateGameCode,
  broadcastPlayerList,
  processGameRound,
  checkGameWinConditions,
  canPlayerJoinGame,
  isWaitingForActions,
  isInRoundResults,
  createGameWithCode,
  cleanupExpiredDisconnectedPlayers,

  // Debug/utility functions
  getGameStats,
  forceCleanupGame,
};
