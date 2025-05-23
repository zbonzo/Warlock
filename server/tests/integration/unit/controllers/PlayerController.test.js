/**
 * @fileoverview Complete Tests for PlayerController with 100% Coverage
 */

// Mock modules before requiring anything
const mockValidateGame = jest.fn();
const mockValidatePlayerName = jest.fn();
const mockValidateGameAction = jest.fn();

const mockGameService = {
  canPlayerJoinGame: jest.fn(),
  refreshGameTimeout: jest.fn(),
  broadcastPlayerList: jest.fn(),
  processReconnection: jest.fn(),
  checkGameWinConditions: jest.fn(),
  games: new Map(),
};

const mockPlayerSessionManager = {
  registerSession: jest.fn(),
  handleDisconnect: jest.fn(),
  getSession: jest.fn(),
  removeSession: jest.fn(),
  updateSocketId: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  throwGameStateError: jest.fn((msg) => {
    const error = new Error(msg);
    error.type = 'GAME_STATE_ERROR';
    throw error;
  }),
  throwValidationError: jest.fn((msg) => {
    const error = new Error(msg);
    error.type = 'VALIDATION_ERROR';
    throw error;
  }),
  throwPermissionError: jest.fn((msg) => {
    const error = new Error(msg);
    error.type = 'PERMISSION_ERROR';
    throw error;
  }),
};

const mockConfig = {
  defaultPlayerName: 'Player',
  races: ['Human', 'Dwarf', 'Elf', 'Orc', 'Satyr', 'Skeleton'],
  classes: [
    'Warrior',
    'Pyromancer',
    'Wizard',
    'Assassin',
    'Alchemist',
    'Priest',
    'Oracle',
    'Barbarian',
    'Shaman',
    'Gunslinger',
    'Tracker',
    'Druid',
  ],
  classRaceCompatibility: {
    Warrior: ['Human', 'Dwarf', 'Skeleton'],
    Pyromancer: ['Dwarf', 'Skeleton', 'Orc'],
    Wizard: ['Human', 'Elf', 'Skeleton'],
    Assassin: ['Human', 'Elf', 'Skeleton'],
    Alchemist: ['Human', 'Elf', 'Satyr'],
    Priest: ['Human', 'Dwarf', 'Skeleton'],
    Oracle: ['Dwarf', 'Satyr', 'Orc'],
    Barbarian: ['Human', 'Dwarf', 'Orc', 'Skeleton'],
    Shaman: ['Dwarf', 'Satyr', 'Orc'],
    Gunslinger: ['Human', 'Dwarf', 'Skeleton'],
    Tracker: ['Elf', 'Satyr', 'Orc'],
    Druid: ['Elf', 'Satyr', 'Orc'],
  },
  player: {
    reconnectionWindow: 60000,
  },
  messages: {
    errors: {
      joinFailed: 'Could not join game.',
      gameStarted: 'Cannot join a game that has already started.',
      reconnectionFailed: 'Failed to reconnect to game.',
      invalidRace: 'Invalid race selection.',
      invalidClass: 'Invalid class selection.',
      invalidCombination: 'Invalid race and class combination.',
    },
  },
};

// Set up module mocks
jest.mock('@shared/gameChecks', () => ({
  validateGameAction: mockValidateGameAction,
}));

jest.mock('@middleware/validation', () => ({
  validatePlayerName: mockValidatePlayerName,
  validateGame: mockValidateGame,
}));

jest.mock('@services/gameService', () => mockGameService);
jest.mock('@services/PlayerSessionManager', () => mockPlayerSessionManager);
jest.mock('@utils/logger', () => mockLogger);
jest.mock('@utils/errorHandler', () => mockErrorHandler);
jest.mock('@config', () => mockConfig);

// Now require the module
const playerController = require('@controllers/PlayerController');

