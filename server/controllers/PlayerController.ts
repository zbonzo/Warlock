/**
 * @fileoverview TypeScript Controller for player-related operations
 * Phase 5: Controllers & Main Classes Migration
 * Handles player joining, character selection, and immediate disconnection
 * Uses centralized config and messaging systems with full type safety
 */

import gameService from '../services/gameService.js';
import { validatePlayerNameSocket } from '../middleware/validation.js';
import { validateGameAction } from '../shared/gameChecks.js';
import logger from '../utils/logger.js';
import errorHandler from '../utils/errorHandler.js';
import config from '../config/index.js';
import messages from '../messages/index.js';
import { GameRoom } from '../models/GameRoom.js';
import { Player } from '../models/Player.js';
import { 
  PlayerClass, 
  PlayerRace, 
  ActionResult, 
  JoinGameData,
  PlayerAction
} from '../types/generated.js';
import { Socket, Server as SocketIOServer } from 'socket.io';

export interface JoinGameRequest {
  gameCode: string;
  playerName: string;
  playerClass?: PlayerClass;
  playerRace?: PlayerRace;
}

export interface CharacterSelectionRequest {
  gameCode: string;
  class: PlayerClass;
  race: PlayerRace;
}

export interface PlayerActionRequest {
  gameCode: string;
  actionType: string;
  targetId?: string;
  abilityId?: string;
  actionData?: Record<string, any>;
}

export interface PlayerControllerResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * BaseController class for common controller functionality
 */
export abstract class BaseController<TModel, TCreateInput, TUpdateInput> {
  protected abstract model: TModel;
  
  abstract create(input: TCreateInput): Promise<TModel>;
  abstract update(id: string, input: TUpdateInput): Promise<TModel>;
  abstract findById(id: string): Promise<TModel | null>;
  abstract delete(id: string): Promise<boolean>;
}

/**
 * PlayerController handles all player-related operations with type safety
 */
export class PlayerController extends BaseController<Player, JoinGameRequest, Partial<Player>> {
  protected model: Player = {} as Player; // Placeholder for abstract requirement

