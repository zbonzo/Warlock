/**
 * @fileoverview Controller for player-related operations
 * Handles player joining, character selection, and immediate disconnection
 */
const gameService = require('@services/gameService');
const { validatePlayerName } = require('@middleware/validation');
const { validateGame } = require('@middleware/validation');
const { validateGameAction } = require('@shared/gameChecks');
const logger = require('@utils/logger');
const errorHandler = require('@utils/errorHandler');
const playerSessionManager = require('@services/PlayerSessionManager');
const config = require('@config');

/**
 * Get an error message or fall back if it's missing
 * @param {string} key   Error key
 * @param {string} fallback  Fallback message if key not found
 * @returns {string}
 */
function getErrorMessage(key, fallback) {
  return config?.messages?.errors?.[key] ?? fallback;
}

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
    errorHandler.throwGameStateError(
      getErrorMessage('joinFailed', 'Could not join game.')
    );
    /* istanbul ignore next */
    return false; // This covers the edge case where throwGameStateError doesn't throw
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
  logger.info(
    `Player ${socket.id} selected ${race} ${className} in game ${gameCode}`
  );

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
  const validRaces = config.races || [
    'Human',
    'Dwarf',
    'Elf',
    'Orc',
    'Satyr',
    'Skeleton',
  ];
  const validClasses = config.classes || [
    'Warrior',
    'Pyromancer',
    'Wizard',
    'Assassin',
    'Alchemist',
    'Priest',
    'Oracle',
    'Seer',
    'Shaman',
    'Gunslinger',
    'Tracker',
    'Druid',
  ];

  // Use class-race compatibility from config if available
  const classToRaces = config.classRaceCompatibility || {
    Warrior: ['Human', 'Dwarf', 'Skeleton'],
    Pyromancer: ['Dwarf', 'Skeleton', 'Orc'],
    Wizard: ['Human', 'Elf', 'Skeleton'],
    Assassin: ['Human', 'Elf', 'Skeleton'],
    Alchemist: ['Human', 'Elf', 'Satyr'],
    Priest: ['Human', 'Dwarf', 'Skeleton'],
    Oracle: ['Dwarf', 'Satyr', 'Orc'],
    Seer: ['Elf', 'Satyr', 'Orc'],
    Shaman: ['Dwarf', 'Satyr', 'Orc'],
    Gunslinger: ['Human', 'Dwarf', 'Skeleton'],
    Tracker: ['Elf', 'Satyr', 'Orc'],
    Druid: ['Elf', 'Satyr', 'Orc'],
  };

  if (!validRaces.includes(race)) {
    errorHandler.throwValidationError(
      getErrorMessage('invalidRace', 'Invalid race selection.')
    );
  }

  // Check if class exists in classes array OR in classRaceCompatibility
  const classExistsInList = validClasses.includes(className);
  const classExistsInCompatibility = Object.prototype.hasOwnProperty.call(
    classToRaces,
    className
  );

  if (!classExistsInList && !classExistsInCompatibility) {
    errorHandler.throwValidationError(
      getErrorMessage('invalidClass', 'Invalid race and class combination.')
    );
  }

  // For a class to be valid, it must exist in the main classes list
  // The compatibility check is secondary
  if (!classExistsInList) {
    errorHandler.throwValidationError(
      getErrorMessage('invalidClass', 'Invalid race and class combination.')
    );
  }

  // Check race-class compatibility
  const allowedRaces = classToRaces[className] || [];
  if (!allowedRaces.includes(race)) {
    errorHandler.throwValidationError(
      getErrorMessage(
        'invalidCombination',
        'Invalid race and class combination.'
      )
    );
  }

  return true;
}

/**
 * Get the thematic disconnection message
 * @param {string} playerName - Name of the disconnected player
 * @returns {string} Thematic disconnection message
 */
function getDisconnectMessage(playerName) {
  return `${playerName} wandered into the forest to discover that there are many more monsters and they were very much unequipped.`;
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

      // Create thematic disconnection message
      const disconnectMessage = getDisconnectMessage(playerName);

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
        // This way it gets processed with the current round when processRound() is called
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

      // Clean up any session data
      playerSessionManager.removeSession(gameCode, playerName);

      // If this was the host, reassign immediately
      if (wasHost && game.players.size > 0) {
        const newHostId = Array.from(game.players.keys())[0];
        game.hostId = newHostId;

        logger.info(
          `Host ${playerName} disconnected, reassigning to ${gameCode}`
        );

        io.to(gameCode).emit('hostChanged', {
          hostId: newHostId,
          message: `${playerName} left the game. Host transferred to another player.`,
        });
      }

      // If game is in progress, check win conditions
      if (game.started) {
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
 * Handle player reconnection attempt - REMOVED FUNCTIONALITY
 * Since we're doing immediate disconnect, reconnection is no longer supported
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} playerName - Player name
 * @returns {boolean} Always returns false (reconnection not supported)
 */
function handlePlayerReconnection(io, socket, gameCode, playerName) {
  // Reconnection is no longer supported - treat as a new join attempt
  socket.emit('errorMessage', {
    message: 'Reconnection is not supported. Please join a new game.',
  });
  return false;
}

module.exports = {
  handlePlayerJoin,
  handleSelectCharacter,
  handlePlayerDisconnect,
  handlePlayerReconnection,
};
