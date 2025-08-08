/**
 * @fileoverview Central Socket.IO event router and EventBus bridge - TypeScript version
 * Consolidates all socket communications through the EventBus system
 * Part of Phase 9 migration - Complete TypeScript conversion
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventTypes } from './EventTypes.js';
import { SocketValidationMiddleware } from '../../middleware/socketValidation.js';
import { CommandProcessor } from '../commands/CommandProcessor.js';
import { PlayerActionCommand } from '../commands/PlayerActionCommand.js';
import { AbilityCommand } from '../commands/AbilityCommand.js';

import logger from '../../utils/logger.js';

/**
 * Socket event configuration interface
 */
interface EventConfig {
  validation?: (socket: Socket, next: Function) => any;
  handler: (socket: Socket, data: any, callback?: Function) => Promise<void>;
}

/**
 * Event mapping types
 */
type IncomingEventMap = Map<string, EventConfig>;
type OutgoingEventMap = Map<string, string>;

/**
 * Router statistics interface
 */
interface RouterStats {
  socketsConnected: number;
  eventsRouted: number;
  commandsProcessed: number;
  errorsHandled: number;
  activeSockets: number;
  mappedPlayers: number;
}

import type { GameRoom } from '../GameRoom.js';

/**
 * Event data interface for socket events
 */
interface SocketEventData {
  actionType?: string;
  targetId?: string;
  gameCode: string;
  playerName?: string;
  className?: string;
  abilityName?: string;
  playerId?: string;
  socketId?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Client event data interface
 */
interface ClientEventData {
  timestamp: string;
  gameCode: string;
  [key: string]: any;
}

/**
 * Central router for Socket.IO events with EventBus integration
 * Provides bidirectional event routing between Socket.IO and EventBus
 */
export class SocketEventRouter {
  private gameRoom: GameRoom;
  private eventBus: any;
  private io: SocketIOServer;
  private gameCode: string;
  private validator: SocketValidationMiddleware;
  private commandProcessor: CommandProcessor;

  // Socket management
  private sockets: Map<string, Socket> = new Map();
  private playerSockets: Map<string, string> = new Map();

  // Event mapping configurations
  private incomingEventMap: IncomingEventMap;
  private outgoingEventMap: OutgoingEventMap;

  // Statistics
  private stats: Omit<RouterStats, 'activeSockets' | 'mappedPlayers'> = {
    socketsConnected: 0,
    eventsRouted: 0,
    commandsProcessed: 0,
    errorsHandled: 0
  };

  /**
   * Create a new socket event router
   * @param gameRoom - Game room instance
   * @param io - Socket.IO server instance
   */
  constructor(gameRoom: GameRoom, io: SocketIOServer) {
    this.gameRoom = gameRoom;
    this.eventBus = gameRoom.eventBus;
    this.io = io;
    this.gameCode = gameRoom.code;

    // Socket validation middleware
    this.validator = new SocketValidationMiddleware({
      enableLogging: true
    });

    // Command processor for handling socket actions
    this.commandProcessor = new CommandProcessor(gameRoom);

    // Event mapping configurations
    this.incomingEventMap = this._createIncomingEventMap();
    this.outgoingEventMap = this._createOutgoingEventMap();

    // Set up EventBus listeners for outgoing events
    this._setupEventBusListeners();
  }

  /**
   * Register a socket connection with the router
   * @param socket - Socket.IO socket instance
   */
  registerSocket(socket: Socket): void {
    this.sockets.set(socket.id, socket);
    this.stats.socketsConnected++;

    logger.info('Socket registered with router:', {
      gameCode: this.gameCode,
      socketId: socket.id,
      totalSockets: this.sockets.size
    });

    // Set up socket event handlers
    this._setupSocketHandlers(socket);

    // Handle socket disconnection
    socket.on('disconnect', () => {
      this._handleSocketDisconnect(socket);
    });
  }

