/**
 * @fileoverview Tests for MonsterController
 */

const MonsterController = require('@controllers/MonsterController');
const Player = require('@models/Player');

// Mock config
jest.mock('@config', () => ({
  gameBalance: {
    monster: {
      baseHp: 100,
      baseDamage: 10,
      baseAge: 0,
      targeting: {
        preferLowestHp: true,
        canAttackInvisible: false,
        fallbackToHighestHp: true,
      },
      damageScaling: {
        ageMultiplier: 1,
      },
    },
    calculateMonsterDamage: jest.fn((age) => 10 * (age + 1)),
  },
  messages: {
    getEvent: jest.fn((key, data) => `Event: ${key}`),
    events: {
      monsterNoTarget: 'Monster has no targets',
      monsterSwipesAtShadows: 'Monster swipes at shadows',
      monsterAttacks: 'Monster attacks!',
    },
  },
}));

describe('MonsterController', () => {
  let monsterController;
  let monster;
  let players;
  let mockCombatSystem;
  let mockGameStateUtils;

  beforeEach(() => {
    monster = {
      hp: 100,
      maxHp: 100,
      baseDmg: 10,
      age: 0,
    };

    players = new Map();

    mockCombatSystem = {
      applyDamageToPlayer: jest.fn(),
    };

    mockGameStateUtils = {
      getLowestHpPlayer: jest.fn(),
      getHighestHpPlayer: jest.fn(),
    };

    monsterController = new MonsterController(
      monster,
      players,
      null, // statusEffectManager
      null, // racialAbilitySystem
      mockGameStateUtils
    );
  });

  describe('Monster State', () => {
    test('should get current state correctly', () => {
      const state = monsterController.getState();

      expect(state).toEqual({
        hp: 100,
        maxHp: 100,
        nextDamage: 10, // age 0 + 1 = 1, * 10 = 10
        age: 0,
      });
    });

    test('should check if monster is dead', () => {
      expect(monsterController.isDead()).toBe(false);

      monster.hp = 0;
      expect(monsterController.isDead()).toBe(true);
    });

    test('should age monster correctly', () => {
      monsterController.ageMonster();

      expect(monster.age).toBe(1);

      const state = monsterController.getState();
      expect(state.nextDamage).toBe(20); // age 1 + 1 = 2, * 10 = 20
    });
  });

  describe('Taking Damage', () => {
    let attacker;
    let log;

    beforeEach(() => {
      attacker = new Player('attacker1', 'TestAttacker');
      log = [];
    });

    test('should take damage correctly', () => {
      const result = monsterController.takeDamage(30, attacker, log);

      expect(result).toBe(true);
      expect(monster.hp).toBe(70);
      expect(log).toHaveLength(2); // Attack message + HP remaining
    });

    test('should handle monster death', () => {
      monster.hp = 20;

      const result = monsterController.takeDamage(30, attacker, log);

      expect(result).toBe(true);
      expect(monster.hp).toBe(0);
      expect(log.some((entry) => entry.includes('defeated'))).toBe(true);
    });

    test('should not take damage when already dead', () => {
      monster.hp = 0;

      const result = monsterController.takeDamage(10, attacker, log);

      expect(result).toBe(false);
      expect(log.some((entry) => entry.includes('already defeated'))).toBe(
        true
      );
    });
  });

  describe('Monster Attacks', () => {
    let player1;
    let player2;
    let log;

    beforeEach(() => {
      player1 = new Player('player1', 'Alice');
      player2 = new Player('player2', 'Bob');

      player1.isAlive = true;
      player1.hp = 30;

      player2.isAlive = true;
      player2.hp = 80;

      players.set('player1', player1);
      players.set('player2', player2);

      log = [];
    });

    test('should attack lowest HP player', () => {
      mockGameStateUtils.getLowestHpPlayer.mockReturnValue(player1);

      const result = monsterController.attack(log, mockCombatSystem);

      expect(result).toBe(player1);
      expect(mockCombatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        player1,
        10,
        { name: 'The Monster' },
        log
      );
      expect(log.some((entry) => entry.includes('Monster attacks'))).toBe(true);
    });

    test('should not attack when dead', () => {
      monster.hp = 0;

      const result = monsterController.attack(log, mockCombatSystem);

      expect(result).toBe(null);
      expect(mockCombatSystem.applyDamageToPlayer).not.toHaveBeenCalled();
    });

    test('should handle no valid targets', () => {
      mockGameStateUtils.getLowestHpPlayer.mockReturnValue(null);

      const result = monsterController.attack(log, mockCombatSystem);

      expect(result).toBe(null);
      expect(log.some((entry) => entry.includes('no targets'))).toBe(true);
    });

    test('should handle invisible target', () => {
      player1.hasStatusEffect = jest.fn().mockReturnValue(true); // Invisible
      mockGameStateUtils.getLowestHpPlayer.mockReturnValue(player1);

      const result = monsterController.attack(log, mockCombatSystem);

      expect(result).toBe(null);
      expect(log.some((entry) => entry.includes('shadows'))).toBe(true);
    });
  });

  describe('Death and Respawn', () => {
    let log;

    beforeEach(() => {
      log = [];
    });

    test('should not respawn when monster is alive', () => {
      const result = monsterController.handleDeathAndRespawn(1, log);

      expect(result.newLevel).toBe(1);
      expect(result.monsterState.hp).toBe(100); // Unchanged
    });

    test('should respawn monster for new level', () => {
      monster.hp = 0; // Dead monster

      const config = require('@config');
      config.gameBalance.calculateMonsterHp = jest.fn().mockReturnValue(150);

      const result = monsterController.handleDeathAndRespawn(1, log);

      expect(result.newLevel).toBe(2);
      expect(result.monsterState.hp).toBe(150);
      expect(result.monsterState.maxHp).toBe(150);
      expect(monster.age).toBe(0); // Reset age
      expect(log.some((entry) => entry.includes('Level up'))).toBe(true);
      expect(log.some((entry) => entry.includes('respawns'))).toBe(true);
    });

    test('should use fallback HP calculation', () => {
      monster.hp = 0;

      const config = require('@config');
      config.gameBalance.calculateMonsterHp = null; // No helper function
      config.gameBalance.monster.hpPerLevel = 50;

      const result = monsterController.handleDeathAndRespawn(2, log);

      expect(result.newLevel).toBe(3);
      // Base 100 + (3-1) * 50 = 200
      expect(result.monsterState.hp).toBe(200);
    });
  });
});
