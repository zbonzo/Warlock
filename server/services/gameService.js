/**
 * @fileoverview Game service for managing game rooms and game state
 * Provides utilities for creating, joining, and managing games
 */
const { GameRoom } = require('@models/GameRoom');
const config = require('@config');
const messages = require('@messages');
const {
  throwGameStateError,
  throwValidationError,
} = require('@utils/errorHandler');
const logger = require('@utils/logger');
const trophies = require('@config/trophies');

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
      messages.getError('serverBusy')
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
    throwValidationError(messages.getError('playerExists'));
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
async function processGameRound(io, gameCode) {
  const game = games.get(gameCode);
  if (!game) return null;

  // Process pending commands before changing phase (Phase 2 enhancement)
  if (game.commandProcessor) {
    try {
      await game.commandProcessor.processCommands();
    } catch (error) {
      logger.error('Error processing commands:', {
        gameCode,
        error: error.message
      });
    }
  }

  // Set phase to results before processing
  game.phase = 'results';

  // Process the round
  const result = game.processRound();

  logger.info(`=== ROUND ${result.turn} STATS ===`);
  
  // Debug: Check that stats are being tracked correctly
  const actualPlayers = Array.from(game.players.values());
  logger.info(`Round ${result.turn} stats (${actualPlayers.length} players):`);
  actualPlayers.forEach(player => {
    if (player.stats.totalDamageDealt > 0 || player.stats.totalHealingDone > 0 || player.stats.abilitiesUsed > 0) {
      logger.info(`${player.name}: ${player.stats.totalDamageDealt} dmg, ${player.stats.abilitiesUsed} abilities, ${player.stats.monsterKills} kills`);
    }
  });
  logger.info('=== END ROUND STATS ===');

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
    
    // Trophy system: Award a random trophy
    const trophyAward = awardRandomTrophy(game, result);
    if (trophyAward) {
      // DEBUG: Log trophy emission for client debugging
      logger.info('EMITTING trophyAwarded event to client:', {
        gameCode,
        trophyData: trophyAward,
        socketRoomSize: io.sockets.adapter.rooms.get(gameCode)?.size || 0
      });
      
      // Add trophy to the result that was already emitted
      io.to(gameCode).emit('trophyAwarded', trophyAward);
    } else {
      logger.warn('No trophy to award - awardRandomTrophy returned null/undefined');
    }
    
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
    const gameResult = {
      eventsLog: [
        `${disconnectedPlayerName} left the game. All Warlocks are gone.`,
      ],
      players: game.getPlayersInfo(),
      winner: 'Good',
    };
    
    io.to(gameCode).emit('roundResult', gameResult);

    // Trophy system: Award a random trophy
    const trophyAward = awardRandomTrophy(game, gameResult);
    if (trophyAward) {
      // DEBUG: Log trophy emission for client debugging
      logger.info('EMITTING trophyAwarded event to client (all warlocks gone):', {
        gameCode,
        trophyData: trophyAward,
        socketRoomSize: io.sockets.adapter.rooms.get(gameCode)?.size || 0
      });
      
      io.to(gameCode).emit('trophyAwarded', trophyAward);
    } else {
      logger.warn('No trophy to award - awardRandomTrophy returned null/undefined (all warlocks gone)');
    }

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
    const gameResult = {
      eventsLog: [`${disconnectedPlayerName} left the game.`],
      players: game.getPlayersInfo(),
      winner: 'Evil',
    };
    
    io.to(gameCode).emit('roundResult', gameResult);

    // Trophy system: Award a random trophy
    const trophyAward = awardRandomTrophy(game, gameResult);
    if (trophyAward) {
      // DEBUG: Log trophy emission for client debugging
      logger.info('EMITTING trophyAwarded event to client (all innocents gone):', {
        gameCode,
        trophyData: trophyAward,
        socketRoomSize: io.sockets.adapter.rooms.get(gameCode)?.size || 0
      });
      
      io.to(gameCode).emit('trophyAwarded', trophyAward);
    } else {
      logger.warn('No trophy to award - awardRandomTrophy returned null/undefined (all innocents gone)');
    }

    // Clean up the game
    clearTimeout(gameTimers.get(gameCode));
    gameTimers.delete(gameCode);
    games.delete(gameCode);
    return true;
  }
  return false;
}

/**
 * Award a random trophy based on player stats and game result
 * @param {GameRoom} game - Game room instance
 * @param {Object} gameResult - Game result with winner information
 * @returns {Object|null} Trophy award information or null if no trophy
 */
