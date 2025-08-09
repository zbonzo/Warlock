/**
 * @fileoverview Main server entry point - TypeScript version
 * Sets up HTTP server, Socket.IO, and event handlers
 * Phase 9: TypeScript Migration - Converted from server.js
 */

import express, { Request, Response } from 'express';
import * as http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import config from './config/index.js';
import configRoutes from './routes/configRoutes.js';
import logger from './utils/logger.js';
import gameController from './controllers/GameController.js';
import playerController from './controllers/PlayerController.js';
import { withSocketErrorHandling } from './utils/errorHandler.js';
import './middleware/socketValidation.js';
import gameService from './services/gameService.js';

// Socket event data interfaces
interface CreateGameData {
  playerName: string;
  maxPlayers?: number;
  gameMode?: 'standard' | 'blitz';
  isPrivate?: boolean;
  timeLimit?: number;
}

interface JoinGameData {
  gameCode: string;
  playerName: string;
}

interface PlayAgainData {
  gameCode: string;
  playerName: string;
}

interface CheckNameData {
  gameCode: string;
  playerName: string;
}

interface SelectCharacterData {
  gameCode: string;
  race: string;
  className: string;
}

interface StartGameData {
  gameCode: string;
}

interface ReconnectData {
  gameCode: string;
  playerName: string;
}

interface PerformActionData {
  gameCode: string;
  actionType: string;
  targetId?: string;
  bloodRageActive?: boolean;
  keenSensesActive?: boolean;
}

interface UseRacialAbilityData {
  gameCode: string;
  targetId?: string;
  abilityType: string;
}

interface AdaptabilityReplaceData {
  gameCode: string;
  oldAbilityType: string;
  newAbilityType: string;
  level: number;
  newClassName?: string;
}

interface GetClassAbilitiesData {
  gameCode: string;
  className: string;
  level?: number;
}

interface PlayerReadyData {
  gameCode: string;
}

// Rate limiter types
interface RateLimitRecord {
  count: number;
  lastReset: number;
}

interface SocketRateLimiter {
  limits: Map<string, Map<string, RateLimitRecord>>;
  check(_socketId: string, _action: string, _limit?: number, _timeWindow?: number): boolean;
  cleanupSocket(_socketId: string): void;
  reset(_socketId: string, _action: string): void;
}

// Initialize Express app and HTTP server
const app = express();
const PORT = process.env['PORT'] || config.port;

