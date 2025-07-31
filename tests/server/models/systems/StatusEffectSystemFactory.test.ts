/**
 * @fileoverview Tests for StatusEffectSystemFactory
 * Comprehensive test suite for status effect system factory creation and configuration
 */

import StatusEffectSystemFactory from '../../../../server/models/systems/StatusEffectSystemFactory';
import NewStatusEffectManager from '../../../../server/models/systems/NewStatusEffectManager';
import EntityAdapter from '../../../../server/models/systems/EntityAdapter';
import StatusEffect from '../../../../server/models/systems/StatusEffect';

// Mock dependencies
jest.mock('../../../../server/models/systems/NewStatusEffectManager');
jest.mock('../../../../server/models/systems/EntityAdapter');
jest.mock('../../../../server/models/systems/StatusEffect');
jest.mock('../../../../server/utils/logger');
jest.mock('../../../../server/config');

const MockNewStatusEffectManager = NewStatusEffectManager as jest.MockedClass<typeof NewStatusEffectManager>;
const MockEntityAdapter = EntityAdapter as jest.MockedClass<typeof EntityAdapter>;
const MockStatusEffect = StatusEffect as jest.MockedClass<typeof StatusEffect>;

// Test interfaces
interface MockPlayer {
  id: string;
  name: string;
  race?: string;
  [key: string]: any;
}

interface MockMonster {
  id: string;
  name: string;
  race: 'Monster';
  [key: string]: any;
}

interface MockWarlockSystem {
  markWarlockDetected?: jest.Mock;
}

