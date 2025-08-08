/**
 * @fileoverview Tests for gameChecks utilities
 */

import { validateGameAction } from '../../../server/shared/gameChecks';

// Mock dependencies
jest.mock('../middleware/validation.js', () => ({
  validateGame: jest.fn(),
  validatePlayer: jest.fn(),
  validateGameState: jest.fn(),
  validateHost: jest.fn()
}));

jest.mock('../services/gameService.js', () => ({
  default: {
    games: new Map([
      ['TEST123', {
        code: 'TEST123',
        started: true,
        players: [{ id: 'player1' }],
        host: 'player1'
      }]
    ])
  }
}));

const mockValidation = require('../../../server/middleware/validation.js');

describe('gameChecks', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      id: 'socket1',
      playerId: 'player1'
    };
    jest.clearAllMocks();
  });

  describe('validateGameAction', () => {
    it('should validate game action with all checks', () => {
      const result = validateGameAction(mockSocket, 'TEST123', true, true, true);

      expect(mockValidation.validateGame).toHaveBeenCalledWith(mockSocket, 'TEST123');
      expect(mockValidation.validateGameState).toHaveBeenCalledWith(mockSocket, 'TEST123', true);
      expect(mockValidation.validatePlayer).toHaveBeenCalledWith(mockSocket, 'TEST123');
      expect(mockValidation.validateHost).toHaveBeenCalledWith(mockSocket, 'TEST123');

      expect(result).toBeDefined();
      expect(result.code).toBe('TEST123');
    });

    it('should skip player validation when not required', () => {
      validateGameAction(mockSocket, 'TEST123', false, false, false);

      expect(mockValidation.validateGame).toHaveBeenCalled();
      expect(mockValidation.validateGameState).toHaveBeenCalled();
      expect(mockValidation.validatePlayer).not.toHaveBeenCalled();
      expect(mockValidation.validateHost).not.toHaveBeenCalled();
    });

    it('should validate host when required', () => {
      validateGameAction(mockSocket, 'TEST123', true, true);

      expect(mockValidation.validateHost).toHaveBeenCalledWith(mockSocket, 'TEST123');
    });

    it('should return the game object', () => {
      const result = validateGameAction(mockSocket, 'TEST123', true);

      expect(result.code).toBe('TEST123');
      expect(result.started).toBe(true);
    });
  });
});
