/**
 * @fileoverview Tests for attackAbilities handlers
 */
import { register } from '../../../../../server/models/systems/abilityHandlers/attackAbilities';
import type { AbilityRegistry, AbilityHandler, CoordinationInfo, LogEntry } from '../../../../../server/models/systems/abilityHandlers/abilityRegistryUtils';
import type { Player, Monster, Ability } from '../../../../../server/types/generated';

// Mock dependencies
jest.mock('@config');
jest.mock('@messages');
jest.mock('../GameStateUtils');

const mockConfig = require('@config');
const mockMessages = require('@messages');
const GameStateUtils = require('../GameStateUtils');

// Mock game systems interface
interface MockGameSystems {
  gameStateUtils: {
    getAlivePlayers(): Player[];
  };
  monsterController: {
    takeDamage(damage: number, actor: Player, log: LogEntry[]): boolean;
    addThreat?(playerId: string, damageToMonster: number, totalDamage: number, healing: number, armor: number): void;
  };
  combatSystem: {
    applyDamageToPlayer(target: Player, damage: number, actor: Player, log: LogEntry[]): void;
    handlePotentialDeath?(target: Player, actor: Player, log: LogEntry[]): void;
  };
  statusEffectSystem: {
    applyEffect(
      targetId: string,
      effectType: string,
      effectData: Record<string, any>,
      sourceId?: string,
      sourceName?: string,
      log?: LogEntry[]
    ): void;
  };
  warlockSystem: {
    attemptConversion(actor: Player, target: Player | null, log: LogEntry[], modifier?: number): void;
    markWarlockDetected?(warlockId: string, log: LogEntry[]): void;
  };
  players: Map<string, Player>;
  monster: {
    hp: number;
  };
}