describe('StatusEffectSystemFactory', () => {
  let mockPlayers: Map<string, MockPlayer>;
  let mockMonster: MockMonster;
  let mockWarlockSystem: MockWarlockSystem;
  let mockEntities: Map<string, any>;
  let mockManager: jest.Mocked<NewStatusEffectManager>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock data
    mockPlayers = new Map([
      ['player1', { id: 'player1', name: 'Test Player 1', race: 'Rockhewn' }],
      ['player2', { id: 'player2', name: 'Test Player 2', race: 'Crestfallen' }]
    ]);

    mockMonster = {
      id: 'monster1',
      name: 'Test Monster',
      race: 'Monster'
    };

    mockWarlockSystem = {
      markWarlockDetected: jest.fn()
    };

    mockEntities = new Map([
      ['player1', { id: 'player1', name: 'Test Player 1' }],
      ['player2', { id: 'player2', name: 'Test Player 2' }],
      ['monster1', { id: 'monster1', name: 'Test Monster' }]
    ]);

    // Mock manager instance
    mockManager = {
      applyRacialPassives: jest.fn(),
      processTimedEffects: jest.fn(),
      applyEffect: jest.fn(),
      hasEffect: jest.fn(),
      removeEffect: jest.fn(),
      calculateModifiedValue: jest.fn(),
      getEffectStatistics: jest.fn().mockReturnValue({ totalEffects: 0 }),
      effectsByEntity: new Map()
    } as any;

    MockNewStatusEffectManager.mockImplementation(() => mockManager);

    // Mock EntityAdapter
    MockEntityAdapter.createEntitiesMap.mockReturnValue(mockEntities);
    MockEntityAdapter.migrateLegacyStatusEffects.mockImplementation(() => {});
    MockEntityAdapter.validateEntity.mockReturnValue(true);
    MockEntityAdapter.syncLegacyFlags.mockImplementation(() => {});

    // Mock StatusEffect
    const mockStatusEffect = {
      id: 'effect-123',
      type: 'stoneArmor'
    };
    MockStatusEffect.createRacialEffect.mockReturnValue(mockStatusEffect as any);

    // Mock config
    const mockConfig = {
      raceAttributes: {
        Rockhewn: { name: 'Rockhewn' },
        Crestfallen: { name: 'Crestfallen' },
        Kinfolk: { name: 'Kinfolk' },
        Lich: { name: 'Lich' }
      }
    };
    require('../../../../server/config').__setMockConfig(mockConfig);
  });

  describe('createSystem', () => {
    it('should create system with default parameters', () => {
      const system = StatusEffectSystemFactory.createSystem(mockPlayers);

      expect(MockEntityAdapter.createEntitiesMap).toHaveBeenCalledWith(mockPlayers, null);
      expect(MockNewStatusEffectManager).toHaveBeenCalledWith(mockEntities, null);
      expect(system).toHaveProperty('manager', mockManager);
      expect(system).toHaveProperty('entities', mockEntities);
    });

    it('should create system with monster and warlock system', () => {
      const system = StatusEffectSystemFactory.createSystem(
        mockPlayers,
        mockMonster,
        mockWarlockSystem
      );

      expect(MockEntityAdapter.createEntitiesMap).toHaveBeenCalledWith(mockPlayers, mockMonster);
      expect(MockNewStatusEffectManager).toHaveBeenCalledWith(mockEntities, mockWarlockSystem);
      expect(system.manager).toBe(mockManager);
    });

    it('should apply racial passives to all players', () => {
      StatusEffectSystemFactory.createSystem(mockPlayers);

      expect(mockManager.applyRacialPassives).toHaveBeenCalledWith('player1', 'Rockhewn');
      expect(mockManager.applyRacialPassives).toHaveBeenCalledWith('player2', 'Crestfallen');
    });

    it('should skip players without race', () => {
      const playersWithoutRace = new Map([
        ['player1', { id: 'player1', name: 'Test Player 1' }]
      ]);

      StatusEffectSystemFactory.createSystem(playersWithoutRace);

      expect(mockManager.applyRacialPassives).not.toHaveBeenCalled();
    });

    it('should migrate existing status effects when requested', () => {
      StatusEffectSystemFactory.createSystem(mockPlayers, mockMonster, mockWarlockSystem, true);

      expect(MockEntityAdapter.migrateLegacyStatusEffects).toHaveBeenCalledTimes(3); // 2 players + 1 monster
    });

    it('should not migrate effects by default', () => {
      StatusEffectSystemFactory.createSystem(mockPlayers);

      expect(MockEntityAdapter.migrateLegacyStatusEffects).not.toHaveBeenCalled();
    });

    it('should return system with convenience methods', () => {
      const system = StatusEffectSystemFactory.createSystem(mockPlayers);

      expect(system).toHaveProperty('processEffects');
      expect(system).toHaveProperty('applyEffect');
      expect(system).toHaveProperty('hasEffect');
      expect(system).toHaveProperty('removeEffect');
      expect(system).toHaveProperty('calculateModified');
      expect(system).toHaveProperty('getStats');

      // Test convenience methods work
      const mockLog = [];
      system.processEffects(mockLog);
      expect(mockManager.processTimedEffects).toHaveBeenCalledWith(mockLog);

      system.applyEffect('player1', 'poison', { damage: 5 }, 'source1', 'Source', mockLog);
      expect(mockManager.applyEffect).toHaveBeenCalledWith('player1', 'poison', { damage: 5 }, 'source1', 'Source', mockLog);

      system.hasEffect('player1', 'poison');
      expect(mockManager.hasEffect).toHaveBeenCalledWith('player1', 'poison');

      system.removeEffect('player1', 'effect-123', mockLog);
      expect(mockManager.removeEffect).toHaveBeenCalledWith('player1', 'effect-123', mockLog);

      system.calculateModified('player1', 'damage', 100);
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('player1', 'damage', 100);

      system.getStats();
      expect(mockManager.getEffectStatistics).toHaveBeenCalled();
    });
  });

  describe('replaceLegacyMethods', () => {
    let mockEntity: any;

    beforeEach(() => {
      mockEntity = {
        id: 'test-entity',
        name: 'Test Entity',
        race: 'Human',
        armor: 10,
        damageMod: 1.2,
        statusEffects: {},
        stoneArmorIntact: false,
        stoneArmorValue: 0,
        getEffectiveArmor: jest.fn().mockReturnValue(15),
        modifyDamage: jest.fn().mockReturnValue(120)
      };

      const entities = new Map([['test-entity', mockEntity]]);
      mockManager.hasEffect.mockReturnValue(true);
      mockManager.removeEffectsByType.mockReturnValue(2);
      mockManager.getAllEffects.mockReturnValue([]);
      mockManager.getEffectsByType.mockReturnValue([]);
      mockManager.isActionPrevented.mockReturnValue(false);
      mockManager.calculateModifiedValue.mockReturnValue(20);

      // Call the private method through createSystem
      StatusEffectSystemFactory.createSystem(new Map([['test-entity', mockEntity]]));
    });

    it('should replace hasStatusEffect method', () => {
      const result = mockEntity.hasStatusEffect('poison');
      expect(mockManager.hasEffect).toHaveBeenCalledWith('test-entity', 'poison');
    });

    it('should replace applyStatusEffect method', () => {
      mockManager.applyEffect.mockReturnValue({ id: 'effect-123' });

      const result = mockEntity.applyStatusEffect('poison', { damage: 5 });
      expect(mockManager.applyEffect).toHaveBeenCalledWith('test-entity', 'poison', { damage: 5 }, 'test-entity', 'Test Entity');
    });

    it('should replace removeStatusEffect method', () => {
      const result = mockEntity.removeStatusEffect('poison');
      expect(mockManager.removeEffectsByType).toHaveBeenCalledWith('test-entity', 'poison');
    });

    it('should add getActiveEffects method', () => {
      const result = mockEntity.getActiveEffects();
      expect(mockManager.getAllEffects).toHaveBeenCalledWith('test-entity');
    });

    it('should add getEffectsOfType method', () => {
      const result = mockEntity.getEffectsOfType('poison');
      expect(mockManager.getEffectsByType).toHaveBeenCalledWith('test-entity', 'poison');
    });

    it('should add isActionPrevented method', () => {
      const result = mockEntity.isActionPrevented('ability');
      expect(mockManager.isActionPrevented).toHaveBeenCalledWith('test-entity', 'ability');
    });

    it('should enhance getEffectiveArmor method', () => {
      const result = mockEntity.getEffectiveArmor();
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'armor', 15);
    });

    it('should handle missing getEffectiveArmor method', () => {
      delete mockEntity.getEffectiveArmor;
      mockEntity.armor = 12;

      const result = mockEntity.getEffectiveArmor();
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'armor', 12);
    });

    it('should handle Rockhewn stone armor in getEffectiveArmor', () => {
      delete mockEntity.getEffectiveArmor;
      mockEntity.race = 'Rockhewn';
      mockEntity.stoneArmorIntact = true;
      mockEntity.stoneArmorValue = 6;
      mockEntity.armor = 5;

      const result = mockEntity.getEffectiveArmor();
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'armor', 11); // 5 + 6
    });

    it('should handle errors in original getEffectiveArmor gracefully', () => {
      mockEntity.getEffectiveArmor = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      mockEntity.armor = 8;

      const result = mockEntity.getEffectiveArmor();
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'armor', 8);
    });

    it('should enhance modifyDamage method', () => {
      const result = mockEntity.modifyDamage(100);
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'damageDealt', 120);
    });

    it('should handle missing modifyDamage method', () => {
      delete mockEntity.modifyDamage;
      mockEntity.damageMod = 1.5;

      const result = mockEntity.modifyDamage(100);
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'damageDealt', 150);
    });

    it('should add calculateIncomingDamage method', () => {
      const result = mockEntity.calculateIncomingDamage(100);
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('test-entity', 'damageTaken', 100);
    });

    it('should add syncStatusFlags method', () => {
      mockEntity.syncStatusFlags();
      expect(MockEntityAdapter.syncLegacyFlags).toHaveBeenCalledWith(mockEntity, mockManager);
    });
  });

  describe('applyRacialPassives', () => {
    beforeEach(() => {
      mockManager.effectsByEntity.set('player1', []);
    });

    it('should apply Rockhewn stone armor passive', () => {
      StatusEffectSystemFactory.applyRacialPassives('player1', 'Rockhewn', mockManager);

      expect(MockStatusEffect.createRacialEffect).toHaveBeenCalledWith('stoneArmor', 'player1', {
        armor: 6,
        initialArmor: 6,
        degradationPerHit: 1,
        name: 'Stone Armor',
        description: 'Starts with 6 armor that degrades by 1 with each hit taken.'
      });
    });

    it('should apply Crestfallen moonbeam passive', () => {
      StatusEffectSystemFactory.applyRacialPassives('player1', 'Crestfallen', mockManager);

      expect(MockStatusEffect.createRacialEffect).toHaveBeenCalledWith('moonbeam', 'player1', {
        healthThreshold: 0.5,
        name: 'Moonbeam',
        description: 'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted.'
      });
    });

    it('should apply Kinfolk life bond passive', () => {
      StatusEffectSystemFactory.applyRacialPassives('player1', 'Kinfolk', mockManager);

      expect(MockStatusEffect.createRacialEffect).toHaveBeenCalledWith('lifeBond', 'player1', {
        healingPercent: 0.05,
        name: 'Life Bond',
        description: "At the end of each round, heal for 5% of the monster's remaining HP."
      });
    });

    it('should apply Lich undying passive', () => {
      StatusEffectSystemFactory.applyRacialPassives('player1', 'Lich', mockManager);

      expect(MockStatusEffect.createRacialEffect).toHaveBeenCalledWith('undying', 'player1', {
        resurrectedHp: 1,
        usesLeft: 1,
        name: 'Undying',
        description: 'Return to 1 HP the first time you would die.'
      });
    });

    it('should not apply passives for unknown races', () => {
      StatusEffectSystemFactory.applyRacialPassives('player1', 'UnknownRace', mockManager);

      expect(MockStatusEffect.createRacialEffect).not.toHaveBeenCalled();
    });

    it('should not apply passives if race config is missing', () => {
      const mockConfig = { raceAttributes: {} };
      require('../../../../server/config').__setMockConfig(mockConfig);

      StatusEffectSystemFactory.applyRacialPassives('player1', 'Rockhewn', mockManager);

      expect(MockStatusEffect.createRacialEffect).not.toHaveBeenCalled();
    });
  });

  describe('createTestScenarios', () => {
    let testScenarios: any;

    beforeEach(() => {
      mockManager.applyEffect.mockReturnValue({ id: 'effect-123', type: 'poison' } as any);
      mockManager.getEffectsByType.mockReturnValue([
        { id: 'effect-123', type: 'poison' },
        { id: 'effect-456', type: 'poison' }
      ] as any);
      mockManager.calculateModifiedValue.mockImplementation((entityId, type, baseValue) => {
        if (type === 'damageDealt') return 80;
        if (type === 'damageTaken') return 125;
        return baseValue;
      });
      mockManager.getEffectStatistics.mockReturnValue({ totalEffects: 5 });

      testScenarios = StatusEffectSystemFactory.createTestScenarios(mockManager, mockEntities);
    });

    it('should create poison stacking test scenario', () => {
      const result = testScenarios.testPoisonStacking();

      expect(mockManager.applyEffect).toHaveBeenCalledTimes(2);
      expect(mockManager.applyEffect).toHaveBeenCalledWith(
        'player1', 'poison', { damage: 5, turns: 3 }, 'test1', 'Test Source 1', expect.any(Array)
      );
      expect(mockManager.applyEffect).toHaveBeenCalledWith(
        'player1', 'poison', { damage: 3, turns: 2 }, 'test2', 'Test Source 2', expect.any(Array)
      );
      expect(result.poisonEffects).toHaveLength(2);
      expect(result.log).toEqual(expect.any(Array));
    });

    it('should create percentage calculations test scenario', () => {
      const result = testScenarios.testPercentageCalculations();

      expect(mockManager.applyEffect).toHaveBeenCalledWith(
        'player1', 'vulnerable', { damageIncrease: 25, turns: 3 }, 'test', 'Test', expect.any(Array)
      );
      expect(mockManager.applyEffect).toHaveBeenCalledWith(
        'player1', 'weakened', { damageReduction: 0.2, turns: 2 }, 'test', 'Test', expect.any(Array)
      );
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('player1', 'damageDealt', 100);
      expect(mockManager.calculateModifiedValue).toHaveBeenCalledWith('player1', 'damageTaken', 100);
      expect(result.damageDealt).toBe(80);
      expect(result.damageTaken).toBe(125);
    });

    it('should create racial passives test scenario', () => {
      const entitiesWithRaces = new Map([
        ['player1', { id: 'player1', race: 'Rockhewn' }],
        ['player2', { id: 'player2', race: 'Crestfallen' }],
        ['monster1', { id: 'monster1', race: 'Monster' }]
      ]);

      const racialScenarios = StatusEffectSystemFactory.createTestScenarios(mockManager, entitiesWithRaces);
      const result = racialScenarios.testRacialPassives();

      expect(mockManager.applyRacialPassives).toHaveBeenCalledWith('player1', 'Rockhewn', expect.any(Array));
      expect(mockManager.applyRacialPassives).toHaveBeenCalledWith('player2', 'Crestfallen', expect.any(Array));
      expect(result.stats).toEqual({ totalEffects: 5 });
    });
  });

  describe('validateSystem', () => {
    let mockSystem: any;

    beforeEach(() => {
      mockSystem = {
        manager: mockManager,
        entities: mockEntities,
        getStats: jest.fn().mockReturnValue({ totalEffects: 3 })
      };

      mockManager.effectsByEntity = new Map([
        ['player1', []],
        ['player2', []]
      ]);
    });

    it('should validate system with all valid entities', () => {
      MockEntityAdapter.validateEntity.mockReturnValue(true);

      const results = StatusEffectSystemFactory.validateSystem(mockSystem);

      expect(results.valid).toBe(true);
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.stats).toEqual({ totalEffects: 3 });
    });

    it('should detect invalid entities', () => {
      MockEntityAdapter.validateEntity.mockImplementation((entity) => {
        return entity.id !== 'player2';
      });

      const results = StatusEffectSystemFactory.validateSystem(mockSystem);

      expect(results.valid).toBe(false);
      expect(results.errors).toContain('Invalid entity: player2');
    });

    it('should detect orphaned effects', () => {
      mockManager.effectsByEntity.set('orphan1', []);

      const results = StatusEffectSystemFactory.validateSystem(mockSystem);

      expect(results.warnings).toContain('Orphaned effects for entity: orphan1');
    });

    it('should handle mixed validation results', () => {
      MockEntityAdapter.validateEntity.mockImplementation((entity) => {
        return entity.id !== 'monster1';
      });
      mockManager.effectsByEntity.set('orphan1', []);

      const results = StatusEffectSystemFactory.validateSystem(mockSystem);

      expect(results.valid).toBe(false);
      expect(results.errors).toContain('Invalid entity: monster1');
      expect(results.warnings).toContain('Orphaned effects for entity: orphan1');
    });
  });

  describe('Error Handling', () => {
    it('should handle EntityAdapter errors gracefully', () => {
      MockEntityAdapter.createEntitiesMap.mockImplementation(() => {
        throw new Error('EntityAdapter error');
      });

      expect(() => StatusEffectSystemFactory.createSystem(mockPlayers)).toThrow('EntityAdapter error');
    });

    it('should handle NewStatusEffectManager initialization errors', () => {
      MockNewStatusEffectManager.mockImplementation(() => {
        throw new Error('Manager initialization error');
      });

      expect(() => StatusEffectSystemFactory.createSystem(mockPlayers)).toThrow('Manager initialization error');
    });

    it('should handle missing racial configurations', () => {
      const mockConfig = { raceAttributes: {} };
      require('../../../../server/config').__setMockConfig(mockConfig);

      expect(() => StatusEffectSystemFactory.createSystem(mockPlayers)).not.toThrow();
      expect(mockManager.applyRacialPassives).not.toHaveBeenCalled();
    });
  });
});

// Mock config module
jest.mock('../../../../server/config', () => {
  let mockConfig = {};
  
  return {
    __esModule: true,
    default: mockConfig,
    __setMockConfig: (config: any) => {
      Object.assign(mockConfig, config);
    }
  };
});

// Mock logger module
jest.mock('../../../../server/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));