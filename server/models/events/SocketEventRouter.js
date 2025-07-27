/**
 * @fileoverview Central Socket.IO event router and EventBus bridge
 * Consolidates all socket communications through the EventBus system
 * Part of Phase 2 Step 4 refactoring - Socket.IO Event Consolidation
 */
const { EventTypes } = require('./EventTypes');
const { SocketValidationMiddleware } = require('../../middleware/socketValidation');
const CommandProcessor = require('../commands/CommandProcessor');
const PlayerActionCommand = require('../commands/PlayerActionCommand');
const AbilityCommand = require('../commands/AbilityCommand');
const logger = require('@utils/logger');

/**
 * Central router for Socket.IO events with EventBus integration
 * Provides bidirectional event routing between Socket.IO and EventBus
 */
class SocketEventRouter {
  /**
   * Create a new socket event router
   * @param {Object} gameRoom - Game room instance
   * @param {Object} io - Socket.IO server instance
   */
  constructor(gameRoom, io) {
    this.gameRoom = gameRoom;
    this.eventBus = gameRoom.getEventBus();
    this.io = io;
    this.gameCode = gameRoom.getGameCode();
    
    // Socket validation middleware
    this.validator = new SocketValidationMiddleware({
      enableLogging: true
    });
    
    // Command processor for handling socket actions
    this.commandProcessor = new CommandProcessor(gameRoom);
    
    // Active socket connections for this game
    this.sockets = new Map(); // socketId -> socket instance
    this.playerSockets = new Map(); // playerId -> socketId
    
    // Event mapping configurations
    this.incomingEventMap = this._createIncomingEventMap();
    this.outgoingEventMap = this._createOutgoingEventMap();
    
    // Statistics
    this.stats = {
      socketsConnected: 0,
      eventsRouted: 0,
      commandsProcessed: 0,
      errorsHandled: 0
    };

    // Set up EventBus listeners for outgoing events
    this._setupEventBusListeners();
  }

