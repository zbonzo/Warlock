/**
 * @fileoverview Tests for Ability Schema validation
 * Testing Zod schema validation for abilities configuration
 */

import { z } from 'zod';
import { 
  AbilitySchema, 
  AbilitiesMapSchema,
  validateAbility,
  validateAbilitiesMap,
  safeValidateAbility,
  safeValidateAbilitiesMap,
  type Ability,
  type AbilitiesMap
} from '@config/schemas/ability.schema';

describe('Ability Schema Validation', () => {
  describe('AbilitySchema', () => {
    it('should validate correct ability structure', () => {
      const validAbility = {
        id: 'fireball',
        name: 'Fireball',
        category: 'Attack' as const,
        effect: 'burn',
        target: 'Single' as const,
        params: {
          damage: 25,
          range: 'medium'
        },
        order: 10,
        cooldown: 2,
        flavorText: 'A powerful fire spell',
        tags: ['fire', 'ranged'],
        buttonText: {
          ready: 'Cast Fireball',
          submitted: 'Fireball Cast!'
        }
      };

      const result = AbilitySchema.safeParse(validAbility);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('fireball');
        expect(result.data.name).toBe('Fireball');
        expect(result.data.category).toBe('Attack');
        expect(result.data.cooldown).toBe(2);
      }
    });

    it('should validate ability with null effect', () => {
      const abilityWithNullEffect = {
        id: 'slash',
        name: 'Slash',
        category: 'Attack' as const,
        effect: null,
        target: 'Single' as const,
        params: { damage: 15 },
        order: 5,
        cooldown: 0,
        flavorText: 'Basic sword attack',
        tags: ['melee']
      };

      const result = AbilitySchema.safeParse(abilityWithNullEffect);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.effect).toBeNull();
      }
    });

    it('should reject ability with invalid category', () => {
      const invalidAbility = {
        id: 'test',
        name: 'Test',
        category: 'InvalidCategory',
        effect: null,
        target: 'Single',
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test ability',
        tags: ['test']
      };

      const result = AbilitySchema.safeParse(invalidAbility);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('category');
      }
    });

    it('should reject ability with invalid target', () => {
      const invalidAbility = {
        id: 'test',
        name: 'Test',
        category: 'Attack',
        effect: null,
        target: 'InvalidTarget',
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test ability',
        tags: ['test']
      };

      const result = AbilitySchema.safeParse(invalidAbility);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('target');
      }
    });

    it('should reject ability with negative cooldown', () => {
      const invalidAbility = {
        id: 'test',
        name: 'Test',
        category: 'Attack',
        effect: null,
        target: 'Single',
        params: {},
        order: 1,
        cooldown: -1,
        flavorText: 'Test ability',
        tags: ['test']
      };

      const result = AbilitySchema.safeParse(invalidAbility);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('cooldown');
        expect(result.error.issues[0].code).toBe('too_small');
      }
    });

    it('should reject ability with empty tags array', () => {
      const invalidAbility = {
        id: 'test',
        name: 'Test',
        category: 'Attack',
        effect: null,
        target: 'Single',
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test ability',
        tags: []
      };

      const result = AbilitySchema.safeParse(invalidAbility);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('tags');
      }
    });

    it('should handle complex params with nested effects', () => {
      const complexAbility = {
        id: 'poisondart',
        name: 'Poison Dart',
        category: 'Attack' as const,
        effect: 'poison',
        target: 'Single' as const,
        params: {
          damage: 10,
          poisonEffect: {
            damage: 3,
            turns: 4
          }
        },
        order: 15,
        cooldown: 1,
        flavorText: 'Inflicts poison damage over time',
        tags: ['ranged', 'poison']
      };

      const result = AbilitySchema.safeParse(complexAbility);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.params.poisonEffect).toBeDefined();
      }
    });
  });

  describe('AbilitiesMapSchema', () => {
    it('should validate abilities collection', () => {
      const abilitiesMap = {
        fireball: {
          id: 'fireball',
          name: 'Fireball',
          category: 'Attack' as const,
          effect: 'burn',
          target: 'Single' as const,
          params: { damage: 25 },
          order: 10,
          cooldown: 2,
          flavorText: 'Fire attack',
          tags: ['fire']
        },
        heal: {
          id: 'heal',
          name: 'Heal',
          category: 'Heal' as const,
          effect: null,
          target: 'Self' as const,
          params: { healing: 30 },
          order: 20,
          cooldown: 1,
          flavorText: 'Restore health',
          tags: ['healing']
        }
      };

      const result = AbilitiesMapSchema.safeParse(abilitiesMap);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data)).toHaveLength(2);
        expect(result.data.fireball.name).toBe('Fireball');
        expect(result.data.heal.category).toBe('Heal');
      }
    });

    it('should reject abilities map with invalid ability', () => {
      const invalidMap = {
        badability: {
          id: 'badability',
          name: '', // Invalid: empty name
          category: 'Attack',
          effect: null,
          target: 'Single',
          params: {},
          order: 1,
          cooldown: 0,
          flavorText: 'Bad ability',
          tags: ['bad']
        }
      };

      const result = AbilitiesMapSchema.safeParse(invalidMap);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Validation Functions', () => {
    const validAbility = {
      id: 'testability',
      name: 'Test Ability',
      category: 'Special' as const,
      effect: null,
      target: 'Self' as const,
      params: { value: 10 },
      order: 1,
      cooldown: 0,
      flavorText: 'Test ability',
      tags: ['test']
    };

    describe('validateAbility', () => {
      it('should validate and return valid ability', () => {
        const result = validateAbility(validAbility);
        
        expect(result.id).toBe('testability');
        expect(result.name).toBe('Test Ability');
        expect(result.category).toBe('Special');
      });

      it('should throw on invalid ability', () => {
        const invalidAbility = { ...validAbility, category: 'Invalid' };
        
        expect(() => validateAbility(invalidAbility)).toThrow();
      });
    });

    describe('safeValidateAbility', () => {
      it('should return success result for valid ability', () => {
        const result = safeValidateAbility(validAbility);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('testability');
        }
      });

      it('should return error result for invalid ability', () => {
        const invalidAbility = { ...validAbility, cooldown: -1 };
        const result = safeValidateAbility(invalidAbility);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });
    });

    describe('validateAbilitiesMap', () => {
      it('should validate abilities map', () => {
        const map = { test: validAbility };
        const result = validateAbilitiesMap(map);
        
        expect(result.test.name).toBe('Test Ability');
      });

      it('should throw on invalid abilities map', () => {
        const invalidMap = { test: { ...validAbility, name: '' } };
        
        expect(() => validateAbilitiesMap(invalidMap)).toThrow();
      });
    });

    describe('safeValidateAbilitiesMap', () => {
      it('should return success for valid map', () => {
        const map = { test: validAbility };
        const result = safeValidateAbilitiesMap(map);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.test.name).toBe('Test Ability');
        }
      });

      it('should return error for invalid map', () => {
        const invalidMap = { test: { ...validAbility, tags: [] } };
        const result = safeValidateAbilitiesMap(invalidMap);
        
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Type Inference', () => {
    it('should provide correct TypeScript types', () => {
      type AbilityType = z.infer<typeof AbilitySchema>;
      type AbilitiesMapType = z.infer<typeof AbilitiesMapSchema>;
      
      const ability: AbilityType = {
        id: 'test',
        name: 'Test',
        category: 'Attack',
        effect: null,
        target: 'Single',
        params: {},
        order: 1,
        cooldown: 0,
        flavorText: 'Test',
        tags: ['test']
      };

      const map: AbilitiesMapType = {
        test: ability
      };

      // Type assertions to verify correct inference
      expect(typeof ability.id).toBe('string');
      expect(typeof ability.cooldown).toBe('number');
      expect(Array.isArray(ability.tags)).toBe(true);
      expect(typeof map.test).toBe('object');
    });

    it('should work with imported types', () => {
      const ability: Ability = {
        id: 'imported',
        name: 'Imported Type Test',
        category: 'Defense',
        effect: 'shield',
        target: 'Self',
        params: { armor: 5 },
        order: 1,
        cooldown: 3,
        flavorText: 'Testing imported types',
        tags: ['defense']
      };

      const map: AbilitiesMap = {
        imported: ability
      };

      expect(ability.category).toBe('Defense');
      expect(map.imported.name).toBe('Imported Type Test');
    });
  });
});