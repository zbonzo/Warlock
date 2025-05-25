/**
 * @fileoverview Complete Tests for GameController with 100% Coverage
 */

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('@utils/logger', () => mockLogger);

const logger = require('@utils/logger');
const mockValidatePlayerName = jest.fn();
const mockValidateGameAction = jest.fn();
const mockErrorHandler = {
  throwGameStateError: jest.fn((msg) => {
    throw new Error(msg);
  }),
};
const mockGameService = {
  generateGameCode: jest.fn(),
  createGame: jest.fn(),
  createGameTimeout: jest.fn(),
  broadcastPlayerList: jest.fn(),
  refreshGameTimeout: jest.fn(),
  processGameRound: jest.fn(),
};

const mockConfig = {
  minPlayers: 2,
  messages: {
    errors: {
      notEnoughPlayers: 'Need more players',
      allPlayersNotReady: 'Not all ready',
      adaptabilityFailed: 'No uses left',
      invalidClass: 'Invalid class',
      abilityNotFound: 'Ability missing',
      abilityNotUnlocked: 'Not unlocked',
      racialAbilityUsed: 'Racial used',
      adaptabilityComplete: 'Adapt done',
    },
    success: {
      adaptabilityTriggered: 'Adapt triggered',
      racialAbilityUsed: 'Racial used',
      adaptabilityComplete: 'Adapt done',
    },
    getError: jest.fn((key, vars) => mockConfig.messages.errors[key] || ''),
  },
  gameBalance: {
    calculateMonsterDamage: jest.fn().mockReturnValue(5),
  },
  getClassAbilities: jest.fn(),
  classAbilities: {},
};

jest.mock('@middleware/validation', () => ({
  validatePlayerName: mockValidatePlayerName,
}));
jest.mock('@shared/gameChecks', () => ({
  validateGameAction: mockValidateGameAction,
}));
jest.mock('@utils/errorHandler', () => mockErrorHandler);
jest.mock('@services/gameService', () => mockGameService);
jest.mock('@config', () => mockConfig);

const controller = require('@controllers/GameController');