// Middleware
app.use(cors({
  origin: process.env['NODE_ENV'] === 'development' ? '*' : config.corsOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());


// API Routes
app.use('/api/config', configRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: process.env['npm_package_version'] || '1.0.0',
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS and transport configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env['NODE_ENV'] === 'development'
      ? '*' // Allow any origin in development
      : config.corsOrigins,
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
  httpCompression: true,

  // Allow transport upgrades
  allowUpgrades: true,
});

/**
 * Rate limiter for Socket.IO events
 * Prevents abuse and excessive requests
 */
const socketRateLimiter: SocketRateLimiter = {
  // Store socketId -> {action -> {count, lastReset}}
  limits: new Map(),

  /**
   * Check if an action should be rate limited
   */
  check(
    socketId: string,
    action: string,
    limit: number = config.gameBalance.rateLimiting.defaultLimit,
    timeWindow: number = config.gameBalance.rateLimiting.defaultTimeWindow
  ): boolean {
    // eslint-disable-next-line no-restricted-syntax
    const now = Date.now();

    if (!this.limits.has(socketId)) {
      this.limits.set(socketId, new Map());
    }

    const socketLimits = this.limits.get(socketId)!;

    if (!socketLimits.has(action)) {
      socketLimits.set(action, { count: 1, lastReset: now });
      return true;
    }

    const record = socketLimits.get(action)!;

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
   */
  cleanupSocket(socketId: string): void {
    this.limits.delete(socketId);
  },

  /**
   * Reset specific action for a socket
   */
  reset(socketId: string, action: string): void {
    if (this.limits.has(socketId)) {
      const socketLimits = this.limits.get(socketId)!;
      if (socketLimits.has(action)) {
        socketLimits.delete(action);
      }
    }
  },
};

// Start the server
server.listen(Number(PORT), '0.0.0.0', () => {
  logger.info('ServerStarted', { port: PORT });
});

// Socket.IO Event Handlers and debugging
io.engine.on('connection_error', (err: any) => {
  logger.error('Socket.IO connection error:', {
    message: err.message || 'Unknown error',
    code: err.code || 'NO_CODE',
    context: err.context || 'NO_CONTEXT',
    type: err.type || 'UNKNOWN_TYPE',
    description: err.description || 'No description',
    stack: err.stack || 'No stack trace',
    fullError: err instanceof Error ? err.toString() : String(err)
  });
});

// Additional error handling
io.on('connect_error', (err: Error) => {
  logger.error('Socket.IO connect error:', {
    message: err.message,
    stack: err.stack
  });
});

io.engine.on('initial_headers', (headers: any, request: any) => {
  logger.debug('Socket.IO initial headers:', {
    headers: Object.keys(headers),
    url: request.url,
    method: request.method
  });
});

io.engine.on('headers', (headers: any, request: any) => {
  logger.debug('Socket.IO headers:', {
    url: request.url,
    userAgent: request.headers['user-agent']?.substring(0, 50)
  });
});

io.on('connection', (socket: Socket) => {
  logger.info('Socket connected', {
    socketId: socket.id,
    transport: (socket.conn as any).transport.name,
    userAgent: socket.handshake.headers['user-agent']?.substring(0, 100),
    remoteAddress: socket.handshake.address
  });

  // Log transport-specific events for debugging
  (socket.conn as any).on('packet', (packet: any) => {
    if (packet.type === 'error') {
      logger.warn('Socket transport packet error:', {
        socketId: socket.id,
        packet: packet
      });
    }
  });

  (socket.conn as any).on('close', (reason: string) => {
    logger.info('Socket transport closed:', {
      socketId: socket.id,
      reason,
      transport: (socket.conn as any).transport.name
    });
  });

  // Host creates a new game
  socket.on(
    'createGame',
    withSocketErrorHandling(
      socket,
      (data: CreateGameData) => {
        return gameController.handleGameCreate(io, socket, data);
      },
      'creating game'
    )
  );

  // Player joins an existing game by code
  socket.on(
    'joinGame',
    withSocketErrorHandling(
      socket,
      (data: JoinGameData) => {
        // Use the original join logic - SocketEventRouter registration handled in PlayerController
        return playerController.handlePlayerJoin(io, socket, {
          gameCode: data.gameCode,
          playerName: data.playerName
        });
      },
      'joining game'
    )
  );

  socket.on(
    'playAgain',
    withSocketErrorHandling(
      socket,
      (data: PlayAgainData) =>
        // TODO: Implement handleGamePlayAgain or use handleGameCreate
        gameController.handleGameCreate(io, socket, { playerName: data.playerName }),
      'starting play again game'
    )
  );

  socket.on(
    'checkNameAvailability',
    withSocketErrorHandling(
      socket,
      (data: CheckNameData) =>
        gameController.handleGameCheckName(
          io,
          socket,
          data.gameCode,
          data.playerName
        ),
      'Name taken in room'
    )
  );

  // Player selects their race and class
  socket.on(
    'selectCharacter',
    withSocketErrorHandling(
      socket,
      (data: SelectCharacterData) =>
        playerController.handlePlayerSelectCharacter(
          io,
          socket,
          data.gameCode,
          data.race,
          data.className
        ),
      'selecting character'
    )
  );

  // Host starts the game when ready
  socket.on(
    'startGame',
    withSocketErrorHandling(
      socket,
      (data: StartGameData) => gameController.handleGameStart(io, socket, data),
      'starting game'
    )
  );

  // Dedicated reconnection event that bypasses the "game started" check
  socket.on(
    'reconnectToGame',
    withSocketErrorHandling(
      socket,
      async (data: ReconnectData) => {
        // Skip normal validation that would block joining started games
        try {
          // Check if game exists
          const game = gameService.games.get(data.gameCode);
          if (!game) {
            socket.emit('errorMessage', { message: 'Game not found.' });
            return Promise.reject(new Error('Game not found'));
          }

          // Attempt reconnection
          return await playerController.handlePlayerReconnect(
            io,
            socket,
            data.gameCode,
            data.playerName
          );
        } catch (error: any) {
          socket.emit('errorMessage', {
            message: error.message || 'Reconnection failed.',
          });
          return Promise.reject(error);
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
      async (data: PerformActionData) => {
        await gameController.handleGameAction(
          io,
          socket,
          data.gameCode,
          data.actionType,
          data.targetId,
          {
            bloodRageActive: data.bloodRageActive,
            keenSensesActive: data.keenSensesActive,
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
      (data: UseRacialAbilityData) =>
        // TODO: Implement handleGameRacialAbility or use handleGameAction
        gameController.handleGameAction(io, socket, data.gameCode, data.abilityType || 'racialAbility', data.targetId),
      'using racial ability'
    )
  );

  // Player uses Artisan Adaptability to replace an ability
  socket.on(
    'adaptabilityReplaceAbility',
    withSocketErrorHandling(
      socket,
      (_data: AdaptabilityReplaceData) =>
        // TODO: Implement handleGameAdaptabilityReplace - currently stubbed
        Promise.resolve(),
      'replacing ability with adaptability'
    )
  );

  // Receive abilities to pick for Artisan Adaptability
  socket.on(
    'getClassAbilities',
    withSocketErrorHandling(
      socket,
      (_data: GetClassAbilitiesData) =>
        // TODO: Implement handleGameGetAbilities
        Promise.resolve(),
      'getting class abilities'
    )
  );

  // Player is ready for next round
  socket.on(
    'playerNextReady',
    withSocketErrorHandling(
      socket,
      (data: PlayerReadyData) =>
        // TODO: Implement handleGamePlayerReady or use handleGameStart
        gameController.handleGameStart(io, socket, { gameCode: data.gameCode }),
      'preparing for next round'
    )
  );

  // Handle player disconnection
  socket.on('disconnect', (reason: string) => {
    try {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        reason,
        transport: (socket.conn as any)?.transport?.name
      });
      playerController.handlePlayerDisconnect(io, socket);
      socketRateLimiter.cleanupSocket(socket.id);
    } catch (error: any) {
      logger.error(`Error handling disconnect: ${error.message}`, error);
    }
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    cause: (error as any).cause,
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
process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
  logger.error('Unhandled promise rejection', reason);
});

export default server;
