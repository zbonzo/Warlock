/**
 * @fileoverview Controller for game creation, management, and state transitions
 * Handles game-related socket events and operations
 */
const gameService = require('@services/gameService');
const {
  validatePlayerNameSocket,
  validatePlayerName,
  suggestValidName,
} = require('@middleware/validation');
const { validateGameAction } = require('@shared/gameChecks');
const logger = require('@utils/logger');
const config = require('@config');
const messages = require('@messages');
const { EventTypes } = require('../models/events/EventTypes');

/**
 * Helper function to emit events through EventBus or fallback to direct socket emission
 * @param {Object} socket - Socket instance
 * @param {string} gameCode - Game code
 * @param {string} eventType - EventBus event type
 * @param {Object} eventData - Event data
 * @param {string} fallbackEvent - Fallback socket event name
 * @param {Object} fallbackData - Fallback socket event data
 */
function emitThroughEventBusOrSocket(socket, gameCode, eventType, eventData, fallbackEvent, fallbackData) {
  const game = gameService.games.get(gameCode);
  if (game && game.getEventBus()) {
    game.getEventBus().emit(eventType, {
      socketId: socket.id,
      ...eventData
    });
  } else {
    socket.emit(fallbackEvent, fallbackData);
  }
}

const { throwGameStateError } = require('@utils/errorHandler');

/**
 * Handle game creation request
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} playerName - Name of the creating player
 * @returns {boolean} Success status
 */
function handleGameCreate(io, socket, playerName) {
  // Validate player name

  if (!validatePlayerNameSocket(socket, playerName)) {
    return; // Error already sent by validation function
  }

  // Generate a unique game code
  const gameCode = gameService.generateGameCode();

  // Create a new game room
  const game = gameService.createGame(gameCode);
  if (!game) return false; // Handle case where game creation fails

  // Initialize the SocketEventRouter for this game
  game.setSocketServer(io);

  // Add this socket as a player (host) in the new game
  game.addPlayer(socket.id, playerName);
  socket.join(gameCode);
  
  // Register the socket with the event router
  game.registerSocket(socket);
  game.mapPlayerSocket(socket.id, socket.id);
  logger.info(
    messages.formatMessage(messages.serverLogMessages.info.GameCreated, {
      gameCode,
      playerName,
    })
  );

  // Create timeout for the new game
  gameService.createGameTimeout(io, gameCode);

  // Send the game code back to the host through EventBus
  if (game.getEventBus()) {
    game.getEventBus().emit(EventTypes.CONTROLLER.GAME_CREATED, {
      socketId: socket.id,
      gameCode: gameCode
    });
  } else {
    // Fallback for games without EventBus
    socket.emit('gameCreated', { gameCode: gameCode });
  }

  // Broadcast the updated player list
  gameService.broadcastPlayerList(io, gameCode);

  return true;
}

/**
 * Handle name availability checking with proper error handling
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code to check
 * @param {string} playerName - Player name to validate
 * @returns {boolean} Success status
 */
function handleGameCheckName(io, socket, gameCode, playerName) {
  try {
    // Check if game exists first, without throwing errors
    const game = gameService.games.get(gameCode);

    if (!game) {
      // Game doesn't exist - send appropriate response
      socket.emit('nameCheckResponse', {
        isAvailable: false,
        error: messages.errors.gameNotFound,
        suggestion: null,
      });
      return false;
    }

    // Game exists, proceed with name validation
    const existingPlayers = Array.from(game.players.values());
    const validation = validatePlayerName(playerName, existingPlayers);

    socket.emit('nameCheckResponse', {
      isAvailable: validation.isValid,
      error: validation.error,
      suggestion: validation.isValid ? null : suggestValidName(playerName),
    });

    return true;
  } catch (error) {
    // Handle any unexpected errors
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.NameAvailabilityCheckError,
        { gameCode, playerName }
      ),
      error
    );

    socket.emit('nameCheckResponse', {
      isAvailable: false,
      error: messages.getError('nameCheckUnavailable'),
      suggestion: null,
    });

    return false;
  }
}

/**
 * Handle game start request
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Success status
 */
