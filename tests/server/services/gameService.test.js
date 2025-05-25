/**
 * @fileoverview Tests for gameService
 */

const gameService = require('@services/gameService');
const { GameRoom } = require('@models/GameRoom');

// Mock dependencies
jest.mock('@models/GameRoom');
jest.mock('@services/PlayerSessionManager', () => ({
  getSession: jest.fn(),
  updateSocketId: jest.fn(),
}));

jest.mock('@config', () => ({
  maxPlayers: 8,
  minPlayers: 2,
  maxGames: 100,
  gameTimeout: 30 * 60 * 1000,
  messages: {
    getError: jest.fn((key, data) => `Error: ${key}`),
    errors: {
      gameNotFound: 'Game not found',
    },
  },
}));

describe('Game Service', () => {
  let mockIO;

  beforeEach(() => {
    // Clear games map
    gameService.games.clear();
    gameService.gameTimers.clear();

    // Mock IO
    mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Clear all timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Game Creation', () => {
    test('should generate unique game codes', () => {
      const code1 = gameService.generateGameCode();
      const code2 = gameService.generateGameCode();

      expect(code1).toMatch(/^\d{4}$/);
      expect(code2).toMatch(/^\d{4}$/);
      expect(code1).not.toBe(code2);
    });

    test('should create game successfully', () => {
      const mockGameRoom = {
        code: 'TEST',
        players: new Map(),
        addPlayer: jest.fn(),
      };
      GameRoom.mockImplementation(() => mockGameRoom);

      const game = gameService.createGame('TEST');

      expect(game).toBe(mockGameRoom);
      expect(gameService.games.get('TEST')).toBe(game);
      expect(GameRoom).toHaveBeenCalledWith('TEST');
    });

    test('should not create game when server is full', () => {
      // Fill server to capacity
      const config = require('@config');
      for (let i = 0; i < config.maxGames; i++) {
        gameService.games.set(`game${i}`, {});
      }

      expect(() => {
        gameService.createGame('OVERFLOW');
      }).toThrow('Server is too busy');
    });
  });

  describe('Game Timeouts', () => {
    test('should create game timeout', () => {
      const mockGame = { code: 'TEST' };
      gameService.games.set('TEST', mockGame);

      gameService.createGameTimeout(mockIO, 'TEST');

      expect(gameService.gameTimers.has('TEST')).toBe(true);
    });

    test('should clear game on timeout', () => {
      const mockGame = { code: 'TEST' };
      gameService.games.set('TEST', mockGame);

      gameService.createGameTimeout(mockIO, 'TEST');

      // Fast forward past the timeout
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);

      expect(gameService.games.has('TEST')).toBe(false);
      expect(gameService.gameTimers.has('TEST')).toBe(false);
      expect(mockIO.to).toHaveBeenCalledWith('TEST');
      expect(mockIO.emit).toHaveBeenCalledWith('gameTimeout', {
        message: 'Game ended due to inactivity',
      });
    });

    test('should refresh existing timeout', () => {
      const mockGame = { code: 'TEST' };
      gameService.games.set('TEST', mockGame);

      // Create initial timeout
      gameService.createGameTimeout(mockIO, 'TEST');
      const firstTimer = gameService.gameTimers.get('TEST');

      // Refresh timeout
      gameService.refreshGameTimeout(mockIO, 'TEST');
      const secondTimer = gameService.gameTimers.get('TEST');

      expect(firstTimer).not.toBe(secondTimer);
    });

    test('should not refresh timeout for non-existent game', () => {
      const originalSize = gameService.gameTimers.size;

      gameService.refreshGameTimeout(mockIO, 'NONEXISTENT');

      expect(gameService.gameTimers.size).toBe(originalSize);
    });
  });

  describe('Player Validation', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        players: new Map(),
      };
    });

    test('should allow player to join when game has space', () => {
      mockGame.players.set('existing', {});

      const result = gameService.canPlayerJoinGame(mockGame, 'newPlayer');

      expect(result).toBe(true);
    });

    test('should not allow player to join when game is full', () => {
      // Fill game to max capacity
      for (let i = 0; i < 8; i++) {
        mockGame.players.set(`player${i}`, {});
      }

      expect(() => {
        gameService.canPlayerJoinGame(mockGame, 'overflow');
      }).toThrow('Game is full');
    });

    test('should not allow duplicate players', () => {
      mockGame.players.set('existing', {});

      expect(() => {
        gameService.canPlayerJoinGame(mockGame, 'existing');
      }).toThrow('You are already in this game');
    });
  });

  describe('Player List Broadcasting', () => {
    test('should broadcast player list to game room', () => {
      const mockGame = {
        getPlayersInfo: jest.fn().mockReturnValue([
          { id: 'player1', name: 'Alice' },
          { id: 'player2', name: 'Bob' },
        ]),
        hostId: 'player1',
      };

      gameService.games.set('TEST', mockGame);

      gameService.broadcastPlayerList(mockIO, 'TEST');

      expect(mockIO.to).toHaveBeenCalledWith('TEST');
      expect(mockIO.emit).toHaveBeenCalledWith('playerList', {
        players: [
          { id: 'player1', name: 'Alice' },
          { id: 'player2', name: 'Bob' },
        ],
        host: 'player1',
      });
    });

    test('should handle non-existent game gracefully', () => {
      gameService.broadcastPlayerList(mockIO, 'NONEXISTENT');

      expect(mockIO.to).not.toHaveBeenCalled();
      expect(mockIO.emit).not.toHaveBeenCalled();
    });
  });

  describe('Round Processing', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        processRound: jest.fn().mockReturnValue({
          eventsLog: ['Test event'],
          players: [{ id: 'player1', name: 'Alice' }],
          monster: { hp: 100, maxHp: 100 },
          turn: 1,
          level: 1,
          winner: null,
        }),
      };
    });

    test('should process game round successfully', () => {
      gameService.games.set('TEST', mockGame);

      const result = gameService.processGameRound(mockIO, 'TEST');

      expect(mockGame.processRound).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(mockIO.to).toHaveBeenCalledWith('TEST');
      expect(mockIO.emit).toHaveBeenCalledWith('roundResult', result);
    });

    test('should handle level up event', () => {
      mockGame.processRound.mockReturnValue({
        eventsLog: ['Level up!'],
        players: [{ id: 'player1', name: 'Alice' }],
        monster: { hp: 150, maxHp: 150 },
        turn: 1,
        level: 2,
        levelUp: { oldLevel: 1, newLevel: 2 },
        winner: null,
      });

      gameService.games.set('TEST', mockGame);

      const result = gameService.processGameRound(mockIO, 'TEST');

      expect(mockIO.emit).toHaveBeenCalledWith(
        'roundResult',
        expect.any(Object)
      );
      expect(mockIO.emit).toHaveBeenCalledWith('levelUp', {
        level: 2,
        oldLevel: 1,
        players: expect.any(Array),
      });
    });

    test('should clean up game when winner is determined', () => {
      mockGame.processRound.mockReturnValue({
        eventsLog: ['Good wins!'],
        players: [{ id: 'player1', name: 'Alice' }],
        monster: { hp: 100, maxHp: 100 },
        turn: 1,
        level: 1,
        winner: 'Good',
      });

      gameService.games.set('TEST', mockGame);
      gameService.gameTimers.set(
        'TEST',
        setTimeout(() => {}, 1000)
      );

      gameService.processGameRound(mockIO, 'TEST');

      expect(gameService.games.has('TEST')).toBe(false);
      expect(gameService.gameTimers.has('TEST')).toBe(false);
    });

    test('should return null for non-existent game', () => {
      const result = gameService.processGameRound(mockIO, 'NONEXISTENT');
      expect(result).toBe(null);
    });
  });

  describe('Win Condition Checking', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        players: new Map([
          [
            'player1',
            { id: 'player1', name: 'Alice', isAlive: true, isWarlock: false },
          ],
          [
            'player2',
            { id: 'player2', name: 'Bob', isAlive: true, isWarlock: true },
          ],
        ]),
        systems: {
          warlockSystem: {
            getWarlockCount: jest.fn().mockReturnValue(1),
          },
        },
        getAlivePlayers: jest.fn().mockReturnValue([
          { id: 'player1', name: 'Alice', isAlive: true, isWarlock: false },
          { id: 'player2', name: 'Bob', isAlive: true, isWarlock: true },
        ]),
        getPlayersInfo: jest.fn().mockReturnValue([
          { id: 'player1', name: 'Alice' },
          { id: 'player2', name: 'Bob' },
        ]),
      };
    });

    test('should detect good victory when no warlocks remain', () => {
      mockGame.systems.warlockSystem.getWarlockCount.mockReturnValue(0);
      gameService.games.set('TEST', mockGame);

      const gameEnded = gameService.checkGameWinConditions(
        mockIO,
        'TEST',
        'Charlie'
      );

      expect(gameEnded).toBe(true);
      expect(mockIO.emit).toHaveBeenCalledWith(
        'roundResult',
        expect.objectContaining({ winner: 'Good' })
      );
      expect(gameService.games.has('TEST')).toBe(false);
    });

    test('should detect evil victory when only warlocks remain', () => {
      mockGame.getAlivePlayers.mockReturnValue([
        { id: 'player2', name: 'Bob', isAlive: true, isWarlock: true },
      ]);
      gameService.games.set('TEST', mockGame);

      const gameEnded = gameService.checkGameWinConditions(
        mockIO,
        'TEST',
        'Alice'
      );

      expect(gameEnded).toBe(true);
      expect(mockIO.emit).toHaveBeenCalledWith(
        'roundResult',
        expect.objectContaining({ winner: 'Evil' })
      );
      expect(gameService.games.has('TEST')).toBe(false);
    });

    test('should continue game when neither win condition is met', () => {
      gameService.games.set('TEST', mockGame);

      const gameEnded = gameService.checkGameWinConditions(
        mockIO,
        'TEST',
        'Charlie'
      );

      expect(gameEnded).toBe(false);
      expect(gameService.games.has('TEST')).toBe(true);
    });

    test('should return false for non-existent game', () => {
      const gameEnded = gameService.checkGameWinConditions(
        mockIO,
        'NONEXISTENT',
        'Player'
      );
      expect(gameEnded).toBe(false);
    });
  });

  describe('Player Reconnection', () => {
    let mockPlayerSessionManager;
    let mockGame;

    beforeEach(() => {
      mockPlayerSessionManager = require('@services/PlayerSessionManager');
      mockGame = {
        players: new Map([['oldSocket', { id: 'oldSocket', name: 'Alice' }]]),
        transferPlayerId: jest.fn().mockReturnValue(true),
        getPlayersInfo: jest
          .fn()
          .mockReturnValue([{ id: 'newSocket', name: 'Alice' }]),
        systems: {
          monsterController: {
            getState: jest.fn().mockReturnValue({ hp: 100, maxHp: 100 }),
          },
        },
        round: 1,
        level: 1,
        started: true,
        hostId: 'newSocket',
      };
    });

    test('should process successful reconnection', () => {
      mockPlayerSessionManager.getSession.mockReturnValue({
        socketId: 'oldSocket',
        lastActive: Date.now(),
        playerData: {},
      });
      mockPlayerSessionManager.updateSocketId.mockReturnValue({
        socketId: 'newSocket',
        lastActive: Date.now(),
      });

      gameService.games.set('TEST', mockGame);

      const result = gameService.processReconnection(
        'TEST',
        'Alice',
        'newSocket'
      );

      expect(result).toBeTruthy();
      expect(result.game).toBe(mockGame);
      expect(result.players).toEqual([{ id: 'newSocket', name: 'Alice' }]);
      expect(mockGame.transferPlayerId).toHaveBeenCalledWith(
        'oldSocket',
        'newSocket'
      );
    });

    test('should fail reconnection for non-existent game', () => {
      const result = gameService.processReconnection(
        'NONEXISTENT',
        'Alice',
        'newSocket'
      );
      expect(result).toBe(false);
    });

    test('should fail reconnection with no active session', () => {
      mockPlayerSessionManager.getSession.mockReturnValue(null);
      gameService.games.set('TEST', mockGame);

      const result = gameService.processReconnection(
        'TEST',
        'Alice',
        'newSocket'
      );
      expect(result).toBe(false);
    });

    test('should fail reconnection when player not found in game', () => {
      mockPlayerSessionManager.getSession.mockReturnValue({
        socketId: 'oldSocket',
        lastActive: Date.now(),
      });
      mockPlayerSessionManager.updateSocketId.mockReturnValue({
        socketId: 'newSocket',
        lastActive: Date.now(),
      });

      // Player not in game
      mockGame.players.clear();
      gameService.games.set('TEST', mockGame);

      const result = gameService.processReconnection(
        'TEST',
        'Alice',
        'newSocket'
      );
      expect(result).toBe(false);
    });

    test('should fail reconnection when transfer fails', () => {
      mockPlayerSessionManager.getSession.mockReturnValue({
        socketId: 'oldSocket',
        lastActive: Date.now(),
      });
      mockPlayerSessionManager.updateSocketId.mockReturnValue({
        socketId: 'newSocket',
        lastActive: Date.now(),
      });
      mockGame.transferPlayerId.mockReturnValue(false);

      gameService.games.set('TEST', mockGame);

      const result = gameService.processReconnection(
        'TEST',
        'Alice',
        'newSocket'
      );
      expect(result).toBe(false);
    });
  });
});