describe('GameController', () => {
  let io, socket;

  beforeEach(() => {
    io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    socket = { id: 'sock1', emit: jest.fn(), join: jest.fn() };
    jest.clearAllMocks();
  });

  describe('handleCreateGame', () => {
    it('returns false when name invalid', () => {
      mockValidatePlayerName.mockReturnValue(false);
      expect(controller.handleCreateGame(io, socket, '')).toBe(false);
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('returns false when service.createGame fails', () => {
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.generateGameCode.mockReturnValue('C123');
      mockGameService.createGame.mockReturnValue(null);
      expect(controller.handleCreateGame(io, socket, 'Alice')).toBe(false);
    });

    it('creates game, joins room, emits code and player list on success', () => {
      mockValidatePlayerName.mockReturnValue(true);
      mockGameService.generateGameCode.mockReturnValue('C123');
      const fakeGame = { addPlayer: jest.fn() };
      mockGameService.createGame.mockReturnValue(fakeGame);

      const ok = controller.handleCreateGame(io, socket, 'Bob');
      expect(ok).toBe(true);
      expect(fakeGame.addPlayer).toHaveBeenCalledWith('sock1', 'Bob');
      expect(socket.join).toHaveBeenCalledWith('C123');
      expect(socket.emit).toHaveBeenCalledWith('gameCreated', {
        gameCode: 'C123',
      });
      expect(mockGameService.broadcastPlayerList).toHaveBeenCalledWith(
        io,
        'C123'
      );
    });
  });

  describe('handleStartGame', () => {
    it('throws when too few players', () => {
      const game = { players: new Map(), started: false };
      mockValidateGameAction.mockReturnValue(game);
      mockConfig.minPlayers = 3;
      expect(() => {
        controller.handleStartGame(io, socket, 'G1');
      }).toThrow();
      expect(mockErrorHandler.throwGameStateError).toHaveBeenCalled();
    });

    it('throws when not all ready', () => {
      const players = new Map([
        ['p1', { race: 'Elf', class: null }],
        ['p2', { race: 'Human', class: 'Warrior' }],
      ]);
      const game = { players, started: false };
      mockValidateGameAction.mockReturnValue(game);
      mockConfig.minPlayers = 1;
      expect(() => {
        controller.handleStartGame(io, socket, 'G2');
      }).toThrow('Not all ready');
    });

    it('returns false (no-throw) when too few players', () => {
      // players.size < minPlayers
      const game = { players: new Map() };
      mockValidateGameAction.mockReturnValue(game);

      // stub out throwGameStateError so it doesn’t throw
      mockErrorHandler.throwGameStateError.mockImplementationOnce(() => {});

      const result = controller.handleStartGame(io, socket, 'G1');
      expect(mockErrorHandler.throwGameStateError).toHaveBeenCalledWith(
        mockConfig.messages.getError('notEnoughPlayers', {
          minPlayers: mockConfig.minPlayers,
        })
      );
      expect(result).toBe(false); // covers the unreachable return false at line 63
    });

    it('returns false (no-throw) when not all players ready', () => {
      // players present but one hasn’t selected character
      const players = new Map([['p1', { race: 'Elf', class: null }]]);
      const game = { players };
      mockValidateGameAction.mockReturnValue(game);

      mockErrorHandler.throwGameStateError.mockImplementationOnce(() => {});

      const result = controller.handleStartGame(io, socket, 'G2');
      expect(mockErrorHandler.throwGameStateError).toHaveBeenCalledWith(
        mockConfig.messages.errors.allPlayersNotReady
      );
      expect(result).toBe(false); // covers the unreachable return false at line 70
    });

    it('starts game and emits gameStarted on success', () => {
      const players = new Map([['p1', { race: 'Elf', class: 'Druid' }]]);
      const monster = { hp: 10, maxHp: 20, age: 2 };
      const game = {
        players,
        started: false,
        monster,
        round: 0,
        assignInitialWarlock: jest.fn(),
        getPlayersInfo: jest.fn().mockReturnValue([{ id: 'p1' }]),
      };
      mockValidateGameAction.mockReturnValue(game);
      mockConfig.minPlayers = 1;

      const ok = controller.handleStartGame(io, socket, 'G3');
      expect(ok).toBe(true);
      expect(game.started).toBe(true);
      expect(game.round).toBe(1);
      expect(game.assignInitialWarlock).toHaveBeenCalled();
      expect(io.to).toHaveBeenCalledWith('G3');
      expect(io.emit).toHaveBeenCalledWith(
        'gameStarted',
        expect.objectContaining({
          players: [{ id: 'p1' }],
          turn: 1,
          monster: expect.objectContaining({
            hp: 10,
            maxHp: 20,
            nextDamage: 5,
          }),
        })
      );
    });
  });

  describe('handlePerformAction', () => {
    it('returns false if addAction fails', () => {
      const game = { addAction: jest.fn().mockReturnValue(false) };
      mockValidateGameAction.mockReturnValue(game);
      expect(
        controller.handlePerformAction(io, socket, 'G', 'attack', 't1')
      ).toBe(false);
    });

    it('returns true and does not process round when not all submitted', () => {
      const game = {
        addAction: jest.fn().mockReturnValue(true),
        allActionsSubmitted: jest.fn().mockReturnValue(false),
      };
      mockValidateGameAction.mockReturnValue(game);
      expect(
        controller.handlePerformAction(io, socket, 'G', 'attack', 't1')
      ).toBe(true);
      expect(mockGameService.processGameRound).not.toHaveBeenCalled();
    });

    it('returns true and processes round when all submitted', () => {
      const game = {
        addAction: jest.fn().mockReturnValue(true),
        allActionsSubmitted: jest.fn().mockReturnValue(true),
      };
      mockValidateGameAction.mockReturnValue(game);
      expect(
        controller.handlePerformAction(io, socket, 'G', 'attack', 't1')
      ).toBe(true);
      expect(mockGameService.processGameRound).toHaveBeenCalledWith(io, 'G');
    });
  });

  describe('handleRacialAbility', () => {
    it('handles non-human path', () => {
      const player = { race: 'Orc' };
      const game = {
        players: new Map([['sock1', player]]),
        addRacialAction: jest.fn().mockReturnValue(true),
        getPlayersInfo: jest
          .fn()
          .mockReturnValue([{ id: 'sock1', race: 'Orc' }]),
      };
      mockValidateGameAction.mockReturnValue(game);

      expect(
        controller.handleRacialAbility(io, socket, 'G', 't1', 'some')
      ).toBe(true);
      expect(io.to).toHaveBeenCalledWith('G');
      expect(socket.emit).toHaveBeenCalledWith(
        'racialAbilityUsed',
        expect.objectContaining({ success: true })
      );
    });

    it('handles human with no uses left', () => {
      const player = { race: 'Human', racialUsesLeft: 0 };
      const game = {
        players: new Map([['sock1', player]]),
        addRacialAction: jest.fn(),
      };
      mockValidateGameAction.mockReturnValue(game);
      const ok = controller.handleRacialAbility(
        io,
        socket,
        'G',
        't1',
        'adaptability'
      );
      expect(ok).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith(
        'racialAbilityUsed',
        expect.objectContaining({ success: false })
      );
    });

    it('handles human adaptability with array conversion and success', () => {
      const abilityList = [{ type: 'a', unlockAt: 2 }];
      const player = {
        race: 'Human',
        racialUsesLeft: 1,
        abilities: abilityList,
        level: 2,
      };
      const game = {
        players: new Map([['sock1', player]]),
        addRacialAction: jest.fn().mockReturnValue(true),
        getPlayersInfo: jest.fn().mockReturnValue([]),
      };
      mockValidateGameAction.mockReturnValue(game);
      mockConfig.messages.success.adaptabilityTriggered = 'OK';
      mockConfig.messages.success.racialAbilityUsed = 'Done';
      mockConfig.messages.errors.racialAbilityUsed = 'Fail';
      const ok = controller.handleRacialAbility(
        io,
        socket,
        'G',
        't1',
        'adaptability'
      );
      expect(ok).toBe(true);
      expect(socket.emit).toHaveBeenCalledWith(
        'adaptabilityChooseAbility',
        expect.any(Object)
      );
      expect(io.to).toHaveBeenCalledWith('G');
      expect(socket.emit).toHaveBeenCalledWith(
        'racialAbilityUsed',
        expect.objectContaining({ success: true })
      );
    });

    it('warns and emits failure when Human adaptability action itself fails', () => {
      // human with uses left but game.addRacialAction returns false
      const player = {
        name: 'Alice',
        race: 'Human',
        racialUsesLeft: 1,
        abilities: [],
        level: 1,
      };
      const game = {
        players: new Map([['sock1', player]]),
        addRacialAction: jest.fn().mockReturnValue(false),
      };
      mockValidateGameAction.mockReturnValue(game);

      const ok = controller.handleRacialAbility(
        io,
        socket,
        'G',
        'target',
        'adaptability'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to use Adaptability for player ${player.name}`
      ); // hits line 201–202
      expect(socket.emit).toHaveBeenCalledWith('racialAbilityUsed', {
        success: false,
        message: mockConfig.messages.errors.adaptabilityFailed,
      }); // covers the else branch
      expect(ok).toBe(false);
    });

    it('emits failure when non-adaptability racial ability fails', () => {
      // non-human or non-adaptability path, game.addRacialAction false
      const player = { race: 'Orc' };
      const game = {
        players: new Map([['sock1', player]]),
        addRacialAction: jest.fn().mockReturnValue(false),
        getPlayersInfo: jest.fn(), // stubbed to avoid missing-method errors
      };
      mockValidateGameAction.mockReturnValue(game);

      const ok = controller.handleRacialAbility(
        io,
        socket,
        'G',
        'target',
        'someOther'
      );
      expect(socket.emit).toHaveBeenCalledWith('racialAbilityUsed', {
        success: false,
        message: mockConfig.messages.errors.racialAbilityUsed,
      }); // hits line 222
      expect(ok).toBe(false);
    });

    it('logs level and converts abilities when Human adaptability succeeds', () => {
      // arrange a Human with an array of abilities
      const player = {
        name: 'Zac',
        race: 'Human',
        racialUsesLeft: 1,
        abilities: [{ type: 'fireball', unlockAt: 3 }],
        level: 5,
      };
      const fakeGame = {
        players: new Map([['sock1', player]]),
        addRacialAction: jest.fn().mockReturnValue(true),
        getPlayersInfo: jest.fn().mockReturnValue([{ id: 'sock1' }]),
      };
      mockValidateGameAction.mockReturnValue(fakeGame);

      // act
      const ok = controller.handleRacialAbility(
        io,
        socket,
        'ROOM',
        'TGT',
        'adaptability'
      );

      // assert
      expect(ok).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Level: 5')
      );
      // conversion branch debug
      expect(logger.debug).toHaveBeenCalledWith(
        'Converting abilities array to object by level...'
      );
      // adaptability modal emit
      expect(socket.emit).toHaveBeenCalledWith(
        'adaptabilityChooseAbility',
        expect.objectContaining({ maxLevel: 5, abilities: expect.any(Object) })
      );
    });
  });

  describe('handleAdaptabilityReplace', () => {
    it('fails when player missing or not human', () => {
      const game = { players: new Map() };
      mockValidateGameAction.mockReturnValue(game);
      expect(
        controller.handleAdaptabilityReplace(
          io,
          socket,
          'G',
          'old',
          'new',
          1,
          'C'
        )
      ).toBe(false);
    });

    it('fails when old ability not found', () => {
      const player = { race: 'Human', abilities: [], unlocked: [] };
      const game = { players: new Map([['sock1', player]]) };
      mockValidateGameAction.mockReturnValue(game);
      expect(
        controller.handleAdaptabilityReplace(
          io,
          socket,
          'G',
          'old',
          'new',
          1,
          'C'
        )
      ).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith(
        'adaptabilityComplete',
        expect.objectContaining({ success: false })
      );
    });

    it('fails when class not in config', () => {
      const player = {
        race: 'Human',
        abilities: [{ type: 'old' }],
        unlocked: [{ type: 'old' }],
      };
      const game = { players: new Map([['sock1', player]]) };
      mockValidateGameAction.mockReturnValue(game);
      delete mockConfig.classAbilities['C'];
      expect(
        controller.handleAdaptabilityReplace(
          io,
          socket,
          'G',
          'old',
          'new',
          1,
          'C'
        )
      ).toBe(false);
    });

    it('fails when new ability not unlocked', () => {
      mockConfig.classAbilities['C'] = [{ type: 'x', unlockAt: 1 }];
      const player = {
        race: 'Human',
        abilities: [{ type: 'old' }],
        unlocked: [{ type: 'old' }],
      };
      const game = { players: new Map([['sock1', player]]) };
      mockValidateGameAction.mockReturnValue(game);
      expect(
        controller.handleAdaptabilityReplace(
          io,
          socket,
          'G',
          'old',
          'new',
          2,
          'C'
        )
      ).toBe(false);
    });

    it('replaces ability and emits success', () => {
      const template = { type: 'new', unlockAt: 1 };
      mockConfig.classAbilities['C'] = [template];
      const player = {
        race: 'Human',
        abilities: [{ type: 'old', unlockAt: 0 }],
        unlocked: [{ type: 'old' }],
      };
      const game = {
        players: new Map([['sock1', player]]),
        getPlayersInfo: jest
          .fn()
          .mockReturnValue([{ id: 'sock1', race: 'Human' }]),
      };
      mockValidateGameAction.mockReturnValue(game);

      const ok = controller.handleAdaptabilityReplace(
        io,
        socket,
        'G',
        'old',
        'new',
        '1',
        'C'
      );
      expect(ok).toBe(true);
      expect(socket.emit).toHaveBeenCalledWith(
        'adaptabilityComplete',
        expect.objectContaining({ success: true })
      );
      expect(io.to).toHaveBeenCalledWith('G');
    });
    it('replaces the old ability in player.unlocked when adaptabilityReplace succeeds', () => {
      // arrange a class C that has our new ability
      const newTpl = { type: 'iceblast', unlockAt: 2 };
      mockConfig.classAbilities['C'] = [newTpl];

      // player starts with old ability in both arrays
      const player = {
        name: 'Zac',
        race: 'Human',
        abilities: [{ type: 'old', unlockAt: 1 }],
        unlocked: [{ type: 'old' }],
      };
      const fakeGame = {
        players: new Map([['sock1', player]]),
        getPlayersInfo: jest.fn().mockReturnValue([{ id: 'sock1' }]),
      };
      mockValidateGameAction.mockReturnValue(fakeGame);

      // act
      const ok = controller.handleAdaptabilityReplace(
        io,
        socket,
        'ROOM',
        'old',
        'iceblast',
        '2',
        'C'
      );

      // assert
      expect(ok).toBe(true);
      expect(player.unlocked[0].type).toBe('iceblast');
    });
  });

  describe('handleGetClassAbilities', () => {
    it('emits abilities on success', () => {
      const abilities = [{ type: 'a', unlockAt: 1 }];
      mockConfig.getClassAbilities.mockReturnValue(abilities);
      const game = {};
      mockValidateGameAction.mockReturnValue(game);
      const ok = controller.handleGetClassAbilities(io, socket, 'G', 'C', '1');
      expect(ok).toBe(true);
      expect(socket.emit).toHaveBeenCalledWith(
        'classAbilitiesResponse',
        expect.objectContaining({
          success: true,
          abilities,
          className: 'C',
          level: '1',
        })
      );
    });

    it('emits error on exception', () => {
      mockConfig.getClassAbilities.mockImplementation(() => {
        throw new Error('boom');
      });
      const ok = controller.handleGetClassAbilities(io, socket, 'G', 'C', '1');
      expect(ok).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith(
        'classAbilitiesResponse',
        expect.objectContaining({
          success: false,
          error: 'boom',
        })
      );
    });
  });

  describe('handlePlayerNextReady', () => {
    it('initializes nextReady and returns true', () => {
      const alive = [{ id: 'sock1' }, { id: 'sock2' }];
      const game = {
        getAlivePlayers: jest.fn().mockReturnValue(alive),
        nextReady: null,
      };
      mockValidateGameAction.mockReturnValue(game);
      const ok = controller.handlePlayerNextReady(io, socket, 'G');
      expect(ok).toBe(true);
      expect(game.nextReady.has('sock1')).toBe(true);
      expect(io.to).toHaveBeenCalledWith('G');
      expect(io.emit).toHaveBeenCalledWith(
        'readyPlayersUpdate',
        expect.any(Object)
      );
    });

    it('returns false if called twice by same player', () => {
      const alive = [{ id: 'sock1' }];
      const readySet = new Set(['sock1']);
      const game = {
        getAlivePlayers: jest.fn().mockReturnValue(alive),
        nextReady: readySet,
      };
      mockValidateGameAction.mockReturnValue(game);
      const ok = controller.handlePlayerNextReady(io, socket, 'G');
      expect(ok).toBe(false);
    });

    it('resumes game when majority ready', () => {
      const alive = [{ id: 'sock1' }, { id: 'sock2' }, { id: 'sock3' }];
      const game = {
        getAlivePlayers: jest.fn().mockReturnValue(alive),
        nextReady: new Set(['sock2']),
      };
      mockValidateGameAction.mockReturnValue(game);
      // first call adds sock1
      controller.handlePlayerNextReady(io, socket, 'G');
      // now 2 of 3 ready, majority
      expect(io.emit).toHaveBeenCalledWith('resumeGame');
      expect(game.nextReady.size).toBe(0);
    });

    it('returns false on validation error', () => {
      mockValidateGameAction.mockImplementation(() => {
        throw new Error('bad');
      });
      expect(controller.handlePlayerNextReady(io, socket, 'G')).toBe(false);
    });
  });
});