function awardRandomTrophy(game, gameResult) {
  try {
    // Debug: Check the game state first
    logger.info('Game state during trophy evaluation:', {
      gameCode: game.code,
      hasPlayers: !!game.players,
      playersMapSize: game.players ? game.players.size : 'undefined',
      gameStarted: game.started,
      gamePhase: game.phase
    });

    logger.info('Trophy evaluation started', {
      winner: gameResult.winner,
      gameCode: game.code
    });

    // FIXED: Refresh gameResult with current player data for trophy evaluation
    // The original gameResult.players was created earlier and may have empty stats
    gameResult.players = game.getPlayersInfo();
    
    // DEBUG: Log the player stats structure for trophy debugging
    logger.info('Trophy debug - getPlayersInfo structure:', {
      playerCount: gameResult.players?.length || 0,
      firstPlayerStats: gameResult.players?.[0]?.stats || 'NO_STATS',
      firstPlayerName: gameResult.players?.[0]?.name || 'NO_NAME',
      firstPlayerComplete: gameResult.players?.[0] || 'NO_PLAYER',
      playerNames: gameResult.players?.map(p => p?.name) || []
    });
    
    if (gameResult.players && gameResult.players.length > 0) {
      logger.info('Using refreshed gameResult player data for trophy evaluation');
      const gameResultPlayers = gameResult.players;
      
      gameResultPlayers.forEach((player, index) => {
        logger.info(`GameResult Player ${index + 1}: ${player.name} - stats: ${JSON.stringify(player.stats)}`);
      });
      
      // Use gameResult players for trophy evaluation instead of game.getPlayersInfo()
      // since the game state might be inconsistent at this point
      const earnedTrophiesFromResult = [];
      
      // Check each trophy to see if any player qualifies
      for (const trophy of trophies) {
        try {
          if (!trophy || !trophy.getWinner || !trophy.name) {
            logger.warn('Invalid trophy object:', trophy);
            continue;
          }
          
          // DEBUG: Log first player's stats structure for this trophy
          if (gameResultPlayers.length > 0) {
            logger.info(`Trophy "${trophy.name}" debug - First player stats:`, {
              playerName: gameResultPlayers[0].name,
              hasStats: !!gameResultPlayers[0].stats,
              stats: gameResultPlayers[0].stats
            });
          }
          
          const winner = trophy.getWinner(gameResultPlayers, gameResult);
          logger.info(`Trophy "${trophy.name}" evaluation: ${winner ? `${winner.name} wins!` : 'No winner'}`);
          
          if (winner) {
            earnedTrophiesFromResult.push({
              trophy: trophy,
              winner: winner
            });
          }
        } catch (error) {
          logger.warn(`Trophy evaluation error for ${trophy.name}:`, {
            error: error.message,
            stack: error.stack
          });
        }
      }

      // If no trophies were earned, return null
      if (earnedTrophiesFromResult.length === 0) {
        logger.info('No trophies earned this game - no players qualified for any trophy');
        return null;
      }

      logger.info(`${earnedTrophiesFromResult.length} trophies earned: ${earnedTrophiesFromResult.map(t => `${t.trophy.name} (${t.winner.name})`).join(', ')}`);

      // Randomly select one trophy from the earned trophies
      const selectedTrophy = earnedTrophiesFromResult[Math.floor(Math.random() * earnedTrophiesFromResult.length)];
      
      const trophyAward = {
        playerName: selectedTrophy.winner.name,
        trophyName: selectedTrophy.trophy.name,
        trophyDescription: selectedTrophy.trophy.description,
      };

      logger.info('Trophy awarded (from gameResult)', {
        gameCode: game.code,
        winner: gameResult.winner,
        trophy: trophyAward.trophyName,
        recipient: trophyAward.playerName
      });

      // DEBUG: Log the exact trophy data being returned
      logger.info('Trophy award data structure:', {
        trophyAward,
        winnerObject: selectedTrophy.winner,
        winnerName: selectedTrophy.winner?.name,
        winnerType: typeof selectedTrophy.winner?.name
      });

      return trophyAward;
    }

    // If we reach here, gameResult.players was empty
    logger.warn('No player data available for trophy evaluation');
    return null;
  } catch (error) {
    logger.error('Error awarding trophy:', {
      error: error.message,
      stack: error.stack,
      gameCode: game?.code,
      gameResult: gameResult
    });
    return null;
  }
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