function handleGameStart(io, socket, gameCode) {
  // Use the combined validation to reduce redundancy
  const game = validateGameAction(socket, gameCode, false, true);

  // Check minimum player count
  if (game.players.size < config.minPlayers) {
    throwGameStateError(
      messages.getError('notEnoughPlayers', {
        minPlayers: config.minPlayers,
      })
    );
    return false;
  }

  // Check if all players have selected characters
  const allPlayersReady = Array.from(game.players.values()).every(
    (p) => p.race && p.class
  );
  if (!allPlayersReady) {
    throwGameStateError(messages.errors.allPlayersNotReady);
    return false;
  }

  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);

  // Start the game with scaled warlock assignment
  game.started = true;
  game.round = 1;

  const assignedWarlocks = game.assignInitialWarlock(); // Now returns array
  const warlockCount = assignedWarlocks.length;
  const playerCount = game.players.size;

  logger.info(
    messages.formatMessage(messages.serverLogMessages.info.GameStarted, {
      gameCode,
      warlockCount,
      playerCount,
    })
  );

  // Create appropriate start message based on warlock count
  let warlockMessage;
  if (warlockCount === 1) {
    warlockMessage = messages.getEvent('warlockChosenSingle');
  } else {
    warlockMessage = messages.formatMessage(
      messages.getAbilityMessage('warlock', 'scaling.multipleWarlocksAssigned'),
      { count: warlockCount }
    );
  }

  // Inform all players that the game has started
  io.to(gameCode).emit('gameStarted', {
    players: game.getPlayersInfo(),
    turn: game.round,
    monster: {
      hp: game.monster.hp,
      maxHp: game.monster.maxHp,
      nextDamage: config.gameBalance.calculateMonsterDamage(game.monster.age),
    },
    warlockInfo: {
      count: warlockCount,
      message: warlockMessage,
      scalingEnabled: config.gameBalance.warlock.scaling.enabled,
    },
  });

  // Send initial corruption event privately to assigned warlocks
  const initialCorruptionEvent = {
    type: 'corruption',
    public: false,
    message: '',
    privateMessage: messages.getAbilityMessage(
      'warlock',
      'private.youWereCorrupted'
    ),
    attackerMessage: '',
    moveToEnd: false,
  };

  assignedWarlocks.forEach((w) => {
    io.to(w.id).emit('privateEvent', {
      events: [{ ...initialCorruptionEvent, targetId: w.id }],
    });
  });

  return true;
}

/**
 * Handle player action submission using command system (Phase 2 enhancement)
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Type of action
 * @param {string} targetId - Target of the action
 * @param {Object} options - Additional options
 * @returns {boolean} Success status
 */
