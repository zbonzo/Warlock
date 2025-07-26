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
    errorHandler.throwGameStateError(messages.getError('couldNotJoinGame'));
    return false;
  }

  // Join socket to game room and update clients
  socket.join(gameCode);
  logger.info('PlayerJoinedGame', {
    playerName: sanitizedName,
    gameCode,
    socketId: socket.id,
  });
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
function handlePlayerSelectCharacter(io, socket, gameCode, race, className) {
  // Use consolidated validation
  const game = validateGameAction(socket, gameCode, false, false);

  // Get player name for better logging
  const player = game.players.get(socket.id);
  const playerName = player ? player.name : 'Unknown';

  // Validate race and class using centralized config
  if (!validateCharacterSelection(race, className, playerName)) {
    return false;
  }

  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);

  // Set player class
  game.setPlayerClass(socket.id, race, className);
  logger.info('PlayerSelectedCharacter', {
    socketId: socket.id,
    race,
    className,
    gameCode,
  });
  // Broadcast updated player list
  gameService.broadcastPlayerList(io, gameCode);

  return true;
}

/**
 * Centralized character selection validation
 * @param {string} race - Selected race
 * @param {string} className - Selected class
 * @param {string} playerName - Player name for logging
 * @returns {boolean} Whether the selection is valid
 * @private
 */
