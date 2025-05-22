/**
 * @fileoverview Tests for validation middleware
 */

const {
  validateGame,
  validatePlayer,
  validateGameState,
  validateHost,
  validatePlayerName,
  validateAction,
} = require('@middleware/validation');

// Mock gameService
const mockGames = new Map();
jest.mock('@services/gameService', () => ({
  games: mockGames,
}));

describe('Validation Middleware', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
    };
    mockGames.clear();
  });

  describe('validateGame', () => {
    test('should validate existing game', () => {
      mockGames.set('1234', { code: '1234' });

      expect(() => validateGame(mockSocket, '1234')).not.toThrow();
    });

    test('should throw for invalid game code format', () => {
      expect(() => validateGame(mockSocket, 'ABCD')).toThrow(
        'Invalid game code format'
      );
    });

    test('should throw for non-existent game', () => {
      expect(() => validateGame(mockSocket, '9999')).toThrow('Game not found');
    });
  });

  describe('validatePlayer', () => {
    test('should validate player in game', () => {
      const mockGame = {
        players: new Map([['socket123', { id: 'socket123' }]]),
      };
      mockGames.set('1234', mockGame);

      expect(() => validatePlayer(mockSocket, '1234')).not.toThrow();
    });

    test('should throw for player not in game', () => {
      const mockGame = { players: new Map() };
      mockGames.set('1234', mockGame);

      expect(() => validatePlayer(mockSocket, '1234')).toThrow(
        'You are not a player in this game'
      );
    });
  });

  describe('validateGameState', () => {
    test('should validate correct game state', () => {
      const mockGame = { started: true };
      mockGames.set('1234', mockGame);

      expect(() => validateGameState(mockSocket, '1234', true)).not.toThrow();
    });

    test('should throw for incorrect game state', () => {
      const mockGame = { started: false };
      mockGames.set('1234', mockGame);

      expect(() => validateGameState(mockSocket, '1234', true)).toThrow(
        'Game has not started yet'
      );
    });
  });

  describe('validateHost', () => {
    test('should validate host player', () => {
      const mockGame = { hostId: 'socket123' };
      mockGames.set('1234', mockGame);

      expect(() => validateHost(mockSocket, '1234')).not.toThrow();
    });

    test('should throw for non-host player', () => {
      const mockGame = { hostId: 'otherPlayer' };
      mockGames.set('1234', mockGame);

      expect(() => validateHost(mockSocket, '1234')).toThrow(
        'Only the host can perform this action'
      );
    });
  });

  describe('validatePlayerName', () => {
    test('should validate good player names', () => {
      expect(() => validatePlayerName(mockSocket, 'Alice')).not.toThrow();
      expect(() => validatePlayerName(mockSocket, 'Player123')).not.toThrow();
      expect(() => validatePlayerName(mockSocket, 'A')).not.toThrow();
    });

    test('should throw for invalid player names', () => {
      expect(() => validatePlayerName(mockSocket, '')).toThrow(
        'Invalid player name'
      );
      expect(() => validatePlayerName(mockSocket, null)).toThrow(
        'Invalid player name'
      );
      expect(() => validatePlayerName(mockSocket, 'A'.repeat(25))).toThrow(
        'Invalid player name'
      );
    });
  });

  describe('validateAction', () => {
    test('should validate valid action', () => {
      const mockGame = {
        players: new Map([
          [
            'socket123',
            {
              unlocked: [{ type: 'slash', name: 'Slash' }],
            },
          ],
          ['target123', { isAlive: true }],
        ]),
      };
      mockGames.set('1234', mockGame);

      const result = validateAction(mockSocket, '1234', 'slash', 'target123');
      expect(result).toBe(true);
    });

    test('should fail for invalid action type', () => {
      const mockGame = {
        players: new Map([['socket123', { unlocked: [] }]]),
      };
      mockGames.set('1234', mockGame);

      const result = validateAction(
        mockSocket,
        '1234',
        'invalidAction',
        'target123'
      );
      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'errorMessage',
        expect.objectContaining({ message: 'Invalid action type.' })
      );
    });

    test('should allow monster targeting', () => {
      const mockGame = {
        players: new Map([
          [
            'socket123',
            {
              unlocked: [{ type: 'slash', name: 'Slash' }],
            },
          ],
        ]),
      };
      mockGames.set('1234', mockGame);

      const result = validateAction(mockSocket, '1234', 'slash', '__monster__');
      expect(result).toBe(true);
    });

    test('should fail for invalid player target', () => {
      const mockGame = {
        players: new Map([
          [
            'socket123',
            {
              unlocked: [{ type: 'slash', name: 'Slash' }],
            },
          ],
        ]),
      };
      mockGames.set('1234', mockGame);

      const result = validateAction(
        mockSocket,
        '1234',
        'slash',
        'invalidTarget'
      );
      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'errorMessage',
        expect.objectContaining({ message: 'Invalid target.' })
      );
    });
  });
});