  /**
   * Register a socket connection with the router
   * @param {Object} socket - Socket.IO socket instance
   */
  registerSocket(socket) {
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
   * @param {string} playerId - Player ID
   * @param {string} socketId - Socket ID
   */
  mapPlayerSocket(playerId, socketId) {
    this.playerSockets.set(playerId, socketId);
    logger.debug('Player mapped to socket:', {
      gameCode: this.gameCode,
      playerId,
      socketId
    });
  }

  /**
   * Emit an event to a specific player
   * @param {string} playerId - Player ID
   * @param {string} eventName - Socket.IO event name
   * @param {Object} data - Event data
   */
  emitToPlayer(playerId, eventName, data) {
    const socketId = this.playerSockets.get(playerId);
    if (socketId && this.sockets.has(socketId)) {
      const socket = this.sockets.get(socketId);
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
   * @param {string} eventName - Socket.IO event name
   * @param {Object} data - Event data
   */
  broadcastToGame(eventName, data) {
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
   * @returns {Map} Event mapping configuration
   * @private
   */
  _createIncomingEventMap() {
    return new Map([
      // For now, no events are handled directly by SocketEventRouter
      // All events are handled by main server.js and routed through EventBus
      // This prevents conflicts and maintains existing functionality
    ]);
  }

  /**
   * Create outgoing event mapping (EventBus → Socket.IO)
   * @returns {Map} Event mapping configuration
   * @private
   */
  _createOutgoingEventMap() {
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
      [EventTypes.ACTION.FAILED, 'actionFailed'],
      [EventTypes.ACTION.RACIAL_ABILITY, 'racialAbilityUsed'],
      [EventTypes.ACTION.ADAPTABILITY, 'adaptabilityComplete'],
      
      // Combat Events
      [EventTypes.COMBAT.DAMAGE_APPLIED, 'damageApplied'],
      [EventTypes.COMBAT.HEALING_APPLIED, 'healingApplied'],
      [EventTypes.COMBAT.EFFECT_APPLIED, 'effectApplied'],
      
      // Error Events
      [EventTypes.GAME.ERROR, 'errorMessage'],
      ['validation.error', 'validationError']
    ]);
  }

  /**
   * Set up EventBus listeners for outgoing events
   * @private
   */
  _setupEventBusListeners() {
    // Listen to all mapped EventBus events
    for (const [eventBusType, socketEventName] of this.outgoingEventMap) {
      this.eventBus.on(eventBusType, (eventData) => {
        this._routeEventBusToSocket(eventBusType, socketEventName, eventData);
      });
    }

    // Special handling for player-specific events
    this.eventBus.on(EventTypes.PLAYER.NAME_CHECK, (eventData) => {
      if (eventData.socketId) {
        const socket = this.sockets.get(eventData.socketId);
        if (socket) {
          socket.emit('nameCheckResponse', {
            isAvailable: eventData.isValid,
            error: eventData.error
          });
        }
      }
    });

    this.eventBus.on(EventTypes.PLAYER.CLASS_ABILITIES_REQUEST, (eventData) => {
      if (eventData.socketId) {
        const socket = this.sockets.get(eventData.socketId);
        if (socket) {
          socket.emit('classAbilitiesResponse', {
            success: eventData.success,
            abilities: eventData.abilities || [],
            message: eventData.message
          });
        }
      }
    });

    // Handle controller-initiated events for backwards compatibility
    this.eventBus.on(EventTypes.CONTROLLER.ERROR, (eventData) => {
      if (eventData.socketId && this.sockets.has(eventData.socketId)) {
        const socket = this.sockets.get(eventData.socketId);
        socket.emit('errorMessage', {
          type: eventData.type || 'error',
          message: eventData.message,
          timestamp: new Date().toISOString(),
          gameCode: this.gameCode
        });
      }
    });

    this.eventBus.on(EventTypes.CONTROLLER.GAME_CREATED, (eventData) => {
      if (eventData.socketId && this.sockets.has(eventData.socketId)) {
        const socket = this.sockets.get(eventData.socketId);
        socket.emit('gameCreated', {
          gameCode: eventData.gameCode,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.eventBus.on(EventTypes.CONTROLLER.PLAYER_JOINED, (eventData) => {
      if (eventData.socketId && this.sockets.has(eventData.socketId)) {
        const socket = this.sockets.get(eventData.socketId);
        socket.emit('playerJoined', {
          gameCode: eventData.gameCode,
          playerName: eventData.playerName,
          me: eventData.me,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Set up socket event handlers
   * @param {Object} socket - Socket.IO socket instance
   * @private
   */
  _setupSocketHandlers(socket) {
    // Note: socket.join is handled by the main server during connection
    // We don't need to join here to avoid conflicts
    
    // No event handlers to register - all events handled by main server
    // SocketEventRouter focuses on outgoing EventBus → Socket.IO routing
    
    // For future expansion, incoming event handlers can be added here
    // when we want to gradually migrate events from main server to EventBus
  }

  /**
   * Handle incoming socket events with validation and routing
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} eventName - Socket event name
   * @param {Object} data - Event data
   * @param {Function} callback - Optional callback
   * @param {Object} config - Event configuration
   * @private
   */
  async _handleIncomingEvent(socket, eventName, data, callback, config) {
    try {
      // Apply validation if configured
      if (config.validation) {
        const validationMiddleware = config.validation(socket, () => {});
        const isValid = await validationMiddleware(data, (error, validatedData) => {
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

    } catch (error) {
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
   * @param {string} eventBusType - EventBus event type
   * @param {string} socketEventName - Socket.IO event name
   * @param {Object} eventData - Event data
   * @private
   */
  _routeEventBusToSocket(eventBusType, socketEventName, eventData) {
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

    } catch (error) {
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
   * @param {string} eventType - EventBus event type
   * @param {Object} eventData - Raw event data
   * @returns {Object} Transformed data for client
   * @private
   */
  _transformEventDataForClient(eventType, eventData) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @private
   */
  _handleSocketDisconnect(socket) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} errorType - Error type identifier
   * @param {string} message - Error message
   * @private
   */
  _emitError(socket, errorType, message) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data {actionType, targetId, gameCode}
   * @param {Function} callback - Optional callback
   */
  async _handleSubmitAction(socket, data, callback) {
    try {
      const { actionType, targetId, gameCode } = data;
      
      // Find the player for this socket
      const player = this.gameRoom.getPlayerBySocketId(socket.id);
      if (!player) {
        this._emitError(socket, 'playerNotFound', 'Player not found for this session');
        return;
      }

      // Create and submit command through command processor
      let command;
      if (actionType === 'ability') {
        command = new AbilityCommand({
          playerId: socket.id,
          abilityName: targetId, // For abilities, targetId contains ability name
          gameCode,
          timestamp: new Date().toISOString()
        });
      } else {
        command = new PlayerActionCommand({
          playerId: socket.id,
          actionType,
          targetId,
          gameCode,
          timestamp: new Date().toISOString()
        });
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

    } catch (error) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data {gameCode}
   * @param {Function} callback - Optional callback
   */
  async _handleRacialAbility(socket, data, callback) {
    try {
      const { gameCode } = data;
      
      // Emit racial ability event through EventBus
      this.eventBus.emit(EventTypes.ACTION.RACIAL_ABILITY, {
        socketId: socket.id,
        playerId: socket.id,
        gameCode,
        timestamp: new Date().toISOString()
      });

      logger.debug('Racial ability event routed to EventBus:', {
        socketId: socket.id,
        gameCode
      });

    } catch (error) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data {gameCode, abilityName}
   * @param {Function} callback - Optional callback
   */
  async _handleAdaptability(socket, data, callback) {
    try {
      const { gameCode, abilityName } = data;
      
      // Emit adaptability event through EventBus
      this.eventBus.emit(EventTypes.ACTION.ADAPTABILITY, {
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

    } catch (error) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data {gameCode, playerName}
   * @param {Function} callback - Optional callback
   */
  async _handleNameCheck(socket, data, callback) {
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

    } catch (error) {
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
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data {gameCode, className}
   * @param {Function} callback - Optional callback
   */
  async _handleClassAbilitiesRequest(socket, data, callback) {
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

    } catch (error) {
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
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      activeSockets: this.sockets.size,
      mappedPlayers: this.playerSockets.size
    };
  }
}

module.exports = SocketEventRouter;