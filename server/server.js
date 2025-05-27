/**
 * @fileoverview Main server entry point
 * Sets up HTTP server, Socket.IO, and event handlers
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('@config');
const configRoutes = require('./routes/configRoutes');
const logger = require('@utils/logger');
const gameController = require('@controllers/GameController');
const playerController = require('@controllers/PlayerController');
const { withSocketErrorHandling } = require('@utils/errorHandler');
const gameService = require('./services/gameService');

// Initialize Express app and HTTP server
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/config', configRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  },
});

/**
 * Rate limiter for Socket.IO events
 * Prevents abuse and excessive requests
 */
const socketRateLimiter = {
  // Store socketId -> {action -> {count, lastReset}}
  limits: new Map(),

  /**
   * Check if an action should be rate limited
   * @param {string} socketId - Client socket ID
   * @param {string} action - Action name
   * @param {number} limit - Maximum allowed actions in time window
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {boolean} Whether the action is allowed
   */
  check(
    socketId,
    action,
    limit = config.gameBalance.socketRateLimiter.limit,
    timeWindow = config.gameBalance.socketRateLimiter.timeWindow
  ) {
    const now = Date.now();

    if (!this.limits.has(socketId)) {
      this.limits.set(socketId, new Map());
    }

    const socketLimits = this.limits.get(socketId);

    if (!socketLimits.has(action)) {
      socketLimits.set(action, { count: 1, lastReset: now });
      return true;
    }

    const record = socketLimits.get(action);

    // Reset counter if time window has passed
    if (now - record.lastReset > timeWindow) {
      record.count = 1;
      record.lastReset = now;
      return true;
    }

    // Increment counter and check
    record.count++;
    if (record.count > limit) {
      return false;
    }

    return true;
  },

  /**
   * Clean up disconnected sockets
   * @param {string} socketId - Client socket ID
   */
  cleanupSocket(socketId) {
    this.limits.delete(socketId);
  },

  /**
   * Reset specific action for a socket
   * @param {string} socketId - Client socket ID
   * @param {string} action - Action name
   */
  reset(socketId, action) {
    if (this.limits.has(socketId)) {
      const socketLimits = this.limits.get(socketId);
      if (socketLimits.has(action)) {
        socketLimits.delete(action);
      }
    }
  },
};

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Game server running on port ${PORT}`);
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  logger.info(`Player connected: ${socket.id}`);

  // Host creates a new game
  socket.on(
    'createGame',
    withSocketErrorHandling(
      socket,
      ({ playerName }) =>
        gameController.handleCreateGame(io, socket, playerName),
      'creating game'
    )
  );

  // Player joins an existing game by code
  socket.on(
    'joinGame',
    withSocketErrorHandling(
      socket,
      ({ gameCode, playerName }) =>
        playerController.handlePlayerJoin(io, socket, gameCode, playerName),
      'joining game'
    )
  );

  socket.on(
    'playAgain',
    withSocketErrorHandling(
      socket,
      ({ gameCode, playerName }) =>
        gameController.handlePlayAgain(io, socket, gameCode, playerName),
      'starting play again game'
    )
  );

  // Player selects their race and class
  socket.on(
    'selectCharacter',
    withSocketErrorHandling(
      socket,
      ({ gameCode, race, className }) =>
        playerController.handleSelectCharacter(
          io,
          socket,
          gameCode,
          race,
          className
        ),
      'selecting character'
    )
  );

  // Host starts the game when ready
  socket.on(
    'startGame',
    withSocketErrorHandling(
      socket,
      ({ gameCode }) => gameController.handleStartGame(io, socket, gameCode),
      'starting game'
    )
  );

  // Dedicated reconnection event that bypasses the "game started" check
  socket.on(
    'reconnectToGame',
    withSocketErrorHandling(
      socket,
      ({ gameCode, playerName }) => {
        // Skip normal validation that would block joining started games
        try {
          // Check if game exists
          const game = gameService.games.get(gameCode);
          if (!game) {
            socket.emit('errorMessage', { message: 'Game not found.' });
            return false;
          }

          // Attempt reconnection
          return playerController.handlePlayerReconnection(
            io,
            socket,
            gameCode,
            playerName
          );
        } catch (error) {
          socket.emit('errorMessage', {
            message: error.message || 'Reconnection failed.',
          });
          return false;
        }
      },
      'reconnecting to game'
    )
  );
  // Player performs an action during a turn
  socket.on(
    'performAction',
    withSocketErrorHandling(
      socket,
      ({
        gameCode,
        actionType,
        targetId,
        bloodRageActive,
        keenSensesActive,
      }) => {
        gameController.handlePerformAction(
          io,
          socket,
          gameCode,
          actionType,
          targetId,
          {
            bloodRageActive,
            keenSensesActive,
          }
        );
      },
      'performing action'
    )
  );

  // Player uses a racial ability
  socket.on(
    'useRacialAbility',
    withSocketErrorHandling(
      socket,
      ({ gameCode, targetId, abilityType }) =>
        gameController.handleRacialAbility(
          io,
          socket,
          gameCode,
          targetId,
          abilityType
        ),
      'using racial ability'
    )
  );

  // Player uses Human Adaptability to replace an ability
  socket.on(
    'adaptabilityReplaceAbility',
    withSocketErrorHandling(
      socket,
      ({ gameCode, oldAbilityType, newAbilityType, level, newClassName }) =>
        gameController.handleAdaptabilityReplace(
          io,
          socket,
          gameCode,
          oldAbilityType,
          newAbilityType,
          level,
          newClassName
        ),
      'replacing ability with adaptability'
    )
  );

  // Receive abilities to pick for Human Adaptability
  socket.on(
    'getClassAbilities',
    withSocketErrorHandling(
      socket,
      ({ gameCode, className, level }) =>
        gameController.handleGetClassAbilities(
          io,
          socket,
          gameCode,
          className,
          level || 1
        ),
      'getting class abilities'
    )
  );

  // Player is ready for next round
  socket.on(
    'playerNextReady',
    withSocketErrorHandling(
      socket,
      ({ gameCode }) =>
        gameController.handlePlayerNextReady(io, socket, gameCode),
      'preparing for next round'
    )
  );

  // Handle player disconnection
  socket.on('disconnect', () => {
    try {
      playerController.handlePlayerDisconnect(io, socket);
      socketRateLimiter.cleanupSocket(socket.id);
    } catch (error) {
      logger.error(`Error handling disconnect: ${error.message}`, error);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  // In a production environment, you might want to restart the server
  // or perform other recovery actions
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason);
});