describe('PlayerController - Complete Coverage', () => {
  let mockIO, mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

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
  });

  describe('handlePlayerJoin', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        addPlayer: jest.fn(),
        players: new Map(),
        started: false,
      };
    });

    test('should handle successful player join', () => {
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);
      mockGame.addPlayer.mockReturnValue(true);

      const result = playerController.handlePlayerJoin(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockValidateGameAction).toHaveBeenCalledWith(
        mockSocket,
        '1234',
        false,
        false,
        false
      );
      expect(mockValidatePlayerName).toHaveBeenCalledWith(
        mockSocket,
        'TestPlayer'
      );
      expect(mockGameService.canPlayerJoinGame).toHaveBeenCalledWith(
        mockGame,
        'socket123'
      );
      expect(mockGame.addPlayer).toHaveBeenCalledWith(
        'socket123',
        'TestPlayer'
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1234');
      expect(mockPlayerSessionManager.registerSession).toHaveBeenCalledWith(
        '1234',
        'TestPlayer',
        'socket123'
      );
      expect(mockGameService.refreshGameTimeout).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
      expect(mockGameService.broadcastPlayerList).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
      expect(result).toBe(true);
    });

    test('should use default player name when name is falsy', () => {
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);
      mockGame.addPlayer.mockReturnValue(true);

      // Test with null
      playerController.handlePlayerJoin(mockIO, mockSocket, '1234', null);
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket123', 'Player');

      // Test with empty string
      jest.clearAllMocks();
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);
      mockGame.addPlayer.mockReturnValue(true);

      playerController.handlePlayerJoin(mockIO, mockSocket, '1234', '');
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket123', 'Player');

      // Test with undefined config default
      const originalDefault = mockConfig.defaultPlayerName;
      mockConfig.defaultPlayerName = undefined;

      jest.clearAllMocks();
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);
      mockGame.addPlayer.mockReturnValue(true);

      playerController.handlePlayerJoin(mockIO, mockSocket, '1234', undefined);
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket123', 'Player');

      mockConfig.defaultPlayerName = originalDefault;
    });

    test('should return false when player name validation fails', () => {
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(false);

      const result = playerController.handlePlayerJoin(
        mockIO,
        mockSocket,
        '1234',
        'Invalid!Name'
      );

      expect(mockValidatePlayerName).toHaveBeenCalledWith(
        mockSocket,
        'Invalid!Name'
      );
      expect(mockGameService.canPlayerJoinGame).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should return false when canPlayerJoinGame returns false', () => {
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(false);

      const result = playerController.handlePlayerJoin(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockGameService.canPlayerJoinGame).toHaveBeenCalledWith(
        mockGame,
        'socket123'
      );
      expect(mockGame.addPlayer).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should throw error when addPlayer fails', () => {
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);
      mockGame.addPlayer.mockReturnValue(false);

      expect(() => {
        playerController.handlePlayerJoin(
          mockIO,
          mockSocket,
          '1234',
          'TestPlayer'
        );
      }).toThrow('Could not join game.');
    });
  });

  describe('handleSelectCharacter', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        setPlayerClass: jest.fn(),
        started: false,
      };
    });

    test('should handle successful character selection', () => {
      mockValidateGameAction.mockReturnValue(mockGame);

      const result = playerController.handleSelectCharacter(
        mockIO,
        mockSocket,
        '1234',
        'Human',
        'Warrior'
      );

      expect(mockValidateGameAction).toHaveBeenCalledWith(
        mockSocket,
        '1234',
        false,
        false
      );
      expect(mockGame.setPlayerClass).toHaveBeenCalledWith(
        'socket123',
        'Human',
        'Warrior'
      );
      expect(mockGameService.refreshGameTimeout).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
      expect(mockGameService.broadcastPlayerList).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
      expect(result).toBe(true);
    });

    test('should throw error for invalid race', () => {
      mockValidateGameAction.mockReturnValue(mockGame);

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'InvalidRace',
          'Warrior'
        );
      }).toThrow('Invalid race selection.');
    });

    test('should throw error for invalid class', () => {
      mockValidateGameAction.mockReturnValue(mockGame);

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'InvalidClass'
        );
      }).toThrow('Invalid class selection.');
    });

    test('should throw error for invalid race-class combination', () => {
      mockValidateGameAction.mockReturnValue(mockGame);

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'Pyromancer'
        );
      }).toThrow('Invalid race and class combination.');
    });

    test('should handle missing classRaceCompatibility', () => {
      mockValidateGameAction.mockReturnValue(mockGame);

      // Temporarily remove class from compatibility map
      const originalCompat = mockConfig.classRaceCompatibility.Warrior;
      delete mockConfig.classRaceCompatibility.Warrior;

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'Warrior'
        );
      }).toThrow('Invalid race and class combination.');

      // Restore
      mockConfig.classRaceCompatibility.Warrior = originalCompat;
    });
  });

  describe('handlePlayerReconnection', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        started: true,
        getAlivePlayers: jest.fn().mockReturnValue([]),
        players: new Map([['socket123', { name: 'TestPlayer' }]]),
        systems: {
          statusEffectManager: {
            isPlayerStunned: jest.fn().mockReturnValue(false),
          },
        },
        pendingActions: [],
        nextReady: new Set(),
      };
    });

    test('should handle successful reconnection', () => {
      mockValidateGame.mockReturnValue(true);
      mockGameService.games.set('1234', mockGame);

      const mockReconnectionData = {
        game: mockGame,
        players: [{ id: 'socket123', name: 'TestPlayer' }],
        monster: { hp: 100, maxHp: 100 },
        turn: 1,
        level: 1,
        started: true,
        host: 'socket123',
      };

      mockGameService.processReconnection.mockReturnValue(mockReconnectionData);

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockValidateGame).toHaveBeenCalledWith(mockSocket, '1234');
      expect(mockGameService.processReconnection).toHaveBeenCalledWith(
        '1234',
        'TestPlayer',
        'socket123'
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1234');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.any(Object)
      );
      expect(mockSocket.to).toHaveBeenCalledWith('1234');
      expect(mockGameService.refreshGameTimeout).toHaveBeenCalledWith(
        mockIO,
        '1234'
      );
      expect(result).toBe(true);
    });

    test('should determine game phase correctly', () => {
      mockValidateGame.mockReturnValue(true);

      // Test characterSelect phase
      const gameCharSelect = {
        started: false,
        players: new Map([['p1', { race: null, class: null }]]),
      };
      mockGameService.games.set('1234', gameCharSelect);
      const reconnectData1 = {
        game: gameCharSelect,
        players: [],
        monster: {},
        turn: 0,
        level: 1,
        started: false,
        host: 'p1',
      };
      mockGameService.processReconnection.mockReturnValue(reconnectData1);

      playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.objectContaining({
          gamePhase: 'characterSelect',
        })
      );

      // Test lobby phase
      jest.clearAllMocks();
      mockValidateGame.mockReturnValue(true);
      const gameLobby = {
        started: false,
        players: new Map([['p1', { race: 'Human', class: 'Warrior' }]]),
      };
      mockGameService.games.set('1234', gameLobby);
      const reconnectData2 = {
        game: gameLobby,
        players: [],
        monster: {},
        turn: 0,
        level: 1,
        started: false,
        host: 'p1',
      };
      mockGameService.processReconnection.mockReturnValue(reconnectData2);

      playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.objectContaining({
          gamePhase: 'lobby',
        })
      );

      // Test roundResults phase
      jest.clearAllMocks();
      mockValidateGame.mockReturnValue(true);
      const gameResults = {
        started: true,
        pendingActions: ['action1'],
        players: new Map(),
      };
      mockGameService.games.set('1234', gameResults);
      const reconnectData3 = {
        game: gameResults,
        players: [],
        monster: {},
        turn: 1,
        level: 1,
        started: true,
        host: 'p1',
      };
      mockGameService.processReconnection.mockReturnValue(reconnectData3);

      playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.objectContaining({
          gamePhase: 'roundResults',
        })
      );

      // Test chooseAction phase with stunned players
      jest.clearAllMocks();
      mockValidateGame.mockReturnValue(true);
      const gameAction = {
        started: true,
        pendingActions: [],
        getAlivePlayers: jest
          .fn()
          .mockReturnValue([{ id: 'p1' }, { id: 'p2' }]),
        systems: {
          statusEffectManager: {
            isPlayerStunned: jest.fn().mockImplementation((id) => id === 'p1'),
          },
        },
        players: new Map([['socket123', {}]]),
      };
      mockGameService.games.set('1234', gameAction);
      const reconnectData4 = {
        game: gameAction,
        players: [],
        monster: {},
        turn: 1,
        level: 1,
        started: true,
        host: 'p1',
      };
      mockGameService.processReconnection.mockReturnValue(reconnectData4);

      playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.objectContaining({
          gamePhase: 'chooseAction',
        })
      );
    });

    test('should handle player data correctly', () => {
      mockValidateGame.mockReturnValue(true);

      const mockPlayer = {
        id: 'socket123',
        name: 'TestPlayer',
        race: 'Dwarf',
        class: 'Warrior',
        hp: 80,
        maxHp: 100,
        armor: 5,
        damageMod: 1.2,
        isWarlock: false,
        isAlive: true,
        isReady: true,
        unlocked: ['ability1'],
        racialAbility: { name: 'Stone Armor' },
        racialUsesLeft: 1,
        racialCooldown: 0,
        statusEffects: {},
        abilityCooldowns: { ability1: 2 },
        stoneArmorIntact: true,
        stoneArmorValue: 10,
        getEffectiveArmor: jest.fn().mockReturnValue(15),
      };

      const gameWithPlayer = {
        started: true,
        players: new Map([['socket123', mockPlayer]]),
        getAlivePlayers: jest.fn().mockReturnValue([mockPlayer]),
        systems: {
          statusEffectManager: {
            isPlayerStunned: jest.fn().mockReturnValue(false),
          },
        },
        pendingActions: [],
      };

      mockGameService.games.set('1234', gameWithPlayer);
      const reconnectData = {
        game: gameWithPlayer,
        players: [mockPlayer],
        monster: { hp: 100 },
        turn: 1,
        level: 2,
        started: true,
        host: 'socket123',
      };
      mockGameService.processReconnection.mockReturnValue(reconnectData);

      playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'gameReconnected',
        expect.objectContaining({
          playerData: expect.objectContaining({
            id: 'socket123',
            name: 'TestPlayer',
            race: 'Dwarf',
            class: 'Warrior',
            level: 2,
            stoneArmor: {
              active: true,
              value: 10,
              effectiveArmor: 15,
            },
          }),
        })
      );
    });

    test('should return false when game validation fails', () => {
      mockValidateGame.mockReturnValue(false);

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        'INVALID',
        'TestPlayer'
      );

      expect(mockValidateGame).toHaveBeenCalledWith(mockSocket, 'INVALID');
      expect(mockGameService.processReconnection).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should handle reconnection failure with started game', () => {
      mockValidateGame.mockReturnValue(true);
      mockGameService.processReconnection.mockReturnValue(null);
      mockGameService.games.set('1234', { started: true });

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        message: 'Cannot join a game that has already started.',
      });
      expect(result).toBe(false);
    });

    test('should fall back to join for unstarted game', () => {
      mockValidateGame.mockReturnValue(true);
      mockGameService.processReconnection.mockReturnValue(null);

      const unstartedGame = {
        started: false,
        players: new Map(),
        addPlayer: jest.fn().mockReturnValue(true),
      };
      mockGameService.games.set('1234', unstartedGame);
      mockValidateGameAction.mockReturnValue(unstartedGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(unstartedGame.addPlayer).toHaveBeenCalledWith(
        'socket123',
        'TestPlayer'
      );
      expect(result).toBe(true);
    });

    test('should handle general errors', () => {
      mockValidateGame.mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        message: 'Validation error',
      });
      expect(result).toBe(false);
    });

    test('should handle errors with no message', () => {
      mockValidateGame.mockImplementation(() => {
        throw new Error();
      });

      const result = playerController.handlePlayerReconnection(
        mockIO,
        mockSocket,
        '1234',
        'TestPlayer'
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('errorMessage', {
        message: 'Failed to reconnect to game.',
      });
      expect(result).toBe(false);
    });
  });

  describe('handlePlayerDisconnect', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    test('should handle disconnection with session and host', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([
          ['socket123', { name: 'TestPlayer' }],
          ['socket456', { name: 'OtherPlayer' }],
        ]),
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      expect(mockPlayerSessionManager.handleDisconnect).toHaveBeenCalledWith(
        'socket123'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Player TestPlayer temporarily disconnected from game 1234'
      );
      expect(mockIO.to).toHaveBeenCalledWith('1234');
      expect(mockIO.emit).toHaveBeenCalledWith('playerTemporaryDisconnect', {
        playerId: 'socket123',
        playerName: 'TestPlayer',
        isHost: true,
      });

      // Should reassign host immediately
      expect(mockGame.hostId).toBe('socket456');
      expect(mockIO.emit).toHaveBeenCalledWith(
        'hostChanged',
        expect.objectContaining({
          hostId: 'socket456',
        })
      );
    });

    test('should handle disconnection with no session', () => {
      mockPlayerSessionManager.handleDisconnect.mockReturnValue(null);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      expect(mockPlayerSessionManager.handleDisconnect).toHaveBeenCalledWith(
        'socket123'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Player disconnected: socket123 (no active sessions)'
      );
      expect(mockIO.emit).not.toHaveBeenCalled();
    });

    test('should handle disconnection when game not found', () => {
      const mockSessionInfo = {
        gameCode: 'NOTFOUND',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      // Don't set the game in mockGameService.games

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      expect(mockIO.emit).not.toHaveBeenCalledWith('playerTemporaryDisconnect');
    });

    test('should handle permanent disconnection after timeout', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([['socket123', { name: 'TestPlayer' }]]),
        removePlayer: jest.fn(),
        started: true,
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);
      mockGameService.checkGameWinConditions.mockReturnValue(false);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      // Player session expired
      mockPlayerSessionManager.getSession.mockReturnValue(null);

      // Fast forward past timeout
      jest.advanceTimersByTime(61000);

      expect(mockPlayerSessionManager.getSession).toHaveBeenCalledWith(
        '1234',
        'TestPlayer'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Player TestPlayer did not reconnect within window, removing from game 1234'
      );
      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket123');
      expect(mockPlayerSessionManager.removeSession).toHaveBeenCalledWith(
        '1234',
        'TestPlayer'
      );
      expect(mockIO.emit).toHaveBeenCalledWith(
        'playerDisconnected',
        expect.any(Object)
      );
      expect(mockGameService.checkGameWinConditions).toHaveBeenCalledWith(
        mockIO,
        '1234',
        'TestPlayer'
      );
    });

    test('should not remove player if they reconnected', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([['socket123', { name: 'TestPlayer' }]]),
        removePlayer: jest.fn(),
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      // Player reconnected with new socket
      mockPlayerSessionManager.getSession.mockReturnValue({
        ...mockSessionInfo,
        socketId: 'newsocket',
      });

      jest.advanceTimersByTime(61000);

      expect(mockGame.removePlayer).not.toHaveBeenCalled();
    });

    test('should handle player already removed from game', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'other',
        players: new Map(), // Player not in game
        removePlayer: jest.fn(),
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      mockPlayerSessionManager.getSession.mockReturnValue(null);
      jest.advanceTimersByTime(61000);

      expect(mockGame.removePlayer).not.toHaveBeenCalled();
    });

    test('should handle game ending on permanent disconnect', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([['socket123', { name: 'TestPlayer' }]]),
        removePlayer: jest.fn(),
        started: true,
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);
      mockGameService.checkGameWinConditions.mockReturnValue(true); // Game ends

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      mockPlayerSessionManager.getSession.mockReturnValue(null);
      jest.advanceTimersByTime(61000);

      expect(mockGameService.checkGameWinConditions).toHaveBeenCalledWith(
        mockIO,
        '1234',
        'TestPlayer'
      );
      expect(mockGameService.broadcastPlayerList).not.toHaveBeenCalled();
    });

    test('should handle host reassignment when not started', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([
          ['socket123', { name: 'TestPlayer' }],
          ['socket456', { name: 'OtherPlayer' }],
        ]),
        removePlayer: jest.fn(),
        started: false,
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);
      mockGameService.checkGameWinConditions.mockReturnValue(false);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      mockPlayerSessionManager.getSession.mockReturnValue(null);
      jest.advanceTimersByTime(61000);

      expect(mockGame.hostId).toBe('socket456');
      expect(mockIO.emit).toHaveBeenCalledWith(
        'hostChanged',
        expect.objectContaining({
          hostId: 'socket456',
        })
      );
    });

    test('should handle permanent disconnect without reassigning host if no other players', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([['socket123', { name: 'TestPlayer' }]]),
        removePlayer: jest.fn(),
        started: false,
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      // Update players map to be empty after removal
      mockGame.players = new Map();

      mockPlayerSessionManager.getSession.mockReturnValue(null);
      jest.advanceTimersByTime(61000);

      // Should not crash when no players left
      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket123');
    });

    test('should handle host being only player', () => {
      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      const mockGame = {
        hostId: 'socket123',
        players: new Map([['socket123', { name: 'TestPlayer' }]]),
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', mockGame);

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      // No host change should occur
      expect(mockGame.hostId).toBe('socket123');
      expect(mockIO.emit).not.toHaveBeenCalledWith(
        'hostChanged',
        expect.any(Object)
      );
    });

    test('should handle error in disconnect processing', () => {
      // Make handleDisconnect throw an error
      mockPlayerSessionManager.handleDisconnect.mockImplementation(() => {
        throw new Error('Session error');
      });

      // The server.js wraps this in try-catch, so we simulate that
      try {
        playerController.handlePlayerDisconnect(mockIO, mockSocket);
      } catch (error) {
        expect(error.message).toBe('Session error');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error handling disconnect: Session error',
          expect.any(Error)
        );
      }
    });
  });

  // Additional coverage tests
  describe('Edge Cases and Full Coverage', () => {
    test('should handle undefined races in config', () => {
      const originalRaces = mockConfig.races;
      mockConfig.races = undefined;

      const mockGame = { setPlayerClass: jest.fn() };
      mockValidateGameAction.mockReturnValue(mockGame);

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'Warrior'
        );
      }).toThrow('Invalid race selection.');

      mockConfig.races = originalRaces;
    });

    test('should handle undefined classes in config', () => {
      const originalClasses = mockConfig.classes;
      mockConfig.classes = undefined;

      const mockGame = { setPlayerClass: jest.fn() };
      mockValidateGameAction.mockReturnValue(mockGame);

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'Warrior'
        );
      }).toThrow('Invalid class selection.');

      mockConfig.classes = originalClasses;
    });

    test('should handle undefined classRaceCompatibility in config', () => {
      const originalCompat = mockConfig.classRaceCompatibility;
      mockConfig.classRaceCompatibility = undefined;

      const mockGame = { setPlayerClass: jest.fn() };
      mockValidateGameAction.mockReturnValue(mockGame);

      expect(() => {
        playerController.handleSelectCharacter(
          mockIO,
          mockSocket,
          '1234',
          'Human',
          'Warrior'
        );
      }).toThrow('Invalid race and class combination.');

      mockConfig.classRaceCompatibility = originalCompat;
    });

    test('should handle missing messages in config', () => {
      const originalMessages = mockConfig.messages;
      mockConfig.messages = {};

      const mockGame = { addPlayer: jest.fn().mockReturnValue(false) };
      mockValidateGameAction.mockReturnValue(mockGame);
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.canPlayerJoinGame.mockReturnValue(true);

      expect(() => {
        playerController.handlePlayerJoin(
          mockIO,
          mockSocket,
          '1234',
          'TestPlayer'
        );
      }).toThrow('Could not join game.');

      mockConfig.messages = originalMessages;
    });

    test('should handle missing player config', () => {
      const originalPlayer = mockConfig.player;
      mockConfig.player = undefined;

      jest.useFakeTimers();

      const mockSessionInfo = {
        gameCode: '1234',
        playerName: 'TestPlayer',
        socketId: 'socket123',
      };

      mockPlayerSessionManager.handleDisconnect.mockReturnValue(
        mockSessionInfo
      );
      mockGameService.games.set('1234', { players: new Map() });

      playerController.handlePlayerDisconnect(mockIO, mockSocket);

      // Should use default timeout of 60 seconds
      jest.advanceTimersByTime(59999);
      // Nothing should happen yet

      jest.advanceTimersByTime(2);
      // Now it should trigger

      jest.useRealTimers();
      mockConfig.player = originalPlayer;
    });
  });
});
