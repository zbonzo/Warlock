/**
 * @fileoverview Integration tests for refactored CombatSystem
 * Tests the new composition-based architecture with DamageCalculator, EffectManager, and TurnResolver
 */

const CombatSystem = require('../../../../server/models/systems/CombatSystem');
const DamageCalculator = require('../../../../server/models/systems/DamageCalculator');
const EffectManager = require('../../../../server/models/systems/EffectManager');
const TurnResolver = require('../../../../server/models/systems/TurnResolver');

// Mock the dependencies
jest.mock('@config', () => ({
  gameBalance: {
    player: {
      healing: {
        rejectWarlockHealing: true,
        warlockSelfHealOnly: true
      }
    },
    warlock: {
      corruption: {
        detectionDamagePenalty: 15,
        detectionPenaltyDuration: 2
      },
      conversion: {
        aoeModifier: 0.5
      }
    },
    armor: {
      reductionRate: 0.1,
      maxReduction: 0.9
    },
    coordinationBonus: {
      appliesToMonster: true
    },
    comebackMechanics: {
      armorIncrease: 2,
      corruptionResistance: 25
    },
    shouldActiveComebackMechanics: jest.fn().mockReturnValue(false),
    calculateCoordinationBonus: jest.fn((damage, count, type) => Math.floor(damage * (1 + count * 0.1))),
    applyComebackBonus: jest.fn((amount, type, isGood, isActive) => amount)
  },
  MONSTER_ID: 'monster'
}));

jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('@messages', () => ({
  formatMessage: jest.fn((template, data) => `Mock formatted message with ${JSON.stringify(data)}`),
  events: {
    playerDies: 'Player dies',
    undyingActivated: 'Undying activated',
    coordinatedAttack: 'Coordinated attack',
    coordinatedHealing: 'Coordinated healing',
    coordinatedMonsterAssault: 'Coordinated monster assault',
    playerHealed: 'Player healed',
    stoneResolveAbsorbed: 'Stone resolve absorbed',
    spiritGuardCounter: 'Spirit guard counter',
    spiritsRevealWarlock: 'Spirits reveal warlock',
    sanctuaryPunishesWarlock: 'Sanctuary punishes warlock',
    moonbeamRevealsCorrupted: 'Moonbeam reveals corrupted',
    moonbeamRevealsPure: 'Moonbeam reveals pure'
  },
  privateMessages: {
    killedBy: 'Killed by',
    undyingSavedYou: 'Undying saved you',
    comebackDamageBonus: 'Comeback damage bonus',
    comebackHealingBonus: 'Comeback healing bonus',
    comebackCorruptionResistance: 'Comeback corruption resistance',
    detectionPenaltyEnded: 'Detection penalty ended',
    healedByPlayer: 'Healed by player',
    yourStoneResolveAbsorbed: 'Your stone resolve absorbed',
    spiritGuardStrikesYou: 'Spirit guard strikes you',
    yourSpiritsRevealWarlock: 'Your spirits reveal warlock',
    moonbeamDetectedWarlock: 'Moonbeam detected warlock',
    moonbeamConfirmedPure: 'Moonbeam confirmed pure'
  },
  player: {
    combat: {
      youKilledTarget: 'You killed target',
      healedTarget: 'Healed target',
      healingBlockedTarget: 'Healing blocked target',
      stoneResolveAbsorbedYourDamage: 'Stone resolve absorbed your damage',
      targetAvoidedDeathUndying: 'Target avoided death undying',
      moonbeamExposedCorruption: 'Moonbeam exposed corruption',
      moonbeamConfirmedPurityAttacker: 'Moonbeam confirmed purity attacker'
    }
  },
  combat: {
    counterAttack: {
      sanctuaryCounterPrivate: 'Sanctuary counter private',
      sanctuaryReveal: 'Sanctuary reveal',
      sanctuaryNoWarlock: 'Sanctuary no warlock',
      sanctuaryNoWarlockPrivate: 'Sanctuary no warlock private'
    }
  },
  getEvent: jest.fn(key => `Mock event: ${key}`)
}));

