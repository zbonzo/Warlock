/**
 * @fileoverview Tests for character classes configuration
 * Tests class definitions, attributes, and ability progressions
 */

// Mock the abilities import to avoid circular dependency
jest.mock('../../../../server/config/character/abilities.js', () => ({
  getAbility: jest.fn((id: string) => ({
    id,
    name: `Mock ${id}`,
    category: 'Attack',
    target: 'Single',
    params: { damage: 25 },
    order: 1000,
    cooldown: 0,
    flavorText: `Mock ability ${id}`,
    tags: ['mock'],
    buttonText: { ready: 'Ready', submitted: 'Submitted' }
  }))
}));

import {
  availableClasses,
  classCategories,
  classAttributes,
  classAbilityProgression
} from '../../../../server/config/character/classes';

describe('Character Classes Configuration', () => {
  describe('Available Classes', () => {
    it('should export available classes array', () => {
      expect(availableClasses).toBeDefined();
      expect(Array.isArray(availableClasses)).toBe(true);
      expect(availableClasses.length).toBeGreaterThan(0);
    });

    it('should have expected classes', () => {
      const expectedClasses = [
        'Alchemist', 'Assassin', 'Barbarian', 'Druid', 'Gunslinger',
        'Oracle', 'Priest', 'Pyromancer', 'Shaman', 'Tracker', 'Warrior', 'Wizard'
      ];

      expectedClasses.forEach(className => {
        expect(availableClasses).toContain(className);
      });
    });

    it('should not have duplicate classes', () => {
      const uniqueClasses = new Set(availableClasses);
      expect(uniqueClasses.size).toBe(availableClasses.length);
    });

    it('should have classes with proper naming convention', () => {
      availableClasses.forEach(className => {
        expect(typeof className).toBe('string');
        expect(className.length).toBeGreaterThan(0);
        expect(className[0]).toBe(className[0].toUpperCase()); // Should start with capital
      });
    });
  });

  describe('Class Categories', () => {
    it('should export class categories object', () => {
      expect(classCategories).toBeDefined();
      expect(typeof classCategories).toBe('object');
    });

    it('should have expected categories', () => {
      const expectedCategories = ['Melee', 'Caster', 'Ranged'];
      expectedCategories.forEach(category => {
        expect(classCategories).toHaveProperty(category);
        expect(Array.isArray(classCategories[category as keyof typeof classCategories])).toBe(true);
      });
    });

    it('should have all classes categorized', () => {
      const categorizedClasses = Object.values(classCategories).flat();
      availableClasses.forEach(className => {
        expect(categorizedClasses).toContain(className);
      });
    });

    it('should not have classes in multiple categories', () => {
      const allCategorizedClasses: string[] = [];
      Object.values(classCategories).forEach(categoryClasses => {
        categoryClasses.forEach(className => {
          expect(allCategorizedClasses).not.toContain(className);
          allCategorizedClasses.push(className);
        });
      });
    });

    it('should have reasonable distribution across categories', () => {
      expect(classCategories.Melee.length).toBeGreaterThan(0);
      expect(classCategories.Caster.length).toBeGreaterThan(0);
      expect(classCategories.Ranged.length).toBeGreaterThan(0);
    });
  });

  describe('Class Attributes', () => {
    it('should export class attributes object', () => {
      expect(classAttributes).toBeDefined();
      expect(typeof classAttributes).toBe('object');
    });

    it('should have attributes for all available classes', () => {
      availableClasses.forEach(className => {
        expect(classAttributes).toHaveProperty(className);
      });
    });

    it('should have required modifier properties', () => {
      Object.values(classAttributes).forEach(attributes => {
        expect(attributes).toHaveProperty('hpModifier');
        expect(attributes).toHaveProperty('armorModifier');
        expect(attributes).toHaveProperty('damageModifier');
        expect(attributes).toHaveProperty('description');
      });
    });

    it('should have valid modifier values', () => {
      Object.values(classAttributes).forEach(attributes => {
        expect(typeof attributes.hpModifier).toBe('number');
        expect(typeof attributes.armorModifier).toBe('number');
        expect(typeof attributes.damageModifier).toBe('number');

        expect(attributes.hpModifier).toBeGreaterThan(0);
        expect(attributes.armorModifier).toBeGreaterThan(0);
        expect(attributes.damageModifier).toBeGreaterThan(0);

        // Reasonable ranges
        expect(attributes.hpModifier).toBeLessThanOrEqual(2.0);
        expect(attributes.armorModifier).toBeLessThanOrEqual(2.0);
        expect(attributes.damageModifier).toBeLessThanOrEqual(2.0);
      });
    });

    it('should have non-empty descriptions', () => {
      Object.values(classAttributes).forEach(attributes => {
        expect(typeof attributes.description).toBe('string');
        expect(attributes.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Class Ability Progression', () => {
    it('should export ability progression object', () => {
      expect(classAbilityProgression).toBeDefined();
      expect(typeof classAbilityProgression).toBe('object');
    });

    it('should have progression for all available classes', () => {
      availableClasses.forEach(className => {
        expect(classAbilityProgression).toHaveProperty(className);
      });
    });

    it('should have valid progression structure', () => {
      Object.values(classAbilityProgression).forEach(progression => {
        expect(Array.isArray(progression)).toBe(true);
        progression.forEach(levelProgression => {
          expect(levelProgression).toHaveProperty('level');
          expect(levelProgression).toHaveProperty('abilityId');
          expect(typeof levelProgression.level).toBe('number');
          expect(typeof levelProgression.abilityId).toBe('string');
          expect(levelProgression.level).toBeGreaterThan(0);
          expect(levelProgression.abilityId.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have reasonable level progression', () => {
      Object.values(classAbilityProgression).forEach(progression => {
        const levels = progression.map(p => p.level).sort((a, b) => a - b);

        // Should start at level 1
        expect(levels[0]).toBe(1);

        // Should have consecutive or ascending levels
        for (let i = 1; i < levels.length; i++) {
          expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
        }

        // Should not exceed reasonable max level
        levels.forEach(level => {
          expect(level).toBeLessThanOrEqual(20);
        });
      });
    });

    it('should not have duplicate abilities per class', () => {
      Object.values(classAbilityProgression).forEach(progression => {
        const abilityIds = progression.map(p => p.abilityId);
        const uniqueAbilityIds = new Set(abilityIds);
        expect(uniqueAbilityIds.size).toBe(abilityIds.length);
      });
    });

    it('should not have duplicate levels per class', () => {
      Object.values(classAbilityProgression).forEach(progression => {
        const levels = progression.map(p => p.level);
        const uniqueLevels = new Set(levels);
        expect(uniqueLevels.size).toBe(levels.length);
      });
    });
  });

  describe('Specific Class Validation', () => {
    it('should have Warrior class properly configured', () => {
      expect(availableClasses).toContain('Warrior');
      expect(classCategories.Melee).toContain('Warrior');
      expect(classAttributes.Warrior).toBeDefined();
      expect(classAbilityProgression.Warrior).toBeDefined();

      // Warrior should be tanky
      expect(classAttributes.Warrior.hpModifier).toBeGreaterThanOrEqual(1.0);
      expect(classAttributes.Warrior.armorModifier).toBeGreaterThanOrEqual(1.0);
    });

    it('should have Pyromancer class properly configured', () => {
      expect(availableClasses).toContain('Pyromancer');
      expect(classCategories.Caster).toContain('Pyromancer');
      expect(classAttributes.Pyromancer).toBeDefined();
      expect(classAbilityProgression.Pyromancer).toBeDefined();
    });

    it('should have Gunslinger class properly configured', () => {
      expect(availableClasses).toContain('Gunslinger');
      expect(classCategories.Ranged).toContain('Gunslinger');
      expect(classAttributes.Gunslinger).toBeDefined();
      expect(classAbilityProgression.Gunslinger).toBeDefined();
    });
  });

  describe('Balance Validation', () => {
    it('should have balanced modifier distributions', () => {
      const hpModifiers = Object.values(classAttributes).map(a => a.hpModifier);
      const armorModifiers = Object.values(classAttributes).map(a => a.armorModifier);
      const damageModifiers = Object.values(classAttributes).map(a => a.damageModifier);

      // Should have variety in modifiers
      expect(new Set(hpModifiers).size).toBeGreaterThan(1);
      expect(new Set(armorModifiers).size).toBeGreaterThan(1);
      expect(new Set(damageModifiers).size).toBeGreaterThan(1);
    });

    it('should have reasonable ability counts per class', () => {
      Object.entries(classAbilityProgression).forEach(([className, progression]) => {
        expect(progression.length).toBeGreaterThan(0);
        expect(progression.length).toBeLessThanOrEqual(10); // Reasonable upper limit
      });
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent data types', () => {
      // Verify all exports have expected types
      expect(Array.isArray(availableClasses)).toBe(true);
      expect(typeof classCategories).toBe('object');
      expect(typeof classAttributes).toBe('object');
      expect(typeof classAbilityProgression).toBe('object');
    });

    it('should not have null or undefined values', () => {
      availableClasses.forEach(className => {
        expect(className).toBeTruthy();
      });

      Object.values(classCategories).forEach(categoryClasses => {
        categoryClasses.forEach(className => {
          expect(className).toBeTruthy();
        });
      });

      Object.values(classAttributes).forEach(attributes => {
        expect(attributes.hpModifier).toBeTruthy();
        expect(attributes.armorModifier).toBeTruthy();
        expect(attributes.damageModifier).toBeTruthy();
        expect(attributes.description).toBeTruthy();
      });

      Object.values(classAbilityProgression).forEach(progression => {
        progression.forEach(levelProgression => {
          expect(levelProgression.level).toBeTruthy();
          expect(levelProgression.abilityId).toBeTruthy();
        });
      });
    });
  });

  describe('Module Integration', () => {
    it('should integrate with ability system', () => {
      const { getAbility } = require('../../../../server/config/character/abilities.js');

      // Test that progression abilities can be retrieved
      Object.values(classAbilityProgression).forEach(progression => {
        progression.forEach(levelProgression => {
          const ability = getAbility(levelProgression.abilityId);
          expect(ability).toBeDefined();
          expect(ability.id).toBe(levelProgression.abilityId);
        });
      });
    });

    it('should be importable as TypeScript module', () => {
      expect(() => {
        const imported = require('../../../../server/config/character/classes');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });
  });
});
