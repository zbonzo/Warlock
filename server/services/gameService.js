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
const playerSessionManager = require('./PlayerSessionManager');

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
    logger.info(`Game ${gameCode} timed out after inactivity`);
    // Notify any connected players before deleting
    if (games.has(gameCode)) {
      io.to(gameCode).emit('gameTimeout', {
        message: 'Game ended due to inactivity',
      });
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
 * Process game round
 * @param {Object} io - Socket.IO instance
 * @param {string} gameCode - Game code
 * @returns {Object|null} Round result or null if game not found
 */
function processGameRound(io, gameCode) {
  const game = games.get(gameCode);
  if (!game) return null;

  // Process the round
  const result = game.processRound();

  // Broadcast the results
  io.to(gameCode).emit('roundResult', result);

  // If there was a level-up, emit a specific event
  if (result.levelUp) {
    io.to(gameCode).emit('levelUp', {
      level: result.level,
      oldLevel: result.levelUp.oldLevel,
      players: result.players,
    });
  }

  // Check if game is over
  if (result.winner) {
    logger.info(`Game ${gameCode} ended. Winner: ${result.winner}`);
    // Clean up the game
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
    games.delete(gameCode);
  }

  return result;
}

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
 * Handle reconnection of a player to a game
 * @param {string} gameCode - Game code
 * @param {string} playerName - Player name
 * @param {string} newSocketId - New socket ID
 * @returns {Object|false} Reconnection data or false if failed
 */
function processReconnection(gameCode, playerName, newSocketId) {
  // Check if the game exists
  const game = games.get(gameCode);
  if (!game) {
    logger.warn(`Reconnection failed: Game ${gameCode} not found`);
    return false;
  }

  // Check for existing session
  const sessionData = playerSessionManager.getSession(gameCode, playerName);
  if (!sessionData) {
    logger.warn(
      `Reconnection failed: No active session for ${playerName} in game ${gameCode}`
    );
    return false;
  }

  // Get old socket ID
  const oldSocketId = sessionData.socketId;

  // Update the session with the new socket ID
  playerSessionManager.updateSocketId(gameCode, playerName, newSocketId);

  // Check if player is already in the game with old socket ID
  if (game.players.has(oldSocketId)) {
    logger.info(
      `Reconnecting ${playerName} to game ${gameCode} (${oldSocketId} -> ${newSocketId})`
    );

    // Transfer player to the new socket ID using the GameRoom method
    const transferred = game.transferPlayerId(oldSocketId, newSocketId);

    if (!transferred) {
      logger.error(`Failed to transfer player data for ${playerName}`);
      return false;
    }

    // Get additional game state information
    const gameState = {
      // Basic game info
      game,
      oldSocketId,
      players: game.getPlayersInfo(),
      monster: game.systems.monsterController.getState(),
      turn: game.round,
      level: game.level,
      started: game.started,
      host: game.hostId,

      // Additional context for proper screen routing
      waitingForActions: isWaitingForActions(game),
      inRoundResults: isInRoundResults(game),

      // Ready state info for lobby
      nextReady: Array.from(game.nextReady || []),

      // Action state
      pendingActionsCount: game.pendingActions ? game.pendingActions.length : 0,

      // Game timing info
      lastActivity: Date.now(),
    };

    // Return the comprehensive reconnection data
    return gameState;
  } else {
    logger.warn(
      `Player ${playerName} not found in game with old socket ID: ${oldSocketId}`
    );
    return false;
  }
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
  processReconnection,
  isWaitingForActions,
  isInRoundResults,

  // Debug/utility functions
  getGameStats,
  forceCleanupGame,
};