function validateCharacterSelection(race, className, playerName = 'Unknown') {
  // Use centralized character validation from config - FAIL HARD if not available
  if (!config.races.includes(race)) {
    const errorMessage = messages.getError('invalidRace', { race });
    logger.warn('InvalidRaceSelection', {
      race,
      className,
      playerName,
      availableRaces: config.races,
      message: errorMessage
    });
    errorHandler.throwValidationError(errorMessage);
    return false;
  }

  if (!config.classes.includes(className)) {
    const errorMessage = messages.getError('invalidClass', { className });
    logger.warn('InvalidClassSelection', {
      race,
      className,
      playerName,
      availableClasses: config.classes,
      message: errorMessage
    });
    errorHandler.throwValidationError(errorMessage);
    return false;
  }

  // Use centralized compatibility check - FAIL HARD if not available
  if (!config.isValidCombination(race, className)) {
    const errorMessage = messages.getError('invalidCombination', { race, className });
    logger.warn('InvalidRaceClassCombination', {
      race,
      className,
      playerName,
      compatibleClasses: config.raceAttributes[race]?.compatibleClasses || [],
      message: errorMessage
    });
    errorHandler.throwValidationError(errorMessage);
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
  logger.info('PlayerDisconnected', {
    socketId: socket.id,
  });

  // Find any game this player was in
  let gameFound = false;
  let playerName = config.player.defaultPlayerName;
  let gameCode = null;

  for (const [code, game] of gameService.games.entries()) {
    if (game.players.has(socket.id)) {
      gameFound = true;
      gameCode = code;
      const player = game.players.get(socket.id);
      playerName = player ? player.name : config.player.defaultPlayerName;

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

      // If game has started, move player to disconnected state for potential reconnection
      // Otherwise, remove player completely
      if (game.started) {
        // Move player to disconnected players array
        const player = game.players.get(socket.id);
        if (player) {
          game.disconnectedPlayers.push({
            ...player,
            disconnectedAt: Date.now(),
            originalSocketId: socket.id
          });
          
          // Remove from active players but keep in disconnected list
          game.players.delete(socket.id);
          if (player.isAlive) {
            game.aliveCount--;
          }
          
          logger.info('PlayerMovedToDisconnectedState', {
            playerName,
            gameCode,
            socketId: socket.id,
            disconnectedPlayersCount: game.disconnectedPlayers.length
          });
        }
      } else {
        // Remove player completely if game hasn't started
        game.removePlayer(socket.id);
      }

      // Handle host reassignment
      handleHostReassignment(io, game, gameCode, playerName, wasHost);

      // Handle game progression checks
      handleGameProgressionAfterDisconnect(io, game, gameCode, playerName);

      // Broadcast updated player list
      gameService.broadcastPlayerList(io, gameCode);

      logger.info('PlayerRemovedFromGame', {
        playerName,
        gameCode,
        socketId: socket.id,
        message: disconnectMessage,
      });
      break;
    }
  }

  if (!gameFound) {
    logger.info('PlayerNotInAnyGame', {
      socketId: socket.id,
    });
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
    const newHostPlayer = game.players.get(newHostId);
    const newHostName = newHostPlayer
      ? newHostPlayer.name
      : config.player.defaultPlayerName;
    game.hostId = newHostId;

    logger.info('HostReassignedAfterDisconnect', {
      oldHostName: playerName,
      newHostName,
      gameCode,
      newHostId,
    });

    // Use centralized messaging for host change - FAIL HARD if not available
    const hostChangeMessage = messages.getEvent('hostChanged', {
      playerName: newHostName,
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
    if (game.allActionsSubmittedSafe()) {
      logger.info('PlayerDisconnectTriggeredRoundProcessing', {
        gameCode,
        playerName,
      });
      // Small delay to ensure UI updates
      setTimeout(() => {
        gameService.processGameRound(io, gameCode);
      }, 500);
    }
  }
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
    const game = gameService.games.get(gameCode);
    if (!game) {
      socket.emit('errorMessage', { message: messages.getError('gameNotFound') });
      return false;
    }

    // Look for the player in disconnected players
    const disconnectedPlayerIndex = game.disconnectedPlayers.findIndex(
      player => player.name === playerName
    );

    if (disconnectedPlayerIndex === -1) {
      socket.emit('errorMessage', { 
        message: messages.getError('playerNotFoundForReconnection')
      });
      return false;
    }

    const disconnectedPlayer = game.disconnectedPlayers[disconnectedPlayerIndex];
    
    // Check if reconnection timeout has expired (e.g., 10 minutes)
    const reconnectionTimeout = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - disconnectedPlayer.disconnectedAt > reconnectionTimeout) {
      // Remove from disconnected players
      game.disconnectedPlayers.splice(disconnectedPlayerIndex, 1);
      socket.emit('errorMessage', { 
        message: messages.getError('reconnectionTimeoutExpired')
      });
      return false;
    }

    // Restore the player with new socket ID
    // Create a new Player instance from the disconnected data
    const Player = require('@models/Player');
    const restoredPlayer = Object.assign(new Player(socket.id, disconnectedPlayer.name), disconnectedPlayer);
    
    // FIXED: Ensure stats are properly restored
    if (disconnectedPlayer.stats) {
      restoredPlayer.stats = { ...disconnectedPlayer.stats };
    }
    
    // Clean up disconnect metadata
    delete restoredPlayer.disconnectedAt;
    delete restoredPlayer.originalSocketId;
    
    // Add new socket ID to tracking
    restoredPlayer.addSocketId(socket.id);
    
    // Add back to active players
    game.players.set(socket.id, restoredPlayer);
    if (restoredPlayer.isAlive) {
      game.aliveCount++;
    }
    
    // Remove from disconnected players
    game.disconnectedPlayers.splice(disconnectedPlayerIndex, 1);
    
    // Join socket to game room
    socket.join(gameCode);
    
    // If this was the host and no one else is host, restore as host
    if (restoredPlayer.originalSocketId === game.hostId || !game.hostId) {
      game.hostId = socket.id;
    }
    
    logger.info('PlayerReconnectedSuccessfully', {
      playerName,
      gameCode,
      oldSocketId: disconnectedPlayer.originalSocketId,
      newSocketId: socket.id,
      socketIds: restoredPlayer.socketIds
    });

    // Refresh game timeout and broadcast updates
    gameService.refreshGameTimeout(io, gameCode);
    gameService.broadcastPlayerList(io, gameCode);
    
    // Emit reconnection success to the player
    socket.emit('gameReconnected', {
      players: Array.from(game.players.values()).map(p => p.toClientData()),
      me: restoredPlayer.toClientData(true, socket.id),
      monster: game.monster,
      turn: game.round,
      level: game.level,
      started: game.started,
      host: game.hostId,
      phase: game.phase,
      gameCode: gameCode
    });
    
    // Notify other players of reconnection
    socket.to(gameCode).emit('playerReconnected', {
      playerId: socket.id,
      playerName,
      message: messages.formatMessage(
        messages.getEvent('playerReconnected') || '{playerName} has reconnected.',
        { playerName }
      )
    });

    return true;
  } catch (error) {
    logger.error('ReconnectionError', {
      error: error.message,
      stack: error.stack,
      gameCode,
      playerName,
      socketId: socket.id
    });
    
    socket.emit('errorMessage', {
      message: messages.getError('reconnectionFailed')
    });
    return false;
  }
}

module.exports = {
  handlePlayerJoin,
  handlePlayerSelectCharacter,
  handlePlayerDisconnect,
  handlePlayerReconnection,
};
