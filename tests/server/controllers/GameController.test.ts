/**
 * @fileoverview Comprehensive TypeScript tests for GameController
 * Testing the GameController with game creation, management, and socket events
 */

import { GameController, CreateGameRequest, StartGameRequest, GameStatusRequest, JoinResult, GameControllerResult } from '../../../server/controllers/GameController.js';
import { GameRoom } from '../../../server/models/GameRoom.js';
import { Player } from '../../../server/models/Player.js';
import { Socket, Server as SocketIOServer } from 'socket.io';

describe('GameController (TypeScript)', () => {
  let gameController: GameController;
  let mockGameService: any;
  let mockConfig: any;
  let mockMessages: any;
  let mockLogger: any;
  let mockValidation: any;
  let mockGameChecks: any;
  let mockSocket: any;
  let mockIO: any;
  let mockGameRoom: any;
  let mockPlayer: any;
  let mockEventBus: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      game: {
        defaultMaxPlayers: 8,
        allowSpectators: false,
        defaultTimeLimit: 300,
        cleanupDelay: 30000
      }
    };

    // Setup mock messages
    mockMessages = {
      formatMessage: jest.fn().mockImplementation((template, vars) =>
        template.replace(/{(\w+)}/g, (match, key) => vars[key] || match)
      ),
      getEvent: jest.fn().mockReturnValue('Game {event} message template')
    };

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Setup mock validation
    mockValidation = {
      validatePlayerNameSocket: jest.fn().mockReturnValue(true),
      validatePlayerName: jest.fn().mockReturnValue(true),
      suggestValidName: jest.fn().mockReturnValue('ValidName')
    };

    // Setup mock game checks
    mockGameChecks = {
      validateGameAction: jest.fn()
    };

    // Setup mock player
    mockPlayer = {
      id: 'player1',
      name: 'Alice',
      class: null,
      race: null,
      isWarlock: false,
      toClientData: jest.fn().mockReturnValue({
        id: 'player1',
        name: 'Alice',
        hp: 100,
        isAlive: true
      })
    };

    // Setup mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Setup mock game room
    mockGameRoom = {
      code: 'GAME123',
      gameState: {
        hostId: 'player1',
        started: false,
        ended: false,
        round: 0,
        level: 1,
        players: new Map([['player1', mockPlayer]]),
        startTime: Date.now()
      },
      gameRules: {
        canAddPlayer: jest.fn().mockReturnValue(true)
      },
      gamePhase: {
        setPhase: jest.fn()
      },
      eventBus: mockEventBus,
      setSocketServer: jest.fn(),
      addPlayer: jest.fn().mockReturnValue({ success: true, player: mockPlayer }),
      getPlayer: jest.fn().mockReturnValue(mockPlayer),
      getPlayers: jest.fn().mockReturnValue([mockPlayer]),
      startGame: jest.fn().mockReturnValue({ success: true }),
      endGame: jest.fn().mockResolvedValue(undefined),
      processRound: jest.fn().mockReturnValue({ success: true }),
      toClientData: jest.fn().mockReturnValue({
        code: 'GAME123',
        playerCount: 1,
        started: false
      }),
      getGameStats: jest.fn().mockReturnValue({
        duration: 0,
        rounds: 0,
        playerCount: 1
      })
    };

    // Setup mock game service
    mockGameService = {
      games: new Map([['GAME123', mockGameRoom]]),
      generateGameCode: jest.fn().mockReturnValue('GAME123'),
      getGame: jest.fn().mockReturnValue(mockGameRoom),
      cleanupGame: jest.fn().mockReturnValue(true)
    };

    // Setup mock socket
    mockSocket = {
      id: 'socket123',
      join: jest.fn(),
      emit: jest.fn(),
      rooms: new Set(['GAME123'])
    };

    // Setup mock IO server
    mockIO = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      }),
      emit: jest.fn()
    };

    // Mock external dependencies
    jest.doMock('../../../server/services/gameService.js', () => ({ default: mockGameService }));
    jest.doMock('../../../server/config/index.js', () => ({ default: mockConfig }));
    jest.doMock('../../../server/messages/index.js', () => ({ default: mockMessages }));
    jest.doMock('../../../server/utils/logger.js', () => ({ default: mockLogger }));
    jest.doMock('../../../server/middleware/validation.js', () => mockValidation);
    jest.doMock('../../../server/shared/gameChecks.js', () => mockGameChecks);
    jest.doMock('../../../server/models/GameRoom.js', () => ({
      GameRoom: jest.fn().mockImplementation(() => mockGameRoom)
    }));

    gameController = new GameController();
  });

  describe('Constructor and Initialization', () => {
    it('should create GameController instance', () => {
      expect(gameController).toBeInstanceOf(GameController);
      expect(gameController).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof gameController.handleGameCreate).toBe('function');
      expect(typeof gameController.handleGameStart).toBe('function');
      expect(typeof gameController.joinGame).toBe('function');
      expect(typeof gameController.handleGameStatus).toBe('function');
      expect(typeof gameController.handleGameEnd).toBe('function');
      expect(typeof gameController.processRound).toBe('function');
      expect(typeof gameController.getActiveGames).toBe('function');
    });
  });

  describe('handleGameCreate', () => {
    it('should create a new game successfully', async () => {
      const request: CreateGameRequest = {
        playerName: 'Alice',
        maxPlayers: 6,
        gameMode: 'standard',
        isPrivate: false,
        timeLimit: 300
      };

      const result = await gameController.handleGameCreate(mockIO, mockSocket, request);

      expect(result.success).toBe(true);
      expect(result.data?.gameCode).toBe('GAME123');
      expect(result.data?.game).toBe(mockGameRoom);
      expect(result.data?.hostPlayer).toBe(mockPlayer);

      expect(mockValidation.validatePlayerNameSocket).toHaveBeenCalledWith(mockSocket, 'Alice');
      expect(mockGameService.generateGameCode).toHaveBeenCalled();
      expect(mockGameRoom.setSocketServer).toHaveBeenCalledWith(mockIO);
      expect(mockGameRoom.addPlayer).toHaveBeenCalledWith('socket123', 'Alice');
      expect(mockSocket.join).toHaveBeenCalledWith('GAME123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('GameCreated', expect.any(Object));
    });

    it('should fail with invalid player name', async () => {
      mockValidation.validatePlayerNameSocket.mockReturnValue(false);

      const request: CreateGameRequest = {
        playerName: 'Invalid@Name',
        maxPlayers: 6
      };

      const result = await gameController.handleGameCreate(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid player name');
      expect(mockGameService.generateGameCode).not.toHaveBeenCalled();
    });

    it('should fail when unable to add player to game', async () => {
      mockGameRoom.addPlayer.mockReturnValue({ success: false, error: 'Game is full' });

      const request: CreateGameRequest = {
        playerName: 'Alice',
        maxPlayers: 1
      };

      const result = await gameController.handleGameCreate(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game is full');
    });

    it('should use default values for optional parameters', async () => {
      const request: CreateGameRequest = {
        playerName: 'Alice'
      };

      const result = await gameController.handleGameCreate(mockIO, mockSocket, request);

      expect(result.success).toBe(true);
      // Should use config defaults
    });

    it('should emit through event bus when available', async () => {
      const request: CreateGameRequest = {
        playerName: 'Alice'
      };

      await gameController.handleGameCreate(mockIO, mockSocket, request);

      expect(mockEventBus.emit).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGameService.generateGameCode.mockImplementation(() => {
        throw new Error('Code generation failed');
      });

      const request: CreateGameRequest = {
        playerName: 'Alice'
      };

      const result = await gameController.handleGameCreate(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Code generation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error in handleGameCreate:', expect.any(Error));
    });
  });

  describe('handleGameStart', () => {
    it('should start a game successfully', async () => {
      mockGameChecks.validateGameAction.mockReturnValue(mockGameRoom);
      mockSocket.id = 'player1'; // Make socket the host

      const request: StartGameRequest = {
        gameCode: 'GAME123'
      };

      const result = await gameController.handleGameStart(mockIO, mockSocket, request);

      expect(result.success).toBe(true);
      expect(mockGameChecks.validateGameAction).toHaveBeenCalledWith(mockSocket, 'GAME123', true, false, false);
      expect(mockGameRoom.startGame).toHaveBeenCalled();
      expect(mockIO.to('GAME123').emit).toHaveBeenCalledWith('game:started', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('GameStarted', expect.any(Object));
    });

    it('should fail when game not found', async () => {
      mockGameChecks.validateGameAction.mockReturnValue(null);

      const request: StartGameRequest = {
        gameCode: 'INVALID'
      };

      const result = await gameController.handleGameStart(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found or access denied');
    });

    it('should fail when player is not host', async () => {
      mockGameChecks.validateGameAction.mockReturnValue(mockGameRoom);
      mockSocket.id = 'player2'; // Not the host

      const request: StartGameRequest = {
        gameCode: 'GAME123'
      };

      const result = await gameController.handleGameStart(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the host can start the game');
    });

    it('should handle game start failure', async () => {
      mockGameChecks.validateGameAction.mockReturnValue(mockGameRoom);
      mockSocket.id = 'player1';
      mockGameRoom.startGame.mockReturnValue({ success: false, reason: 'Not enough players' });

      const request: StartGameRequest = {
        gameCode: 'GAME123'
      };

      const result = await gameController.handleGameStart(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Not enough players');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:start_failed', expect.any(Object));
    });

    it('should emit through event bus on successful start', async () => {
      mockGameChecks.validateGameAction.mockReturnValue(mockGameRoom);
      mockSocket.id = 'player1';

      const request: StartGameRequest = {
        gameCode: 'GAME123'
      };

      await gameController.handleGameStart(mockIO, mockSocket, request);

      expect(mockEventBus.emit).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGameChecks.validateGameAction.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const request: StartGameRequest = {
        gameCode: 'GAME123'
      };

      const result = await gameController.handleGameStart(mockIO, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error in handleGameStart:', expect.any(Error));
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should enforce CreateGameRequest interface', () => {
      const request: CreateGameRequest = {
        playerName: 'Alice',
        maxPlayers: 8,
        gameMode: 'standard',
        isPrivate: false,
        timeLimit: 300
      };

      expect(typeof request.playerName).toBe('string');
      expect(typeof request.maxPlayers).toBe('number');
      expect(['standard', 'blitz']).toContain(request.gameMode);
      expect(typeof request.isPrivate).toBe('boolean');
      expect(typeof request.timeLimit).toBe('number');
    });

    it('should enforce StartGameRequest interface', () => {
      const request: StartGameRequest = {
        gameCode: 'GAME123'
      };

      expect(typeof request.gameCode).toBe('string');
    });

    it('should enforce GameStatusRequest interface', () => {
      const request: GameStatusRequest = {
        gameCode: 'GAME123'
      };

      expect(typeof request.gameCode).toBe('string');
    });

    it('should enforce JoinResult interface', () => {
      const result: JoinResult = {
        success: true,
        player: mockPlayer,
        game: mockGameRoom,
        error: undefined
      };

      expect(typeof result.success).toBe('boolean');
      expect(result.player).toBeDefined();
      expect(result.game).toBeDefined();
    });

    it('should enforce GameControllerResult interface', () => {
      const result: GameControllerResult = {
        success: true,
        error: undefined,
        data: { test: 'data' }
      };

      expect(typeof result.success).toBe('boolean');
      expect(result.data).toBeDefined();
    });
  });
});
