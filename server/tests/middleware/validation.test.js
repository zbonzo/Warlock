/**
 * @fileoverview Tests for validation middleware
 */
const validation = require('@middleware/validation');
const gameService = require('@services/gameService');

jest.mock('@services/gameService', () => ({
  games: new Map(),
}));

describe('Validation Middleware', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
    };

    gameService.games = new Map();
    jest.clearAllMocks();
  });

  describe('validateGame', () => {
    it('should pass for valid game code', () => {
      const mockGame = { code: '1234' };
      gameService.games.set('1234', mockGame);

      expect(() => validation.validateGame(mockSocket, '1234')).not.toThrow();
    });

    it('should throw for invalid game code format', () => {
      expect(() => validation.validateGame(mockSocket, 'abc')).toThrow();
      expect(() => validation.validateGame(mockSocket, '12345')).toThrow();
      expect(() => validation.validateGame(mockSocket, '')).toThrow();
    });

    it('should throw for non-existent game', () => {
      expect(() => validation.validateGame(mockSocket, '9999')).toThrow();
    });
  });

  describe('validatePlayerName', () => {
    it('should pass for valid names', () => {
      expect(() =>
        validation.validatePlayerName(mockSocket, 'Alice')
      ).not.toThrow();
      expect(() =>
        validation.validatePlayerName(mockSocket, 'Player123')
      ).not.toThrow();
    });

    it('should throw for invalid names', () => {
      expect(() => validation.validatePlayerName(mockSocket, '')).toThrow();
      expect(() =>
        validation.validatePlayerName(mockSocket, 'A'.repeat(25))
      ).toThrow();
      expect(() =>
        validation.validatePlayerName(mockSocket, '<script>')
      ).toThrow();
    });
  });
});
