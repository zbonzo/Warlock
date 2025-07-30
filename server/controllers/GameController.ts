/**
 * @fileoverview TypeScript Controller for game creation, management, and state transitions
 * Phase 5: Controllers & Main Classes Migration
 * Handles game-related socket events and operations with full type safety
 */

import gameService from '../services/gameService.js';
import {
  validatePlayerNameSocket,
  validatePlayerName,
  suggestValidName,
} from '../middleware/validation.js';
import { validateGameAction } from '../shared/gameChecks.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import messages from '../messages/index.js';
import { EventTypes } from '../models/events/EventTypes.js';
import { GameRoom } from '../models/GameRoom.js';
import type { Player } from '../models/Player.js';
import { BaseController } from './PlayerController.js';
import { 
  GameState,
  GameCode,
  GameRules,
  ActionResult,
  ValidationResult,
  CreateGameInput,
  PlayerAction
} from '../types/generated.js';
import { Socket, Server as SocketIOServer } from 'socket.io';

export interface CreateGameRequest {
  playerName: string;
  maxPlayers?: number;
  gameMode?: 'standard' | 'blitz';
  isPrivate?: boolean;
  timeLimit?: number;
}

export interface StartGameRequest {
  gameCode: string;
}

export interface GameStatusRequest {
  gameCode: string;
}

export interface UpdateGameInput {
  phase?: string;
  settings?: Partial<GameRules>;
}

export interface JoinResult {
  success: boolean;
  player?: Player;
  game?: GameRoom;
  error?: string;
}

export interface GameControllerResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Helper function to emit events through EventBus or fallback to direct socket emission
 */
function emitThroughEventBusOrSocket(
  socket: Socket, 
  gameCode: string, 
  eventType: string, 
  eventData: any, 
  fallbackEvent: string, 
  fallbackData: any
): void {
  const game = gameService.games.get(gameCode);
  if (game && game.eventBus) {
    game.eventBus.emit(eventType, {
      socketId: socket.id,
      ...eventData
    });
  } else {
    socket.emit(fallbackEvent, fallbackData);
  }
}

/**
 * Strongly Typed GameController with enhanced type safety patterns
 */
export class GameController extends BaseController<GameRoom, CreateGameRequest, UpdateGameInput> {
  protected model: GameRoom = {} as GameRoom; // Placeholder for abstract requirement

