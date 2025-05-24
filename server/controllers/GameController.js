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
    throwGameStateError(
      config.messages.getError('notEnoughPlayers', {
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
    throwGameStateError(config.messages.errors.allPlayersNotReady);
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
      nextDamage: config.gameBalance.calculateMonsterDamage(game.monster.age),
    },
  });

  return true;
}

/**
 * Handle player action submission with proper cooldown validation and enhanced tracking
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Type of action
 * @param {string} targetId - Target of the action
 * @param {Object} options - Additional options
 * @returns {boolean} Success status
 */
function handlePerformAction(
  io,
  socket,
  gameCode,
  actionType,
  targetId,
  options = {}
) {
  try {
    // Use the combined validation
    const game = validateGameAction(socket, gameCode, true, false);
    if (!game) {
      socket.emit('errorMessage', {
        message: 'Game not found or invalid state',
      });
      return false;
    }

    // Get the player
    const player = game.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('errorMessage', { message: 'Player not found in game' });
      return false;
    }

    // Validate player is alive
    if (!player.isAlive) {
      socket.emit('errorMessage', {
        message: 'Dead players cannot perform actions',
      });
      return false;
    }

    // Validate game is in correct state for actions
    if (!game.started) {
      socket.emit('errorMessage', { message: 'Game has not started yet' });
      return false;
    }

    // Allow actions if game is in action phase OR if it's started but phase isn't explicitly set to results
    if (game.phase === 'results') {
      socket.emit('errorMessage', {
        message: 'Cannot perform actions while viewing results',
      });
      return false;
    }

    // COOLDOWN VALIDATION - Check if ability is on cooldown
    if (player.isAbilityOnCooldown(actionType)) {
      const remainingCooldown = player.getAbilityCooldown(actionType);
      socket.emit('errorMessage', {
        message: `Ability "${actionType}" is on cooldown for ${remainingCooldown} more turn${remainingCooldown !== 1 ? 's' : ''}`,
        type: 'cooldown_error',
        abilityType: actionType,
        remainingTurns: remainingCooldown,
      });
      return false;
    }

    // ABILITY VALIDATION - Check if player can use this ability
    if (!player.canUseAbility(actionType)) {
      const hasAbility = player.unlocked.some((a) => a.type === actionType);
      if (!hasAbility) {
        socket.emit('errorMessage', {
          message: `You don't have the ability "${actionType}"`,
          type: 'ability_not_found',
        });
      } else {
        socket.emit('errorMessage', {
          message: `Cannot use ability "${actionType}" right now`,
          type: 'ability_unavailable',
        });
      }
      return false;
    }

    // TARGET VALIDATION - Check if target is valid
    if (targetId !== '__monster__') {
      const targetPlayer = game.getPlayerById(targetId);
      if (!targetPlayer || !targetPlayer.isAlive) {
        socket.emit('errorMessage', {
          message: 'Selected target is no longer alive or valid',
          type: 'invalid_target',
        });
        return false;
      }
    } else {
      // Validate monster is alive (if applicable)
      if (game.monster && game.monster.hp <= 0) {
        socket.emit('errorMessage', {
          message: 'Monster is no longer a valid target',
          type: 'invalid_target',
        });
        return false;
      }
    }

    // Check if player has already submitted an action
    if (player.hasSubmittedAction) {
      socket.emit('errorMessage', {
        message: 'You have already submitted an action for this round',
        type: 'already_submitted',
      });
      return false;
    }

    // Refresh game timeout
    gameService.refreshGameTimeout(io, gameCode);

    // Record the action with sanitized options (DON'T put ability on cooldown yet)
    const success = game.addAction(socket.id, actionType, targetId, options);

    if (success) {
      // Mark player as having submitted an action (this is now handled in Player.submitAction)
      player.actionSubmissionTime = Date.now();

      logger.info(
        `Player ${player.name} (${socket.id}) performed ${actionType} on ${targetId} in game ${gameCode}`
      );

      // Broadcast updated player list with submission status
      io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });

      // Check if all alive players have submitted actions
      const alivePlayers = game.getAlivePlayers();
      const submittedPlayers = alivePlayers.filter(
        (p) => p.hasSubmittedAction && p.actionValidationState === 'valid'
      );

      logger.info(
        `Action submission progress: ${submittedPlayers.length}/${alivePlayers.length} players submitted in game ${gameCode}`
      );

      // If all actions submitted, process the round
      if (game.allActionsSubmitted()) {
        logger.info(
          `All actions submitted, processing round for game ${gameCode}`
        );

        // Process the round immediately but don't auto-advance
        gameService.processGameRound(io, gameCode);
      }

      // Send success confirmation to the submitting player
      socket.emit('actionSubmitted', {
        actionType,
        targetId,
        message: 'Action submitted successfully',
        submissionProgress: {
          submitted: submittedPlayers.length,
          total: alivePlayers.length,
        },
      });
    } else {
      socket.emit('errorMessage', {
        message: 'Failed to submit action. Please try again.',
        type: 'submission_failed',
      });
    }

    return success;
  } catch (error) {
    logger.error(`Error in handlePerformAction for game ${gameCode}:`, error);
    socket.emit('errorMessage', {
      message: 'An error occurred while processing your action',
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
function handleRacialAbility(io, socket, gameCode, targetId, abilityType) {
  // Use the combined validation
  const game = validateGameAction(socket, gameCode, true, false);

  // Refresh game timeout
  gameService.refreshGameTimeout(io, gameCode);

  // Get player info
  const player = game.players.get(socket.id);

  // Special handling for Human Adaptability
  if (abilityType === 'adaptability' && player.race === 'Human') {
    logger.debug(
      `Player ${player.name} (${socket.id}) is using Human Adaptability`
    );

    // First check if they have uses left
    if (player.racialUsesLeft <= 0) {
      logger.debug(`Player ${player.name} has no Adaptability uses left`);
      socket.emit('racialAbilityUsed', {
        success: false,
        message: config.messages.getError('noUsesLeft', {
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
        message: config.messages.success.adaptabilityTriggered,
      });
    } else {
      logger.warn(`Failed to use Adaptability for player ${player.name}`);
      socket.emit('racialAbilityUsed', {
        success: false,
        message: config.messages.errors.adaptabilityFailed,
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
      message: config.messages.success.racialAbilityUsed,
    });
  } else {
    socket.emit('racialAbilityUsed', {
      success: false,
      message: config.messages.errors.racialAbilityUsed,
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
 * @param {string} newClassName - Class to take ability from
 * @returns {boolean} Success status
 */
function handleAdaptabilityReplace(
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
  if (!player || player.race !== 'Human') {
    socket.emit('adaptabilityComplete', {
      success: false,
      message: config.messages.errors.adaptabilityFailed,
    });
    return false;
  }

  logger.debug(
    `Player ${player.name} trying to replace ${oldAbilityType} with ${newAbilityType} from ${newClassName} at level ${level}`
  );

  // Find the old ability
  const oldAbilityIndex = player.abilities.findIndex(
    (a) => a.type === oldAbilityType
  );
  if (oldAbilityIndex === -1) {
    logger.error(
      `Old ability ${oldAbilityType} not found for player ${player.name}`
    );
    socket.emit('adaptabilityComplete', {
      success: false,
      message: config.messages.errors.abilityNotFound,
    });
    return false;
  }

  // Find the new ability in the target class
  const targetClassAbilities = config.classAbilities[newClassName];
  if (!targetClassAbilities) {
    logger.error(`Class ${newClassName} not found in abilities config`);
    socket.emit('adaptabilityComplete', {
      success: false,
      message: config.messages.getError('invalidClass'),
    });
    return false;
  }

  const newAbilityTemplate = targetClassAbilities.find(
    (a) => a.type === newAbilityType && a.unlockAt === parseInt(level, 10)
  );
  if (!newAbilityTemplate) {
    logger.error(
      `Ability ${newAbilityType} at level ${level} not found for class ${newClassName}`
    );
    socket.emit('adaptabilityComplete', {
      success: false,
      message: config.messages.errors.abilityNotUnlocked,
    });
    return false;
  }

  // Create a deep copy to avoid reference issues
  const newAbility = JSON.parse(JSON.stringify(newAbilityTemplate));

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
    `Successfully replaced ${oldAbilityType} with ${newAbilityType} for player ${player.name}`
  );

  // Update clients
  io.to(gameCode).emit('playerList', { players: game.getPlayersInfo() });
  socket.emit('adaptabilityComplete', {
    success: true,
    message: config.messages.success.adaptabilityComplete,
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
function handleGetClassAbilities(io, socket, gameCode, className, level) {
  // Validation
  const game = validateGameAction(socket, gameCode, true, false);
  gameService.refreshGameTimeout(io, gameCode);

  logger.debug(`Getting ${className} abilities for level ${level}`);

  try {
    // Find abilities for the requested class and level
    let matchingAbilities = [];

    // Use config helper to get abilities
    matchingAbilities = config
      .getClassAbilities(className)
      .filter((ability) => ability.unlockAt === parseInt(level, 10));

    logger.debug(
      `Found ${matchingAbilities.length} abilities for ${className} at level ${level}`
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
    logger.error(`Error getting abilities: ${error.message}`, error);
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
 * Handle player readiness for next round with proper phase management
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Success status
 */
function handlePlayerNextReady(io, socket, gameCode) {
  logger.info(
    `Player ${socket.id} clicked ready for next round in game ${gameCode}`
  );

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
      logger.debug(
        `Player ${socket.id} already marked ready for game ${gameCode}`
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

    logger.info(
      `Ready progress: ${readyPlayers.length}/${alivePlayers.length} players ready in game ${gameCode}`
    );

    // Check if majority are ready
    if (readyPlayers.length > alivePlayers.length / 2) {
      logger.info(
        `Game ${gameCode}: Majority ready (${readyPlayers.length}/${alivePlayers.length}), advancing to next round`
      );

      // Set phase back to action for next round
      game.phase = 'action';

      // Clear ready status for next round
      game.nextReady.clear();

      // Resume game
      io.to(gameCode).emit('resumeGame');

      // Send updated game state with new phase
      io.to(gameCode).emit('gameStateUpdate', {
        phase: game.phase,
        round: game.round,
        players: game.getPlayersInfo(),
      });
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
  handleAdaptabilityReplace,
};