  /**
   * Map a player to their socket connection
   * @param playerId - Player ID
   * @param socketId - Socket ID
   */
  mapPlayerSocket(playerId: string, socketId: string): void {
    this.playerSockets.set(playerId, socketId);
    logger.debug('Player mapped to socket:', {
      gameCode: this.gameCode,
      playerId,
      socketId
    });
  }

  /**
   * Emit an event to a specific player
   * @param playerId - Player ID
   * @param eventName - Socket.IO event name
   * @param data - Event data
   */
  emitToPlayer(playerId: string, eventName: string, data: any): void {
    const socketId = this.playerSockets.get(playerId);
    if (socketId && this.sockets.has(socketId)) {
      const socket = this.sockets.get(socketId)!;
      socket.emit(eventName, data);
      this.stats.eventsRouted++;

      logger.debug('Event emitted to player:', {
        gameCode: this.gameCode,
        playerId,
        eventName,
        data
      });
    }
  }

  /**
   * Broadcast an event to all players in the game
   * @param eventName - Socket.IO event name
   * @param data - Event data
   */
  broadcastToGame(eventName: string, data: any): void {
    this.io.to(this.gameCode).emit(eventName, data);
    this.stats.eventsRouted++;

    logger.debug('Event broadcasted to game:', {
      gameCode: this.gameCode,
      eventName,
      playersCount: this.sockets.size,
      data
    });
  }

  /**
   * Create incoming event mapping (Socket.IO → EventBus)
   * @returns Event mapping configuration
   * @private
   */
  private _createIncomingEventMap(): IncomingEventMap {
    return new Map([
      // For now, no events are handled directly by SocketEventRouter
      // All events are handled by main server.js and routed through EventBus
      // This prevents conflicts and maintains existing functionality
    ]);
  }

  /**
   * Create outgoing event mapping (EventBus → Socket.IO)
   * @returns Event mapping configuration
   * @private
   */
  private _createOutgoingEventMap(): OutgoingEventMap {
    return new Map([
      // Game Events
      [EventTypes.GAME.CREATED, 'gameCreated'],
      [EventTypes.GAME.STARTED, 'gameStarted'],
      [EventTypes.GAME.ENDED, 'gameEnded'],

      // Phase Events
      [EventTypes.PHASE.CHANGED, 'phaseChanged'],
      [EventTypes.PHASE.COUNTDOWN_STARTED, 'countdownStarted'],
      [EventTypes.PHASE.COUNTDOWN_TICK, 'countdownTick'],

      // Player Events
      [EventTypes.PLAYER.JOINED, 'playerJoined'],
      [EventTypes.PLAYER.LEFT, 'playerLeft'],
      [EventTypes.PLAYER.DISCONNECTED, 'playerDisconnected'],
      [EventTypes.PLAYER.RECONNECTED, 'gameReconnected'],
      [EventTypes.PLAYER.DIED, 'playerDied'],
      [EventTypes.PLAYER.STATUS_UPDATED, 'playerList'],

      // Action Events
      [EventTypes.ACTION.SUBMITTED, 'actionSubmitted'],
      [EventTypes.ACTION.EXECUTED, 'actionExecuted'],
      [EventTypes.ABILITY.FAILED, 'actionFailed'],
      [EventTypes.ABILITY.USED, 'racialAbilityUsed'],
      [EventTypes.ABILITY.EXECUTED, 'adaptabilityComplete'],

      // Combat Events
      [EventTypes.DAMAGE.APPLIED, 'damageApplied'],
      [EventTypes.HEAL.APPLIED, 'healingApplied'],
      [EventTypes.EFFECT.APPLIED, 'effectApplied'],

      // Error Events
      [EventTypes.GAME.ERROR, 'errorMessage'],
      ['validation.error', 'validationError']
    ]);
  }

