/**
 * @fileoverview Comprehensive TypeScript tests for GameRoom
 * Testing the migrated TypeScript GameRoom class with full type safety and complex game logic
 */

import type { GameRoom, AddPlayerResult, GameRoomOptions, PlayerActionData, GameStats } from '@models/GameRoom';
import type { Player } from '@models/Player';
import type { GameState } from '@models/game/GameState';
import type { GamePhase } from '@models/game/GamePhase';
import type { GameRules } from '@models/game/GameRules';
import type { GameEventBus } from '@models/events/GameEventBus';
import type { CommandProcessor } from '@models/commands/CommandProcessor';
import type { EventTypes } from '@models/events/EventTypes';
import type SystemsFactory from '@models/systems/SystemsFactory';
import type {
  GameCode,
  PlayerRace,
  PlayerClass,
  GamePhase as GamePhaseEnum,
  Monster,
  ActionResult,
  ValidationResult
} from '@server/types/generated';
import type { Server as SocketIOServer } from 'socket.io';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockConfig = {
  gameBalance: {
    monster: {
      baseHp: 100,
      baseDamage: 10,
      baseAge: 1
    }
  },
  maxPlayers: 4,
  minPlayers: 2
};

const mockMessages = {
  errors: {
    gameNotFound: 'Game not found',
    playerNotFound: 'Player not found'
  }
};

// Mock all dependencies
jest.mock('@models/Player');
jest.mock('@models/game/GameState');
jest.mock('@models/game/GamePhase');
jest.mock('@models/game/GameRules');
jest.mock('@models/events/GameEventBus');
jest.mock('@models/commands/CommandProcessor');
jest.mock('@models/systems/SystemsFactory');
jest.mock('@utils/logger', () => ({ default: mockLogger }));
jest.mock('@config', () => ({ default: mockConfig }));
jest.mock('@messages', () => ({ default: mockMessages }));

const MockedPlayer = Player as jest.MockedClass<typeof Player>;
const MockedGameState = GameState as jest.MockedClass<typeof GameState>;
const MockedGamePhase = GamePhase as jest.MockedClass<typeof GamePhase>;
const MockedGameRules = GameRules as jest.MockedClass<typeof GameRules>;
const MockedGameEventBus = GameEventBus as jest.MockedClass<typeof GameEventBus>;
const MockedCommandProcessor = CommandProcessor as jest.MockedClass<typeof CommandProcessor>;
const MockedSystemsFactory = SystemsFactory as jest.Mocked<typeof SystemsFactory>;

