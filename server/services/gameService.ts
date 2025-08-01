/**
 * @fileoverview Game service for managing game rooms and game state - TypeScript version
 * Provides utilities for creating, joining, and managing games
 * Phase 9: TypeScript Migration - Converted from gameService.js
 */

import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from '../models/GameRoom.js';
import config from '../config/index.js';
// Messages are now accessed through the config system
import {
  throwGameStateError,
  throwValidationError,
} from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import trophies from '../config/trophies.js';
import type { Player } from '../models/Player.js';

/**
 * Game result interface
 */
export interface GameResult {
  eventsLog: string[];
  players: any[];
  winner: string;
  turn?: number;
  phase?: string;
  levelUp?: {
    oldLevel: number;
    newLevel: number;
  };
  level?: number;
}

/**
 * Trophy award interface
 */
export interface TrophyAward {
  playerName: string;
  trophyName: string;
  trophyDescription: string;
}

/**
 * Game statistics interface
 */
export interface GameStats {
  totalGames: number;
  activeTimers: number;
  gameList: string[];
}

/**
 * Trophy evaluation result
 */
interface EarnedTrophy {
  trophy: any;
  winner: Player;
}

// In-memory storage
export const games = new Map<string, GameRoom>();
export const gameTimers = new Map<string, NodeJS.Timeout>();

/**
 * Function to create a game timeout
 */