  /**
   * Handle game creation request
   */
  async handleGameCreate(
    io: SocketIOServer, 
    socket: Socket, 
    request: CreateGameRequest
  ): Promise<GameControllerResult> {
    try {
      const { playerName, maxPlayers, gameMode = 'standard', isPrivate = false, timeLimit } = request;

      // Validate player name
      if (!validatePlayerNameSocket(socket, playerName)) {
        return {
          success: false,
          error: 'Invalid player name'
        };
      }

      // Generate unique game code
      const gameCode = gameService.generateGameCode();
      
      // Create game room with options
      const gameOptions = {
        maxPlayers: maxPlayers || config.game?.defaultMaxPlayers || 8,
        allowSpectators: config.game?.allowSpectators || false,
        timeLimit: timeLimit || config.game?.defaultTimeLimit || 300
      };

      const game = new GameRoom(gameCode, gameOptions);
      
      // Set socket server for real-time communication
      game.setSocketServer(io);
      
      // Add creating player as host
      const joinResult = game.addPlayer(socket.id, playerName);
      if (!joinResult.success) {
        return {
          success: false,
          error: joinResult.error || 'Failed to add player to created game'
        };
      }

      const hostPlayer = joinResult.player!;
      game.gameState.hostId = hostPlayer.id;

      // Register game with service
      gameService.games.set(gameCode, game);

      // Join socket to game room
      socket.join(gameCode);

      logger.info('GameCreated', {
        gameCode,
        hostName: playerName,
        hostId: socket.id,
        maxPlayers: gameOptions.maxPlayers
      });

      // Send success response to creator
      socket.emit('game:created', {
        success: true,
        gameCode,
        game: game.toClientData(hostPlayer.id),
        player: hostPlayer.toClientData({ includePrivate: true, requestingPlayerId: hostPlayer.id })
      });

      // Emit creation event through event bus
      emitThroughEventBusOrSocket(
        socket,
        gameCode,
        EventTypes.GAME.CREATED,
        {
          gameCode,
          hostName: playerName,
          maxPlayers: gameOptions.maxPlayers
        },
        'game:created',
        { success: true, gameCode }
      );

      return {
        success: true,
        data: {
          gameCode,
          game,
          hostPlayer
        }
      };

    } catch (error) {
      logger.error('Error in handleGameCreate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle game start request
   */
  async handleGameStart(
    io: SocketIOServer,
    socket: Socket,
    request: StartGameRequest
  ): Promise<GameControllerResult> {
    try {
      const { gameCode } = request;

      // Validate game and permissions
      const game = validateGameAction(socket, gameCode, true, false, false);
      if (!game) {
        return {
          success: false,
          error: 'Game not found or access denied'
        };
      }

      // Check if player is host
      if (game.gameState.hostId !== socket.id) {
        return {
          success: false,
          error: 'Only the host can start the game'
        };
      }

      // Attempt to start the game
      const startResult = await game.startGame();
      
      if (startResult.success) {
        logger.info('GameStarted', {
          gameCode,
          hostId: socket.id,
          playerCount: game.getPlayers().length
        });

        // Notify all players
        io.to(gameCode).emit('game:started', {
          success: true,
          game: game.toClientData(),
          message: messages.formatMessage(
            messages.getEvent('gameStarted'),
            { hostName: game.getPlayer(socket.id)?.name || 'Host' }
          )
        });

        // Emit start event through event bus
        emitThroughEventBusOrSocket(
          socket,
          gameCode,
          EventTypes.GAME.STARTED,
          {
            gameCode,
            playerCount: game.getPlayers().length
          },
          'game:started',
          { success: true }
        );
      } else {
        socket.emit('game:start_failed', {
          success: false,
          error: startResult.reason
        });
      }

      return startResult;

    } catch (error) {
      logger.error('Error in handleGameStart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Join a game by code
   */
  async joinGame(gameCode: string, playerData: Partial<Player>): Promise<JoinResult> {
    try {
      const game = gameService.getGame(gameCode);
      if (!game) {
        return { 
          success: false, 
          error: 'Game not found' 
        };
      }

      if (!playerData.name) {
        return {
          success: false,
          error: 'Player name is required'
        };
      }

      // Validate game can accept new players
      if (!game.gameRules.canAddPlayer(game.gameState.started, game.gameState.players.size)) {
        return {
          success: false,
          error: 'Game is full or cannot accept new players'
        };
      }

      // Add player to game
      const joinResult = game.addPlayer(playerData.id || '', playerData.name);
      
      if (joinResult.success) {
        const player = joinResult.player!;
        
        // Apply any additional player data
        if (playerData.class) player.class = playerData.class;
        if (playerData.race) player.race = playerData.race;

        return {
          success: true,
          player,
          game
        };
      }

      return {
        success: false,
        error: joinResult.error || 'Failed to join game'
      };

    } catch (error) {
      logger.error('Error in joinGame:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle getting game status
   */
  async handleGameStatus(
    socket: Socket,
    request: GameStatusRequest
  ): Promise<GameControllerResult> {
    try {
      const { gameCode } = request;

      const game = gameService.getGame(gameCode);
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }

      const player = game.getPlayer(socket.id);
      const gameData = game.toClientData(player?.id);
      const stats = game.getGameStats();

      return {
        success: true,
        data: {
          game: gameData,
          stats,
          player: player?.toClientData({ 
            includePrivate: true, 
            requestingPlayerId: player.id 
          })
        }
      };

    } catch (error) {
      logger.error('Error in handleGameStatus:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle ending a game
   */
  async handleGameEnd(
    io: SocketIOServer,
    socket: Socket,
    gameCode: string,
    winner?: string
  ): Promise<GameControllerResult> {
    try {
      const game = validateGameAction(socket, gameCode, true, false, false);
      if (!game) {
        return {
          success: false,
          error: 'Game not found or access denied'
        };
      }

      // Only host or system can end game
      const player = game.getPlayer(socket.id);
      if (!player || (game.gameState.hostId !== socket.id && socket.id !== 'system')) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      await game.endGame(winner);

      logger.info('GameEnded', {
        gameCode,
        winner,
        endedBy: player.name,
        duration: Date.now() - (game.gameState.startTime || Date.now())
      });

      // Notify all players
      io.to(gameCode).emit('game:ended', {
        winner,
        message: messages.formatMessage(
          messages.getEvent('gameEnded'),
          { winner: winner || 'No one' }
        ),
        stats: game.getGameStats()
      });

      // Emit end event through event bus
      emitThroughEventBusOrSocket(
        socket,
        gameCode,
        EventTypes.GAME.ENDED,
        {
          gameCode,
          winner,
          endedBy: player.name
        },
        'game:ended',
        { winner }
      );

      // Clean up game after delay
      setTimeout(() => {
        gameService.cleanupGame(gameCode);
      }, config.game?.cleanupDelay || 30000);

      return {
        success: true,
        data: { winner }
      };

    } catch (error) {
      logger.error('Error in handleGameEnd:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process a round for a game
   */
  async processRound(gameCode: string): Promise<GameControllerResult> {
    try {
      const game = gameService.getGame(gameCode);
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }

      const result = await game.processRound();
      
      logger.info('RoundProcessed', {
        gameCode,
        round: game.gameState.round,
        success: result.success
      });

      return result;

    } catch (error) {
      logger.error('Error in processRound:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all active games (for admin/monitoring)
   */
  async getActiveGames(): Promise<GameControllerResult> {
    try {
      const games = Array.from(gameService.games.values()).map(game => ({
        code: game.code,
        playerCount: game.getPlayers().length,
        started: game.gameState.started,
        ended: game.gameState.ended,
        round: game.gameState.round,
        level: game.gameState.level,
        hostId: game.gameState.hostId
      }));

      return {
        success: true,
        data: { games }
      };

    } catch (error) {
      logger.error('Error in getActiveGames:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Required abstract method implementations
  async create(input: CreateGameRequest): Promise<GameRoom> {
    const result = await this.handleGameCreate({} as any, {} as any, input);
    if (result.success && result.data) {
      return result.data.game;
    }
    throw new Error(result.error || 'Failed to create game');
  }

  async update(id: string, input: UpdateGameInput): Promise<GameRoom> {
    const game = gameService.getGame(id);
    if (!game) {
      throw new Error('Game not found');
    }

    if (input.phase) {
      game.gamePhase.setPhase(input.phase as any);
    }

    if (input.settings) {
      // Update game rules/settings
      Object.assign(game.gameRules, input.settings);
    }

    return game;
  }

  async findById(id: string): Promise<GameRoom | null> {
    return gameService.getGame(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return gameService.cleanupGame(id);
  }
}

export default GameController;