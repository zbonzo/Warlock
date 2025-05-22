/**
 * @fileoverview Tests for gameService - Core game management
 */
const gameService = require('@services/gameService');
const { GameRoom } = require('@models/GameRoom');

jest.mock('@services/gameService', () => ({
  generateGameCode: jest.fn(),
  createGame: jest.fn(),
  games: new Map(),
  broadcastPlayerList: jest.fn(),
}));

jest.mock('@models/GameRoom', () => ({
  GameRoom: jest.fn(),
}));

describe('gameService', () => {
  beforeEach(() => {
    gameService.games.clear();
    gameService.gameTimers.clear();
    jest.clearAllMocks();
  });

  describe('generateGameCode', () => {
    it('should generate unique 4-digit codes', () => {
      const code1 = gameService.generateGameCode();
      const code2 = gameService.generateGameCode();

      expect(code1).toMatch(/^\d{4}$/);
      expect(code2).toMatch(/^\d{4}$/);
      expect(code1).not.toBe(code2);
    });

    it('should avoid collisions with existing games', () => {
      // Add existing game
      gameService.games.set('1234', {});

      // Mock Math.random to try to generate 1234 first
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.234) // Would generate 1234
        .mockReturnValueOnce(0.567); // Would generate 5567

      const code = gameService.generateGameCode();
      expect(code).toBe('5567'); // Should skip 1234
    });
  });

  describe('createGame', () => {
    it('should create and store new game', () => {
      const mockGame = { code: 'TEST' };
      GameRoom.mockImplementation(() => mockGame);

      const result = gameService.createGame('1234');

      expect(result).toBe(mockGame);
      expect(gameService.games.get('1234')).toBe(mockGame);
      expect(GameRoom).toHaveBeenCalledWith('1234');
    });
  });

  describe('processGameRound', () => {
    it('should process round and broadcast results', () => {
      const mockGame = {
        processRound: jest.fn().mockReturnValue({
          eventsLog: ['Test event'],
          players: [],
          monster: { hp: 100 },
          turn: 1,
          winner: null,
        }),
      };

      const mockIo = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      };

      gameService.games.set('1234', mockGame);

      const result = gameService.processGameRound(mockIo, '1234');

      expect(mockGame.processRound).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('1234');
      expect(result).toEqual(
        expect.objectContaining({
          eventsLog: ['Test event'],
          turn: 1,
        })
      );
    });

    it('should clean up game when winner declared', () => {
      const mockGame = {
        processRound: jest.fn().mockReturnValue({
          winner: 'Good',
        }),
      };

      const mockIo = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      };

      gameService.games.set('1234', mockGame);
      gameService.gameTimers.set(
        '1234',
        setTimeout(() => {}, 1000)
      );

      gameService.processGameRound(mockIo, '1234');

      // Game should be cleaned up
      expect(gameService.games.has('1234')).toBe(false);
      expect(gameService.gameTimers.has('1234')).toBe(false);
    });
  });
});