export function createGameTimeout(io: SocketIOServer, gameCode: string): void {
  // Clear any existing timer for this game
  if (gameTimers.has(gameCode)) {
    clearTimeout(gameTimers.get(gameCode)!);
  }

  const timerId = setTimeout(() => {
    logger.info('GameTimedOut', { gameCode });
    // Notify any connected players before deleting
    if (games.has(gameCode)) {
      io.to(gameCode).emit(config.getError('gameTimeout'));
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
 */
export function refreshGameTimeout(io: SocketIOServer, gameCode: string): void {
  if (games.has(gameCode)) {
    createGameTimeout(io, gameCode);
  }
}

/**
 * Create a new game
 */
export function createGame(gameCode: string): GameRoom | null {
  // Check if we already have too many games
  const maxGames = config.maxGames || 100; // Default max games
  if (games.size >= maxGames) {
    // Prevent server overload
    throwGameStateError(
      config.getError('serverBusy')
    );
    return null;
  }

  const game = new GameRoom(gameCode);
  games.set(gameCode, game);
  return game;
}

/**
 * Generate a unique game code
 */
export function generateGameCode(): string {
  let code: string;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (games.has(code));

  return code;
}

/**
 * Check if a player can join a game
 */
export function canPlayerJoinGame(game: GameRoom, playerId: string): boolean {
  // Check if game is full based on config max players
  if (game.gameState.players.size >= config.maxPlayers) {
    throwGameStateError(`Game is full (${config.maxPlayers} players max).`);
    return false;
  }

  // Don't check if player already exists here - that's handled by name validation
  // This allows reconnection and name changes
  return true;
}

/**
 * Helper to broadcast updated player list to a game room
 */
export function broadcastPlayerList(io: SocketIOServer, gameCode: string): void {
  const game = games.get(gameCode);
  if (game) {
    io.to(gameCode).emit('playerList', {
      players: (game as any).getPlayersInfo(),
      host: game.gameState.hostId,
    });
  }
}

/**
 * Process game round with proper phase management
 */
export async function processGameRound(io: SocketIOServer, gameCode: string): Promise<GameResult | null> {
  const game = games.get(gameCode);
  if (!game) return null;

  // Process pending commands before changing phase (Phase 2 enhancement)
  if (game.commandProcessor) {
    try {
      await game.commandProcessor.processCommands();
    } catch (error: any) {
      logger.error('Error processing commands:', {
        gameCode,
        error: error.message
      });
    }
  }

  // Set phase to results before processing
  game.gamePhase.phase = 'results';

  // Process the round
  const result = (game as any).processRound() as GameResult;

  logger.info(`=== ROUND ${result.turn} STATS ===`);
  
  // Debug: Check that stats are being tracked correctly
  const actualPlayers = Array.from(game.gameState.players.values());
  logger.info(`Round ${result.turn} stats (${actualPlayers.length} players):`);
  actualPlayers.forEach(player => {
    if ((player as any).stats.totalDamageDealt > 0 || (player as any).stats.totalHealingDone > 0 || (player as any).stats.abilitiesUsed > 0) {
      logger.info(`${player.name}: ${(player as any).stats.totalDamageDealt} dmg, ${(player as any).stats.abilitiesUsed} abilities, ${(player as any).stats.monsterKills} kills`);
    }
  });
  logger.info('=== END ROUND STATS ===');

  // Broadcast the results with phase information
  io.to(gameCode).emit('roundResult', {
    ...result,
    phase: game.gamePhase.phase, // Include current phase
  });

  // Broadcast phase update specifically
  io.to(gameCode).emit('gamePhaseUpdate', {
    phase: game.gamePhase.phase,
    round: result.turn,
  });

  // If there was a level-up, emit a specific event
  if (result.levelUp) {
    io.to(gameCode).emit('levelUp', {
      level: result.level,
      oldLevel: result.levelUp.oldLevel,
      players: result.players,
      phase: game.gamePhase.phase,
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
    const timer = gameTimers.get(gameCode);
    if (timer) {
      clearTimeout(timer);
    }
    gameTimers.delete(gameCode);
    games.delete(gameCode);
  }

  return result;
}

/**
 * Check win conditions (for disconnects)
 */
export function checkGameWinConditions(
  io: SocketIOServer, 
  gameCode: string, 
  disconnectedPlayerName: string
): boolean {
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
    const gameResult: GameResult = {
      eventsLog: [
        `${disconnectedPlayerName} left the game. All Warlocks are gone.`,
      ],
      players: (game as any).getPlayersInfo(),
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
    const timer = gameTimers.get(gameCode);
    if (timer) {
      clearTimeout(timer);
    }
    gameTimers.delete(gameCode);
    games.delete(gameCode);
    return true;
  }
  // Check if only warlocks remain
  else if (
    game.systems.warlockSystem.getWarlockCount() ===
    (game as any).getAlivePlayers().length
  ) {
    const gameResult: GameResult = {
      eventsLog: [`${disconnectedPlayerName} left the game.`],
      players: (game as any).getPlayersInfo(),
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
    const timer = gameTimers.get(gameCode);
    if (timer) {
      clearTimeout(timer);
    }
    gameTimers.delete(gameCode);
    games.delete(gameCode);
    return true;
  }
  return false;
}

/**
 * Award a random trophy based on player stats and game result
 */
function awardRandomTrophy(game: GameRoom, gameResult: GameResult): TrophyAward | null {
  try {
    // Debug: Check the game state first
    logger.info('Game state during trophy evaluation:', {
      gameCode: game.code,
      hasPlayers: !!game.gameState.players,
      playersMapSize: game.gameState.players ? game.gameState.players.size : 'undefined',
      gameStarted: game.gameState.started,
      gamePhase: game.gamePhase.phase
    });

    logger.info('Trophy evaluation started', {
      winner: gameResult.winner,
      gameCode: game.code
    });

    // FIXED: Refresh gameResult with current player data for trophy evaluation
    // The original gameResult.players was created earlier and may have empty stats
    const playersInfo = (game as any).getPlayersInfo();
    logger.info('getPlayersInfo returned:', {
      playerCount: playersInfo?.length || 0,
      playersHaveStats: playersInfo?.map(p => ({
        name: p.name,
        hasStats: !!p.stats,
        statsKeys: p.stats ? Object.keys(p.stats) : []
      }))
    });
    gameResult.players = playersInfo;
    
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
      const earnedTrophiesFromResult: EarnedTrophy[] = [];
      
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
        } catch (error: any) {
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
      
      const trophyAward: TrophyAward = {
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
  } catch (error: any) {
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
 */
export function isWaitingForActions(game: GameRoom): boolean {
  if (!game.gameState.started) return false;

  const alivePlayers = (game as any).getAlivePlayers();
  const unstunnedPlayers = alivePlayers.filter(
    (p: Player) => !game.systems.statusEffectManager.isPlayerStunned(p.id)
  );

  return (game as any).pendingActions.length < unstunnedPlayers.length;
}

/**
 * Determine if the game is currently showing round results
 */
export function isInRoundResults(game: GameRoom): boolean {
  if (!game.gameState.started) return false;

  // This is tricky to determine without additional state
  // For now, we'll assume if actions are submitted but not processed, we're in results
  const alivePlayers = (game as any).getAlivePlayers();
  const unstunnedPlayers = alivePlayers.filter(
    (p: Player) => !game.systems.statusEffectManager.isPlayerStunned(p.id)
  );

  // If we have all actions, we might be processing or showing results
  return (game as any).pendingActions.length >= unstunnedPlayers.length;
}

/**
 * Get game statistics for debugging
 */
export function getGameStats(): GameStats {
  return {
    totalGames: games.size,
    activeTimers: gameTimers.size,
    gameList: Array.from(games.keys()),
  };
}

/**
 * Force cleanup a game (for testing/debugging)
 */
export function forceCleanupGame(gameCode: string): boolean {
  const hasGame = games.has(gameCode);
  const hasTimer = gameTimers.has(gameCode);

  if (hasTimer) {
    const timer = gameTimers.get(gameCode)!;
    clearTimeout(timer);
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
 */
export function createGameWithCode(gameCode: string): GameRoom | null {
  // Check if code is already in use
  if (games.has(gameCode)) {
    return null; // Code already exists
  }

  // Check if we already have too many games
  const maxGames = config.maxGames || 100;
  if (games.size >= maxGames) {
    throwGameStateError(config.getError('serverBusy'));
    return null;
  }

  const game = new GameRoom(gameCode);
  games.set(gameCode, game);
  logger.info(`Created replay game with code ${gameCode}`);
  return game;
}

/**
 * Get a game by code
 */
export function getGame(gameCode: string): GameRoom | undefined {
  return games.get(gameCode);
}

/**
 * Cleanup a game by code
 */
export function cleanupGame(gameCode: string): boolean {
  const game = games.get(gameCode);
  if (!game) {
    return false;
  }

  // Clear any existing timer
  if (gameTimers.has(gameCode)) {
    clearTimeout(gameTimers.get(gameCode)!);
    gameTimers.delete(gameCode);
  }

  // Remove game
  games.delete(gameCode);
  
  logger.info('GameCleanedup', { gameCode });
  return true;
}

/**
 * Cleanup expired disconnected players across all games
 */
export function cleanupExpiredDisconnectedPlayers(io?: SocketIOServer): void {
  let totalCleaned = 0;
  
  for (const [gameCode, game] of games.entries()) {
    const cleanedPlayerNames = (game as any).cleanupDisconnectedPlayers();
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

export default {
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
  
  // Game management functions
  getGame,
  cleanupGame,

  // Debug/utility functions
  getGameStats,
  forceCleanupGame,
};