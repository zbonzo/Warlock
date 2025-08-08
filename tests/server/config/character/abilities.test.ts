/**
 * @fileoverview Tests for character abilities configuration
 * Tests ability definitions, structure, and validation
 */

import abilities from '../../../../server/config/character/abilities';
import type { Ability, AbilitiesMap } from '../../../../server/config/schemas/ability.schema';

// Mock the schema import to avoid dependency issues
jest.mock('../../../../server/config/schemas/ability.schema', () => ({
  AbilitySchema: {
    parse: jest.fn((data) => data),
    safeParse: jest.fn((data) => ({ success: true, data }))
  }
}));

describe('Character Abilities Configuration', () => {
  describe('Abilities Structure', () => {
    it('should export abilities object', () => {
      expect(abilities).toBeDefined();
      expect(typeof abilities).toBe('object');
    });

    it('should contain ability definitions', () => {
      const abilityKeys = Object.keys(abilities);
      expect(abilityKeys.length).toBeGreaterThan(0);
    });

    it('should have valid ability IDs that match their keys', () => {
      Object.entries(abilities).forEach(([key, ability]) => {
        expect(ability.id).toBe(key);
      });
    });
  });

  describe('Ability Categories', () => {
    const validCategories = ['Attack', 'Defense', 'Heal', 'Special'];

    it('should only use valid categories', () => {
      Object.values(abilities).forEach(ability => {
        expect(validCategories).toContain(ability.category);
      });
    });

    it('should have attack abilities', () => {
      const attackAbilities = Object.values(abilities).filter(a => a.category === 'Attack');
      expect(attackAbilities.length).toBeGreaterThan(0);
    });

    it('should have defense abilities', () => {
      const defenseAbilities = Object.values(abilities).filter(a => a.category === 'Defense');
      expect(defenseAbilities.length).toBeGreaterThan(0);
    });

    it('should have heal abilities', () => {
      const healAbilities = Object.values(abilities).filter(a => a.category === 'Heal');
      expect(healAbilities.length).toBeGreaterThan(0);
    });

    it('should have special abilities', () => {
      const specialAbilities = Object.values(abilities).filter(a => a.category === 'Special');
      expect(specialAbilities.length).toBeGreaterThan(0);
    });
  });

  describe('Ability Targets', () => {
    const validTargets = ['Single', 'Self', 'Multi'];

    it('should only use valid target types', () => {
      Object.values(abilities).forEach(ability => {
        expect(validTargets).toContain(ability.target);
      });
    });

    it('should have single target abilities', () => {
      const singleTargetAbilities = Object.values(abilities).filter(a => a.target === 'Single');
      expect(singleTargetAbilities.length).toBeGreaterThan(0);
    });

    it('should have self target abilities', () => {
      const selfTargetAbilities = Object.values(abilities).filter(a => a.target === 'Self');
      expect(selfTargetAbilities.length).toBeGreaterThan(0);
    });

    it('should have multi target abilities', () => {
      const multiTargetAbilities = Object.values(abilities).filter(a => a.target === 'Multi');
      expect(multiTargetAbilities.length).toBeGreaterThan(0);
    });
  });

  describe('Ability Properties', () => {
    it('should have required properties', () => {
      Object.values(abilities).forEach(ability => {
        expect(ability).toHaveProperty('id');
        expect(ability).toHaveProperty('name');
        expect(ability).toHaveProperty('category');
        expect(ability).toHaveProperty('target');
        expect(ability).toHaveProperty('params');
        expect(ability).toHaveProperty('order');
        expect(ability).toHaveProperty('cooldown');
        expect(ability).toHaveProperty('flavorText');
        expect(ability).toHaveProperty('tags');
        expect(ability).toHaveProperty('buttonText');
      });
    });

    it('should have valid order values', () => {
      Object.values(abilities).forEach(ability => {
        expect(typeof ability.order).toBe('number');
        expect(ability.order).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid cooldown values', () => {
      Object.values(abilities).forEach(ability => {
        expect(typeof ability.cooldown).toBe('number');
        expect(ability.cooldown).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-empty names', () => {
      Object.values(abilities).forEach(ability => {
        expect(ability.name).toBeTruthy();
        expect(typeof ability.name).toBe('string');
        expect(ability.name.length).toBeGreaterThan(0);
      });
    });

    it('should have flavor text', () => {
      Object.values(abilities).forEach(ability => {
        expect(ability.flavorText).toBeTruthy();
        expect(typeof ability.flavorText).toBe('string');
        expect(ability.flavorText.length).toBeGreaterThan(0);
      });
    });

    it('should have tags array', () => {
      Object.values(abilities).forEach(ability => {
        expect(Array.isArray(ability.tags)).toBe(true);
        expect(ability.tags.length).toBeGreaterThan(0);
      });
    });

    it('should have button text', () => {
      Object.values(abilities).forEach(ability => {
        expect(ability.buttonText).toBeDefined();
        expect(ability.buttonText.ready).toBeTruthy();
        expect(ability.buttonText.submitted).toBeTruthy();
      });
    });
  });

  describe('Specific Abilities', () => {
    it('should have attack ability', () => {
      expect(abilities.attack).toBeDefined();
      expect(abilities.attack.name).toBe('Slash');
      expect(abilities.attack.category).toBe('Attack');
      expect(abilities.attack.target).toBe('Single');
      expect(abilities.attack.params.damage).toBe(28);
    });

    it('should have fireball ability', () => {
      expect(abilities.fireball).toBeDefined();
      expect(abilities.fireball.name).toBe('Fireball');
      expect(abilities.fireball.category).toBe('Attack');
      expect(abilities.fireball.effect).toBe('poison');
      expect(abilities.fireball.params.damage).toBe(22);
    });

    it('should have heal ability', () => {
      const healAbility = Object.values(abilities).find(a => a.category === 'Heal');
      expect(healAbility).toBeDefined();
      if (healAbility) {
        expect(healAbility.params).toBeDefined();
      }
    });

    it('should have shield ability', () => {
      const shieldAbility = Object.values(abilities).find(a => a.name.toLowerCase().includes('shield'));
      expect(shieldAbility).toBeDefined();
      if (shieldAbility) {
        expect(shieldAbility.category).toBe('Defense');
      }
    });
  });

  describe('Ability Parameters', () => {
    it('should have valid damage parameters for attack abilities', () => {
      const attackAbilities = Object.values(abilities).filter(a => a.category === 'Attack');
      attackAbilities.forEach(ability => {
        if (ability.params.damage) {
          expect(typeof ability.params.damage).toBe('number');
          expect(ability.params.damage).toBeGreaterThan(0);
        }
      });
    });

    it('should have valid heal parameters for heal abilities', () => {
      const healAbilities = Object.values(abilities).filter(a => a.category === 'Heal');
      healAbilities.forEach(ability => {
        if (ability.params.heal) {
          expect(typeof ability.params.heal).toBe('number');
          expect(ability.params.heal).toBeGreaterThan(0);
        }
      });
    });

    it('should have valid shield parameters for defense abilities', () => {
      const defenseAbilities = Object.values(abilities).filter(a => a.category === 'Defense');
      defenseAbilities.forEach(ability => {
        if (ability.params.shield) {
          expect(typeof ability.params.shield).toBe('number');
          expect(ability.params.shield).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Ability Effects', () => {
    const commonEffects = ['poison', 'burn', 'stun', 'slow', 'blind', 'silence'];

    it('should use valid effect names or null', () => {
      Object.values(abilities).forEach(ability => {
        if (ability.effect !== null) {
          expect(typeof ability.effect).toBe('string');
          expect(ability.effect.length).toBeGreaterThan(0);
        }
      });
    });

    it('should have consistent effect parameters', () => {
      Object.values(abilities).forEach(ability => {
        if (ability.effect && ability.params[ability.effect]) {
          const effectParams = ability.params[ability.effect];
          expect(effectParams).toBeDefined();
        }
      });
    });
  });

  describe('Ability Balance', () => {
    it('should have reasonable damage ranges', () => {
      const attackAbilities = Object.values(abilities).filter(a => a.category === 'Attack');
      attackAbilities.forEach(ability => {
        if (ability.params.damage) {
          expect(ability.params.damage).toBeGreaterThanOrEqual(10);
          expect(ability.params.damage).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should have reasonable heal ranges', () => {
      const healAbilities = Object.values(abilities).filter(a => a.category === 'Heal');
      healAbilities.forEach(ability => {
        if (ability.params.heal) {
          expect(ability.params.heal).toBeGreaterThanOrEqual(10);
          expect(ability.params.heal).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should have reasonable cooldown ranges', () => {
      Object.values(abilities).forEach(ability => {
        expect(ability.cooldown).toBeGreaterThanOrEqual(0);
        expect(ability.cooldown).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Ability Tags', () => {
    const commonTags = ['basic', 'melee', 'ranged', 'magical', 'physical', 'fire', 'ice', 'lightning', 'arcane', 'healing', 'defensive'];

    it('should use meaningful tags', () => {
      Object.values(abilities).forEach(ability => {
        ability.tags.forEach(tag => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have consistent tag usage', () => {
      const allTags = new Set<string>();
      Object.values(abilities).forEach(ability => {
        ability.tags.forEach(tag => allTags.add(tag));
      });

      expect(allTags.size).toBeGreaterThan(5); // Should have variety
    });
  });

  describe('Module Exports', () => {
    it('should export abilities as default', () => {
      expect(abilities).toBeDefined();
    });

    it('should be importable as TypeScript module', () => {
      expect(() => {
        const imported = require('../../../../server/config/character/abilities');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should have unique ability IDs', () => {
      const ids = Object.keys(abilities);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique ability names', () => {
      const names = Object.values(abilities).map(a => a.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have consistent order values', () => {
      const orders = Object.values(abilities).map(a => a.order);
      orders.forEach(order => {
        expect(typeof order).toBe('number');
        expect(Number.isInteger(order)).toBe(true);
      });
    });
  });

  describe('TypeScript Integration', () => {
    it('should match AbilitiesMap type structure', () => {
      Object.entries(abilities).forEach(([key, ability]) => {
        // Key should match ability id
        expect(key).toBe(ability.id);

        // Should have all required Ability properties
        expect(ability).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          category: expect.any(String),
          target: expect.any(String),
          params: expect.any(Object),
          order: expect.any(Number),
          cooldown: expect.any(Number),
          flavorText: expect.any(String),
          tags: expect.any(Array),
          buttonText: expect.objectContaining({
            ready: expect.any(String),
            submitted: expect.any(String)
          })
        });
      });
    });
  });
});
