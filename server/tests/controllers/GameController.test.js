/**
 * @fileoverview Tests for GameController - Critical game flow handlers
 */
const gameController = require('@controllers/GameController');
const gameService = require('@services/gameService');
const config = require('@config');

// Mock dependencies
jest.mock('@services/gameService');
jest.mock('@config');

describe('GameController', () => {
  let mockIo, mockSocket, mockGame;

  beforeEach(() => {
    // Mock Socket.IO objects
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
      join: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };

    mockIo = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };

    // Mock game object
    mockGame = {
      code: 'TEST',
      players: new Map(),
      addPlayer: jest.fn().mockReturnValue(true),
      setPlayerClass: jest.fn(),
      started: false,
      hostId: null,
      getPlayersInfo: jest.fn().mockReturnValue([]),
    };

    // Mock gameService methods
    gameService.generateGameCode.mockReturnValue('1234');
    gameService.createGame.mockReturnValue(mockGame);
    gameService.games = new Map([['1234', mockGame]]);
    gameService.broadcastPlayerList = jest.fn();
    gameService.createGameTimeout = jest.fn();

    jest.clearAllMocks();
  });

  describe('handleCreateGame', () => {
    it('should create game and add host player', () => {
      const result = gameController.handleCreateGame(
        mockIo,
        mockSocket,
        'Alice'
      );

      expect(result).toBe(true);
      expect(gameService.generateGameCode).toHaveBeenCalled();
      expect(gameService.createGame).toHaveBeenCalledWith('1234');
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket123', 'Alice');
      expect(mockSocket.join).toHaveBeenCalledWith('1234');
      expect(mockSocket.emit).toHaveBeenCalledWith('gameCreated', {
        gameCode: '1234',
      });
      expect(gameService.broadcastPlayerList).toHaveBeenCalledWith(
        mockIo,
        '1234'
      );
    });

    it('should fail with invalid player name', () => {
      const result = gameController.handleCreateGame(mockIo, mockSocket, '');

      expect(result).toBe(false);
      expect(gameService.createGame).not.toHaveBeenCalled();
    });
  });

  describe('handlePerformAction', () => {
    beforeEach(() => {
      mockGame.started = true;
      mockGame.addAction = jest.fn().mockReturnValue(true);
      mockGame.allActionsSubmitted = jest.fn().mockReturnValue(false);
    });

    it('should add action and process round when all actions submitted', () => {
      mockGame.allActionsSubmitted.mockReturnValue(true);
      gameService.processGameRound = jest.fn();

      const result = gameController.handlePerformAction(
        mockIo,
        mockSocket,
        '1234',
        'slash',
        'target123'
      );

      expect(result).toBe(true);
      expect(mockGame.addAction).toHaveBeenCalledWith(
        'socket123',
        'slash',
        'target123',
        {}
      );
      expect(gameService.processGameRound).toHaveBeenCalledWith(mockIo, '1234');
    });

    it('should not process round when actions still pending', () => {
      gameService.processGameRound = jest.fn();

      const result = gameController.handlePerformAction(
        mockIo,
        mockSocket,
        '1234',
        'slash',
        'target123'
      );

      expect(result).toBe(true);
      expect(gameService.processGameRound).not.toHaveBeenCalled();
    });
  });
});
