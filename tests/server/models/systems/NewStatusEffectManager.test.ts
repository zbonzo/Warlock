/**
 * @fileoverview Tests for NewStatusEffectManager
 * Comprehensive test suite for individual status effect instance management
 */

import NewStatusEffectManager from '../../../../server/models/systems/NewStatusEffectManager';
import StatusEffect from '../../../../server/models/systems/StatusEffect';

// Mock dependencies
jest.mock('../../../../server/models/systems/StatusEffect');
jest.mock('../../../../server/config');
jest.mock('../../../../server/config/messages');
jest.mock('../../../../server/utils/logger');

const MockStatusEffect = StatusEffect as jest.MockedClass<typeof StatusEffect>;

// Test interfaces
interface MockEntity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive?: boolean;
  isWarlock?: boolean;
  race?: string;
  isVulnerable?: boolean;
  vulnerabilityIncrease?: number;
  stoneArmorIntact?: boolean;
  stoneArmorValue?: number;
  processStoneArmorDegradation?: jest.Mock;
}

interface MockWarlockSystem {
  markWarlockDetected?: jest.Mock;
}

describe('NewStatusEffectManager', () => {
  let manager: NewStatusEffectManager;
  let mockEntities: Map<string, MockEntity>;
  let mockWarlockSystem: MockWarlockSystem;
  let mockPlayer: MockEntity;
  let mockMonster: MockEntity;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock entities
    mockPlayer = {
      id: 'player1',
      name: 'Test Player',
      hp: 100,
      maxHp: 100,
      isAlive: true,
      isWarlock: false,
      race: 'Human',
      isVulnerable: false,
      vulnerabilityIncrease: 0,
      stoneArmorIntact: false,
      processStoneArmorDegradation: jest.fn()
    };

    mockMonster = {
      id: 'monster1',
      name: 'Test Monster',
      hp: 200,
      maxHp: 200,
      isAlive: true,
      race: 'Monster'
    };

    mockEntities = new Map([
      ['player1', mockPlayer],
      ['monster1', mockMonster]
    ]);

    mockWarlockSystem = {
      markWarlockDetected: jest.fn()
    };

    // Mock config
    const mockConfig = {
      statusEffects: {
        poison: { stackable: true, refreshable: false },
        vulnerable: { stackable: false, refreshable: true },
        stunned: { stackable: false, refreshable: false },
        getEffectMessage: jest.fn().mockReturnValue('Mock message')
      },
      raceAttributes: {
        Rockhewn: { name: 'Rockhewn' },
        Crestfallen: { name: 'Crestfallen' },
        Kinfolk: { name: 'Kinfolk' },
        Lich: { name: 'Lich' }
      }
    };

    require('../../../../server/config').__setMockConfig(mockConfig);

    manager = new NewStatusEffectManager(mockEntities, mockWarlockSystem);
  });

  describe('Constructor', () => {
    it('should initialize with empty entities map when none provided', () => {
      const emptyManager = new NewStatusEffectManager();
      expect(emptyManager.getTotalActiveEffects()).toBe(0);
    });

    it('should initialize with provided entities', () => {
      expect(manager.getTotalActiveEffects()).toBe(0);
      expect(manager.getEffectStatistics().totalEntities).toBe(2);
    });

    it('should initialize without warlock system', () => {
      const managerWithoutWarlock = new NewStatusEffectManager(mockEntities);
      expect(managerWithoutWarlock).toBeDefined();
    });
  });

  describe('Entity Management', () => {
    it('should add entity successfully', () => {
      const newEntity = {
        id: 'player2',
        name: 'New Player',
        hp: 80,
        maxHp: 80,
        isAlive: true
      };

      manager.addEntity('player2', newEntity);

      const stats = manager.getEffectStatistics();
      expect(stats.totalEntities).toBe(3);
    });

    it('should remove entity successfully', () => {
      manager.removeEntity('player1');

      const stats = manager.getEffectStatistics();
      expect(stats.totalEntities).toBe(1);
    });

    it('should initialize effects array for new entities', () => {
      const newEntity = {
        id: 'player3',
        name: 'Another Player',
        hp: 90,
        maxHp: 90,
        isAlive: true
      };

      manager.addEntity('player3', newEntity);
      expect(manager.getAllEffects('player3')).toEqual([]);
    });
  });

  describe('Effect Application', () => {
    let mockStatusEffect: jest.Mocked<StatusEffect>;

    beforeEach(() => {
      mockStatusEffect = {
        id: 'effect-123',
        type: 'poison',
        isActive: true,
        turnsRemaining: 3,
        priority: 0,
        params: { damage: 5 },
        sourceName: 'Test Source',
        refresh: jest.fn(),
        processTurn: jest.fn().mockReturnValue({ shouldRemove: false, effects: [] }),
        getSummary: jest.fn().mockReturnValue({ id: 'effect-123', type: 'poison' }),
        getCalculationContribution: jest.fn().mockReturnValue({
          additive: 0,
          multiplicative: 1,
          percentage: 0,
          priority: 0
        }),
        preventsAction: jest.fn().mockReturnValue(false)
      } as any;

      MockStatusEffect.mockImplementation(() => mockStatusEffect);
    });

    it('should apply new effect successfully', () => {
      const result = manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 }, 'source1', 'Test Source');

      expect(result).toBe(mockStatusEffect);
      expect(MockStatusEffect).toHaveBeenCalledWith('poison', { damage: 5, turns: 3 }, 'source1', 'Test Source', 'player1');
    });

    it('should handle legacy 4-parameter signature', () => {
      const log: any[] = [];
      const result = manager.applyEffect('player1', 'poison', { damage: 5 }, log);

      expect(result).toBe(mockStatusEffect);
      expect(MockStatusEffect).toHaveBeenCalledWith('poison', { damage: 5 }, 'System', 'Combat', 'player1');
    });

    it('should return null for unknown target', () => {
      const result = manager.applyEffect('unknown', 'poison', { damage: 5 });

      expect(result).toBeNull();
    });

    it('should return null for unknown effect type', () => {
      const result = manager.applyEffect('player1', 'unknownEffect', {});

      expect(result).toBeNull();
    });

    it('should stack effects when stackable', () => {
      // Apply first poison effect
      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });

      // Apply second poison effect (should stack)
      const result = manager.applyEffect('player1', 'poison', { damage: 3, turns: 2 });

      expect(result).toBe(mockStatusEffect);
      expect(manager.getEffectsByType('player1', 'poison')).toHaveLength(2);
    });

    it('should refresh effects when refreshable', () => {
      // Apply initial vulnerable effect
      manager.applyEffect('player1', 'vulnerable', { damageIncrease: 25, turns: 2 });

      // Apply second vulnerable effect (should refresh)
      const result = manager.applyEffect('player1', 'vulnerable', { damageIncrease: 30, turns: 3 });

      expect(mockStatusEffect.refresh).toHaveBeenCalledWith({ damageIncrease: 30, turns: 3 }, false);
    });

    it('should not apply duplicate non-stackable effects', () => {
      // Apply first stunned effect
      const first = manager.applyEffect('player1', 'stunned', { turns: 2 });

      // Try to apply second stunned effect (should return existing)
      const second = manager.applyEffect('player1', 'stunned', { turns: 3 });

      expect(second).toBe(first);
    });
  });

  describe('Effect Removal', () => {
    it('should remove effect by ID successfully', () => {
      const effect = manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });

      const removed = manager.removeEffect('player1', effect!.id);

      expect(removed).toBe(true);
      expect(manager.getAllEffects('player1')).toHaveLength(0);
    });

    it('should return false for non-existent effect ID', () => {
      const removed = manager.removeEffect('player1', 'non-existent');

      expect(removed).toBe(false);
    });

    it('should remove effects by type successfully', () => {
      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });
      manager.applyEffect('player1', 'poison', { damage: 3, turns: 2 });

      const removedCount = manager.removeEffectsByType('player1', 'poison');

      expect(removedCount).toBe(2);
      expect(manager.getEffectsByType('player1', 'poison')).toHaveLength(0);
    });
  });

  describe('Effect Processing', () => {
    it('should process timed effects for all alive entities', () => {
      const log: any[] = [];
      mockPlayer.isAlive = true;
      mockMonster.isAlive = true;

      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });
      manager.applyEffect('monster1', 'vulnerable', { damageIncrease: 25, turns: 2 });

      manager.processTimedEffects(log);

      expect(mockStatusEffect.processTurn).toHaveBeenCalledTimes(2);
    });

    it('should skip dead entities during processing', () => {
      const log: any[] = [];
      mockPlayer.isAlive = false;
      mockMonster.isAlive = true;

      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });
      manager.applyEffect('monster1', 'vulnerable', { damageIncrease: 25, turns: 2 });

      manager.processTimedEffects(log);

      expect(mockStatusEffect.processTurn).toHaveBeenCalledTimes(1);
    });

    it('should remove expired effects', () => {
      const log: any[] = [];
      mockStatusEffect.processTurn.mockReturnValue({ shouldRemove: true, effects: [] });

      manager.applyEffect('player1', 'poison', { damage: 5, turns: 1 });
      manager.processTimedEffects(log);

      expect(manager.getAllEffects('player1')).toHaveLength(0);
    });

    it('should handle side effects from processing', () => {
      const log: any[] = [];
      const sideEffect = {
        type: 'warlock_detection',
        targetId: 'player1',
        sourceId: 'source1',
        message: 'Warlock detected!'
      };

      mockStatusEffect.processTurn.mockReturnValue({
        shouldRemove: false,
        effects: [sideEffect]
      });

      manager.applyEffect('player1', 'healingOverTime', { amount: 10, turns: 3 });
      manager.processTimedEffects(log);

      expect(mockWarlockSystem.markWarlockDetected).toHaveBeenCalledWith('player1', log);
    });
  });

  describe('Effect Queries', () => {
    beforeEach(() => {
      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });
      manager.applyEffect('player1', 'vulnerable', { damageIncrease: 25, turns: 2 });
      manager.applyEffect('monster1', 'stunned', { turns: 1 });
    });

    it('should check if entity has effect type', () => {
      expect(manager.hasEffect('player1', 'poison')).toBe(true);
      expect(manager.hasEffect('player1', 'stunned')).toBe(false);
      expect(manager.hasEffect('monster1', 'stunned')).toBe(true);
    });

    it('should get effects by type', () => {
      const poisonEffects = manager.getEffectsByType('player1', 'poison');
      expect(poisonEffects).toHaveLength(1);
      expect(poisonEffects[0].type).toBe('poison');
    });

    it('should get all effects for entity', () => {
      const allEffects = manager.getAllEffects('player1');
      expect(allEffects).toHaveLength(2);
    });

    it('should return empty array for non-existent entity', () => {
      const effects = manager.getAllEffects('non-existent');
      expect(effects).toEqual([]);
    });
  });

  describe('Calculation Modifications', () => {
    beforeEach(() => {
      mockStatusEffect.getCalculationContribution.mockReturnValue({
        additive: 5,
        multiplicative: 1.1,
        percentage: 25,
        priority: 0
      });

      manager.applyEffect('player1', 'vulnerable', { damageIncrease: 25 });
    });

    it('should calculate modified values with additive effects', () => {
      const result = manager.calculateModifiedValue('player1', 'damageTaken', 100);

      // Base: 100, +5 additive, +25% percentage, *1.1 multiplicative
      // Expected: ((100 + 5) * 1.25) * 1.1 = 144.375 -> 144 (floored)
      expect(result).toBe(144);
    });

    it('should return base value when no effects present', () => {
      const result = manager.calculateModifiedValue('monster1', 'damageTaken', 100);
      expect(result).toBe(100);
    });

    it('should not go below zero', () => {
      mockStatusEffect.getCalculationContribution.mockReturnValue({
        additive: -200,
        multiplicative: 1,
        percentage: 0,
        priority: 0
      });

      const result = manager.calculateModifiedValue('player1', 'armor', 50);
      expect(result).toBe(0);
    });
  });

  describe('Action Prevention', () => {
    beforeEach(() => {
      mockStatusEffect.preventsAction.mockImplementation((actionType: string) => {
        return actionType === 'ability';
      });

      manager.applyEffect('player1', 'stunned', { turns: 2 });
    });

    it('should check if action is prevented', () => {
      expect(manager.isActionPrevented('player1', 'ability')).toBe(true);
      expect(manager.isActionPrevented('player1', 'move')).toBe(false);
    });

    it('should return false for entities without effects', () => {
      expect(manager.isActionPrevented('monster1', 'ability')).toBe(false);
    });
  });

  describe('Racial Passives', () => {
    it('should apply Rockhewn stone armor', () => {
      manager.applyRacialPassives('player1', 'Rockhewn');

      expect(MockStatusEffect).toHaveBeenCalledWith(
        'stoneArmor',
        expect.objectContaining({
          armor: 6,
          isPassive: true,
          isPermanent: true,
          degradationPerHit: 1
        }),
        'player1',
        'Stone Armor',
        'player1'
      );
    });

    it('should apply Crestfallen moonbeam', () => {
      manager.applyRacialPassives('player1', 'Crestfallen');

      expect(MockStatusEffect).toHaveBeenCalledWith(
        'moonbeam',
        expect.objectContaining({
          isPassive: true,
          isPermanent: true,
          healthThreshold: 0.5
        }),
        'player1',
        'Moonbeam',
        'player1'
      );
    });

    it('should apply Kinfolk life bond', () => {
      manager.applyRacialPassives('player1', 'Kinfolk');

      expect(MockStatusEffect).toHaveBeenCalledWith(
        'lifeBond',
        expect.objectContaining({
          healingPercent: 0.05,
          isPassive: true,
          isPermanent: true
        }),
        'player1',
        'Life Bond',
        'player1'
      );
    });

    it('should apply Lich undying', () => {
      manager.applyRacialPassives('player1', 'Lich');

      expect(MockStatusEffect).toHaveBeenCalledWith(
        'undying',
        expect.objectContaining({
          resurrectedHp: 1,
          isPassive: true,
          usesLeft: 1
        }),
        'player1',
        'Undying',
        'player1'
      );
    });

    it('should not apply passives for unknown races', () => {
      manager.applyRacialPassives('player1', 'UnknownRace');

      expect(MockStatusEffect).not.toHaveBeenCalled();
    });
  });

  describe('Clear Effects', () => {
    beforeEach(() => {
      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });
      manager.applyEffect('player1', 'vulnerable', { damageIncrease: 25, turns: 2 });
      mockPlayer.isVulnerable = true;
      mockPlayer.vulnerabilityIncrease = 25;
    });

    it('should clear all effects from entity', () => {
      manager.clearAllEffects('player1');

      expect(manager.getAllEffects('player1')).toHaveLength(0);
      expect(mockPlayer.isVulnerable).toBe(false);
      expect(mockPlayer.vulnerabilityIncrease).toBe(0);
    });

    it('should deactivate effects instead of removing them', () => {
      manager.clearAllEffects('player1');

      // Effects should be deactivated but still in the array
      const stats = manager.getEffectStatistics();
      expect(stats.totalEffects).toBe(0); // Active effects count
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      manager.applyEffect('player1', 'poison', { damage: 5, turns: 3 });
      manager.applyEffect('player1', 'poison', { damage: 3, turns: 2 }); // Stackable
      manager.applyEffect('monster1', 'vulnerable', { damageIncrease: 25, turns: 2 });
    });

    it('should get effect statistics', () => {
      const stats = manager.getEffectStatistics();

      expect(stats.totalEffects).toBe(3);
      expect(stats.effectsByType.poison).toBe(2);
      expect(stats.effectsByType.vulnerable).toBe(1);
      expect(stats.totalEntities).toBe(2);
    });

    it('should get total active effects count', () => {
      expect(manager.getTotalActiveEffects()).toBe(3);
    });

    it('should get all active effects summary', () => {
      const activeEffects = manager.getAllActiveEffects();

      expect(activeEffects).toHaveProperty('player1');
      expect(activeEffects).toHaveProperty('monster1');
      expect(activeEffects.player1.entityName).toBe('Test Player');
      expect(activeEffects.player1.effects).toHaveLength(2);
    });
  });

  describe('Legacy Compatibility Methods', () => {
    beforeEach(() => {
      manager.applyEffect('player1', 'stunned', { turns: 2 });
      manager.applyEffect('player1', 'invisible', { turns: 3 });
    });

    it('should check if player is stunned', () => {
      expect(manager.isPlayerStunned('player1')).toBe(true);
      expect(manager.isPlayerStunned('monster1')).toBe(false);
    });

    it('should check if player is invisible', () => {
      expect(manager.isPlayerInvisible('player1')).toBe(true);
      expect(manager.isPlayerInvisible('monster1')).toBe(false);
    });

    it('should get player effects in legacy format', () => {
      const effects = manager.getPlayerEffects('player1');

      expect(effects).toHaveProperty('stunned');
      expect(effects).toHaveProperty('invisible');
      expect(effects.stunned.turns).toBe(2);
    });

    it('should apply effects with legacy signature', () => {
      const result = manager.applyEffectLegacy('monster1', 'poison', { damage: 10, turns: 3 });

      expect(result).toBeDefined();
      expect(result!.type).toBe('poison');
    });

    it('should apply multiple effects', () => {
      const effectsToApply = {
        poison: { damage: 5, turns: 3 },
        vulnerable: { damageIncrease: 25, turns: 2 }
      };

      const appliedCount = manager.applyMultipleEffects('monster1', effectsToApply);

      expect(appliedCount).toBe(2);
      expect(manager.hasEffect('monster1', 'poison')).toBe(true);
      expect(manager.hasEffect('monster1', 'vulnerable')).toBe(true);
    });

    it('should remove effect by type', () => {
      const removed = manager.removeEffectByType('player1', 'stunned');

      expect(removed).toBe(true);
      expect(manager.hasEffect('player1', 'stunned')).toBe(false);
    });

    it('should get effect duration', () => {
      const duration = manager.getEffectDuration('player1', 'stunned');

      expect(duration).toBe(2);
    });

    it('should get legacy statistics format', () => {
      const stats = manager.getEffectStatisticsLegacy();

      expect(stats).toHaveProperty('totalEffects');
      expect(stats).toHaveProperty('effectsByType');
      expect(stats).toHaveProperty('playersCounts');
      expect(stats.playersCounts.stunned).toBe(1);
      expect(stats.playersCounts.invisible).toBe(1);
    });
  });

  describe('Special Effect Handling', () => {
    it('should handle vulnerable effect application', () => {
      manager.applyEffect('player1', 'vulnerable', { damageIncrease: 30 });

      expect(mockPlayer.isVulnerable).toBe(true);
      expect(mockPlayer.vulnerabilityIncrease).toBe(30);
    });

    it('should handle healing over time with healer info', () => {
      manager.applyEffect('player1', 'healingOverTime', {
        amount: 10,
        turns: 3,
        healerId: 'healer1',
        healerName: 'Test Healer',
        isWarlock: true
      });

      const effects = manager.getEffectsByType('player1', 'healingOverTime');
      expect(effects[0].params.healerId).toBe('healer1');
      expect(effects[0].params.healerName).toBe('Test Healer');
      expect(effects[0].params.isWarlock).toBe(true);
    });
  });
});

// Mock config module
jest.mock('../../../../server/config', () => {
  const mockConfig = {};

  return {
    __esModule: true,
    default: mockConfig,
    __setMockConfig: (config: any) => {
      Object.assign(mockConfig, config);
    }
  };
});

// Mock messages module
jest.mock('../../../../server/config/messages', () => ({
  __esModule: true,
  default: {
    getEvent: jest.fn().mockReturnValue({ type: 'test', message: 'Test message' }),
    getAbilityMessage: jest.fn().mockReturnValue('Test ability message'),
    formatMessage: jest.fn().mockReturnValue('Formatted message')
  }
}));

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
