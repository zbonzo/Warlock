/**
 * @fileoverview Tests for PlayerController
 */

const playerController = require('@controllers/PlayerController');
const gameService = require('@services/gameService');
const playerSessionManager = require('@services/PlayerSessionManager');

// Mock dependencies
jest.mock('@services/gameService');
jest.mock('@services/PlayerSessionManager');
jest.mock('@middleware/validation');
jest.mock('@shared/gameChecks');
jest.mock('@config', () => ({
  races: ['Human', 'Dwarf', 'Elf'],
  classes: ['Warrior', 'Pyromancer', 'Wizard'],
  classRaceCompatibility: {
    Warrior: ['Human', 'Dwarf'],
    Pyromancer: ['Dwarf', 'Elf'],
    Wizard: ['Human', 'Elf'],
  },
  player: {
    reconnectionWindow: 60000,
  },
  messages: {
    errors: {
      gameStarted: 'Game has already started',
      reconnectionFailed: 'Reconnection failed',
    },
  },
}));

describe('PlayerController', () => {
  let mockIO;
  let mockSocket;
  let mockGame;

  beforeEach(() => {
    mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
      join: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    mockGame = {
      players: new Map(),
      addPlayer: jest.fn().mockReturnValue(true),
      removePlayer: jest.fn(),
      setPlayerClass: jest.fn(),
      started: false,
      hostId: 'socket123',
    };

    jest.clearAllMocks();
  });

  describe('handlePlayerJoin', () => {
    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      const { validatePlayerName } = require('@middleware/validation');

      validateGameAction.mockReturnValue(mockGame);
      validatePlayerName.mockReturnValue(true);

      gameService.canPlayerJoinGame.mockReturnValue(true);
      gameService.refreshGameTimeout.mockImplementation(() => {});
      gameService.broadcastPlayerList.mockImplementation(() => {});
      playerSessionManager.registerSession.mockImplementation(() => {});
    });

    test('should handle player join successfully', () => {
      const result = playerController.handlePlayerJoin(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(result).toBe(true);
      expect(mockGame.addPlayer).toHaveBeenCalledWith(
        'socket123',
        'TestPlayer'
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1234');
      expect(playerSessionManager.registerSession).toHaveBeenCalledWith(
        '1234',
        'TestPlayer',
        'socket123'
      );
      expect(gameService.broadcastPlayerList).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
    });

    test('should fail with invalid player name', () => {
      const { validatePlayerName } = require('@middleware/validation');
      validatePlayerName.mockReturnValue(false);

      const result = playerController.handlePlayerJoin(
        mockIO,
        mockSocket,
        '1234',
        ''
      );

      expect(result).toBe(false);
      expect(mockGame.addPlayer).not.toHaveBeenCalled();
    });

    test('should fail when cannot join game', () => {
      gameService.canPlayerJoinGame.mockReturnValue(false);

      const result = playerController.handlePlayerJoin(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(result).toBe(false);
    });

    test('should fail when addPlayer fails', () => {
      mockGame.addPlayer.mockReturnValue(false);

      expect(() => {
        playerController.handlePlayerJoin(
          mockIO,
          mockSocket,
          '1234',
          'TestPlayer'
        );
      }).toThrow();
    });
  });

  describe('handlePlayerReconnection', () => {
    beforeEach(() => {
      const { validateGame } = require('@middleware/validation');
      validateGame.mockReturnValue(true);

      gameService.processReconnection.mockReturnValue({
        game: mockGame,
        players: [{ id: 'socket123', name: 'TestPlayer' }],
        monster: { hp: 100, maxHp: 100 },
        turn: 1,
        level: 1,
        started: true,
        host: 'socket123',
      });

      gameService.refreshGameTimeout.mockImplementation(() => {});
    });

    test('should handle successful reconnection', () => {
      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(result).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith('1234');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.any(Object)
      );
      expect(mockSocket.to).toHaveBeenCalledWith('1234');
    });

    test('should fall back to normal join for unstarted game', () => {
      gameService.processReconnection.mockReturnValue(null);
      gameService.games = new Map([['1234', { started: false }]]);

      // Mock handlePlayerJoin to avoid actual execution
      const handlePlayerJoinSpy = jest
        .spyOn(playerController, 'handlePlayerJoin')
        .mockReturnValue(true);

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(result).toBe(true);
      expect(handlePlayerJoinSpy).toHaveBeenCalled();

      handlePlayerJoinSpy.mockRestore();
    });

    test('should fail for non-existent game', () => {
      const { validateGame } = require('@middleware/validation');
      validateGame.mockReturnValue(false);

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        'NONEXISTENT',
        'TestPlayer'
      );

      expect(result).toBe(false);
    });

    test('should fail when reconnection processing fails', () => {
      gameService.processReconnection.mockReturnValue(null);
      gameService.games = new Map([['1234', { started: true }]]);

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'errorMessage',
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot join a game that has already started'
          ),
        })
      );
    });
  });

  describe('handleSelectCharacter', () => {
    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      gameService.refreshGameTimeout.mockImplementation(() => {});
      gameService.broadcastPlayerList.mockImplementation(() => {});
    });

    test('should handle character selection successfully', () => {
      const result = playerController.handleSelectCharacter(
        mockIO,
        mockSocket,
        '1234',
        'Human',
        'Warrior'
      );

      expect(result).toBe(true);
      expect(mockGame.setPlayerClass).toHaveBeenCalledWith(
        'socket123',
        'Human',
        'Warrior'
      );
      expect(gameService.broadcastPlayerList).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
    });

    test('should fail with invalid race', () => {
      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'InvalidRace',
          'Warrior'
        );
      }).toThrow();
    });

    test('should fail with invalid class', () => {
      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'InvalidClass'
        );
      }).toThrow();
    });

    test('should fail with invalid race-class combination', () => {
      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'Pyromancer'
        );
      }).toThrow();
    });
  });

  describe('handlePlayerDisconnect', () => {
    beforeEach(() => {
      playerSessionManager.handleDisconnect.mockReturnValue({
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      });

      gameService.games = new Map([['1234', mockGame]]);
    });

    test('should handle temporary disconnection', () => {
      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      expect(playerSessionManager.handleDisconnect).toHaveBeenCalledWith(
        'socket123'
      );
      expect(mockIO.emit).toHaveBeenCalledWith('playerTemporaryDisconnect', {
        playerId: 'socket123',
        playerName: 'TestPlayer',
        isHost: true,
      });
    });

    test('should handle disconnection with no session', () => {
      playerSessionManager.handleDisconnect.mockReturnValue(null);

      // Should not throw error
      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      expect(mockIO.emit).not.toHaveBeenCalled();
    });

    test('should handle permanent disconnection after timeout', (done) => {
      jest.useFakeTimers();

      // Mock the private function by extending the module
      const originalTimeout = setTimeout;
      setTimeout.mockImplementation((callback, delay) => {
        if (delay === 60000) {
          // Reconnection window
          // Simulate timeout
          playerSessionManager.getSession.mockReturnValue(null);
          callback();

          // Verify permanent disconnection handling
          expect(mockGame.removePlayer).toHaveBeenCalledWith('socket123');
          done();
        }
        return originalTimeout(callback, delay);
      });

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });
});
