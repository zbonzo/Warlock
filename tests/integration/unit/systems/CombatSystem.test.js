/**
 * @fileoverview Tests for CombatSystem
 */

const CombatSystem = require('@models/systems/CombatSystem');
const Player = require('@models/Player');

// Mock the config
jest.mock('@config', () => ({
  gameBalance: {
    player: {
      healing: {
        rejectWarlockHealing: true,
        warlockSelfHealOnly: true,
      },
    },
    warlock: {
      conversion: {
        aoeModifier: 0.5,
      },
    },
  },
  messages: {
    getEvent: jest.fn((key, data) => `Mock event: ${key}`),
    getMessage: jest.fn((category, key, data) => `Mock message: ${key}`),
  },
}));

describe('CombatSystem', () => {
  let combatSystem;
  let players;
  let mockMonsterController;
  let mockStatusEffectManager;
  let mockRacialAbilitySystem;
  let mockWarlockSystem;
  let mockGameStateUtils;

  beforeEach(() => {
    players = new Map();

    mockMonsterController = {
      takeDamage: jest.fn().mockReturnValue(true),
      getState: jest.fn().mockReturnValue({ hp: 100, maxHp: 100 }),
      isDead: jest.fn().mockReturnValue(false),
    };

    mockStatusEffectManager = {
      isPlayerStunned: jest.fn().mockReturnValue(false),
    };

    mockRacialAbilitySystem = {};

    mockWarlockSystem = {
      attemptConversion: jest.fn(),
      decrementWarlockCount: jest.fn(),
    };

    mockGameStateUtils = {
      getRandomTarget: jest.fn().mockReturnValue('target1'),
      getAlivePlayers: jest.fn().mockReturnValue([]),
    };

    combatSystem = new CombatSystem(
      players,
      mockMonsterController,
      mockStatusEffectManager,
      mockRacialAbilitySystem,
      mockWarlockSystem,
      mockGameStateUtils
    );
  });

  describe('Constructor', () => {
    test('should initialize with all required dependencies', () => {
      expect(combatSystem.players).toBe(players);
      expect(combatSystem.monsterController).toBe(mockMonsterController);
      expect(combatSystem.statusEffectManager).toBe(mockStatusEffectManager);
      expect(combatSystem.warlockSystem).toBe(mockWarlockSystem);
      expect(combatSystem.gameStateUtils).toBe(mockGameStateUtils);
    });
  });

  describe('Damage Application to Players', () => {
    let player;
    let attacker;
    let log;

    beforeEach(() => {
      player = new Player('target1', 'TestTarget');
      attacker = new Player('attacker1', 'TestAttacker');
      players.set('target1', player);
      players.set('attacker1', attacker);
      log = [];
    });

    test('should apply damage to player correctly', () => {
      player.takeDamage = jest.fn().mockReturnValue(15); // Mock reduced damage

      const result = combatSystem.applyDamageToPlayer(
        player,
        20,
        attacker,
        log
      );

      expect(result).toBe(true);
      expect(player.takeDamage).toHaveBeenCalledWith(20, attacker);
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('damage');
    });

    test('should not damage dead players', () => {
      player.isAlive = false;

      const result = combatSystem.applyDamageToPlayer(
        player,
        20,
        attacker,
        log
      );

      expect(result).toBe(false);
      expect(log).toHaveLength(0);
    });

    test('should handle stone armor degradation', () => {
      player.race = 'Dwarf';
      player.stoneArmorIntact = true;
      player.processStoneArmorDegradation = jest.fn().mockReturnValue({
        degraded: true,
        oldValue: 5,
        newArmorValue: 4,
        destroyed: false,
      });
      player.takeDamage = jest.fn().mockReturnValue(15);

      combatSystem.applyDamageToPlayer(player, 20, attacker, log);

      expect(player.processStoneArmorDegradation).toHaveBeenCalledWith(20);
      expect(log).toHaveLength(2); // Damage + stone armor degradation
      expect(log[1].type).toBe('stone_armor_degradation');
    });

    test('should handle potential death', () => {
      player.hp = 10;
      player.takeDamage = jest.fn().mockReturnValue(15);
      player.takeDamage.mockImplementation(() => {
        player.hp = 0;
        return 15;
      });

      const handlePotentialDeathSpy = jest.spyOn(
        combatSystem,
        'handlePotentialDeath'
      );

      combatSystem.applyDamageToPlayer(player, 20, attacker, log);

      expect(handlePotentialDeathSpy).toHaveBeenCalledWith(
        player,
        attacker,
        log
      );
    });

    test('should check for warlock conversion', () => {
      attacker.isWarlock = true;
      player.takeDamage = jest.fn().mockReturnValue(15);

      combatSystem.applyDamageToPlayer(player, 20, attacker, log);

      expect(mockWarlockSystem.attemptConversion).toHaveBeenCalledWith(
        attacker,
        player,
        log
      );
    });

    test('should handle Keen Senses attack', () => {
      player.takeDamage = jest.fn().mockReturnValue(15);
      const handleKeenSensesSpy = jest.spyOn(
        combatSystem,
        'handleKeenSensesAttack'
      );

      combatSystem.applyDamageToPlayer(player, 20, attacker, log, true);

      expect(handleKeenSensesSpy).toHaveBeenCalledWith(player, attacker, log);
    });
  });

  describe('Damage Application to Monster', () => {
    let attacker;
    let log;

    beforeEach(() => {
      attacker = new Player('attacker1', 'TestAttacker');
      log = [];
    });

    test('should apply damage to monster correctly', () => {
      const result = combatSystem.applyDamageToMonster(30, attacker, log);

      expect(result).toBe(true);
      expect(mockMonsterController.takeDamage).toHaveBeenCalledWith(
        30,
        attacker,
        log
      );
    });
  });

  describe('Counter-attacks', () => {
    let target;
    let attacker;
    let log;

    beforeEach(() => {
      target = new Player('target1', 'TestTarget');
      attacker = new Player('attacker1', 'TestAttacker');
      log = [];
    });

    test('should handle Spirit Guard counter-attack', () => {
      target.classEffects = {
        spiritGuard: {
          turnsLeft: 2,
          counterDamage: 15,
          revealsWarlocks: true,
        },
      };
      attacker.hp = 100;

      combatSystem.handleCounterAttacks(target, attacker, log);

      expect(attacker.hp).toBe(85); // 100 - 15 = 85
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('vengeful spirits strike back');
    });

    test('should reveal warlocks with Spirit Guard', () => {
      target.classEffects = {
        spiritGuard: {
          turnsLeft: 2,
          counterDamage: 15,
          revealsWarlocks: true,
        },
      };
      attacker.isWarlock = true;
      attacker.hp = 100;

      combatSystem.handleCounterAttacks(target, attacker, log);

      expect(log).toHaveLength(3); // Counter damage + warlock revelation + private message
      expect(log[1]).toContain('IS a Warlock');
    });

    test('should handle Sanctuary of Truth counter-attack', () => {
      target.classEffects = {
        sanctuaryOfTruth: {
          turnsLeft: 2,
          counterDamage: 10,
          autoDetect: true,
        },
      };
      attacker.isWarlock = true;
      attacker.hp = 100;

      combatSystem.handleCounterAttacks(target, attacker, log);

      expect(attacker.hp).toBe(90); // 100 - 10 = 90
      expect(log).toHaveLength(3); // Counter damage + revelation + private message
      expect(log[0]).toContain('Sanctuary reveals and punishes');
    });
  });

  describe('Death Processing', () => {
    let player;
    let log;

    beforeEach(() => {
      player = new Player('player1', 'TestPlayer');
      players.set('player1', player);
      log = [];
    });

    test('should process pending deaths', () => {
      player.pendingDeath = true;
      player.deathAttacker = 'TestAttacker';
      player.isAlive = true;

      combatSystem.processPendingDeaths(log);

      expect(player.isAlive).toBe(false);
      expect(player.pendingDeath).toBeUndefined();
      expect(log).toHaveLength(1);
    });

    test('should handle Undying resurrection', () => {
      player.race = 'Skeleton';
      player.racialEffects = {
        resurrect: { resurrectedHp: 1 },
      };
      player.pendingDeath = true;
      player.hp = 0;

      combatSystem.processPendingDeaths(log);

      expect(player.hp).toBe(1);
      expect(player.isAlive).toBe(true);
      expect(player.racialEffects.resurrect).toBeUndefined();
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('resurrected');
    });

    test('should decrement warlock count for dead warlocks', () => {
      player.isWarlock = true;
      player.pendingDeath = true;

      combatSystem.processPendingDeaths(log);

      expect(mockWarlockSystem.decrementWarlockCount).toHaveBeenCalled();
    });
  });

  describe('Area of Effect Combat', () => {
    let source;
    let targets;
    let log;

    beforeEach(() => {
      source = new Player('source1', 'TestSource');
      targets = [
        new Player('target1', 'TestTarget1'),
        new Player('target2', 'TestTarget2'),
        new Player('target3', 'TestTarget3'),
      ];
      targets.forEach((target, index) => {
        target.hp = 100;
        target.isAlive = true;
        players.set(`target${index + 1}`, target);
      });
      source.modifyDamage = jest.fn().mockReturnValue(25);
      log = [];
    });

    test('should apply area damage to multiple targets', () => {
      targets.forEach((target) => {
        target.takeDamage = jest.fn().mockReturnValue(20);
      });

      const affected = combatSystem.applyAreaDamage(source, 20, targets, log);

      expect(affected).toHaveLength(3);
      targets.forEach((target) => {
        expect(target.takeDamage).toHaveBeenCalledWith(25, source);
      });
    });

    test('should exclude self from area damage by default', () => {
      const targetsWithSelf = [...targets, source];
      targets.forEach((target) => {
        target.takeDamage = jest.fn().mockReturnValue(20);
      });
      source.takeDamage = jest.fn();

      const affected = combatSystem.applyAreaDamage(
        source,
        20,
        targetsWithSelf,
        log
      );

      expect(affected).toHaveLength(3);
      expect(source.takeDamage).not.toHaveBeenCalled();
    });

    test('should apply area healing correctly', () => {
      source.getHealingModifier = jest.fn().mockReturnValue(1.5);
      targets.forEach((target) => {
        target.hp = 50;
        target.maxHp = 100;
      });

      const affected = combatSystem.applyAreaHealing(source, 20, targets, log);

      expect(affected).toHaveLength(3);
      targets.forEach((target) => {
        expect(target.hp).toBe(80); // 50 + (20 * 1.5) = 80
      });
    });

    test('should exclude warlocks from area healing by default', () => {
      targets[0].isWarlock = true;
      source.getHealingModifier = jest.fn().mockReturnValue(1.0);
      targets.forEach((target) => {
        target.hp = 50;
        target.maxHp = 100;
      });

      const affected = combatSystem.applyAreaHealing(source, 30, targets, log);

      expect(affected).toHaveLength(2); // Only non-warlocks
      expect(targets[0].hp).toBe(50); // Warlock not healed
      expect(targets[1].hp).toBe(80); // Non-warlock healed
      expect(targets[2].hp).toBe(80); // Non-warlock healed
    });
  });

  describe('Immunity Effects', () => {
    let target;
    let attacker;
    let log;

    beforeEach(() => {
      target = new Player('target1', 'TestTarget');
      attacker = new Player('attacker1', 'TestAttacker');
      log = [];
    });

    test('should handle Stone Resolve immunity', () => {
      target.racialEffects = {
        immuneNextDamage: true,
      };

      const immune = combatSystem.checkImmunityEffects(target, attacker, log);

      expect(immune).toBe(true);
      expect(target.racialEffects.immuneNextDamage).toBeUndefined();
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('immunity');
    });

    test('should return false when no immunity effects', () => {
      const immune = combatSystem.checkImmunityEffects(target, attacker, log);

      expect(immune).toBe(false);
      expect(log).toHaveLength(0);
    });
  });

  describe('Undying Setup', () => {
    test('should set up Undying for Skeleton players missing it', () => {
      const player = new Player('skeleton1', 'TestSkeleton');
      player.race = 'Skeleton';

      const setupNeeded = combatSystem.checkAndSetupUndyingIfNeeded(player);

      expect(setupNeeded).toBe(true);
      expect(player.racialEffects.resurrect).toEqual({ resurrectedHp: 1 });
    });

    test('should not set up Undying for non-Skeleton players', () => {
      const player = new Player('human1', 'TestHuman');
      player.race = 'Human';

      const setupNeeded = combatSystem.checkAndSetupUndyingIfNeeded(player);

      expect(setupNeeded).toBe(false);
    });

    test('should not set up Undying if already present', () => {
      const player = new Player('skeleton1', 'TestSkeleton');
      player.race = 'Skeleton';
      player.racialEffects = { resurrect: { resurrectedHp: 1 } };

      const setupNeeded = combatSystem.checkAndSetupUndyingIfNeeded(player);

      expect(setupNeeded).toBe(false);
    });
  });
});
