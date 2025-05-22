/**
 * @fileoverview Tests for GameController
 */

const gameController = require('@controllers/GameController');
const gameService = require('@services/gameService');

// Mock dependencies
jest.mock('@services/gameService');
jest.mock('@middleware/validation');
jest.mock('@shared/gameChecks');
jest.mock('@config', () => ({
  minPlayers: 2,
  maxPlayers: 8,
  classAbilities: {
    Warrior: [
      { type: 'slash', name: 'Slash', unlockAt: 1 },
      { type: 'shield', name: 'Shield', unlockAt: 2 },
    ],
  },
  messages: {
    getError: jest.fn((key, data) => `Error: ${key}`),
    success: {
      adaptabilityTriggered: 'Adaptability triggered',
      adaptabilityComplete: 'Ability replacement successful',
    },
    errors: {
      adaptabilityFailed: 'Adaptability failed',
      abilityNotFound: 'Ability not found',
      abilityNotUnlocked: 'Ability not unlocked',
    },
  },
}));

describe('GameController', () => {
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
    };

    mockGame = {
      players: new Map(),
      addPlayer: jest.fn().mockReturnValue(true),
      setPlayerClass: jest.fn(),
      started: false,
      round: 1,
      level: 1,
      hostId: 'socket123',
      assignInitialWarlock: jest.fn(),
      monster: { hp: 100, maxHp: 100 },
      addAction: jest.fn().mockReturnValue(true),
      addRacialAction: jest.fn().mockReturnValue(true),
      allActionsSubmitted: jest.fn().mockReturnValue(false),
      getPlayersInfo: jest.fn().mockReturnValue([]),
      nextReady: new Set(),
      getAlivePlayers: jest.fn().mockReturnValue([]),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('handleCreateGame', () => {
    beforeEach(() => {
      const { validatePlayerName } = require('@middleware/validation');
      validatePlayerName.mockReturnValue(true);

      gameService.generateGameCode.mockReturnValue('1234');
      gameService.createGame.mockReturnValue(mockGame);
      gameService.createGameTimeout.mockImplementation(() => {});
      gameService.broadcastPlayerList.mockImplementation(() => {});
    });

    test('should create game successfully', () => {
      const result = gameController.handleCreateGame(
        mockIO,
        mockSocket,
        'TestPlayer'
      );

      expect(result).toBe(true);
      expect(gameService.generateGameCode).toHaveBeenCalled();
      expect(gameService.createGame).toHaveBeenCalledWith('1234');
      expect(mockGame.addPlayer).toHaveBeenCalledWith(
        'socket123',
        'TestPlayer'
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1234');
      expect(mockSocket.emit).toHaveBeenCalledWith('gameCreated', {
        gameCode: '1234',
      });
    });

    test('should fail with invalid player name', () => {
      const { validatePlayerName } = require('@middleware/validation');
      validatePlayerName.mockReturnValue(false);

      const result = gameController.handleCreateGame(mockIO, mockSocket, '');

      expect(result).toBe(false);
      expect(gameService.createGame).not.toHaveBeenCalled();
    });

    test('should fail when game creation fails', () => {
      gameService.createGame.mockReturnValue(null);

      const result = gameController.handleCreateGame(
        mockIO,
        mockSocket,
        'TestPlayer'
      );

      expect(result).toBe(false);
      expect(mockGame.addPlayer).not.toHaveBeenCalled();
    });
  });

  describe('handleStartGame', () => {
    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      // Set up players
      mockGame.players.set('player1', { race: 'Human', class: 'Warrior' });
      mockGame.players.set('player2', { race: 'Dwarf', class: 'Warrior' });

      gameService.refreshGameTimeout.mockImplementation(() => {});
    });

    test('should start game successfully', () => {
      const result = gameController.handleStartGame(mockIO, mockSocket, '1234');

      expect(result).toBe(true);
      expect(mockGame.started).toBe(true);
      expect(mockGame.round).toBe(1);
      expect(mockGame.assignInitialWarlock).toHaveBeenCalled();
      expect(mockIO.emit).toHaveBeenCalledWith(
        'gameStarted',
        expect.any(Object)
      );
    });

    test('should fail with insufficient players', () => {
      mockGame.players.clear();

      expect(() => {
        gameController.handleStartGame(mockIO, mockSocket, '1234');
      }).toThrow();
    });

    test('should fail when not all players are ready', () => {
      mockGame.players.set('player1', { race: null, class: null });

      expect(() => {
        gameController.handleStartGame(mockIO, mockSocket, '1234');
      }).toThrow();
    });
  });

  describe('handlePerformAction', () => {
    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      gameService.refreshGameTimeout.mockImplementation(() => {});
      gameService.processGameRound.mockImplementation(() => {});
    });

    test('should handle action successfully', () => {
      const result = gameController.handlePerformAction(
        mockIO,
        mockSocket,
        '1234',
        'slash',
        'target1',
        {}
      );

      expect(result).toBe(true);
      expect(mockGame.addAction).toHaveBeenCalledWith(
        'socket123',
        'slash',
        'target1',
        {}
      );
      expect(gameService.refreshGameTimeout).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
    });

    test('should process round when all actions submitted', () => {
      mockGame.allActionsSubmitted.mockReturnValue(true);

      gameController.handlePerformAction(
        mockIO,
        mockSocket,
        '1234',
        'slash',
        'target1',
        {}
      );

      expect(gameService.processGameRound).toHaveBeenCalledWith(mockIO, '1234');
    });

    test('should fail when action cannot be added', () => {
      mockGame.addAction.mockReturnValue(false);

      const result = gameController.handlePerformAction(
        mockIO,
        mockSocket,
        '1234',
        'slash',
        'target1',
        {}
      );

      expect(result).toBe(false);
    });
  });

  describe('handleRacialAbility', () => {
    let mockPlayer;

    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      mockPlayer = {
        name: 'TestPlayer',
        race: 'Human',
        class: 'Warrior',
        racialUsesLeft: 1,
        abilities: [
          { type: 'slash', name: 'Slash', unlockAt: 1 },
          { type: 'shield', name: 'Shield', unlockAt: 2 },
        ],
        level: 1,
      };

      mockGame.players.set('socket123', mockPlayer);
      gameService.refreshGameTimeout.mockImplementation(() => {});
    });

    test('should handle Human Adaptability correctly', () => {
      const result = gameController.handleRacialAbility(
        mockIO,
        mockSocket,
        '1234',
        'socket123',
        'adaptability'
      );

      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'adaptabilityChooseAbility',
        expect.objectContaining({
          abilities: expect.any(Object),
          maxLevel: 1,
        })
      );
    });

    test('should fail Adaptability when no uses left', () => {
      mockPlayer.racialUsesLeft = 0;

      const result = gameController.handleRacialAbility(
        mockIO,
        mockSocket,
        '1234',
        'socket123',
        'adaptability'
      );

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'racialAbilityUsed',
        expect.objectContaining({ success: false })
      );
    });

    test('should handle non-Human racial abilities', () => {
      mockPlayer.race = 'Dwarf';

      const result = gameController.handleRacialAbility(
        mockIO,
        mockSocket,
        '1234',
        'socket123',
        'stoneArmor'
      );

      expect(result).toBe(true);
      expect(mockGame.addRacialAction).toHaveBeenCalledWith(
        'socket123',
        'socket123'
      );
    });

    test('should fail when racial action cannot be added', () => {
      mockGame.addRacialAction.mockReturnValue(false);

      const result = gameController.handleRacialAbility(
        mockIO,
        mockSocket,
        '1234',
        'socket123',
        'keenSenses'
      );

      expect(result).toBe(false);
    });
  });

  describe('handleAdaptabilityReplace', () => {
    let mockPlayer;

    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      mockPlayer = {
        name: 'TestPlayer',
        race: 'Human',
        class: 'Warrior',
        abilities: [
          { type: 'slash', name: 'Slash', unlockAt: 1 },
          { type: 'shield', name: 'Shield', unlockAt: 2 },
        ],
        unlocked: [{ type: 'slash', name: 'Slash', unlockAt: 1 }],
      };

      mockGame.players.set('socket123', mockPlayer);
      gameService.refreshGameTimeout.mockImplementation(() => {});
    });

    test('should replace ability successfully', () => {
      const config = require('@config');
      config.classAbilities.Pyromancer = [
        { type: 'fireball', name: 'Fireball', unlockAt: 1 },
      ];

      const result = gameController.handleAdaptabilityReplace(
        mockIO,
        mockSocket,
        '1234',
        'slash',
        'fireball',
        1,
        'Pyromancer'
      );

      expect(result).toBe(true);
      expect(mockPlayer.abilities[0].type).toBe('fireball');
      expect(mockPlayer.unlocked[0].type).toBe('fireball');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'adaptabilityComplete',
        expect.objectContaining({ success: true })
      );
    });

    test('should fail for non-Human players', () => {
      mockPlayer.race = 'Dwarf';

      const result = gameController.handleAdaptabilityReplace(
        mockIO,
        mockSocket,
        '1234',
        'slash',
        'fireball',
        1,
        'Pyromancer'
      );

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'adaptabilityComplete',
        expect.objectContaining({ success: false })
      );
    });

    test('should fail when old ability not found', () => {
      const result = gameController.handleAdaptabilityReplace(
        mockIO,
        mockSocket,
        '1234',
        'nonexistent',
        'fireball',
        1,
        'Pyromancer'
      );

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'adaptabilityComplete',
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('not found'),
        })
      );
    });

    test('should fail when new ability not found', () => {
      const result = gameController.handleAdaptabilityReplace(
        mockIO,
        mockSocket,
        '1234',
        'slash',
        'nonexistent',
        1,
        'NonexistentClass'
      );

      expect(result).toBe(false);
    });
  });

  describe('handleGetClassAbilities', () => {
    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      gameService.refreshGameTimeout.mockImplementation(() => {});
    });

    test('should get class abilities successfully', () => {
      const config = require('@config');
      config.getClassAbilities = jest
        .fn()
        .mockReturnValue([{ type: 'slash', name: 'Slash', unlockAt: 1 }]);

      const result = gameController.handleGetClassAbilities(
        mockIO,
        mockSocket,
        '1234',
        'Warrior',
        1
      );

      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('classAbilitiesResponse', {
        success: true,
        abilities: [{ type: 'slash', name: 'Slash', unlockAt: 1 }],
        className: 'Warrior',
        level: 1,
      });
    });

    test('should handle errors gracefully', () => {
      const config = require('@config');
      config.getClassAbilities = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = gameController.handleGetClassAbilities(
        mockIO,
        mockSocket,
        '1234',
        'Warrior',
        1
      );

      expect(result).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'classAbilitiesResponse',
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('handlePlayerNextReady', () => {
    beforeEach(() => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockReturnValue(mockGame);

      gameService.refreshGameTimeout.mockImplementation(() => {});
    });

    test('should mark player ready successfully', () => {
      mockGame.getAlivePlayers.mockReturnValue([
        { id: 'socket123' },
        { id: 'player2' },
        { id: 'player3' },
      ]);

      const result = gameController.handlePlayerNextReady(
        mockIO,
        mockSocket,
        '1234'
      );

      expect(result).toBe(true);
      expect(mockGame.nextReady.has('socket123')).toBe(true);
      expect(mockIO.emit).toHaveBeenCalledWith('readyPlayersUpdate', {
        readyPlayers: ['socket123'],
        total: 3,
      });
    });

    test('should resume game when majority ready', () => {
      mockGame.getAlivePlayers.mockReturnValue([
        { id: 'socket123' },
        { id: 'player2' },
      ]);

      // Add one player already ready (majority = 2/2 > 1)
      mockGame.nextReady.add('player2');

      const result = gameController.handlePlayerNextReady(
        mockIO,
        mockSocket,
        '1234'
      );

      expect(result).toBe(true);
      expect(mockIO.emit).toHaveBeenCalledWith('resumeGame');
      expect(mockGame.nextReady.size).toBe(0); // Cleared after resume
    });

    test('should not mark player ready twice', () => {
      mockGame.nextReady.add('socket123');

      const result = gameController.handlePlayerNextReady(
        mockIO,
        mockSocket,
        '1234'
      );

      expect(result).toBe(false);
    });

    test('should handle errors gracefully', () => {
      const { validateGameAction } = require('@shared/gameChecks');
      validateGameAction.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = gameController.handlePlayerNextReady(
        mockIO,
        mockSocket,
        '1234'
      );

      expect(result).toBe(false);
    });
  });
});