async function handleGameAction(
  io,
  socket,
  gameCode,
  actionType,
  targetId,
  options = {}
) {
  try {
    // Use the combined validation for basic game state
    const game = validateGameAction(socket, gameCode, true, false);
    if (!game) {
      emitThroughEventBusOrSocket(
        socket, 
        gameCode, 
        EventTypes.CONTROLLER.ERROR,
        { 
          message: messages.getError('gameOrStateInvalid'),
          type: 'validation_error'
        },
        'errorMessage',
        { message: messages.getError('gameOrStateInvalid') }
      );
      return false;
    }

    // Get the player
    const player = game.getPlayerBySocketId(socket.id);
    if (!player) {
      emitThroughEventBusOrSocket(
        socket,
        gameCode,
        EventTypes.CONTROLLER.ERROR,
        { 
          message: messages.errors.playerNotFound,
          type: 'player_error'
        },
        'errorMessage',
        { message: messages.errors.playerNotFound }
      );
      return false;
    }

    // Create action data for command system
    const actionData = {
      actionType: 'ability', // All actions from this handler are abilities
      targetId,
      abilityId: actionType,
      metadata: options
    };

    // Submit action through command system (Phase 2 enhancement)
    try {
      const commandId = await game.submitPlayerAction(player.id, actionData);
      
      // Refresh game timeout
      gameService.refreshGameTimeout(io, gameCode);

      logger.info(
        messages.formatMessage(
          messages.serverLogMessages.info.PlayerPerformedAction,
          {
            playerName: player.name,
            socketId: socket.id,
            actionType,
            targetId,
            gameCode,
            commandId
          }
        )
      );

      // Send success confirmation with command ID through EventBus
      game.getEventBus().emit(EventTypes.ACTION.SUBMITTED, {
        socketId: socket.id,
        actionType,
        targetId,
        commandId,
        success: true,
        message: messages.getSuccess('actionSubmitted'),
        timestamp: new Date().toISOString()
      });

      // Broadcast updated player list with submission status
      io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });

      // Check if all alive players have submitted actions
      if (game.allActionsSubmittedSafe()) {
        logger.info(
          messages.formatMessage(
            messages.serverLogMessages.info.AllActionsSubmitted,
            { gameCode }
          )
        );

        // Small delay to ensure UI updates
        setTimeout(async () => {
          await gameService.processGameRound(io, gameCode);
        }, 500);
      }

      return true;

    } catch (commandError) {
      // Handle command validation/execution errors
      const errorMessage = commandError.message || messages.getError('actionSubmitFailed');
      
      socket.emit('errorMessage', {
        message: errorMessage,
        type: 'command_error'
      });
      
      logger.error('Command submission failed:', {
        playerId: player.id,
        actionType,
        targetId,
        error: errorMessage,
        stack: commandError.stack,
        gameCode
      });
      
      return false;
    }
  } catch (error) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.HandlePerformActionError,
        { gameCode, errorDetails: error.message }
      ),
      error
    );
    socket.emit('errorMessage', {
      message: messages.getError('actionProcessingError'),
      type: 'server_error',
    });
    return false;
  }
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
function handleGameRacialAbility(io, socket, gameCode, targetId, abilityType) {
  // Use the combined validation
  const game = validateGameAction(socket, gameCode, true, false);

  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);

  // Get player info
  const player = game.players.get(socket.id);

  // Special handling for Artisan Adaptability
  if (abilityType === 'adaptability' && player.race === 'Artisan') {
    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerUsedAdaptability,
        {
          playerName: player.name,
          socketId: socket.id,
          gameCode,
        }
      )
    );

    // First check if they have uses left
    if (player.racialUsesLeft <= 0) {
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.AdaptabilityNoUsesLeft,
          { playerName: player.name }
        )
      );
      socket.emit('racialAbilityUsed', {
        success: false,
        message: messages.getError('noUsesLeft', {
          abilityName: 'Adaptability',
        }),
      });
      return false;
    }

    // Mark the ability as used
    const success = game.addRacialAction(socket.id, targetId);

    if (success) {
      // Get the player's current abilities and level for the modal
      /* istanbul ignore next */
      const abilities = player.abilities;
      /* istanbul ignore next */
      const maxLevel = player.level || 1;
      /* istanbul ignore next */
      logger.debug(`=== ADAPTABILITY DEBUG ===
        Player: ${player.name} (${socket.id})
        Level: ${maxLevel}
      `);

      // If abilities is not properly formatted, convert it
      /* istanbul ignore next */
      let formattedAbilities = abilities;

      // Check if abilities is an array instead of expected object format
      /* istanbul ignore next */
      if (Array.isArray(abilities)) {
        logger.debug('Converting abilities array to object by level...');
        formattedAbilities = abilities.reduce((acc, ability) => {
          const level = ability.unlockAt || 1;
          acc[level] = acc[level] || [];
          acc[level].push(ability);
          return acc;
        }, {});
      }

      // Send the adaptability modal data
      socket.emit('adaptabilityChooseAbility', {
        abilities: formattedAbilities,
        maxLevel,
      });

      // Update all players with new player state
      io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
      socket.emit('racialAbilityUsed', {
        success: true,
        message: messages.success.adaptabilityTriggered,
      });
    } else {
      logger.warn(
        messages.formatMessage(
          messages.serverLogMessages.warn.AdaptabilityUseFailed,
          { playerName: player.name }
        )
      );
      socket.emit('racialAbilityUsed', {
        success: false,
        message: messages.errors.adaptabilityFailed,
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
      message: messages.success.racialAbilityUsed,
    });
  } else {
    socket.emit('racialAbilityUsed', {
      success: false,
      message: messages.errors.racialAbilityUsed,
    });
  }

  return success;
}

/**
 * Handle ability replacement from Artisan Adaptability racial
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} oldAbilityType - Ability being replaced
 * @param {string} newAbilityType - New ability
 * @param {number} level - Ability level
 * @param {string} newClassName - Class to take ability from
 * @returns {boolean} Success status
 */