  /**
   * Set up EventBus listeners for outgoing events
   * @private
   */
  private _setupEventBusListeners(): void {
    // Listen to all mapped EventBus events
    for (const [eventBusType, socketEventName] of this.outgoingEventMap) {
      this.eventBus.on(eventBusType, (eventData: any) => {
        this._routeEventBusToSocket(eventBusType, socketEventName, eventData);
      });
    }

    // Special handling for player-specific events
    this.eventBus.on(EventTypes.PLAYER.NAME_CHECK, (eventData: SocketEventData) => {
      if (eventData.socketId) {
        const socket = this.sockets.get(eventData.socketId);
        if (socket) {
          socket.emit('nameCheckResponse', {
            isAvailable: (eventData as any).isValid,
            error: (eventData as any).error
          });
        }
      }
    });

    this.eventBus.on(EventTypes.PLAYER.CLASS_ABILITIES_REQUEST, (eventData: SocketEventData) => {
      if (eventData.socketId) {
        const socket = this.sockets.get(eventData.socketId);
        if (socket) {
          socket.emit('classAbilitiesResponse', {
            success: (eventData as any).success,
            abilities: (eventData as any).abilities || [],
            message: (eventData as any).message
          });
        }
      }
    });

    // Handle controller-initiated events for backwards compatibility
    this.eventBus.on(EventTypes.CONTROLLER.ERROR, (eventData: SocketEventData) => {
      if (eventData.socketId && this.sockets.has(eventData.socketId)) {
        const socket = this.sockets.get(eventData.socketId)!;
        socket.emit('errorMessage', {
          type: (eventData as any).type || 'error',
          message: (eventData as any).message,
          timestamp: new Date().toISOString(),
          gameCode: this.gameCode
        });
      }
    });

    this.eventBus.on(EventTypes.CONTROLLER.GAME_CREATED, (eventData: SocketEventData) => {
      if (eventData.socketId && this.sockets.has(eventData.socketId)) {
        const socket = this.sockets.get(eventData.socketId)!;
        socket.emit('gameCreated', {
          gameCode: eventData.gameCode,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.eventBus.on(EventTypes.CONTROLLER.PLAYER_JOINED, (eventData: SocketEventData) => {
      if (eventData.socketId && this.sockets.has(eventData.socketId)) {
        const socket = this.sockets.get(eventData.socketId)!;
        socket.emit('playerJoined', {
          gameCode: eventData.gameCode,
          playerName: eventData.playerName,
          me: (eventData as any).me,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Set up socket event handlers
   * @param socket - Socket.IO socket instance
   * @private
   */
  private _setupSocketHandlers(socket: Socket): void {
    // Note: socket.join is handled by the main server during connection
    // We don't need to join here to avoid conflicts

    // No event handlers to register - all events handled by main server
    // SocketEventRouter focuses on outgoing EventBus → Socket.IO routing

    // For future expansion, incoming event handlers can be added here
    // when we want to gradually migrate events from main server to EventBus
  }

  /**
   * Handle incoming socket events with validation and routing
   * @param socket - Socket.IO socket instance
   * @param eventName - Socket event name
   * @param data - Event data
   * @param callback - Optional callback
   * @param config - Event configuration
   * @private
   */
  private async _handleIncomingEvent(
    socket: Socket,
    eventName: string,
    data: any,
    callback?: Function,
    config?: EventConfig
  ): Promise<void> {
    try {
      if (!config) return;

      // Apply validation if configured
      if (config.validation) {
        const validationMiddleware = config.validation(socket, () => {});
        const isValid = await validationMiddleware(data, (error: any, validatedData: any) => {
          if (error) {
            this.stats.errorsHandled++;
            return false;
          }
          return validatedData;
        });

        if (!isValid) {
          return; // Validation middleware already handled the error
        }
      }

      // Call the specific handler
      await config.handler(socket, data, callback);
      this.stats.eventsRouted++;

    } catch (error: any) {
      logger.error('Socket event handling error:', {
        gameCode: this.gameCode,
        socketId: socket.id,
        eventName,
        error: error.message,
        stack: error.stack
      });

      this._emitError(socket, 'actionProcessingError', error.message);
      this.stats.errorsHandled++;
    }
  }

  /**
   * Route EventBus events to Socket.IO
   * @param eventBusType - EventBus event type
   * @param socketEventName - Socket.IO event name
   * @param eventData - Event data
   * @private
   */
  private _routeEventBusToSocket(eventBusType: string, socketEventName: string, eventData: any): void {
    try {
      // Transform event data for client consumption
      const clientData = this._transformEventDataForClient(eventBusType, eventData);

      // Determine routing strategy
      if (eventData.playerId && this.playerSockets.has(eventData.playerId)) {
        // Send to specific player
        this.emitToPlayer(eventData.playerId, socketEventName, clientData);
      } else {
        // Broadcast to all players in game
        this.broadcastToGame(socketEventName, clientData);
      }

      this.stats.eventsRouted++;

    } catch (error: any) {
      logger.error('EventBus to Socket routing error:', {
        gameCode: this.gameCode,
        eventBusType,
        socketEventName,
        error: error.message
      });
    }
  }

  /**
   * Transform EventBus data for client consumption
   * @param eventType - EventBus event type
   * @param eventData - Raw event data
   * @returns Transformed data for client
   * @private
   */
  private _transformEventDataForClient(eventType: string, eventData: any): ClientEventData {
    // Remove internal properties that shouldn't go to client
    const { eventBus, gameRoom, ...clientData } = eventData;

    // Add standard fields for client events
    if (!clientData.timestamp) {
      clientData.timestamp = new Date().toISOString();
    }

    if (!clientData.gameCode) {
      clientData.gameCode = this.gameCode;
    }

    return clientData;
  }

  /**
   * Handle socket disconnection
   * @param socket - Socket.IO socket instance
   * @private
   */
  private _handleSocketDisconnect(socket: Socket): void {
    this.sockets.delete(socket.id);

    // Find and remove player mapping
    for (const [playerId, socketId] of this.playerSockets) {
      if (socketId === socket.id) {
        this.playerSockets.delete(playerId);

        // Emit player disconnected event
        this.eventBus.emit(EventTypes.PLAYER.DISCONNECTED, {
          playerId,
          socketId: socket.id,
          gameCode: this.gameCode,
          timestamp: new Date().toISOString()
        });
        break;
      }
    }

    logger.info('Socket disconnected from router:', {
      gameCode: this.gameCode,
      socketId: socket.id,
      remainingSockets: this.sockets.size
    });
  }

  /**
   * Emit standardized error to socket
   * @param socket - Socket.IO socket instance
   * @param errorType - Error type identifier
   * @param message - Error message
   * @private
   */
  private _emitError(socket: Socket, errorType: string, message: string): void {
    socket.emit('errorMessage', {
      type: errorType,
      message,
      timestamp: new Date().toISOString(),
      gameCode: this.gameCode
    });
  }

  // Event Handlers - Integrated with command processing and EventBus

  /**
   * Handle submit action socket event
   * @param socket - Socket.IO socket instance
   * @param data - Event data {actionType, targetId, gameCode}
   * @param callback - Optional callback
   */
  private async _handleSubmitAction(socket: Socket, data: SocketEventData, callback?: Function): Promise<void> {
    try {
      const { actionType, targetId, gameCode } = data;

      // Find the player for this socket
      const player = this.gameRoom.getPlayerBySocketId(socket.id);
      if (!player) {
        this._emitError(socket, 'playerNotFound', 'Player not found for this session');
        return;
      }

      // Create and submit command through command processor
      let command: PlayerActionCommand | AbilityCommand;
      if (actionType === 'ability') {
        command = new AbilityCommand(
          socket.id,
          targetId! // For abilities, targetId contains ability name
        );
      } else {
        command = new PlayerActionCommand(
          socket.id,
          actionType!,
          {
            targetId
          }
        );
      }

      // Submit command for processing
      const commandId = await this.commandProcessor.submitCommand(command);
      this.stats.commandsProcessed++;

      // Emit success response
      socket.emit('actionSubmitted', {
        actionType,
        targetId,
        commandId,
        success: true,
        timestamp: new Date().toISOString()
      });

      logger.debug('Action command submitted:', {
        socketId: socket.id,
        actionType,
        targetId,
        commandId
      });

    } catch (error: any) {
      logger.error('Submit action handler error:', {
        socketId: socket.id,
        error: error.message,
        data
      });
      this._emitError(socket, 'actionSubmissionError', error.message);
    }
  }

  /**
   * Handle racial ability socket event
   * @param socket - Socket.IO socket instance
   * @param data - Event data {gameCode}
   * @param callback - Optional callback
   */
  private async _handleRacialAbility(socket: Socket, data: SocketEventData, callback?: Function): Promise<void> {
    try {
      const { gameCode } = data;

      // Emit racial ability event through EventBus
      this.eventBus.emit(EventTypes.ABILITY.USED, {
        socketId: socket.id,
        playerId: socket.id,
        gameCode,
        timestamp: new Date().toISOString()
      });

      logger.debug('Racial ability event routed to EventBus:', {
        socketId: socket.id,
        gameCode
      });

    } catch (error: any) {
      logger.error('Racial ability handler error:', {
        socketId: socket.id,
        error: error.message,
        data
      });
      this._emitError(socket, 'racialAbilityError', error.message);
    }
  }

  /**
   * Handle adaptability selection socket event
   * @param socket - Socket.IO socket instance
   * @param data - Event data {gameCode, abilityName}
   * @param callback - Optional callback
   */
  private async _handleAdaptability(socket: Socket, data: SocketEventData, callback?: Function): Promise<void> {
    try {
      const { gameCode, abilityName } = data;

      // Emit adaptability event through EventBus
      this.eventBus.emit(EventTypes.ABILITY.EXECUTED, {
        socketId: socket.id,
        playerId: socket.id,
        abilityName,
        gameCode,
        timestamp: new Date().toISOString()
      });

      logger.debug('Adaptability event routed to EventBus:', {
        socketId: socket.id,
        abilityName,
        gameCode
      });

    } catch (error: any) {
      logger.error('Adaptability handler error:', {
        socketId: socket.id,
        error: error.message,
        data
      });
      this._emitError(socket, 'adaptabilityError', error.message);
    }
  }

  /**
   * Handle name check socket event
   * @param socket - Socket.IO socket instance
   * @param data - Event data {gameCode, playerName}
   * @param callback - Optional callback
   */
  private async _handleNameCheck(socket: Socket, data: SocketEventData, callback?: Function): Promise<void> {
    try {
      const { gameCode, playerName } = data;

      // Emit name check event through EventBus
      this.eventBus.emit(EventTypes.PLAYER.NAME_CHECK, {
        socketId: socket.id,
        playerName,
        gameCode,
        timestamp: new Date().toISOString()
      });

      logger.debug('Name check event routed to EventBus:', {
        socketId: socket.id,
        playerName,
        gameCode
      });

    } catch (error: any) {
      logger.error('Name check handler error:', {
        socketId: socket.id,
        error: error.message,
        data
      });
      this._emitError(socket, 'nameCheckError', error.message);
    }
  }

  /**
   * Handle class abilities request socket event
   * @param socket - Socket.IO socket instance
   * @param data - Event data {gameCode, className}
   * @param callback - Optional callback
   */
  private async _handleClassAbilitiesRequest(socket: Socket, data: SocketEventData, callback?: Function): Promise<void> {
    try {
      const { gameCode, className } = data;

      // Emit class abilities request through EventBus
      this.eventBus.emit(EventTypes.PLAYER.CLASS_ABILITIES_REQUEST, {
        socketId: socket.id,
        className,
        gameCode,
        timestamp: new Date().toISOString()
      });

      logger.debug('Class abilities request routed to EventBus:', {
        socketId: socket.id,
        className,
        gameCode
      });

    } catch (error: any) {
      logger.error('Class abilities request handler error:', {
        socketId: socket.id,
        error: error.message,
        data
      });
      this._emitError(socket, 'classAbilitiesError', error.message);
    }
  }

  /**
   * Get router statistics
   * @returns Statistics object
   */
  getStats(): RouterStats {
    return {
      ...this.stats,
      activeSockets: this.sockets.size,
      mappedPlayers: this.playerSockets.size
    };
  }
}

export default SocketEventRouter;