  /**
   * Handle player joining a game
   */
  async handlePlayerJoin(
    io: SocketIOServer, 
    socket: Socket, 
    request: JoinGameRequest
  ): Promise<PlayerControllerResult> {
    try {
      const { gameCode, playerName, playerClass, playerRace } = request;
      
      // Validate game exists and is joinable
      const game = validateGameAction(socket, gameCode, false, false, false);
      if (!game) {
        return {
          success: false,
          error: 'Game not found or not joinable'
        };
      }

      // Validate player name
      if (!validatePlayerNameSocket(socket, playerName, gameCode)) {
        return {
          success: false,
          error: 'Invalid player name'
        };
      }

      // Validate game capacity and player eligibility
      if (!gameService.canPlayerJoinGame(game, socket.id)) {
        return {
          success: false,
          error: 'Cannot join game at this time'
        };
      }

      // Add player and update game state
      const sanitizedName = playerName || config.player?.defaultPlayerName || 'Player';
      const joinResult = game.addPlayer(socket.id, sanitizedName);
      
      if (!joinResult.success) {
        errorHandler.throwGameStateError(messages.getError('couldNotJoinGame'));
        return {
          success: false,
          error: joinResult.error || 'Failed to join game'
        };
      }

      const player = joinResult.player!;

      // Set initial character selection if provided
      if (playerClass) {
        player.class = playerClass;
      }
      if (playerRace) {
        player.race = playerRace;
      }

      // Join socket to game room and update clients
      socket.join(gameCode);
      
      // Register with SocketEventRouter if available
      const socketRouter = game.socketEventRouter;
      if (socketRouter) {
        socketRouter.registerSocket(socket);
        socketRouter.mapPlayerSocket(socket.id, socket.id);
      }
      
      logger.info('PlayerJoinedGame', {
        playerName: sanitizedName,
        gameCode,
        socketId: socket.id,
        playerClass,
        playerRace
      });

      // Send success response
      socket.emit('game:joined', {
        success: true,
        player: player.toClientData({ includePrivate: true, requestingPlayerId: player.id }),
        game: game.toClientData(player.id)
      });

      // Notify other players
      socket.to(gameCode).emit('player:joined', {
        player: player.toClientData(),
        message: messages.formatMessage(
          messages.getEvent('playerJoined'),
          { playerName: sanitizedName }
        )
      });

      return {
        success: true,
        data: {
          player,
          game
        }
      };

    } catch (error) {
      logger.error('Error in handlePlayerJoin:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle character selection
   */
  async handleCharacterSelection(
    io: SocketIOServer,
    socket: Socket,
    request: CharacterSelectionRequest
  ): Promise<PlayerControllerResult> {
    try {
      const { gameCode, class: playerClass, race } = request;

      // Validate game and player
      const game = validateGameAction(socket, gameCode, true, false, false);
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }

      const player = game.getPlayer(socket.id);
      if (!player) {
        return {
          success: false,
          error: 'Player not found in game'
        };
      }

      // Validate character selection is allowed
      if (game.gameState.started) {
        return {
          success: false,
          error: 'Cannot change character after game has started'
        };
      }

      // Apply character selection
      player.class = playerClass;
      player.race = race;

      // Apply class and race bonuses
      gameService.applyCharacterBonuses(player, playerClass, race);

      logger.info('CharacterSelected', {
        playerName: player.name,
        gameCode,
        class: playerClass,
        race
      });

      // Send confirmation to player
      socket.emit('character:selected', {
        success: true,
        player: player.toClientData({ includePrivate: true, requestingPlayerId: player.id })
      });

      // Notify other players
      socket.to(gameCode).emit('player:updated', {
        playerId: player.id,
        updates: {
          class: playerClass,
          race
        },
        message: messages.formatMessage(
          'playerSelectedCharacter',
          { playerName: player.name, class: playerClass, race }
        )
      });

      return {
        success: true,
        data: { player }
      };

    } catch (error) {
      logger.error('Error in handleCharacterSelection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle player action submission
   */
  async handlePlayerAction(
    io: SocketIOServer,
    socket: Socket,
    request: PlayerActionRequest
  ): Promise<PlayerControllerResult> {
    try {
      const { gameCode, actionType, targetId, abilityId, actionData = {} } = request;

      // Validate game and player
      const game = validateGameAction(socket, gameCode, true, true, false);
      if (!game) {
        return {
          success: false,
          error: 'Game not found or not in valid state'
        };
      }

      const player = game.getPlayer(socket.id);
      if (!player) {
        return {
          success: false,
          error: 'Player not found in game'
        };
      }

      // Submit action through game room
      const actionResult = await game.submitAction({
        playerId: socket.id,
        actionType,
        targetId,
        additionalData: {
          ...actionData,
          abilityId
        }
      });

      if (actionResult.success) {
        // Send confirmation to player
        socket.emit('action:submitted', {
          success: true,
          actionType,
          targetId,
          submissionTime: Date.now()
        });

        // Notify other players if appropriate
        if (actionType !== 'ability' || !config.game?.hideAbilitySubmissions) {
          socket.to(gameCode).emit('player:action_submitted', {
            playerId: player.id,
            playerName: player.name,
            hasSubmitted: true
          });
        }

        logger.debug('PlayerActionSubmitted', {
          playerName: player.name,
          gameCode,
          actionType,
          targetId
        });
      } else {
        // Send error to player
        socket.emit('action:error', {
          success: false,
          error: actionResult.reason,
          actionType
        });
      }

      return actionResult;

    } catch (error) {
      logger.error('Error in handlePlayerAction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle player leaving/disconnecting
   */
  async handlePlayerLeave(
    io: SocketIOServer,
    socket: Socket,
    gameCode: string,
    isDisconnect: boolean = false
  ): Promise<PlayerControllerResult> {
    try {
      const game = gameService.getGame(gameCode);
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }

      const player = game.getPlayer(socket.id);
      if (!player) {
        return {
          success: false,
          error: 'Player not found in game'
        };
      }

      const playerName = player.name;

      if (isDisconnect && game.gameState.started) {
        // Handle disconnection during game
        gameService.handlePlayerDisconnection(game, socket.id);
        
        logger.info('PlayerDisconnected', {
          playerName,
          gameCode,
          socketId: socket.id
        });

        // Notify other players
        socket.to(gameCode).emit('player:disconnected', {
          playerId: socket.id,
          playerName,
          message: messages.formatMessage(
            messages.getEvent('playerDisconnected'),
            { playerName }
          )
        });
      } else {
        // Handle normal leave
        const success = game.removePlayer(socket.id);
        
        if (success) {
          socket.leave(gameCode);
          
          logger.info('PlayerLeftGame', {
            playerName,
            gameCode,
            socketId: socket.id
          });

          // Notify other players
          socket.to(gameCode).emit('player:left', {
            playerId: socket.id,
            playerName,
            message: messages.formatMessage(
              messages.getEvent('playerLeft'),
              { playerName }
            )
          });
        }
      }

      return {
        success: true,
        data: { playerName }
      };

    } catch (error) {
      logger.error('Error in handlePlayerLeave:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle player reconnection
   */
  async handlePlayerReconnect(
    io: SocketIOServer,
    socket: Socket,
    gameCode: string,
    playerName: string
  ): Promise<PlayerControllerResult> {
    try {
      const game = gameService.getGame(gameCode);
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }

      const reconnectResult = gameService.handlePlayerReconnection(game, socket, playerName);
      
      if (reconnectResult.success) {
        const player = reconnectResult.player;
        
        // Update socket mapping
        player.addSocketId(socket.id);
        
        // Join socket to game room
        socket.join(gameCode);
        
        // Register with socket router
        const socketRouter = game.socketEventRouter;
        if (socketRouter) {
          socketRouter.registerSocket(socket);
          socketRouter.mapPlayerSocket(socket.id, socket.id);
        }

        logger.info('PlayerReconnected', {
          playerName,
          gameCode,
          newSocketId: socket.id,
          oldSocketIds: player.socketIds
        });

        // Send game state to reconnected player
        socket.emit('game:reconnected', {
          success: true,
          player: player.toClientData({ includePrivate: true, requestingPlayerId: player.id }),
          game: game.toClientData(player.id)
        });

        // Notify other players
        socket.to(gameCode).emit('player:reconnected', {
          playerId: player.id,
          playerName,
          message: messages.formatMessage(
            messages.getEvent('playerReconnected'),
            { playerName }
          )
        });
      }

      return reconnectResult;

    } catch (error) {
      logger.error('Error in handlePlayerReconnect:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Required abstract method implementations (minimal for now)
  async create(input: JoinGameRequest): Promise<Player> {
    throw new Error('Use handlePlayerJoin instead');
  }

  async update(id: string, input: Partial<Player>): Promise<Player> {
    throw new Error('Use specific update methods instead');
  }

  async findById(id: string): Promise<Player | null> {
    // This would typically find a player across all games
    // Implementation depends on game service architecture
    return gameService.findPlayerById(id);
  }

  async delete(id: string): Promise<boolean> {
    throw new Error('Use handlePlayerLeave instead');
  }
}

export default PlayerController;