describe('attackAbilities', () => {
  let mockRegistry: jest.Mocked<AbilityRegistry>;
  let mockSystems: MockGameSystems;
  let mockActor: Player;
  let mockTarget: Player;
  let mockMonster: Monster;
  let mockAbility: Ability;
  let log: LogEntry[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config
    mockConfig.MONSTER_ID = 'monster1';
    mockConfig.gameBalance = {
      shouldActiveComebackMechanics: jest.fn().mockReturnValue(false),
      comebackMechanics: {
        damageIncrease: 25
      },
      warlock: {
        conversion: {
          randomModifier: 1,
          aoeModifier: 0.5
        }
      },
      stoneArmor: {
        degradationPerHit: 1,
        minimumValue: 0,
        initialValue: 5
      }
    };

    // Mock messages
    mockMessages.getAbilityMessage = jest.fn((category, key) => `${category}.${key}`);
    mockMessages.formatMessage = jest.fn((template, params) =>
      `Formatted: ${template} with ${JSON.stringify(params)}`
    );
    mockMessages.getError = jest.fn((key) => `Error: ${key}`);

    // Mock GameStateUtils
    GameStateUtils.isTargetInvisible = jest.fn().mockReturnValue(false);
    GameStateUtils.checkInvisibilityAndLog = jest.fn().mockReturnValue(false);

    // Create mock registry
    mockRegistry = {
      registerClassAbility: jest.fn(),
      executeClassAbility: jest.fn(),
      getHandler: jest.fn()
    } as any;

    // Create mock players
    mockActor = {
      id: 'actor1',
      name: 'TestActor',
      hp: 100,
      isAlive: true,
      isWarlock: false,
      damageMod: 1.0,
      modifyDamage: jest.fn((damage) => Math.floor(damage * 1.0)),
      addDamageDealt: jest.fn(),
      applyVulnerability: jest.fn()
    } as any;

    mockTarget = {
      id: 'target1',
      name: 'TestTarget',
      hp: 80,
      isAlive: true,
      isWarlock: false,
      damageMod: 1.0,
      modifyDamage: jest.fn((damage) => Math.floor(damage * 1.0)),
      calculateDamageReduction: jest.fn((damage) => damage),
      applyVulnerability: jest.fn()
    } as any;

    mockMonster = {
      hp: 200
    } as any;

    // Create mock systems
    mockSystems = {
      gameStateUtils: {
        getAlivePlayers: jest.fn().mockReturnValue([mockActor, mockTarget])
      },
      monsterController: {
        takeDamage: jest.fn().mockReturnValue(true),
        addThreat: jest.fn()
      },
      combatSystem: {
        applyDamageToPlayer: jest.fn().mockImplementation((target, damage) => {
          target.hp = Math.max(0, target.hp - damage);
        }),
        handlePotentialDeath: jest.fn()
      },
      statusEffectSystem: {
        applyEffect: jest.fn()
      },
      warlockSystem: {
        attemptConversion: jest.fn(),
        markWarlockDetected: jest.fn()
      },
      players: new Map([
        ['actor1', mockActor],
        ['target1', mockTarget]
      ]),
      monster: mockMonster
    };

    // Create mock ability
    mockAbility = {
      id: 'testAttack',
      name: 'Test Attack',
      type: 'attack',
      category: 'Attack',
      target: 'Single',
      effect: null,
      params: {
        damage: 20
      }
    } as any;

    log = [];
  });

  describe('register function', () => {
    it('should register all attack ability handlers', () => {
      register(mockRegistry);

      // Verify core attack abilities are registered
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('attack', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('poisonStrike', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('deathMark', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('vulnerabilityStrike', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('multiHitAttack', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('meteorShower', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('infernoBlast', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('recklessStrike', expect.any(Function));
    });
  });

  describe('basic attack handler', () => {
    let attackHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      // Get the attack handler from the first registerClassAbility call
      attackHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'attack'
      )?.[1];
    });

    it('should handle basic attack on monster successfully', () => {
      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        20, // Expected damage
        mockActor,
        log
      );
      expect(mockActor.addDamageDealt).toHaveBeenCalledWith(20);
    });

    it('should handle basic attack on player successfully', () => {
      const result = attackHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        20,
        mockActor,
        log
      );
    });

    it('should apply coordination bonuses correctly', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDamage: true,
        damageBonus: 25
      };

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 20 * 1.25 = 25
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        25,
        mockActor,
        log
      );

      // Should log coordination bonus
      expect(log.some(entry =>
        entry.type === 'coordination_damage_applied' &&
        entry.privateMessage?.includes('25%')
      )).toBe(true);
    });

    it('should apply comeback mechanics when active', () => {
      mockConfig.gameBalance.shouldActiveComebackMechanics.mockReturnValue(true);

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      // 20 * 1.25 = 25 (comeback mechanics)
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        25,
        mockActor,
        log
      );

      // Should log comeback bonus
      expect(log.some(entry =>
        entry.type === 'comeback_damage_applied' &&
        entry.privateMessage?.includes('25%')
      )).toBe(true);
    });

    it('should fail when target is invisible', () => {
      GameStateUtils.isTargetInvisible.mockReturnValue(true);

      const result = attackHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockSystems.combatSystem.applyDamageToPlayer).not.toHaveBeenCalled();
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('attackInvisible');
    });

    it('should trigger warlock conversion on monster attack', () => {
      mockActor.isWarlock = true;

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.warlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockActor,
        null,
        log,
        1 // randomConversionModifier
      );
    });

    it('should trigger warlock conversion on player attack', () => {
      mockActor.isWarlock = true;

      const result = attackHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.warlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockActor,
        mockTarget,
        log
      );
    });

    it('should return false when target player is dead', () => {
      mockTarget.isAlive = false;

      const result = attackHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockSystems.combatSystem.applyDamageToPlayer).not.toHaveBeenCalled();
    });

    it('should apply actor damage modifiers', () => {
      mockActor.modifyDamage = jest.fn().mockReturnValue(30);

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        30,
        mockActor,
        log
      );
    });
  });

  describe('poison strike handler', () => {
    let poisonStrikeHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      poisonStrikeHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'poisonStrike'
      )?.[1];

      mockAbility.params = {
        damage: 15,
        poison: {
          damage: 5,
          turns: 3
        }
      };
    });

    it('should apply damage and poison to player target', () => {
      const result = poisonStrikeHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        15,
        mockActor,
        log
      );
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'poison',
        { turns: 3, damage: 5 },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply coordination bonus to both damage and poison', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDamage: true,
        damageBonus: 20
      };

      const result = poisonStrikeHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // Main damage: 15 * 1.20 = 18
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        18,
        mockActor,
        log
      );
      // Poison damage: 5 * 1.20 = 6
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'poison',
        { turns: 3, damage: 6 },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should not apply poison to monster target', () => {
      const result = poisonStrikeHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        15,
        mockActor,
        log
      );
      expect(mockSystems.statusEffectSystem.applyEffect).not.toHaveBeenCalled();
    });

    it('should not apply poison if target dies from initial damage', () => {
      mockTarget.hp = 10; // Will die from 15 damage
      mockSystems.combatSystem.applyDamageToPlayer.mockImplementation((target, damage) => {
        target.hp = 0;
        target.isAlive = false;
      });

      const result = poisonStrikeHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).not.toHaveBeenCalled();
    });
  });

  describe('AoE damage handler', () => {
    let aoeHandler: AbilityHandler;
    let mockTarget2: Player;

    beforeEach(() => {
      register(mockRegistry);
      aoeHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'meteorShower'
      )?.[1];

      mockTarget2 = {
        id: 'target2',
        name: 'TestTarget2',
        hp: 70,
        isAlive: true,
        isWarlock: false
      } as any;

      mockSystems.players.set('target2', mockTarget2);
      mockSystems.gameStateUtils.getAlivePlayers.mockReturnValue([mockActor, mockTarget, mockTarget2]);

      mockAbility.target = 'Multi';
      mockAbility.params = {
        damage: 25,
        includeMonster: true
      };
    });

    it('should damage all players except caster', () => {
      const result = aoeHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        25,
        mockActor,
        log
      );
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget2,
        25,
        mockActor,
        log
      );
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledTimes(2);
    });

    it('should damage monster when includeMonster is true', () => {
      const result = aoeHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        25,
        mockActor,
        log
      );
    });

    it('should not damage monster when includeMonster is false', () => {
      mockAbility.params!.includeMonster = false;

      const result = aoeHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).not.toHaveBeenCalled();
    });

    it('should apply coordination bonus to AoE damage', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDamage: true,
        damageBonus: 30
      };

      const result = aoeHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 25 * 1.30 = 32 (floored)
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        32,
        mockActor,
        log
      );
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        32,
        mockActor,
        log
      );
    });

    it('should fail when no valid targets', () => {
      // Remove all other players
      mockSystems.players.clear();
      mockSystems.players.set('actor1', mockActor);
      mockSystems.gameStateUtils.getAlivePlayers.mockReturnValue([mockActor]);
      mockAbility.params!.includeMonster = false;
      mockSystems.monster.hp = 0;

      const result = aoeHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(log.some(entry => entry.includes('aoeNoTargets'))).toBe(true);
    });

    it('should attempt warlock conversion with AoE modifier', () => {
      mockActor.isWarlock = true;

      const result = aoeHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.warlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockActor,
        mockTarget,
        log,
        0.5 // aoeModifier
      );
      expect(mockSystems.warlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockActor,
        mockTarget2,
        log,
        0.5
      );
    });
  });

  describe('vulnerability strike handler', () => {
    let vulnHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      vulnHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'vulnerabilityStrike'
      )?.[1];

      mockAbility.params = {
        damage: 18,
        vulnerable: {
          damageIncrease: 40,
          turns: 2
        }
      };
    });

    it('should apply damage and vulnerability to player target', () => {
      const result = vulnHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        18,
        mockActor,
        log
      );
      expect(mockTarget.applyVulnerability).toHaveBeenCalledWith(40, 2);
    });

    it('should not apply vulnerability to monster', () => {
      const result = vulnHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        18,
        mockActor,
        log
      );
      expect(mockTarget.applyVulnerability).not.toHaveBeenCalled();
    });

    it('should use default vulnerability values when not specified', () => {
      mockAbility.params = { damage: 18 }; // No vulnerable params

      const result = vulnHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.applyVulnerability).toHaveBeenCalledWith(50, 1); // Defaults
    });

    it('should not apply vulnerability if target dies', () => {
      mockTarget.hp = 10;
      mockSystems.combatSystem.applyDamageToPlayer.mockImplementation((target, damage) => {
        target.hp = 0;
        target.isAlive = false;
      });

      const result = vulnHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.applyVulnerability).not.toHaveBeenCalled();
    });
  });

  describe('multi-hit attack handler', () => {
    let multiHitHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      multiHitHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'multiHitAttack'
      )?.[1];

      mockAbility.params = {
        damage: 12,
        hits: 3,
        hitChance: 0.8
      };

      // Mock random for predictable results
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Always hits (0.5 < 0.8)
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should perform multiple hits on monster target', () => {
      const result = multiHitHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledTimes(3);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        12,
        mockActor,
        []
      );
    });

    it('should perform multiple hits on player target', () => {
      const result = multiHitHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      // Check that damage was applied multiple times
      expect(log.filter(entry => entry.type === 'multi_hit_hit')).toHaveLength(3);
    });

    it('should apply coordination bonus to each hit', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDamage: true,
        damageBonus: 25
      };

      const result = multiHitHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 12 * 1.25 = 15
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        15,
        mockActor,
        []
      );
    });

    it('should handle miss chances correctly', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Always misses (0.9 > 0.8)

      const result = multiHitHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false); // No hits landed
      expect(log.filter(entry => entry.type === 'multi_hit_miss')).toHaveLength(3);
      expect(log.some(entry => entry.type === 'multi_hit_missed')).toBe(true);
    });

    it('should handle target death during multi-hit', () => {
      let hitCount = 0;
      mockSystems.combatSystem.applyDamageToPlayer.mockImplementation((target, damage) => {
        hitCount++;
        if (hitCount >= 2) {
          target.hp = 0;
          target.isAlive = false;
        } else {
          target.hp = Math.max(0, target.hp - damage);
        }
      });

      const result = multiHitHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.combatSystem.handlePotentialDeath).toHaveBeenCalledWith(
        mockTarget,
        mockActor,
        log
      );
    });

    it('should use damagePerHit when available', () => {
      mockAbility.params = {
        damagePerHit: 8,
        hits: 2,
        hitChance: 1.0
      };

      const result = multiHitHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        8,
        mockActor,
        []
      );
    });
  });

  describe('reckless strike handler', () => {
    let recklessHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      recklessHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'recklessStrike'
      )?.[1];

      mockAbility.params = {
        damage: 30,
        selfDamage: 8
      };
    });

    it('should apply self-damage before attacking', () => {
      const initialHp = mockActor.hp;

      const result = recklessHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockActor.hp).toBe(initialHp - 8);
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        30,
        mockActor,
        log
      );
    });

    it('should not reduce actor HP below 1', () => {
      mockActor.hp = 5; // Low HP

      const result = recklessHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockActor.hp).toBe(1); // Cannot go below 1
    });

    it('should log self-damage when applied', () => {
      const result = recklessHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(log.some(entry =>
        entry.includes('recklessStrikeSelfDamage')
      )).toBe(true);
    });

    it('should fail when target is invisible', () => {
      GameStateUtils.isTargetInvisible.mockReturnValue(true);

      const result = recklessHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockActor.hp).toBe(100); // No self-damage when attack fails
      expect(mockSystems.combatSystem.applyDamageToPlayer).not.toHaveBeenCalled();
    });

    it('should apply coordination bonus to attack damage', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDamage: true,
        damageBonus: 20
      };

      const result = recklessHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // Self-damage still 8, but attack damage: 30 * 1.20 = 36
      expect(mockActor.hp).toBe(92);
      expect(mockSystems.combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget,
        36,
        mockActor,
        log
      );
    });
  });

  describe('error handling and edge cases', () => {
    let attackHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      attackHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'attack'
      )?.[1];
    });

    it('should handle missing ability params gracefully', () => {
      const abilityNoDamage = { ...mockAbility, params: {} };

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        abilityNoDamage,
        log,
        mockSystems
      );

      expect(result).toBe(false); // No damage = failure
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        0,
        mockActor,
        log
      );
    });

    it('should handle missing modifyDamage method', () => {
      delete mockActor.modifyDamage;

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        20, // Raw damage without modification
        mockActor,
        log
      );
    });

    it('should handle failed monster damage', () => {
      mockSystems.monsterController.takeDamage.mockReturnValue(false);

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockActor.addDamageDealt).not.toHaveBeenCalled();
    });

    it('should handle null target gracefully', () => {
      const result = attackHandler(
        mockActor,
        null as any,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
    });

    it('should handle invalid coordination info', () => {
      const invalidCoordination: CoordinationInfo = {
        coordinatedDamage: true,
        damageBonus: -10 // Negative bonus
      };

      const result = attackHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems,
        invalidCoordination
      );

      expect(result).toBe(true);
      // Should still work but with reduced damage
      expect(mockSystems.monsterController.takeDamage).toHaveBeenCalledWith(
        18, // 20 * 0.9 = 18
        mockActor,
        log
      );
    });
  });
});
