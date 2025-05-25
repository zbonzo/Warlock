/**
 * @fileoverview Tests for WarlockSystem
 */

const WarlockSystem = require('@models/systems/WarlockSystem');
const Player = require('@models/Player');

// Mock the config
jest.mock('@config', () => ({
  gameBalance: {
    warlock: {
      conversion: {
        baseChance: 0.2,
        maxChance: 0.5,
        scalingFactor: 0.3,
        randomModifier: 0.5,
      },
      winConditions: {
        allWarlocksGone: 'Good',
        allPlayersWarlocks: 'Evil',
        majorityThreshold: 0.5,
      },
    },
  },
  messages: {
    getEvent: jest.fn((key, data) => `Mock event: ${key}`),
    getMessage: jest.fn((category, key, data) => `Mock message: ${key}`),
  },
}));

describe('WarlockSystem', () => {
  let warlockSystem;
  let players;
  let mockGameStateUtils;

  beforeEach(() => {
    players = new Map();

    mockGameStateUtils = {
      getAlivePlayers: jest.fn(),
    };

    warlockSystem = new WarlockSystem(players, mockGameStateUtils);

    // Reset Math.random mock before each test
    jest.spyOn(Math, 'random').mockRestore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct values', () => {
      expect(warlockSystem.players).toBe(players);
      expect(warlockSystem.gameStateUtils).toBe(mockGameStateUtils);
      expect(warlockSystem.numWarlocks).toBe(0);
    });
  });

  describe('Warlock Count Management', () => {
    test('should increment warlock count', () => {
      warlockSystem.incrementWarlockCount();
      expect(warlockSystem.getWarlockCount()).toBe(1);

      warlockSystem.incrementWarlockCount();
      expect(warlockSystem.getWarlockCount()).toBe(2);
    });

    test('should decrement warlock count', () => {
      warlockSystem.numWarlocks = 3;

      const newCount = warlockSystem.decrementWarlockCount();
      expect(newCount).toBe(2);
      expect(warlockSystem.getWarlockCount()).toBe(2);
    });

    test('should not decrement below zero', () => {
      expect(warlockSystem.getWarlockCount()).toBe(0);

      const newCount = warlockSystem.decrementWarlockCount();
      expect(newCount).toBe(0);
      expect(warlockSystem.getWarlockCount()).toBe(0);
    });
  });

  describe('Initial Warlock Assignment', () => {
    beforeEach(() => {
      // Add some test players
      players.set('player1', new Player('player1', 'Player1'));
      players.set('player2', new Player('player2', 'Player2'));
      players.set('player3', new Player('player3', 'Player3'));
    });

    test('should assign preferred player as warlock', () => {
      const warlock = warlockSystem.assignInitialWarlock('player2');

      expect(warlock).toBeTruthy();
      expect(warlock.id).toBe('player2');
      expect(warlock.isWarlock).toBe(true);
      expect(warlockSystem.getWarlockCount()).toBe(1);
    });

    test('should assign random player when no preference', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Should pick middle player

      const warlock = warlockSystem.assignInitialWarlock();

      expect(warlock).toBeTruthy();
      expect(warlock.isWarlock).toBe(true);
      expect(warlockSystem.getWarlockCount()).toBe(1);
    });

    test('should assign random player when preferred player not found', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Should pick first player

      const warlock = warlockSystem.assignInitialWarlock('nonexistent');

      expect(warlock).toBeTruthy();
      expect(warlock.id).toBe('player1');
      expect(warlock.isWarlock).toBe(true);
    });

    test('should return null when no players exist', () => {
      players.clear();

      const warlock = warlockSystem.assignInitialWarlock();

      expect(warlock).toBe(null);
      expect(warlockSystem.getWarlockCount()).toBe(0);
    });
  });

  describe('Warlock Queries', () => {
    beforeEach(() => {
      const player1 = new Player('player1', 'Player1');
      const player2 = new Player('player2', 'Player2');
      const player3 = new Player('player3', 'Player3');

      player1.isWarlock = true;
      player1.isAlive = true;
      player2.isWarlock = false;
      player2.isAlive = true;
      player3.isWarlock = true;
      player3.isAlive = false; // Dead warlock

      players.set('player1', player1);
      players.set('player2', player2);
      players.set('player3', player3);

      warlockSystem.numWarlocks = 2; // Manually set count
    });

    test('should check if player is warlock', () => {
      expect(warlockSystem.isPlayerWarlock('player1')).toBe(true);
      expect(warlockSystem.isPlayerWarlock('player2')).toBe(false);
      expect(warlockSystem.isPlayerWarlock('nonexistent')).toBe(false);
    });

    test('should count alive warlocks correctly', () => {
      mockGameStateUtils.getAlivePlayers.mockReturnValue([
        players.get('player1'),
        players.get('player2'),
      ]);

      const count = warlockSystem.countAliveWarlocks();
      expect(count).toBe(1); // Only player1 is alive and warlock
    });

    test('should get all warlocks', () => {
      const allWarlocks = warlockSystem.getWarlocks();
      expect(allWarlocks).toHaveLength(2);
      expect(allWarlocks.map((w) => w.id)).toEqual(['player1', 'player3']);
    });

    test('should get only alive warlocks', () => {
      const aliveWarlocks = warlockSystem.getWarlocks(true);
      expect(aliveWarlocks).toHaveLength(1);
      expect(aliveWarlocks[0].id).toBe('player1');
    });
  });

  describe('Warlock Conversion', () => {
    let actor;
    let target;
    let log;

    beforeEach(() => {
      actor = new Player('warlock1', 'WarlockPlayer');
      actor.isWarlock = true;

      target = new Player('target1', 'TargetPlayer');
      target.isWarlock = false;
      target.isAlive = true;

      players.set('warlock1', actor);
      players.set('target1', target);

      log = [];

      // Mock alive players for conversion chance calculation
      mockGameStateUtils.getAlivePlayers.mockReturnValue([actor, target]);
    });

    test('should attempt conversion with successful result', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Below conversion threshold

      const result = warlockSystem.attemptConversion(actor, target, log);

      expect(result).toBe(true);
      expect(target.isWarlock).toBe(true);
      expect(warlockSystem.getWarlockCount()).toBe(1); // Incremented from 0
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('corruption');
    });

    test('should attempt conversion with failed result', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Above conversion threshold

      const result = warlockSystem.attemptConversion(actor, target, log);

      expect(result).toBe(false);
      expect(target.isWarlock).toBe(false);
      expect(warlockSystem.getWarlockCount()).toBe(0);
      expect(log).toHaveLength(0);
    });

    test('should not convert actor that is not a warlock', () => {
      actor.isWarlock = false;

      const result = warlockSystem.attemptConversion(actor, target, log);

      expect(result).toBe(false);
      expect(target.isWarlock).toBe(false);
    });

    test('should not convert dead targets', () => {
      target.isAlive = false;

      const result = warlockSystem.attemptConversion(actor, target, log);

      expect(result).toBe(false);
      expect(target.isWarlock).toBe(false);
    });

    test('should not convert targets that are already warlocks', () => {
      target.isWarlock = true;

      const result = warlockSystem.attemptConversion(actor, target, log);

      expect(result).toBe(false);
    });

    test('should apply rate modifier correctly', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.15); // Would succeed at 1.0x, fail at 0.5x

      const result = warlockSystem.attemptConversion(actor, target, log, 0.5);

      expect(result).toBe(false);
      expect(target.isWarlock).toBe(false);
    });

    test('should handle null target (random conversion)', () => {
      const target2 = new Player('target2', 'Target2');
      target2.isAlive = true;
      target2.isWarlock = false;
      players.set('target2', target2);

      mockGameStateUtils.getAlivePlayers.mockReturnValue([
        actor,
        target,
        target2,
      ]);
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.5) // Random target selection
        .mockReturnValueOnce(0.05); // Conversion success

      const result = warlockSystem.attemptConversion(actor, null, log, 1.0);

      expect(result).toBe(true);
      // One of the targets should be converted
      expect(target.isWarlock || target2.isWarlock).toBe(true);
    });
  });

  describe('Force Conversion', () => {
    let target;
    let log;

    beforeEach(() => {
      target = new Player('target1', 'TargetPlayer');
      target.isAlive = true;
      target.isWarlock = false;

      players.set('target1', target);
      log = [];
    });

    test('should force convert player successfully', () => {
      const result = warlockSystem.forceConvertPlayer(
        'target1',
        log,
        'test reason'
      );

      expect(result).toBe(true);
      expect(target.isWarlock).toBe(true);
      expect(warlockSystem.getWarlockCount()).toBe(1);
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('test reason');
    });

    test('should not force convert non-existent player', () => {
      const result = warlockSystem.forceConvertPlayer(
        'nonexistent',
        log,
        'test'
      );

      expect(result).toBe(false);
      expect(log).toHaveLength(0);
    });

    test('should not force convert dead player', () => {
      target.isAlive = false;

      const result = warlockSystem.forceConvertPlayer('target1', log, 'test');

      expect(result).toBe(false);
      expect(target.isWarlock).toBe(false);
    });

    test('should not force convert existing warlock', () => {
      target.isWarlock = true;

      const result = warlockSystem.forceConvertPlayer('target1', log, 'test');

      expect(result).toBe(false);
      expect(warlockSystem.getWarlockCount()).toBe(0); // No increment
    });
  });

  describe('Win Condition Checks', () => {
    beforeEach(() => {
      const player1 = new Player('player1', 'Player1');
      const player2 = new Player('player2', 'Player2');
      const player3 = new Player('player3', 'Player3');

      player1.isAlive = true;
      player2.isAlive = true;
      player3.isAlive = true;

      players.set('player1', player1);
      players.set('player2', player2);
      players.set('player3', player3);
    });

    test('should determine warlocks are winning when majority', () => {
      mockGameStateUtils.getAlivePlayers.mockReturnValue([
        players.get('player1'),
        players.get('player2'),
        players.get('player3'),
      ]);

      const player1 = players.get('player1');
      const player2 = players.get('player2');
      player1.isWarlock = true;
      player2.isWarlock = true;
      // 2 out of 3 = 66% > 50% threshold

      const winning = warlockSystem.areWarlocksWinning();
      expect(winning).toBe(true);
    });

    test('should determine warlocks are not winning when minority', () => {
      mockGameStateUtils.getAlivePlayers.mockReturnValue([
        players.get('player1'),
        players.get('player2'),
        players.get('player3'),
      ]);

      const player1 = players.get('player1');
      player1.isWarlock = true;
      // 1 out of 3 = 33% < 50% threshold

      const winning = warlockSystem.areWarlocksWinning();
      expect(winning).toBe(false);
    });

    test('should handle edge case of exactly 50% warlocks', () => {
      // Remove one player to have exactly 2 players
      players.delete('player3');

      mockGameStateUtils.getAlivePlayers.mockReturnValue([
        players.get('player1'),
        players.get('player2'),
      ]);

      const player1 = players.get('player1');
      player1.isWarlock = true;
      // 1 out of 2 = 50% = 50% threshold (not greater)

      const winning = warlockSystem.areWarlocksWinning();
      expect(winning).toBe(false);
    });
  });
});