describe('CombatSystem Refactored Integration Tests', () => {
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
      isDead: jest.fn().mockReturnValue(false)
    };

    mockStatusEffectManager = {
      isPlayerStunned: jest.fn().mockReturnValue(false),
      applyEffect: jest.fn()
    };

    mockRacialAbilitySystem = {};

    mockWarlockSystem = {
      attemptConversion: jest.fn(),
      decrementWarlockCount: jest.fn()
    };

    mockGameStateUtils = {
      getRandomTarget: jest.fn().mockReturnValue('target1'),
      getAlivePlayers: jest.fn().mockReturnValue([])
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

  describe('Composition Architecture', () => {
    test('should initialize with domain models', () => {
      expect(combatSystem.damageCalculator).toBeInstanceOf(DamageCalculator);
      expect(combatSystem.effectManager).toBeInstanceOf(EffectManager);
      expect(combatSystem.turnResolver).toBeInstanceOf(TurnResolver);
    });

    test('should delegate to domain models correctly', () => {
      // Test delegation to TurnResolver
      expect(typeof combatSystem.resetCoordinationTracking).toBe('function');
      expect(typeof combatSystem.trackCoordination).toBe('function');
      expect(typeof combatSystem.getCoordinationCount).toBe('function');
      expect(typeof combatSystem.processPendingDeaths).toBe('function');

      // Test delegation to EffectManager
      expect(typeof combatSystem.checkImmunityEffects).toBe('function');
      expect(typeof combatSystem.applyHealing).toBe('function');
      expect(typeof combatSystem.processDetectionPenalties).toBe('function');

      // Test delegation to DamageCalculator
      expect(typeof combatSystem.calculateArmorReduction).toBe('function');
    });

    test('should provide backward compatibility getters', () => {
      // Test coordination tracker access
      expect(combatSystem.coordinationTracker).toBeDefined();
      
      // Test comeback status access
      expect(typeof combatSystem.comebackActive).toBe('boolean');
      combatSystem.comebackActive = true;
      expect(combatSystem.getComebackStatus()).toBe(true);
    });
  });

  describe('Damage Application Integration', () => {
    let target;
    let attacker;
    let log;

    beforeEach(() => {
      target = {
        id: 'target1',
        name: 'TestTarget',
        hp: 100,
        maxHp: 100,
        isAlive: true,
        isWarlock: false,
        getEffectiveArmor: jest.fn().mockReturnValue(2),
        addDamageTaken: jest.fn(),
        addDeath: jest.fn()
      };

      attacker = {
        id: 'attacker1',
        name: 'TestAttacker',
        hp: 100,
        maxHp: 100,
        isAlive: true,
        isWarlock: false,
        addDamageDealt: jest.fn()
      };

      players.set(target.id, target);
      players.set(attacker.id, attacker);
      log = [];
    });

    test('should apply damage using new composition architecture', () => {
      const result = combatSystem.applyDamageToPlayer(target, 20, attacker, log);

      expect(result).toBe(true);
      expect(target.hp).toBeLessThan(100); // Should have taken damage
      expect(log.length).toBeGreaterThan(0); // Should log damage event
      expect(log[0].type).toBe('damage');
    });

    test('should track coordination correctly', () => {
      // Apply damage from multiple attackers to same target
      const attacker2 = {
        id: 'attacker2',
        name: 'TestAttacker2',
        hp: 100,
        isAlive: true,
        isWarlock: false,
        addDamageDealt: jest.fn()
      };
      players.set(attacker2.id, attacker2);

      // First attack - should establish coordination
      combatSystem.applyDamageToPlayer(target, 20, attacker, log);
      
      // Second attack - should get coordination bonus
      combatSystem.applyDamageToPlayer(target, 20, attacker2, log);

      // Check that coordination was tracked
      expect(combatSystem.getCoordinationCount(target.id, attacker2.id)).toBeGreaterThan(0);
    });

    test('should handle immunity effects through EffectManager', () => {
      target.racialEffects = {
        immuneNextDamage: true
      };

      const result = combatSystem.applyDamageToPlayer(target, 20, attacker, log);

      expect(result).toBe(false); // Attack should be blocked
      expect(target.hp).toBe(100); // No damage taken
      expect(target.racialEffects.immuneNextDamage).toBeUndefined(); // Effect consumed
    });

    test('should process death through TurnResolver', () => {
      target.hp = 5; // Low HP
      
      combatSystem.applyDamageToPlayer(target, 20, attacker, log);

      expect(target.pendingDeath).toBe(true); // Should mark for pending death
      expect(target.deathAttacker).toBe(attacker.name);
    });
  });

  describe('Monster Combat Integration', () => {
    let attacker;
    let log;

    beforeEach(() => {
      attacker = {
        id: 'attacker1',
        name: 'TestAttacker',
        hp: 100,
        isAlive: true,
        isWarlock: false
      };
      log = [];
    });

    test('should apply monster damage with coordination', () => {
      // Setup coordination tracking
      combatSystem.trackCoordination(attacker.id, '__monster__');
      
      const result = combatSystem.applyDamageToMonster(30, attacker, log);

      expect(result).toBe(true);
      expect(mockMonsterController.takeDamage).toHaveBeenCalled();
    });

    test('should handle Thirsty Blade life steal', () => {
      attacker.class = 'Barbarian';
      attacker.classEffects = {
        thirstyBlade: {
          active: true,
          lifeSteal: 0.25
        }
      };
      attacker.heal = jest.fn();

      combatSystem.applyDamageToMonster(40, attacker, log);

      expect(attacker.heal).toHaveBeenCalledWith(10); // 40 * 0.25 = 10
    });
  });

  describe('Healing Integration', () => {
    let healer;
    let target;
    let log;

    beforeEach(() => {
      healer = {
        id: 'healer1',
        name: 'TestHealer',
        hp: 100,
        isAlive: true,
        isWarlock: false,
        getHealingModifier: jest.fn().mockReturnValue(1.2)
      };

      target = {
        id: 'target1',
        name: 'TestTarget',
        hp: 60,
        maxHp: 100,
        isAlive: true,
        isWarlock: false
      };

      players.set(healer.id, healer);
      players.set(target.id, target);
      log = [];
    });

    test('should apply healing with coordination through EffectManager', () => {
      // Track coordination for healing
      combatSystem.trackCoordination(healer.id, target.id);

      const healAmount = combatSystem.applyHealing(healer, target, 25, log);

      expect(healAmount).toBeGreaterThan(0);
      expect(target.hp).toBeGreaterThan(60); // Should be healed
      expect(log.length).toBeGreaterThan(0); // Should log healing
    });

    test('should block warlock healing correctly', () => {
      target.isWarlock = true;

      const healAmount = combatSystem.applyHealing(healer, target, 25, log);

      expect(healAmount).toBe(0); // No healing applied
      expect(target.hp).toBe(60); // HP unchanged
    });

    test('should handle area healing', () => {
      const targets = [target, {
        id: 'target2',
        name: 'TestTarget2',
        hp: 70,
        maxHp: 100,
        isAlive: true,
        isWarlock: false
      }];

      const affected = combatSystem.applyAreaHealing(healer, 20, targets, log);

      expect(affected.length).toBe(2);
      expect(targets[0].hp).toBeGreaterThan(60);
      expect(targets[1].hp).toBeGreaterThan(70);
    });
  });

  describe('Death Processing Integration', () => {
    let player;
    let log;

    beforeEach(() => {
      player = {
        id: 'player1',
        name: 'TestPlayer',
        hp: 0,
        isAlive: false,
        isWarlock: false,
        race: 'Human',
        pendingDeath: true,
        deathAttacker: 'TestAttacker',
        deathAttackerId: 'attacker1'
      };

      players.set(player.id, player);
      log = [];
    });

    test('should process pending deaths through TurnResolver', () => {
      combatSystem.processPendingDeaths(log);

      expect(player.pendingDeath).toBeUndefined();
      expect(player.isAlive).toBe(false);
    });

    test('should handle Undying resurrection through TurnResolver', () => {
      player.race = 'Lich';
      player.racialEffects = {
        resurrect: {
          resurrectedHp: 1,
          active: true
        }
      };

      combatSystem.processPendingDeaths(log);

      expect(player.hp).toBe(1); // Resurrected
      expect(player.isAlive).toBe(true);
      expect(player.racialEffects.resurrect.active).toBe(false); // Effect consumed
    });

    test('should handle warlock count decrement', () => {
      player.isWarlock = true;

      combatSystem.processPendingDeaths(log);

      expect(mockWarlockSystem.decrementWarlockCount).toHaveBeenCalled();
    });
  });

  describe('Counter-attacks Integration', () => {
    let target;
    let attacker;
    let log;

    beforeEach(() => {
      target = {
        id: 'target1',
        name: 'TestTarget',
        hp: 100,
        classEffects: {}
      };

      attacker = {
        id: 'attacker1',
        name: 'TestAttacker',
        hp: 100,
        isWarlock: false
      };

      log = [];
    });

    test('should handle Spirit Guard counter-attack through EffectManager', () => {
      target.classEffects.spiritGuard = {
        turnsLeft: 2,
        counterDamage: 15,
        revealsWarlocks: true
      };

      combatSystem.handleCounterAttacks(target, attacker, log);

      expect(attacker.hp).toBe(85); // 100 - 15 = 85
      expect(log.length).toBeGreaterThan(0);
    });

    test('should reveal warlocks with Spirit Guard', () => {
      target.classEffects.spiritGuard = {
        turnsLeft: 2,
        counterDamage: 15,
        revealsWarlocks: true
      };
      attacker.isWarlock = true;

      combatSystem.handleCounterAttacks(target, attacker, log);

      expect(attacker.recentlyDetected).toBe(true);
      expect(attacker.detectionTurnsRemaining).toBe(2);
    });
  });

  describe('Statistics and State', () => {
    test('should provide coordination statistics through TurnResolver', () => {
      combatSystem.trackCoordination('attacker1', 'target1');
      combatSystem.trackCoordination('attacker2', 'target1');

      const stats = combatSystem.getCoordinationStats();

      expect(stats).toHaveProperty('coordinationTracker');
      expect(stats).toHaveProperty('comebackActive');
      expect(stats).toHaveProperty('totalCoordinatedTargets');
    });

    test('should reset coordination tracking correctly', () => {
      combatSystem.trackCoordination('attacker1', 'target1');
      
      combatSystem.resetCoordinationTracking();

      const stats = combatSystem.getCoordinationStats();
      expect(stats.totalCoordinatedTargets).toBe(0);
    });

    test('should update comeback status correctly', () => {
      const initialStatus = combatSystem.getComebackStatus();
      
      combatSystem.updateComebackStatus();
      
      // Should maintain consistent state
      expect(typeof combatSystem.getComebackStatus()).toBe('boolean');
    });
  });

  describe('Armor Calculation Integration', () => {
    test('should calculate armor reduction through DamageCalculator', () => {
      const damage = 50;
      const armor = 5;

      const reducedDamage = combatSystem.calculateArmorReduction(damage, armor);

      expect(reducedDamage).toBeLessThan(damage);
      expect(reducedDamage).toBeGreaterThan(0); // Always deals at least 1 damage
    });

    test('should handle negative armor correctly', () => {
      const damage = 50;
      const armor = -2;

      const increasedDamage = combatSystem.calculateArmorReduction(damage, armor);

      expect(increasedDamage).toBeGreaterThan(damage); // Negative armor increases damage
    });
  });

  describe('Area Combat Integration', () => {
    let source;
    let targets;
    let log;

    beforeEach(() => {
      source = {
        id: 'source1',
        name: 'TestSource',
        isWarlock: false,
        modifyDamage: jest.fn(damage => damage)
      };

      targets = [
        {
          id: 'target1',
          name: 'TestTarget1',
          hp: 100,
          maxHp: 100,
          isAlive: true,
          isWarlock: false,
          getEffectiveArmor: jest.fn().mockReturnValue(1),
          addDamageTaken: jest.fn(),
          addDeath: jest.fn()
        },
        {
          id: 'target2',
          name: 'TestTarget2',
          hp: 100,
          maxHp: 100,
          isAlive: true,
          isWarlock: false,
          getEffectiveArmor: jest.fn().mockReturnValue(1),
          addDamageTaken: jest.fn(),
          addDeath: jest.fn()
        }
      ];

      targets.forEach(target => players.set(target.id, target));
      log = [];
    });

    test('should apply area damage using new architecture', () => {
      const affected = combatSystem.applyAreaDamage(source, 25, targets, log);

      expect(affected.length).toBe(2);
      targets.forEach(target => {
        expect(target.hp).toBeLessThan(100); // Should have taken damage
      });
    });

    test('should handle warlock conversion in area effects', () => {
      source.isWarlock = true;

      combatSystem.applyAreaDamage(source, 25, targets, log);

      // Should attempt conversion for each valid target
      expect(mockWarlockSystem.attemptConversion).toHaveBeenCalledTimes(2);
    });
  });
});