function handleGameAdaptabilityReplace(
  io,
  socket,
  gameCode,
  oldAbilityType,
  newAbilityType,
  level,
  newClassName
) {
  // Validate game and player
  const game = validateGameAction(socket, gameCode, true, false);
  gameService.refreshGameTimeout(io, gameCode);

  // Get player
  const player = game.players.get(socket.id);
  if (!player || player.race !== 'Artisan') {
    socket.emit('adaptabilityComplete', {
      success: false,
      message: messages.errors.adaptabilityFailed,
    });
    return false;
  }

  // Find the old ability
  const oldAbilityIndex = player.abilities.findIndex(
    (a) => a.type === oldAbilityType
  );
  if (oldAbilityIndex === -1) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.AdaptabilityOldAbilityNotFound,
        { oldAbilityType, playerName: player.name }
      )
    );
    socket.emit('adaptabilityComplete', {
      success: false,
      message: messages.errors.abilityNotFound,
    });
    return false;
  }

  // Find the new ability in the target class using new config system
  const targetClassAbilities = config.getAllClassAbilities(newClassName);
  if (!targetClassAbilities || targetClassAbilities.length === 0) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.AdaptabilityClassNotFound,
        { className: newClassName }
      )
    );
    socket.emit('adaptabilityComplete', {
      success: false,
      message: messages.getError('invalidClass'),
    });
    return false;
  }

  const newAbilityTemplate = targetClassAbilities.find(
    (a) => a.type === newAbilityType && a.unlockAt === parseInt(level, 10)
  );
  if (!newAbilityTemplate) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.AdaptabilityNewAbilityNotFound,
        { newAbilityType, level, className: newClassName }
      )
    );
    socket.emit('adaptabilityComplete', {
      success: false,
      message: messages.errors.abilityNotUnlocked,
    });
    return false;
  }

  // Create a deep copy to avoid reference issues
  const newAbility = JSON.parse(JSON.stringify(newAbilityTemplate));

  logger.info(
    messages.formatMessage(
      messages.serverLogMessages.info.PlayerSelectedAdaptabilityAbility,
      {
        playerName: player.name,
        abilityName: newAbilityTemplate.name,
        className: newClassName,
      }
    )
  );

  // Replace in both arrays
  player.abilities[oldAbilityIndex] = newAbility;

  const unlockedIndex = player.unlocked.findIndex(
    (a) => a.type === oldAbilityType
  );
  /* istanbul ignore next */
  if (unlockedIndex !== -1) {
    player.unlocked[unlockedIndex] = newAbility;
  }

  logger.info(
    messages.formatMessage(
      messages.serverLogMessages.info.AdaptabilitySuccess,
      { oldAbilityType, newAbilityType, playerName: player.name }
    )
  );

  // Update clients
  io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
  socket.emit('adaptabilityComplete', {
    success: true,
    message: messages.success.adaptabilityComplete,
    oldAbility: oldAbilityType,
    newAbility: newAbilityType,
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
function handleGameGetAbilities(io, socket, gameCode, className, level) {
  // Validation
  const game = validateGameAction(socket, gameCode, true, false);
  gameService.refreshGameTimeout(io, gameCode);

  logger.debug(
    messages.formatMessage(messages.serverLogMessages.debug.GetClassAbilities, {
      className,
      level,
    })
  );

  try {
    // Find abilities for the requested class and level
    let matchingAbilities = [];

    // Use config helper to get abilities
    matchingAbilities = config
      .getClassAbilities(className)
      .filter((ability) => ability.unlockAt === parseInt(level, 10));

    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.FoundClassAbilities,
        { count: matchingAbilities.length, className, level }
      )
    );

    // Send the response with the matching abilities
    socket.emit('classAbilitiesResponse', {
      success: true,
      abilities: matchingAbilities,
      className,
      level,
    });

    return true;
  } catch (error) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.GetClassAbilitiesError,
        { errorMessage: error.message }
      ),
      error
    );
    socket.emit('classAbilitiesResponse', {
      success: false,
      abilities: [],
      className,
      level,
      error: error.message,
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
function handleGamePlayerReady(io, socket, gameCode) {
  logger.info(
    messages.formatMessage(
      messages.serverLogMessages.info.PlayerReadyNextRound,
      { socketId: socket.id, gameCode }
    )
  );

  try {
    // Use the combined validation
    const game = validateGameAction(socket, gameCode, true, false);

    // Refresh game timeout
    gameService.refreshGameTimeout(io, gameCode);

    // Initialize the set if missing
    if (!game.nextReady) {
      game.nextReady = new Set();
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.NextReadySetInitialized,
          { gameCode }
        )
      );
    }

    // Check if player already marked ready
    if (game.nextReady.has(socket.id)) {
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.PlayerAlreadyMarkedReady,
          { socketId: socket.id, gameCode }
        )
      );
      return false; // Already marked ready
    }

    // Mark this player ready for the next round
    game.nextReady.add(socket.id);

    const alivePlayers = game.getAlivePlayers();
    const readyPlayers = Array.from(game.nextReady);

    // Emit updated ready player list
    io.to(gameCode).emit('readyPlayersUpdate', {
      readyPlayers,
      total: alivePlayers.length,
    });

    // Check if majority are ready
    if (readyPlayers.length > alivePlayers.length / 2) {
      // Resume game
      io.to(gameCode).emit('resumeGame');
      game.nextReady.clear();
      logger.info(
        messages.formatMessage(
          messages.serverLogMessages.info.ResumeByMajority,
          { gameCode }
        )
      );
    }

    return true;
  } catch (error) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.PlayerNextReadyError,
        { gameCode, errorDetails: error.message }
      ),
      error
    );
    return false;
  }
}

