/**
 * @fileoverview Working tests for Ability Schema validation
 * Testing Zod schema validation with direct imports
 */

import { z } from 'zod';

// Import directly using relative path for now
import { 
  AbilitySchema, 
  AbilitiesMapSchema,
  validateAbility,
  type Ability,
  type AbilitiesMap
} from '../../../../server/config/schemas/ability.schema';

describe('Ability Schema Validation (Working)', () => {
  describe('AbilitySchema Basic Tests', () => {
    it('should validate minimal ability structure', () => {
      const validAbility = {
        id: 'fireball',
        name: 'Fireball',
        category: 'Attack' as const,
        effect: null,
        target: 'Single' as const,
        params: { damage: 25 },
        order: 10,
        cooldown: 2,
        flavorText: 'A powerful fire spell',
        tags: ['fire']
      };

      const result = AbilitySchema.safeParse(validAbility);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('fireball');
        expect(result.data.name).toBe('Fireball');
        expect(result.data.category).toBe('Attack');
      }
    });

    it('should reject invalid category', () => {
      const invalidAbility = {
        id: 'test',
        name: 'Test',
        category: 'Invalid' as any,
        effect: null,
        target: 'Single' as const,
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test',
        tags: ['test']
      };

      const result = AbilitySchema.safeParse(invalidAbility);
      
      expect(result.success).toBe(false);
    });

    it('should reject empty id', () => {
      const invalidAbility = {
        id: '',
        name: 'Test',
        category: 'Attack' as const,
        effect: null,
        target: 'Single' as const,
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test',
        tags: ['test']
      };

      const result = AbilitySchema.safeParse(invalidAbility);
      
      expect(result.success).toBe(false);
    });

    it('should validate with buttonText', () => {
      const abilityWithButtonText = {
        id: 'heal',
        name: 'Heal',
        category: 'Heal' as const,
        effect: null,
        target: 'Self' as const,
        params: { healing: 30 },
        order: 20,
        cooldown: 1,
        flavorText: 'Restore health',
        tags: ['healing'],
        buttonText: {
          ready: 'Cast Heal',
          submitted: 'Healing!'
        }
      };

      const result = AbilitySchema.safeParse(abilityWithButtonText);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buttonText?.ready).toBe('Cast Heal');
        expect(result.data.buttonText?.submitted).toBe('Healing!');
      }
    });
  });

  describe('AbilitiesMapSchema', () => {
    it('should validate abilities collection', () => {
      const validAbility = {
        id: 'test',
        name: 'Test',
        category: 'Special' as const,
        effect: null,
        target: 'Self' as const,
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test',
        tags: ['test']
      };

      const abilitiesMap = {
        test: validAbility
      };

      const result = AbilitiesMapSchema.safeParse(abilitiesMap);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.test.name).toBe('Test');
      }
    });
  });

  describe('Validation Functions', () => {
    const validAbility = {
      id: 'testability',
      name: 'Test Ability',
      category: 'Defense' as const,
      effect: null,
      target: 'Multi' as const,
      params: { shield: 5 },
      order: 1,
      cooldown: 2,
      flavorText: 'Test ability',
      tags: ['defense']
    };

    it('should validate ability with validateAbility function', () => {
      const result = validateAbility(validAbility);
      
      expect(result.id).toBe('testability');
      expect(result.name).toBe('Test Ability');
      expect(result.category).toBe('Defense');
    });

    it('should throw on invalid ability', () => {
      const invalidAbility = { ...validAbility, id: '' };
      
      expect(() => validateAbility(invalidAbility)).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should provide type safety with imported types', () => {
      const ability: Ability = {
        id: 'typedability',
        name: 'Typed Ability',
        category: 'Attack',
        effect: 'burn',
        target: 'Single',
        params: { damage: 20 },
        order: 5,
        cooldown: 3,
        flavorText: 'Type-safe ability',
        tags: ['typed', 'fire']
      };

      expect(ability.category).toBe('Attack');
      expect(typeof ability.cooldown).toBe('number');
      expect(Array.isArray(ability.tags)).toBe(true);
    });

    it('should work with AbilitiesMap type', () => {
      const map: AbilitiesMap = {
        ability1: {
          id: 'ability1',
          name: 'Ability One',
          category: 'Heal',
          effect: null,
          target: 'Self',
          params: {},
          order: 1,
          cooldown: 0,
          flavorText: 'First ability',
          tags: ['heal']
        }
      };

      expect(map.ability1.name).toBe('Ability One');
      expect(map.ability1.category).toBe('Heal');
    });
  });
});