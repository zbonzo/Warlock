/**
 * @fileoverview Main server entry point
 * Sets up HTTP server, Socket.IO, and event handlers
 * Updated for Phase 2 Step 4: Socket.IO Event Consolidation - Stabilized connections
 * Debugging IPv4/IPv6 connectivity issues
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
const { SocketValidators, socketValidator } = require('./middleware/socketValidation');
const gameService = require('./services/gameService');

// Initialize Express app and HTTP server
const app = express();
const PORT = process.env.PORT || config.port;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : config.corsOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
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

// Initialize Socket.IO with CORS and transport configuration
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://192.168.100.42:4000'] : config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
  },
  // Transport configuration - start with polling, allow upgrades
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  
  // Connection settings - balanced for stability
  connectTimeout: 45000,
  pingTimeout: 30000,
  pingInterval: 25000,
  
  // HTTP settings
  maxHttpBufferSize: 1e6,
  httpCompression: true,
  
  // Allow transport upgrades
  allowUpgrades: true,
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
  logger.info('ServerStarted', { port: PORT });
});

// Socket.IO Event Handlers and debugging
io.engine.on('connection_error', (err) => {
  logger.error('Socket.IO connection error:', {
    message: err.message || 'Unknown error',
    code: err.code || 'NO_CODE',
    context: err.context || 'NO_CONTEXT',
    type: err.type || 'UNKNOWN_TYPE',
    description: err.description || 'No description',
    stack: err.stack || 'No stack trace',
    fullError: JSON.stringify(err, null, 2)
  });
});

// Additional error handling
io.on('connect_error', (err) => {
  logger.error('Socket.IO connect error:', {
    message: err.message,
    stack: err.stack
  });
});

io.engine.on('initial_headers', (headers, request) => {
  logger.debug('Socket.IO initial headers:', {
    headers: Object.keys(headers),
    url: request.url,
    method: request.method
  });
});

io.engine.on('headers', (headers, request) => {
  logger.debug('Socket.IO headers:', {
    url: request.url,
    userAgent: request.headers['user-agent']?.substring(0, 50)
  });
});

io.on('connection', (socket) => {
  logger.info('Socket connected', { 
    socketId: socket.id,
    transport: socket.conn.transport.name,
    userAgent: socket.handshake.headers['user-agent']?.substring(0, 100),
    remoteAddress: socket.handshake.address
  });

  // Log transport-specific events for debugging
  socket.conn.on('packet', (packet) => {
    if (packet.type === 'error') {
      logger.warn('Socket transport packet error:', {
        socketId: socket.id,
        packet: packet
      });
    }
  });

  socket.conn.on('close', (reason) => {
    logger.info('Socket transport closed:', {
      socketId: socket.id,
      reason,
      transport: socket.conn.transport.name
    });
  });

  // Host creates a new game
  socket.on(
    'createGame',
    withSocketErrorHandling(
      socket,
      ({ playerName }) =>
        gameController.handleGameCreate(io, socket, playerName),
      'creating game'
    )
  );

  // Player joins an existing game by code
  socket.on(
    'joinGame',
    withSocketErrorHandling(
      socket,
      ({ gameCode, playerName }) => {
        // Use the original join logic - SocketEventRouter registration handled in PlayerController
        return playerController.handlePlayerJoin(io, socket, gameCode, playerName);
      },
      'joining game'
    )
  );

  socket.on(
    'playAgain',
    withSocketErrorHandling(
      socket,
      ({ gameCode, playerName }) =>
        gameController.handleGamePlayAgain(io, socket, gameCode, playerName),
      'starting play again game'
    )
  );

  socket.on(
    'checkNameAvailability',
    withSocketErrorHandling(
      socket,
      ({ gameCode, playerName }) =>
        gameController.handleGameCheckName(
          io,
          socket,
          gameCode,
          playerName
        ),
      'Name taken in room'
    )
  );

  // Player selects their race and class
  socket.on(
    'selectCharacter',
    withSocketErrorHandling(
      socket,
      ({ gameCode, race, className }) =>
        playerController.handlePlayerSelectCharacter(
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
      ({ gameCode }) => gameController.handleGameStart(io, socket, gameCode),
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
      async ({
        gameCode,
        actionType,
        targetId,
        bloodRageActive,
        keenSensesActive,
      }) => {
        await gameController.handleGameAction(
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
        gameController.handleGameRacialAbility(
          io,
          socket,
          gameCode,
          targetId,
          abilityType
        ),
      'using racial ability'
    )
  );

  // Player uses Artisan Adaptability to replace an ability
  socket.on(
    'adaptabilityReplaceAbility',
    withSocketErrorHandling(
      socket,
      ({ gameCode, oldAbilityType, newAbilityType, level, newClassName }) =>
        gameController.handleGameAdaptabilityReplace(
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

  // Receive abilities to pick for Artisan Adaptability
  socket.on(
    'getClassAbilities',
    withSocketErrorHandling(
      socket,
      ({ gameCode, className, level }) =>
        gameController.handleGameGetAbilities(
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
        gameController.handleGamePlayerReady(io, socket, gameCode),
      'preparing for next round'
    )
  );

  // Handle player disconnection
  socket.on('disconnect', (reason) => {
    try {
      logger.info('Socket disconnected', { 
        socketId: socket.id,
        reason,
        transport: socket.conn?.transport?.name
      });
      playerController.handlePlayerDisconnect(io, socket);
      socketRateLimiter.cleanupSocket(socket.id);
    } catch (error) {
      logger.error(`Error handling disconnect: ${error.message}`, error);
    }
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    cause: error.cause,
    timestamp: new Date().toISOString()
  });
  
  // Also log to console for immediate visibility
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('Name:', error.name);
  console.error('Time:', new Date().toISOString());
  console.error('========================');
  
  // In a production environment, you might want to restart the server
  // or perform other recovery actions
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason);
});
