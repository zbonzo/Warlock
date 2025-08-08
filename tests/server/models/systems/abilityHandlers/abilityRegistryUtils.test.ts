/**
 * @fileoverview Tests for abilityRegistryUtils functions
 */

import {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
  findAbilitiesByTypePattern,
  getAllAbilities,
  applyThreatForAbility
} from '../../../../../server/models/systems/abilityHandlers/abilityRegistryUtils';

jest.mock('@config', () => ({
  classAbilities: {
    'Warrior': [
      { type: 'slash', category: 'Attack', effect: null, target: 'Single' },
      { type: 'block', category: 'Defense', effect: 'shielded', target: 'Self' }
    ],
    'Mage': [
      { type: 'fireball', category: 'Attack', effect: null, target: 'Single' },
      { type: 'poison_bolt', category: 'Attack', effect: 'poison', target: 'Single' }
    ]
  },
  MONSTER_ID: '__monster__'
}));

describe('abilityRegistryUtils', () => {
  let mockRegistry: any;

  beforeEach(() => {
    mockRegistry = {
      registerClassAbility: jest.fn(),
      registerClassAbilities: jest.fn(),
      hasClassAbility: jest.fn().mockReturnValue(false)
    };
  });

  describe('registerAbilitiesByCategory', () => {
    it('should register all abilities of specified category', () => {
      const result = registerAbilitiesByCategory(mockRegistry, 'Attack', jest.fn());

      expect(result).toContain('slash');
      expect(result).toContain('fireball');
      expect(result).toContain('poison_bolt');
      expect(mockRegistry.registerClassAbilities).toHaveBeenCalled();
    });
  });

  describe('registerAbilitiesByEffectAndTarget', () => {
    it('should register abilities with matching effect and target', () => {
      const result = registerAbilitiesByEffectAndTarget(mockRegistry, 'poison', 'Single', jest.fn());

      expect(result).toContain('poison_bolt');
      expect(mockRegistry.registerClassAbilities).toHaveBeenCalled();
    });
  });

  describe('registerAbilitiesByCriteria', () => {
    it('should register abilities matching multiple criteria', () => {
      const criteria = { category: 'Attack', target: 'Single' };
      const result = registerAbilitiesByCriteria(mockRegistry, criteria, jest.fn());

      expect(result.length).toBeGreaterThan(0);
      expect(mockRegistry.registerClassAbilities).toHaveBeenCalled();
    });
  });

  describe('findAbilitiesByTypePattern', () => {
    it('should find abilities matching type pattern', () => {
      const result = findAbilitiesByTypePattern('poison');

      expect(result).toContain('poison_bolt');
    });
  });

  describe('getAllAbilities', () => {
    it('should return comprehensive ability breakdown', () => {
      const result = getAllAbilities();

      expect(result.byCategory.Attack).toContain('slash');
      expect(result.byEffect.poison).toContain('poison_bolt');
      expect(result.byTarget.Single).toContain('fireball');
      expect(result.all).toContain('block');
    });
  });

  describe('applyThreatForAbility', () => {
    it('should apply threat when monster controller available', () => {
      const mockSystems = {
        monsterController: {
          addThreat: jest.fn()
        }
      };
      const actor = { id: 'player1', getEffectiveArmor: () => 5 };
      const ability = { type: 'slash' };

      applyThreatForAbility(actor, '__monster__', ability, 10, 5, mockSystems);

      expect(mockSystems.monsterController.addThreat).toHaveBeenCalledWith(
        'player1', 10, 10, 5, 5
      );
    });
  });
});
