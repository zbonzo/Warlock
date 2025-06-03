/**
 * @fileoverview Controller for player-related operations
 * Handles player joining, character selection, and immediate disconnection
 * Uses centralized config and messaging systems
 */
const gameService = require('@services/gameService');
const { validatePlayerNameSocket } = require('@middleware/validation');
const { validateGameAction } = require('@shared/gameChecks');
const logger = require('@utils/logger');
const errorHandler = require('@utils/errorHandler');
const config = require('@config');
const messages = require('@messages');

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

  if (!validatePlayerNameSocket(socket, playerName, gameCode)) {
    return; // Error already sent by validation function
  }

  // Validate game capacity and player eligibility
  if (!gameService.canPlayerJoinGame(game, socket.id)) return false;

  // Add player and update game state
  const sanitizedName = playerName || config.player.defaultPlayerName;
  const success = game.addPlayer(socket.id, sanitizedName);
  if (!success) {
    errorHandler.throwGameStateError(messages.getError('joinFailed'));
    return false;
  }

  // Join socket to game room and update clients
  socket.join(gameCode);
  logger.info(`Player ${sanitizedName} joined game ${gameCode}`);
  gameService.refreshGameTimeout(io, gameCode);
  gameService.broadcastPlayerList(io, gameCode);

  return true;
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

  // Validate race and class using centralized config
  if (!validateCharacterSelection(race, className)) {
    return false;
  }

  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);

  // Set player class
  game.setPlayerClass(socket.id, race, className);
  logger.info(
    `Player ${socket.id} selected ${race} ${className} in game ${gameCode}`
  );

  // Broadcast updated player list
  gameService.broadcastPlayerList(io, gameCode);

  return true;
}

/**
 * Centralized character selection validation
 * @param {string} race - Selected race
 * @param {string} className - Selected class
 * @returns {boolean} Whether the selection is valid
 * @private
 */
function validateCharacterSelection(race, className) {
  // Use centralized character validation from config - FAIL HARD if not available
  if (!config.races.includes(race)) {
    errorHandler.throwValidationError(messages.getError('invalidRace'));
    return false;
  }

  if (!config.classes.includes(className)) {
    errorHandler.throwValidationError(messages.getError('invalidClass'));
    return false;
  }

  // Use centralized compatibility check - FAIL HARD if not available
  if (!config.isValidCombination(race, className)) {
    errorHandler.throwValidationError(messages.getError('invalidCombination'));
    return false;
  }

  return true;
}

/**
 * Handle player disconnect with battle log integration
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 */
function handlePlayerDisconnect(io, socket) {
  logger.info(`Player disconnected: ${socket.id}`);

  // Find any game this player was in
  let gameFound = false;
  let playerName = 'Unknown Player';
  let gameCode = null;

  for (const [code, game] of gameService.games.entries()) {
    if (game.players.has(socket.id)) {
      gameFound = true;
      gameCode = code;
      const player = game.players.get(socket.id);
      playerName = player ? player.name : 'Unknown Player';

      const wasHost = socket.id === game.hostId;
      const wasAlive = player ? player.isAlive : false;

      // Create thematic disconnection message using centralized messaging
      const disconnectMessage = getThematicDisconnectMessage(playerName);

      // Add disconnection event to the current round's events
      if (game.started && wasAlive) {
        // Create a disconnection event that will appear in the battle log
        const disconnectionEvent = {
          type: 'player_disconnect',
          public: true,
          message: disconnectMessage,
          privateMessage: disconnectMessage,
          attackerMessage: disconnectMessage,
          targetId: socket.id,
          playerName: playerName,
          timestamp: Date.now(),
        };

        // Add the disconnect event to the pending actions as a special event
        game.pendingDisconnectEvents = game.pendingDisconnectEvents || [];
        game.pendingDisconnectEvents.push(disconnectionEvent);

        // Broadcast the disconnection event immediately to all players for UI feedback
        io.to(gameCode).emit('playerDisconnected', {
          playerId: socket.id,
          playerName,
          message: disconnectMessage,
        });
      }

      // Remove player from game
      game.removePlayer(socket.id);

      // Handle host reassignment
      handleHostReassignment(io, game, gameCode, playerName, wasHost);

      // Handle game progression checks
      handleGameProgressionAfterDisconnect(io, game, gameCode, playerName);

      // Broadcast updated player list
      gameService.broadcastPlayerList(io, gameCode);

      logger.info(
        `Player ${playerName} immediately removed from game ${gameCode} with message: ${disconnectMessage}`
      );
      break;
    }
  }

  if (!gameFound) {
    logger.info(`Disconnected player ${socket.id} was not in any active games`);
  }
}

/**
 * Get thematic disconnection message using centralized messaging
 * @param {string} playerName - Name of the disconnected player
 * @returns {string} Thematic disconnection message
 * @private
 */
function getThematicDisconnectMessage(playerName) {
  // Use centralized message formatting - FAIL HARD if not available
  return messages.getEvent('playerLeft', { playerName });
}

/**
 * Handle host reassignment after disconnect
 * @param {Object} io - Socket.IO instance
 * @param {Object} game - Game instance
 * @param {string} gameCode - Game code
 * @param {string} playerName - Disconnected player name
 * @param {boolean} wasHost - Whether the disconnected player was host
 * @private
 */
function handleHostReassignment(io, game, gameCode, playerName, wasHost) {
  if (wasHost && game.players.size > 0) {
    const newHostId = Array.from(game.players.keys())[0];
    game.hostId = newHostId;

    logger.info(`Host ${playerName} disconnected, reassigning to ${gameCode}`);

    // Use centralized messaging for host change - FAIL HARD if not available
    const hostChangeMessage = messages.getEvent('hostChanged', {
      playerName,
    });

    io.to(gameCode).emit('hostChanged', {
      hostId: newHostId,
      message: hostChangeMessage,
    });
  }
}

/**
 * Handle game progression checks after disconnect
 * @param {Object} io - Socket.IO instance
 * @param {Object} game - Game instance
 * @param {string} gameCode - Game code
 * @param {string} playerName - Disconnected player name
 * @private
 */
function handleGameProgressionAfterDisconnect(io, game, gameCode, playerName) {
  if (game.started) {
    // Check win conditions first
    if (gameService.checkGameWinConditions(io, gameCode, playerName)) {
      // Game ended, already handled in the helper
      return;
    }

    // Check if all remaining players have submitted actions
    if (game.allActionsSubmitted()) {
      logger.info(
        `Player disconnect triggered round processing for game ${gameCode}`
      );
      // Small delay to ensure UI updates
      setTimeout(() => {
        gameService.processGameRound(io, gameCode);
      }, 500);
    }
  }
}

/**
 * Handle player reconnection attempt - DISABLED
 * Reconnection is no longer supported with immediate disconnect system
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} playerName - Player name
 * @returns {boolean} Always returns false (reconnection not supported)
 */
function handlePlayerReconnection(io, socket, gameCode, playerName) {
  // Use centralized messaging for reconnection failure - FAIL HARD if not available
  const reconnectionMessage = messages.getError('reconnectionFailed');

  socket.emit('errorMessage', {
    message: reconnectionMessage,
  });
  return false;
}

module.exports = {
  handlePlayerJoin,
  handleSelectCharacter,
  handlePlayerDisconnect,
  handlePlayerReconnection,
};
