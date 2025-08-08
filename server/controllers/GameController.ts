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
// Messages are now accessed through the config system
import { EventTypes, EventType } from '../models/events/EventTypes.js';
import { GameRoom } from '../models/GameRoom.js';
import { createDebugLogger } from '../config/debug.config.js';
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
  eventType: EventType,
  eventData: any,
  fallbackEvent: string,
  fallbackData: any
): void {
  const game = gameService.games.get(gameCode);
  if (game && (game as any).eventBus) {
    (game as any).eventBus.emit(eventType, {
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
  private debug = createDebugLogger('gameStart', 'GameController');

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
        logger.error('Player name validation failed:', {
          playerName,
          socketId: socket.id,
          validationResult: false
        });
        return {
          success: false,
          error: 'Invalid player name'
        };
      }

      // Generate unique game code
      const gameCode = gameService.generateGameCode();

      // Create game room with options
      const gameOptions = {
        maxPlayers: maxPlayers || (config as any).game?.defaultMaxPlayers || 8,
        allowSpectators: (config as any).game?.allowSpectators || false,
        timeLimit: timeLimit || (config as any).game?.defaultTimeLimit || 300
      };

      const game = new GameRoom(gameCode, gameOptions);

      // Set socket server for real-time communication
      (game as any).setSocketServer(io);

      // Add creating player as host
      const joinResult = (game as any).addPlayer(socket.id, playerName);
      if (!joinResult.success) {
        return {
          success: false,
          error: joinResult.error || 'Failed to add player to created game'
        };
      }

      const hostPlayer = joinResult.player!;
      (game as any).hostId = hostPlayer.id;

      // Register game with service
      gameService.games.set(gameCode, game);

      // Join socket to game room
      socket.join(gameCode);

      logger.info('GameCreated', {
        gameCode,
        playerName, // Changed from hostName to match message template
        hostId: socket.id,
        maxPlayers: gameOptions.maxPlayers
      });

      // Send success response to creator
      socket.emit('gameCreated', {
        success: true,
        gameCode,
        // TODO: Implement toClientData methods when needed
        game: {
          code: gameCode,
          hostId: hostPlayer.id,
          maxPlayers: gameOptions.maxPlayers,
          playerCount: 1,
          started: false
        },
        player: {
          id: hostPlayer.id,
          name: hostPlayer.name,
          isHost: true
        }
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
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown',
        cause: error instanceof Error ? (error as any).cause : undefined,
        fullError: error
      };

      logger.error('DETAILED Error in handleGameCreate:', errorDetails);
      console.error('=== HANDLEGA ME CREATE ERROR ===');
      console.error('Message:', errorDetails.message);
      console.error('Stack:', errorDetails.stack);
      console.error('Full Error Object:', error);
      console.error('================================');

      return {
        success: false,
        error: errorDetails.message
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
      this.debug.info('=================== GAME START DEBUG ===================');
      this.debug.info('1. Request received:', JSON.stringify(request, null, 2));
      this.debug.info('Socket ID:', socket.id);

      const { gameCode } = request;
      this.debug.verbose('2. Extracted gameCode:', gameCode);

      // Validate game and permissions - game should NOT be started yet
      this.debug.verbose('3. Validating game action...');
      const game = validateGameAction(socket, gameCode, false, false, false);
      this.debug.verbose('4. Game validation result:', !!game);

      if (!game) {
        this.debug.warn('5. GAME NOT FOUND - returning error');
        return {
          success: false,
          error: 'Game not found or access denied'
        };
      }

      this.debug.verbose('5. Game found. Current state:');
      this.debug.verbose('   - Host ID:', (game as any).hostId);
      this.debug.verbose('   - Current socket ID:', socket.id);
      this.debug.verbose('   - Players count:', (game as any).getPlayers ? (game as any).getPlayers().length : 'NO GETPLAYERS METHOD');
      this.debug.verbose('   - Game started?:', (game as any).gameState?.started || (game as any).started || 'UNKNOWN');


      // Check if player is host
      this.debug.verbose('6. Checking if player is host...');
      if ((game as any).hostId !== socket.id) {
        this.debug.warn('7. HOST CHECK FAILED - not the host');
        return {
          success: false,
          error: 'Only the host can start the game'
        };
      }
      this.debug.info('7. HOST CHECK PASSED - proceeding to start game');

      // Attempt to start the game
      this.debug.info('8. Calling game.startGame()...');
      const startResult = await (game as any).startGame();
      this.debug.verbose('9. Start result:', JSON.stringify(startResult, null, 2));

      if (startResult.success) {
        this.debug.info('10. GAME START SUCCESSFUL - processing success flow...');

        const players = (game as any).getPlayers();
        this.debug.verbose('11. Players data:', players.map((p: any) => ({ id: p.id, name: p.name, isAlive: p.isAlive })));

        // Calculate warlock count for log message
        const warlockCount = players.filter((p: any) => p.isWarlock).length;

        logger.info('GameStarted', {
          gameCode,
          hostId: socket.id,
          playerCount: players.length,
          warlockCount: warlockCount
        });

        this.debug.verbose('12. About to get host player for message formatting...');
        const hostPlayer = (game as any).getPlayer(socket.id);
        this.debug.verbose('13. Host player found:', hostPlayer ? { id: hostPlayer.id, name: hostPlayer.name } : 'NOT FOUND');

        this.debug.verbose('14. About to get game event template...');
        const gameStartedEvent = (config as any).getEvent('gameStarted');
        this.debug.verbose('15. Game started event template:', gameStartedEvent);

        this.debug.verbose('16. About to format message with hostName:', hostPlayer?.name || 'Host');
        let formattedMessage;
        try {
          formattedMessage = (config as any).formatMessage(
            gameStartedEvent,
            { hostName: hostPlayer?.name || 'Host' }
          );
          this.debug.verbose('17. Successfully formatted message:', formattedMessage);
        } catch (formatError) {
          this.debug.error('17. ERROR formatting message:', formatError);
          formattedMessage = `Game started by ${hostPlayer?.name || 'Host'}`;
        }

        this.debug.verbose('18. About to get client data from game...');

        // Send personalized data to each player (so they get their abilities)
        for (const [playerId, player] of (game as any).players) {
          const personalizedGameData = (game as any).toClientData(playerId);
          this.debug.verbose(`19. Sending personalized data to ${(player as any).name}:`, JSON.stringify(personalizedGameData.players.find((p: any) => p.id === playerId), null, 2));

          io.to(playerId).emit('gameStarted', {
            ...personalizedGameData,
            success: true,
            message: formattedMessage
          });
        }

        this.debug.info('20. Successfully emitted personalized gameStarted events');
        this.debug.info('21. Successfully emitted gameStarted event');

        this.debug.verbose('22. About to emit through event bus...');
        // Emit start event through event bus
        try {
          emitThroughEventBusOrSocket(
            socket,
            gameCode,
            EventTypes.GAME.STARTED,
            {
              gameCode,
              playerCount: players.length
            },
            'game:started',
            { success: true }
          );
          this.debug.verbose('23. Successfully emitted through event bus');
        } catch (eventBusError) {
          this.debug.error('23. ERROR emitting through event bus:', eventBusError);
        }

        this.debug.info('24. SUCCESS FLOW COMPLETE - returning success result');
      } else {
        this.debug.error('10. GAME START FAILED - processing failure flow...');
        this.debug.error('   - Failure reason:', startResult.reason);

        socket.emit('game:start_failed', {
          success: false,
          error: startResult.reason
        });
        this.debug.info('11. Emitted start_failed event to socket');
      }

      this.debug.verbose('25. About to return result:', startResult);
      return startResult;

    } catch (error) {
      logger.error('Error in handleGameStart:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        gameCode: request.gameCode,
        socketId: socket.id
      });

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
      if (!(game as any).gameRules.canAddPlayer((game as any).started, (game as any).gameState.getPlayerCount())) {
        return {
          success: false,
          error: 'Game is full or cannot accept new players'
        };
      }

      // Add player to game
      const joinResult = (game as any).addPlayer(playerData.id || '', playerData.name);

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
      logger.error('Error in joinGame:', error as any);
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

      const player = (game as any).getPlayer(socket.id);
      const gameData = (game as any).toClientData(player?.id);
      const stats = (game as any).getGameStats();

      return {
        success: true,
        data: {
          game: gameData,
          stats,
          player: player ? (player as any).toClientData({
            includePrivate: true,
            requestingPlayerId: player?.id
          }) : undefined
        }
      };

    } catch (error) {
      logger.error('Error in handleGameStatus:', error as any);
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
      const player = (game as any).getPlayer(socket.id);
      if (!player || ((game as any).hostId !== socket.id && socket.id !== 'system')) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      await (game as any).endGame(winner);

      logger.info('GameEnded', {
        gameCode,
        winner,
        endedBy: (player as any).name,
        duration: 0 // TODO: Add startTime tracking
      });

      // Notify all players
      io.to(gameCode).emit('game:ended', {
        winner,
        message: (config as any).formatMessage(
          (config as any).getEvent('gameEnded'),
          { winner: winner || 'No one' }
        ),
        stats: (game as any).getGameStats()
      });

      // Emit end event through event bus
      emitThroughEventBusOrSocket(
        socket,
        gameCode,
        EventTypes.GAME.ENDED,
        {
          gameCode,
          winner,
          endedBy: (player as any).name
        },
        'game:ended',
        { winner }
      );

      // Clean up game after delay
      setTimeout(() => {
        gameService.cleanupGame(gameCode);
      }, (config as any).game?.cleanupDelay || 30000);

      return {
        success: true,
        data: { winner }
      };

    } catch (error) {
      logger.error('Error in handleGameEnd:', error as any);
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

      const result = await (game as any).processRound();

      logger.info('RoundProcessed', {
        gameCode,
        round: (game as any).round,
        success: result.success
      });

      return result;

    } catch (error) {
      logger.error('Error in processRound:', error as any);
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
        code: (game as any).code,
        playerCount: (game as any).getPlayers().length,
        started: (game as any).started,
        ended: false, // TODO: Add ended state to GameState
        round: (game as any).round,
        level: (game as any).level,
        hostId: (game as any).hostId
      }));

      return {
        success: true,
        data: { games }
      };

    } catch (error) {
      logger.error('Error in getActiveGames:', error as any);
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
      (game as any).gamePhase.setPhase(input.phase as any);
    }

    if (input.settings) {
      // Update game rules/settings
      Object.assign((game as any).gameRules, input.settings);
    }

    return game;
  }

  async findById(id: string): Promise<GameRoom | null> {
    return gameService.getGame(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return gameService.cleanupGame(id);
  }

  /**
   * Handle checking if a player name is available in a game
   */
  async handleGameCheckName(
    io: SocketIOServer,
    socket: Socket,
    gameCode: string,
    playerName: string
  ): Promise<void> {
    try {
      const game = gameService.getGame(gameCode);
      if (!game) {
        socket.emit('nameCheckResponse', {
          available: false,
          error: 'Game not found'
        });
        return;
      }

      // Check if name is already taken in this game
      const existingPlayer = Array.from(game.getPlayers()).find(
        (p: any) => p.name.toLowerCase() === playerName.toLowerCase()
      );

      if (existingPlayer) {
        socket.emit('nameCheckResponse', {
          available: false,
          error: 'Name already taken in this game'
        });
      } else {
        socket.emit('nameCheckResponse', {
          available: true
        });
      }
    } catch (error) {
      logger.error('Error in handleGameCheckName:', {
        error: error instanceof Error ? error.message : String(error),
        gameCode,
        playerName,
        socketId: socket.id
      });

      socket.emit('nameCheckResponse', {
        available: false,
        error: 'Error checking name availability'
      });
    }
  }

  /**
   * Handle player action submission
   */
  async handleGameAction(
    io: SocketIOServer,
    socket: Socket,
    gameCode: string,
    actionType: string,
    targetId?: string,
    options?: { bloodRageActive?: boolean; keenSensesActive?: boolean; }
  ): Promise<void> {
    try {
      const game = validateGameAction(socket, gameCode, true, false, false);
      if (!game) {
        socket.emit('errorMessage', { message: 'Game not found' });
        return;
      }

      const player = game.getPlayer(socket.id);
      if (!player) {
        socket.emit('errorMessage', { message: 'Player not found' });
        return;
      }

      // Submit the action to the game room
      const result = await game.submitAction({
        playerId: socket.id,
        actionType,
        targetId,
        additionalData: options
      });

      if (result.success) {
        socket.emit('actionSubmitted', { success: true });
        logger.info(`[GameController] Player ${player.name} submitted action: ${actionType} -> ${targetId}`);

        // Send updated game state to all players so they can see submission status
        for (const [playerId, gamePlayer] of (game as any).players) {
          const personalizedGameData = (game as any).toClientData(playerId);
          io.to(playerId).emit('gameStateUpdate', personalizedGameData);
        }
      } else {
        socket.emit('errorMessage', { message: result.reason || 'Failed to submit action' });
      }
    } catch (error) {
      logger.error('[GameController] Error in handleGameAction:', error as any);
      socket.emit('errorMessage', {
        message: error instanceof Error ? error.message : 'Failed to submit action'
      });
    }
  }
}

// Export an instance for immediate use
const gameController = new GameController();
export default gameController;