describe('GameRoom (TypeScript)', () => {
  let gameRoom: GameRoom;
  let mockGameState: jest.Mocked<GameState>;
  let mockGamePhase: jest.Mocked<GamePhase>;
  let mockGameRules: jest.Mocked<GameRules>;
  let mockEventBus: jest.Mocked<GameEventBus>;
  let mockCommandProcessor: jest.Mocked<CommandProcessor>;
  let mockPlayers: Map<string, Player>;
  let mockMonster: Monster;

  const gameCode: GameCode = 'TEST123' as GameCode;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock players map
    mockPlayers = new Map();

    // Setup mock monster
    mockMonster = {
      hp: 100,
      maxHp: 100,
      baseDmg: 10,
      age: 1
    };

    // Setup mock GameState
    mockGameState = {
      players: mockPlayers,
      hostId: 'host1',
      started: false,
      round: 0,
      level: 1,
      aliveCount: 0,
      disconnectedPlayers: new Map(),
      monster: mockMonster,
      ended: false,
      winner: undefined,
      created: new Date().toISOString(),
      startTime: null,
      addPlayer: jest.fn(),
      removePlayer: jest.fn(),
      getPlayer: jest.fn(),
      start: jest.fn(),
      end: jest.fn(),
      initializeMonster: jest.fn(),
      updateAliveCount: jest.fn(),
    } as any;

    // Setup mock GamePhase
    mockGamePhase = {
      pendingActions: new Map(),
      pendingRacialActions: new Map(),
      nextReady: false,
      getCurrentPhase: jest.fn().mockReturnValue('lobby' as GamePhaseEnum),
      setPhase: jest.fn(),
    } as any;

    // Setup mock GameRules
    mockGameRules = {
      canAddPlayer: jest.fn(),
      canStartGame: jest.fn(),
      getRules: jest.fn().mockReturnValue({}),
    } as any;

    // Setup mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      use: jest.fn(),
    } as any;

    // Setup mock CommandProcessor
    mockCommandProcessor = {
      processCommand: jest.fn(),
    } as any;

    // Setup mocked constructors
    MockedGameState.mockImplementation(() => mockGameState);
    MockedGamePhase.mockImplementation(() => mockGamePhase);
    MockedGameRules.mockImplementation(() => mockGameRules);
    MockedGameEventBus.mockImplementation(() => mockEventBus);
    MockedCommandProcessor.mockImplementation(() => mockCommandProcessor);

    // Create GameRoom instance
    gameRoom = new GameRoom(gameCode);
  });

  describe('Constructor', () => {
    it('should create GameRoom with required domain models', () => {
      expect(gameRoom.code).toBe(gameCode);
      expect(MockedGameState).toHaveBeenCalledWith(gameCode);
      expect(MockedGamePhase).toHaveBeenCalledWith(gameCode);
      expect(MockedGameRules).toHaveBeenCalledWith(gameCode, {});
      expect(MockedGameEventBus).toHaveBeenCalledWith(gameCode);
      expect(MockedCommandProcessor).toHaveBeenCalledWith(gameRoom);
    });

    it('should create GameRoom with custom options', () => {
      const options: GameRoomOptions = {
        maxPlayers: 6,
        allowSpectators: true,
        timeLimit: 30000
      };

      const customGameRoom = new GameRoom(gameCode, options);

      expect(MockedGameRules).toHaveBeenCalledWith(gameCode, {
        maxPlayers: 6,
        allowSpectators: true,
        turnTimeLimit: 30000
      });
    });

    it('should initialize monster from config', () => {
      expect(mockGameState.initializeMonster).toHaveBeenCalledWith(mockConfig);
    });

    it('should emit game created event', () => {
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.GAME.CREATED,
        expect.objectContaining({
          gameCode,
          createdBy: 'system'
        })
      );
    });

    it('should setup event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith(EventTypes.PLAYER.JOINED, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(EventTypes.PLAYER.LEFT, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(EventTypes.GAME.STARTED, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(EventTypes.ACTION.SUBMITTED, expect.any(Function));
    });
  });

  describe('Property Delegation', () => {
    it('should delegate players property to gameState', () => {
      const newPlayers = new Map([['test', {} as Player]]);

      // Test getter
      expect((gameRoom as any).players).toBe(mockGameState.players);

      // Test setter
      (gameRoom as any).players = newPlayers;
      expect(mockGameState.players).toBe(newPlayers);
    });

    it('should delegate started property to gameState', () => {
      expect((gameRoom as any).started).toBe(mockGameState.started);

      (gameRoom as any).started = true;
      expect(mockGameState.started).toBe(true);
    });

    it('should delegate phase property to gamePhase', () => {
      expect((gameRoom as any).phase).toBe('lobby');

      (gameRoom as any).phase = 'action';
      expect(mockGamePhase.setPhase).toHaveBeenCalledWith('action');
    });

    it('should delegate round property to gameState', () => {
      mockGameState.round = 5;
      expect((gameRoom as any).round).toBe(5);

      (gameRoom as any).round = 10;
      expect(mockGameState.round).toBe(10);
    });
  });

  describe('Player Management', () => {
    it('should add player successfully when rules allow', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockGameRules.canAddPlayer.mockReturnValue(true);
      mockGameState.addPlayer.mockReturnValue(true);
      MockedPlayer.mockImplementation(() => mockPlayer);

      const result: AddPlayerResult = gameRoom.addPlayer('player1', 'Alice');

      expect(result.success).toBe(true);
      expect(result.player).toBe(mockPlayer);
      expect(mockGameRules.canAddPlayer).toHaveBeenCalledWith(false, 0);
      expect(mockGameState.addPlayer).toHaveBeenCalledWith(mockPlayer);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.PLAYER.JOINED,
        expect.objectContaining({
          playerId: 'player1',
          playerName: 'Alice',
          gameCode
        })
      );
    });

    it('should reject player when rules do not allow', () => {
      mockGameRules.canAddPlayer.mockReturnValue(false);

      const result: AddPlayerResult = gameRoom.addPlayer('player1', 'Alice');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot add player to this game');
      expect(mockGameState.addPlayer).not.toHaveBeenCalled();
    });

    it('should reject player when gameState fails to add', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockGameRules.canAddPlayer.mockReturnValue(true);
      mockGameState.addPlayer.mockReturnValue(false);
      MockedPlayer.mockImplementation(() => mockPlayer);

      const result: AddPlayerResult = gameRoom.addPlayer('player1', 'Alice');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add player to game state');
    });

    it('should remove player successfully', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockGameState.getPlayer.mockReturnValue(mockPlayer);
      mockGameState.removePlayer.mockReturnValue(true);

      const result = gameRoom.removePlayer('player1');

      expect(result).toBe(true);
      expect(mockGameState.removePlayer).toHaveBeenCalledWith('player1');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.PLAYER.LEFT,
        expect.objectContaining({
          playerId: 'player1',
          playerName: 'Alice',
          gameCode
        })
      );
    });

    it('should handle removing warlock player with systems initialized', () => {
      const mockPlayer = createMockPlayer('player1', 'Warlock');
      mockPlayer.isWarlock = true;

      const mockSystems = {
        warlockSystem: {
          decrementWarlockCount: jest.fn()
        }
      };
      gameRoom.systems = mockSystems;

      mockGameState.getPlayer.mockReturnValue(mockPlayer);
      mockGameState.removePlayer.mockReturnValue(true);

      const result = gameRoom.removePlayer('player1');

      expect(result).toBe(true);
      expect(mockSystems.warlockSystem.decrementWarlockCount).toHaveBeenCalled();
    });

    it('should return false when removing non-existent player', () => {
      mockGameState.getPlayer.mockReturnValue(undefined);

      const result = gameRoom.removePlayer('nonexistent');

      expect(result).toBe(false);
      expect(mockGameState.removePlayer).not.toHaveBeenCalled();
    });
  });

  describe('Player Retrieval', () => {
    it('should get player by ID', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockGameState.getPlayer.mockReturnValue(mockPlayer);

      const result = gameRoom.getPlayer('player1');

      expect(result).toBe(mockPlayer);
      expect(mockGameState.getPlayer).toHaveBeenCalledWith('player1');
    });

    it('should get all players', () => {
      const mockPlayers = [
        createMockPlayer('player1', 'Alice'),
        createMockPlayer('player2', 'Bob')
      ];
      mockGameState.players = new Map([
        ['player1', mockPlayers[0]],
        ['player2', mockPlayers[1]]
      ]);

      const result = gameRoom.getPlayers();

      expect(result).toEqual(mockPlayers);
    });

    it('should get alive players only', () => {
      const alivePlayer = createMockPlayer('alive', 'Alive');
      const deadPlayer = createMockPlayer('dead', 'Dead');
      alivePlayer.isAlive = true;
      deadPlayer.isAlive = false;

      mockGameState.players = new Map([
        ['alive', alivePlayer],
        ['dead', deadPlayer]
      ]);

      const result = gameRoom.getAlivePlayers();

      expect(result).toEqual([alivePlayer]);
      expect(result).toHaveLength(1);
    });
  });

  describe('Game Lifecycle', () => {
    it('should start game successfully', async () => {
      const mockSystems = { combatSystem: {}, warlockSystem: {} };
      mockGameRules.canStartGame.mockReturnValue(true);
      MockedSystemsFactory.createSystems.mockReturnValue(mockSystems);

      const result: ActionResult = await gameRoom.startGame();

      expect(result.success).toBe(true);
      expect(mockGameState.start).toHaveBeenCalled();
      expect(mockGamePhase.setPhase).toHaveBeenCalledWith('setup');
      expect(gameRoom.systems).toBe(mockSystems);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.GAME.STARTED,
        expect.objectContaining({
          gameCode,
          playerCount: 0
        })
      );
    });

    it('should reject starting already started game', async () => {
      mockGameState.started = true;

      const result: ActionResult = await gameRoom.startGame();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Game already started');
      expect(mockGameState.start).not.toHaveBeenCalled();
    });

    it('should reject starting game with insufficient players', async () => {
      mockGameRules.canStartGame.mockReturnValue(false);

      const result: ActionResult = await gameRoom.startGame();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Not enough players to start the game');
    });

    it('should handle systems initialization failure', async () => {
      mockGameRules.canStartGame.mockReturnValue(true);
      MockedSystemsFactory.createSystems.mockImplementation(() => {
        throw new Error('Systems failed to initialize');
      });

      const result: ActionResult = await gameRoom.startGame();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Failed to initialize game systems');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should end game successfully', async () => {
      const winner = 'player1';
      mockGameState.startTime = Date.now() - 60000; // 1 minute ago

      await gameRoom.endGame(winner);

      expect(mockGameState.end).toHaveBeenCalledWith(winner);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.GAME.ENDED,
        expect.objectContaining({
          gameCode,
          winner,
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Action Processing', () => {
    it('should submit action successfully', async () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      const actionData: PlayerActionData = {
        playerId: 'player1',
        actionType: 'attack',
        targetId: 'monster',
        additionalData: { power: 5 }
      };

      mockGameState.getPlayer.mockReturnValue(mockPlayer);
      mockPlayer.submitAction.mockReturnValue({ success: true });

      const result: ActionResult = await gameRoom.submitAction(actionData);

      expect(result.success).toBe(true);
      expect(mockPlayer.submitAction).toHaveBeenCalledWith('attack', 'monster', { power: 5 });
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.ACTION.SUBMITTED,
        expect.objectContaining({
          playerId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          gameCode
        })
      );
    });

    it('should reject action from non-existent player', async () => {
      const actionData: PlayerActionData = {
        playerId: 'nonexistent',
        actionType: 'attack'
      };

      mockGameState.getPlayer.mockReturnValue(undefined);

      const result: ActionResult = await gameRoom.submitAction(actionData);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Player not found');
    });

    it('should validate actions for all alive players', async () => {
      const mockPlayer1 = createMockPlayer('player1', 'Alice');
      const mockPlayer2 = createMockPlayer('player2', 'Bob');

      mockPlayer1.isAlive = true;
      mockPlayer2.isAlive = true;
      (mockPlayer1 as any).hasSubmittedAction = true;
      (mockPlayer2 as any).hasSubmittedAction = false;

      mockPlayer1.validateSubmittedAction.mockReturnValue({ valid: true, playerId: 'player1' });

      mockGameState.players = new Map([
        ['player1', mockPlayer1],
        ['player2', mockPlayer2]
      ]);

      const results: ValidationResult[] = await gameRoom.validateActions();

      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(true);
      expect(mockPlayer1.validateSubmittedAction).toHaveBeenCalledWith(
        [mockPlayer1, mockPlayer2],
        mockMonster
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.ACTION.VALIDATED,
        expect.objectContaining({
          playerId: 'player1',
          valid: true,
          gameCode
        })
      );
    });

    it('should process round successfully', async () => {
      const mockSystems = {
        combatSystem: {
          processRound: jest.fn().mockResolvedValue({ roundResult: 'success' })
        },
        warlockSystem: {
          getWarlockCount: jest.fn().mockReturnValue(1)
        },
        gameStateUtils: {
          checkWinConditions: jest.fn().mockReturnValue(null)
        }
      };
      gameRoom.systems = mockSystems;

      // Mock gameState.getAliveCount
      (gameRoom as any).gameState = {
        getAliveCount: jest.fn().mockReturnValue(3)
      };

      const result: ActionResult = await gameRoom.processRound();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ roundResult: 'success' });
      expect(mockSystems.combatSystem.processRound).toHaveBeenCalledWith(gameRoom);
      expect(mockSystems.warlockSystem.getWarlockCount).toHaveBeenCalled();
      expect(mockSystems.gameStateUtils.checkWinConditions).toHaveBeenCalled();
    });

    it('should end game when win conditions are met', async () => {
      const mockSystems = {
        combatSystem: {
          processRound: jest.fn().mockResolvedValue({})
        },
        warlockSystem: {
          getWarlockCount: jest.fn().mockReturnValue(0)
        },
        gameStateUtils: {
          checkWinConditions: jest.fn().mockReturnValue('Good')
        }
      };
      gameRoom.systems = mockSystems;

      // Mock gameState.getAliveCount
      (gameRoom as any).gameState = {
        getAliveCount: jest.fn().mockReturnValue(2)
      };

      const endGameSpy = jest.spyOn(gameRoom, 'endGame').mockImplementation();

      await gameRoom.processRound();

      expect(endGameSpy).toHaveBeenCalledWith('Good');
    });

    it('should handle round processing failure', async () => {
      const mockSystems = {
        combatSystem: {
          processRound: jest.fn().mockRejectedValue(new Error('Combat failed'))
        }
      };
      gameRoom.systems = mockSystems;

      const result: ActionResult = await gameRoom.processRound();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Failed to process round');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should reject round processing without systems', async () => {
      gameRoom.systems = null;

      const result: ActionResult = await gameRoom.processRound();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Game systems not initialized');
    });
  });

  describe('Socket Integration', () => {
    it('should set socket server and create event router', () => {
      const mockIo = {} as SocketIOServer;

      gameRoom.setSocketServer(mockIo);

      expect(gameRoom.socketEventRouter).not.toBeNull();
    });
  });

  describe('Game Statistics', () => {
    it('should return correct game statistics', () => {
      mockGameState.players = new Map([
        ['p1', createMockPlayer('p1', 'Player1')],
        ['p2', createMockPlayer('p2', 'Player2')]
      ]);
      mockGameState.aliveCount = 1;
      mockGameState.round = 5;
      mockGameState.level = 3;
      mockGameState.started = true;
      mockGameState.ended = false;
      mockGamePhase.getCurrentPhase.mockReturnValue('action');

      const stats: GameStats = gameRoom.getGameStats();

      expect(stats).toEqual({
        playersCount: 2,
        aliveCount: 1,
        round: 5,
        level: 3,
        phase: 'action',
        isStarted: true,
        isEnded: false
      });
    });
  });

  describe('Client Data Serialization', () => {
    it('should generate client data correctly', () => {
      const mockPlayer1 = createMockPlayer('p1', 'Player1');
      const mockPlayer2 = createMockPlayer('p2', 'Player2');

      mockPlayer1.toClientData.mockReturnValue({ id: 'p1', name: 'Player1' });
      mockPlayer2.toClientData.mockReturnValue({ id: 'p2', name: 'Player2' });

      mockGameState.players = new Map([
        ['p1', mockPlayer1],
        ['p2', mockPlayer2]
      ]);
      mockGameState.round = 3;
      mockGameState.level = 2;
      mockGameState.started = true;
      mockGameState.ended = false;
      mockGameState.hostId = 'p1';
      mockGamePhase.getCurrentPhase.mockReturnValue('action');

      const clientData = gameRoom.toClientData('p1');

      expect(clientData).toEqual({
        code: gameCode,
        players: {
          p1: { id: 'p1', name: 'Player1' },
          p2: { id: 'p2', name: 'Player2' }
        },
        monster: mockMonster,
        phase: 'action',
        round: 3,
        level: 2,
        started: true,
        ended: false,
        hostId: 'p1',
        stats: expect.any(Object)
      });

      expect(mockPlayer1.toClientData).toHaveBeenCalledWith({
        includePrivate: false,
        requestingPlayerId: 'p1'
      });
    });

    it('should generate JSON data with Zod validation', () => {
      const mockPlayer = createMockPlayer('p1', 'Player1');
      mockPlayer.toJSON.mockReturnValue({ id: 'p1', name: 'Player1' });

      mockGameState.players = new Map([['p1', mockPlayer]]);
      mockGameState.winner = undefined;
      mockGameState.created = '2024-01-01T00:00:00Z';
      mockGameState.hostId = 'p1';
      mockGameState.level = 1;
      mockGameState.aliveCount = 1;
      mockGamePhase.getCurrentPhase.mockReturnValue('lobby');
      mockGameRules.getRules.mockReturnValue({ maxPlayers: 4 });

      const jsonData = gameRoom.toJSON();

      expect(jsonData).toEqual(
        expect.objectContaining({
          gameCode,
          players: { p1: { id: 'p1', name: 'Player1' } },
          monster: mockMonster,
          phase: expect.objectContaining({
            current: 'lobby',
            round: 0
          }),
          rules: { maxPlayers: 4 },
          isActive: true,
          metadata: expect.objectContaining({
            hostId: 'p1',
            level: 1,
            aliveCount: 1
          })
        })
      );
    });
  });

  describe('Event Handlers', () => {
    it('should handle player joined event', async () => {
      const event = {
        playerName: 'Alice',
        playerId: 'player1'
      };

      await (gameRoom as any).handlePlayerJoined(event);

      expect(mockLogger.info).toHaveBeenCalledWith(`Player Alice joined game ${gameCode}`);
    });

    it('should handle player died event', async () => {
      const event = { playerId: 'player1' };

      await (gameRoom as any).handlePlayerDied(event);

      expect(mockLogger.info).toHaveBeenCalledWith(`Player player1 died in game ${gameCode}`);
      expect(mockGameState.updateAliveCount).toHaveBeenCalled();
    });

    it('should handle game started event', async () => {
      const event = { playerCount: 3 };

      await (gameRoom as any).handleGameStarted(event);

      expect(mockLogger.info).toHaveBeenCalledWith(`Game ${gameCode} started with 3 players`);
    });

    it('should handle game ended event', async () => {
      const event = { winner: 'player1' };

      await (gameRoom as any).handleGameEnded(event);

      expect(mockLogger.info).toHaveBeenCalledWith(`Game ${gameCode} ended. Winner: player1`);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for GameCode', () => {
      const validCode: GameCode = 'VALID1' as GameCode;
      const room = new GameRoom(validCode);

      expect(room.code).toBe(validCode);
    });

    it('should enforce correct types for ActionResult', () => {
      const result: ActionResult = {
        success: true,
        data: { test: 'data' }
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'data' });
    });

    it('should enforce correct types for GameStats', () => {
      const stats: GameStats = gameRoom.getGameStats();

      expect(typeof stats.playersCount).toBe('number');
      expect(typeof stats.aliveCount).toBe('number');
      expect(typeof stats.round).toBe('number');
      expect(typeof stats.level).toBe('number');
      expect(typeof stats.isStarted).toBe('boolean');
      expect(typeof stats.isEnded).toBe('boolean');
    });
  });

  /**
   * Helper function to create mock player instances
   */
  function createMockPlayer(id: string, name: string): jest.Mocked<Player> {
    return {
      id,
      name,
      race: 'Human' as PlayerRace,
      class: 'Warrior' as PlayerClass,
      isWarlock: false,
      isReady: false,
      hasSubmittedAction: false,
      isAlive: true,
      hp: 100,
      maxHp: 100,
      armor: 0,
      level: 1,
      submitAction: jest.fn(),
      validateSubmittedAction: jest.fn(),
      toClientData: jest.fn(),
      toJSON: jest.fn(),
      setCharacter: jest.fn(),
      takeDamage: jest.fn(),
      heal: jest.fn(),
      applyStatusEffect: jest.fn(),
    } as any;
  }
});
