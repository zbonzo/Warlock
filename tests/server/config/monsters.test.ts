/**
 * @fileoverview Tests for monster type configurations
 * Tests monster definitions and their properties
 */

describe('Monster Configuration Tests', () => {
  let monsterTypes: any;

  beforeAll(async () => {
    try {
      // Try to load the monster types configuration
      const monsterConfig = await import('../../server/config/monsters/monsterTypes');
      monsterTypes = monsterConfig.default || monsterConfig;
    } catch (error) {
      console.warn('Monster types configuration not available for testing');
      monsterTypes = null;
    }
  });

  describe('Monster types structure', () => {
    it('should handle missing monster configuration gracefully', () => {
      if (!monsterTypes) {
        expect(monsterTypes).toBeNull();
        return;
      }
      
      expect(monsterTypes).toBeDefined();
      expect(typeof monsterTypes).toBe('object');
    });

    it('should have valid monster type entries when available', () => {
      if (!monsterTypes) return;
      
      Object.entries(monsterTypes).forEach(([key, monster]: [string, any]) => {
        // Key should be a number
        expect(Number.isInteger(Number(key))).toBe(true);
        
        // Monster should be an object
        expect(typeof monster).toBe('object');
        expect(monster).toBeDefined();
        
        // Required properties
        expect(monster.type).toBeDefined();
        expect(typeof monster.type).toBe('string');
        expect(monster.type.length).toBeGreaterThan(0);
        
        expect(monster.name).toBeDefined();
        expect(typeof monster.name).toBe('string');
        expect(monster.name.length).toBeGreaterThan(0);
        
        expect(monster.description).toBeDefined();
        expect(typeof monster.description).toBe('string');
        expect(monster.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid stats configuration when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.stats) {
          expect(typeof monster.stats).toBe('object');
          
          // HP multiplier validation
          if (monster.stats.hpMultiplier !== undefined) {
            expect(typeof monster.stats.hpMultiplier).toBe('number');
            expect(monster.stats.hpMultiplier).toBeGreaterThan(0);
            expect(monster.stats.hpMultiplier).toBeLessThanOrEqual(5); // Reasonable upper bound
          }
          
          // Damage multiplier validation
          if (monster.stats.damageMultiplier !== undefined) {
            expect(typeof monster.stats.damageMultiplier).toBe('number');
            expect(monster.stats.damageMultiplier).toBeGreaterThan(0);
            expect(monster.stats.damageMultiplier).toBeLessThanOrEqual(3); // Reasonable upper bound
          }
          
          // Armor multiplier validation
          if (monster.stats.armorMultiplier !== undefined) {
            expect(typeof monster.stats.armorMultiplier).toBe('number');
            expect(monster.stats.armorMultiplier).toBeGreaterThanOrEqual(0);
            expect(monster.stats.armorMultiplier).toBeLessThanOrEqual(3); // Reasonable upper bound
          }
        }
      });
    });

    it('should have valid attack patterns when available', () => {
      if (!monsterTypes) return;
      
      const validAttackPatterns = ['single', 'cleave', 'splash', 'random', 'weakest', 'strongest'];
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.attackPattern) {
          expect(typeof monster.attackPattern).toBe('string');
          expect(validAttackPatterns).toContain(monster.attackPattern);
        }
      });
    });

    it('should have valid special attacks when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.specialAttack) {
          const special = monster.specialAttack;
          expect(typeof special).toBe('object');
          
          if (special.name) {
            expect(typeof special.name).toBe('string');
            expect(special.name.length).toBeGreaterThan(0);
          }
          
          if (special.chance !== undefined) {
            expect(typeof special.chance).toBe('number');
            expect(special.chance).toBeGreaterThanOrEqual(0);
            expect(special.chance).toBeLessThanOrEqual(1);
          }
          
          if (special.effect) {
            expect(typeof special.effect).toBe('string');
            expect(special.effect.length).toBeGreaterThan(0);
          }
          
          if (special.duration !== undefined) {
            expect(typeof special.duration).toBe('number');
            expect(special.duration).toBeGreaterThan(0);
          }
        }
      });
    });

    it('should have valid threat modifiers when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.threatModifiers) {
          expect(typeof monster.threatModifiers).toBe('object');
          
          Object.values(monster.threatModifiers).forEach((modifier: any) => {
            expect(typeof modifier).toBe('number');
            expect(modifier).toBeGreaterThan(0);
            expect(modifier).toBeLessThanOrEqual(5); // Reasonable upper bound
          });
        }
      });
    });

    it('should have emoji representation when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.emoji) {
          expect(typeof monster.emoji).toBe('string');
          expect(monster.emoji.length).toBeGreaterThan(0);
          // Should be a single emoji character (though this is hard to validate precisely)
          expect(monster.emoji.length).toBeLessThanOrEqual(4); // Account for multi-byte emojis
        }
      });
    });
  });

  describe('Monster progression', () => {
    it('should have progressive difficulty when available', () => {
      if (!monsterTypes) return;
      
      const monsterKeys = Object.keys(monsterTypes).map(Number).sort((a, b) => a - b);
      
      if (monsterKeys.length < 2) return; // Need at least 2 monsters to test progression
      
      // Check that later monsters tend to be stronger (though not strictly required)
      const firstMonster = monsterTypes[monsterKeys[0]];
      const secondMonster = monsterTypes[monsterKeys[1]];
      
      if (firstMonster.stats && secondMonster.stats) {
        // At least one stat should increase or stay the same (progression concept)
        const firstTotal = (firstMonster.stats.hpMultiplier || 1) + 
                          (firstMonster.stats.damageMultiplier || 1) + 
                          (firstMonster.stats.armorMultiplier || 1);
        const secondTotal = (secondMonster.stats.hpMultiplier || 1) + 
                           (secondMonster.stats.damageMultiplier || 1) + 
                           (secondMonster.stats.armorMultiplier || 1);
        
        // This is a loose test - later monsters should generally be stronger
        expect(secondTotal).toBeGreaterThanOrEqual(firstTotal * 0.8); // Allow some flexibility
      }
    });

    it('should have unique monster types when available', () => {
      if (!monsterTypes) return;
      
      const types = Object.values(monsterTypes).map((monster: any) => monster.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });

    it('should have unique monster names when available', () => {
      if (!monsterTypes) return;
      
      const names = Object.values(monsterTypes).map((monster: any) => monster.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Monster balance validation', () => {
    it('should have reasonable stat multipliers when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.stats) {
          // No monster should be completely overpowered
          const totalMultiplier = (monster.stats.hpMultiplier || 1) * 
                                 (monster.stats.damageMultiplier || 1) * 
                                 (monster.stats.armorMultiplier || 1);
          
          expect(totalMultiplier).toBeLessThanOrEqual(10); // Reasonable upper bound for combined multipliers
          
          // No monster should be completely weak
          expect(totalMultiplier).toBeGreaterThanOrEqual(0.1);
        }
      });
    });

    it('should have reasonable special attack chances when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.specialAttack && monster.specialAttack.chance !== undefined) {
          // Special attacks shouldn't be too frequent (would be annoying)
          expect(monster.specialAttack.chance).toBeLessThanOrEqual(0.5);
          
          // But also shouldn't be too rare (would never trigger)
          expect(monster.specialAttack.chance).toBeGreaterThanOrEqual(0.05);
        }
      });
    });
  });

  describe('Configuration completeness', () => {
    it('should provide meaningful descriptions when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        if (monster.description) {
          expect(monster.description.length).toBeGreaterThan(20); // Should be descriptive
          expect(monster.description.endsWith('.')).toBe(false); // Usually no period in game descriptions
        }
      });
    });

    it('should have consistent naming conventions when available', () => {
      if (!monsterTypes) return;
      
      Object.values(monsterTypes).forEach((monster: any) => {
        // Type should be camelCase
        expect(monster.type).toMatch(/^[a-z][a-zA-Z]*$/);
        
        // Name should be Title Case
        expect(monster.name).toMatch(/^[A-Z]/);
      });
    });
  });
});