/**
 * Handle play again request - reuses existing game code
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Previous game code to reuse
 * @param {string} playerName - Player's display name
 * @returns {boolean} Success status
 */
function handleGamePlayAgain(io, socket, gameCode, playerName) {
  try {
    // Validate inputs
    if (!gameCode || !playerName) {
      socket.emit('errorMessage', {
        message: messages.getError('missingGameCodeOrPlayerName'),
        type: 'validation_error',
      });
      return false;
    }

    // Basic player name validation (simplified)
    if (!playerName || playerName.length < 1 || playerName.length > 20) {
      socket.emit('errorMessage', {
        message: messages.getError('invalidPlayerNameLength'),
        type: 'validation_error',
      });
      return false;
    }

    // Check if game code already exists (someone else hit play again first)
    const existingGame = gameService.games.get(gameCode);

    if (existingGame) {
      // Game already exists, join it directly (bypass normal validation)
      logger.info(
        messages.formatMessage(
          messages.serverLogMessages.info.PlayerAttemptingPlayAgain,
          { playerName, oldGameCode: gameCode }
        )
      );

      // Check if game is full
      if (existingGame.players.size >= (config.maxPlayers || 20)) {
        socket.emit('errorMessage', {
          message: messages.formatMessage(
            messages.getError('gameFullWithCount'),
            { maxPlayers: config.maxPlayers || 20 }
          ),
          type: 'game_full',
        });
        return false;
      }

      // Check if player is already in this game
      if (existingGame.players.has(socket.id)) {
        socket.emit('errorMessage', {
          message: messages.getError('alreadyInThisGame'),
          type: 'already_joined',
        });
        return false;
      }

      // Add player directly to the game
      const success = existingGame.addPlayer(socket.id, playerName);
      if (!success) {
        socket.emit('errorMessage', {
          message: messages.getError('couldNotJoinGame'),
          type: 'join_failed',
        });
        return false;
      }

      // Join socket to game room and update clients
      socket.join(gameCode);
      gameService.refreshGameTimeout(io, gameCode);
      gameService.broadcastPlayerList(io, gameCode);

      // Notify client they joined successfully
      socket.emit('playerJoined', {
        gameCode,
        playerName,
        message: messages.formatMessage(
          messages.getSuccess('joinedReplayGame'),
          { gameCode }
        ),
      });

      return true;
    } else {
      // Game doesn't exist, create it and become host
      logger.info(
        messages.formatMessage(
          messages.serverLogMessages.info.CreatingReplayGame,
          { playerName, gameCode }
        )
      );

      // Create the game with the specific code
      const game = gameService.createGameWithCode(gameCode);
      if (!game) {
        socket.emit('errorMessage', {
          message: messages.getError('createGameFailedServerBusy'),
          type: 'creation_failed',
        });
        return false;
      }

      // Add this socket as a player (host) in the new game
      const success = game.addPlayer(socket.id, playerName);
      if (!success) {
        // Clean up the game if we can't add the player
        gameService.games.delete(gameCode);
        socket.emit('errorMessage', {
          message: messages.getError('joinCreatedGameFailed'),
          type: 'creation_failed',
        });
        return false;
      }

      socket.join(gameCode);

      // Create timeout for the new game
      gameService.createGameTimeout(io, gameCode);

      // Send the game code back to the host
      socket.emit('gameCreated', { gameCode: gameCode });

      // Broadcast the updated player list
      gameService.broadcastPlayerList(io, gameCode);

      return true;
    }
  } catch (error) {
    logger.error(
      messages.formatMessage(
        messages.serverLogMessages.error.PlayerNextReadyError,
        { gameCode, errorDetails: error.message }
      ),
      error
    );
    socket.emit('errorMessage', {
      message: messages.getError('startNewGameFailed'),
      type: 'server_error',
    });
    return false;
  }
}

module.exports = {
  handleGameCreate,
  handleGameStart,
  handleGameCheckName,
  handleGameAction,
  handleGameRacialAbility,
  handleGamePlayerReady,
  handleGameGetAbilities,
  handleGameAdaptabilityReplace,
  handleGamePlayAgain,
};
