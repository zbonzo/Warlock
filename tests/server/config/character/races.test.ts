/**
 * @fileoverview Tests for character races configuration
 * Tests race definitions, attributes, and compatibility
 */

import {
  availableRaces,
  raceAttributes,
  racialAbilities,
  classRaceCompatibility
} from '../../../../server/config/character/races';

describe('Character Races Configuration', () => {
  describe('Available Races', () => {
    it('should export available races array', () => {
      expect(availableRaces).toBeDefined();
      expect(Array.isArray(availableRaces)).toBe(true);
      expect(availableRaces.length).toBeGreaterThan(0);
    });

    it('should have expected races', () => {
      const expectedRaces = ['Artisan', 'Rockhewn', 'Lich', 'Orc', 'Crestfallen', 'Kinfolk'];
      expectedRaces.forEach(raceName => {
        expect(availableRaces).toContain(raceName);
      });
    });

    it('should not have duplicate races', () => {
      const uniqueRaces = new Set(availableRaces);
      expect(uniqueRaces.size).toBe(availableRaces.length);
    });

    it('should have races with proper naming convention', () => {
      availableRaces.forEach(raceName => {
        expect(typeof raceName).toBe('string');
        expect(raceName.length).toBeGreaterThan(0);
        expect(raceName[0]).toBe(raceName[0].toUpperCase()); // Should start with capital
      });
    });
  });

  describe('Race Attributes', () => {
    it('should export race attributes object', () => {
      expect(raceAttributes).toBeDefined();
      expect(typeof raceAttributes).toBe('object');
    });

    it('should have attributes for all available races', () => {
      availableRaces.forEach(raceName => {
        expect(raceAttributes).toHaveProperty(raceName);
      });
    });

    it('should have required attribute properties', () => {
      Object.values(raceAttributes).forEach(attributes => {
        expect(attributes).toHaveProperty('hpModifier');
        expect(attributes).toHaveProperty('armorModifier');
        expect(attributes).toHaveProperty('damageModifier');
        expect(attributes).toHaveProperty('compatibleClasses');
        expect(attributes).toHaveProperty('description');
      });
    });

    it('should have valid modifier values', () => {
      Object.values(raceAttributes).forEach(attributes => {
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

    it('should have compatible classes arrays', () => {
      Object.values(raceAttributes).forEach(attributes => {
        expect(Array.isArray(attributes.compatibleClasses)).toBe(true);
        expect(attributes.compatibleClasses.length).toBeGreaterThan(0);
        
        attributes.compatibleClasses.forEach(className => {
          expect(typeof className).toBe('string');
          expect(className.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have non-empty descriptions', () => {
      Object.values(raceAttributes).forEach(attributes => {
        expect(typeof attributes.description).toBe('string');
        expect(attributes.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Racial Abilities', () => {
    it('should export racial abilities object', () => {
      expect(racialAbilities).toBeDefined();
      expect(typeof racialAbilities).toBe('object');
    });

    it('should have abilities for all available races', () => {
      availableRaces.forEach(raceName => {
        expect(racialAbilities).toHaveProperty(raceName);
      });
    });

    it('should have valid racial ability structure', () => {
      Object.values(racialAbilities).forEach(ability => {
        expect(ability).toHaveProperty('name');
        expect(ability).toHaveProperty('description');
        expect(ability).toHaveProperty('effect');
        expect(ability).toHaveProperty('target');
        expect(ability).toHaveProperty('usageLimit');
        expect(ability).toHaveProperty('params');
        expect(ability).toHaveProperty('flavorText');
        expect(ability).toHaveProperty('buttonText');
      });
    });

    it('should have valid ability properties', () => {
      Object.values(racialAbilities).forEach(ability => {
        expect(typeof ability.name).toBe('string');
        expect(typeof ability.description).toBe('string');
        expect(typeof ability.flavorText).toBe('string');
        expect(typeof ability.target).toBe('string');
        expect(typeof ability.usageLimit).toBe('string');
        expect(typeof ability.params).toBe('object');
        expect(typeof ability.buttonText).toBe('object');
        
        expect(ability.name.length).toBeGreaterThan(0);
        expect(ability.description.length).toBeGreaterThan(0);
        expect(ability.flavorText.length).toBeGreaterThan(0);
      });
    });

    it('should have valid target types', () => {
      const validTargets = ['Single', 'Self', 'Multi'];
      Object.values(racialAbilities).forEach(ability => {
        expect(validTargets).toContain(ability.target);
      });
    });

    it('should have valid usage limits', () => {
      const validUsageLimits = ['passive', 'perGame', 'perRound', 'perTurn'];
      Object.values(racialAbilities).forEach(ability => {
        expect(validUsageLimits).toContain(ability.usageLimit);
      });
    });

    it('should have button text for interactive abilities', () => {
      Object.values(racialAbilities).forEach(ability => {
        if (ability.usageLimit !== 'passive') {
          expect(ability.buttonText).toHaveProperty('ready');
          expect(ability.buttonText).toHaveProperty('submitted');
          expect(typeof ability.buttonText.ready).toBe('string');
          expect(typeof ability.buttonText.submitted).toBe('string');
        }
      });
    });
  });

  describe('Class-Race Compatibility', () => {
    it('should export class-race compatibility object', () => {
      expect(classRaceCompatibility).toBeDefined();
      expect(typeof classRaceCompatibility).toBe('object');
    });

    it('should be consistent with race attributes', () => {
      Object.entries(raceAttributes).forEach(([raceName, attributes]) => {
        attributes.compatibleClasses.forEach(className => {
          expect(classRaceCompatibility[className]).toContain(raceName);
        });
      });
    });

    it('should have all classes represented', () => {
      const allClasses = new Set<string>();
      Object.values(raceAttributes).forEach(attributes => {
        attributes.compatibleClasses.forEach(className => {
          allClasses.add(className);
        });
      });

      Object.keys(classRaceCompatibility).forEach(className => {
        expect(allClasses.has(className)).toBe(true);
      });
    });

    it('should ensure every class has compatible races', () => {
      Object.entries(classRaceCompatibility).forEach(([className, compatibleRaces]) => {
        expect(Array.isArray(compatibleRaces)).toBe(true);
        expect(compatibleRaces.length).toBeGreaterThan(0);
        
        compatibleRaces.forEach(raceName => {
          expect(availableRaces).toContain(raceName);
        });
      });
    });
  });

  describe('Specific Races Validation', () => {
    it('should have Artisan race properly configured', () => {
      expect(availableRaces).toContain('Artisan');
      expect(raceAttributes.Artisan).toBeDefined();
      expect(racialAbilities.Artisan).toBeDefined();
      
      // Artisan should be versatile
      expect(raceAttributes.Artisan.compatibleClasses.length).toBeGreaterThanOrEqual(5);
    });

    it('should have Rockhewn race properly configured', () => {
      expect(availableRaces).toContain('Rockhewn');
      expect(raceAttributes.Rockhewn).toBeDefined();
      expect(racialAbilities.Rockhewn).toBeDefined();
      
      // Rockhewn should be tanky
      expect(raceAttributes.Rockhewn.armorModifier).toBeGreaterThanOrEqual(1.3);
    });

    it('should have Lich race properly configured', () => {
      expect(availableRaces).toContain('Lich');
      expect(raceAttributes.Lich).toBeDefined();
      expect(racialAbilities.Lich).toBeDefined();
    });

    it('should have Orc race properly configured', () => {
      expect(availableRaces).toContain('Orc');
      expect(raceAttributes.Orc).toBeDefined();
      expect(racialAbilities.Orc).toBeDefined();
    });
  });

  describe('Balance Validation', () => {
    it('should have balanced modifier distributions', () => {
      const hpModifiers = Object.values(raceAttributes).map(a => a.hpModifier);
      const armorModifiers = Object.values(raceAttributes).map(a => a.armorModifier);
      const damageModifiers = Object.values(raceAttributes).map(a => a.damageModifier);

      // Should have variety in modifiers
      expect(new Set(hpModifiers).size).toBeGreaterThan(1);
      expect(new Set(armorModifiers).size).toBeGreaterThan(1);
      expect(new Set(damageModifiers).size).toBeGreaterThan(1);
    });

    it('should have reasonable class compatibility distribution', () => {
      const compatibilityCounts = Object.values(raceAttributes).map(a => a.compatibleClasses.length);
      
      // Should have variety in compatibility
      expect(Math.max(...compatibilityCounts)).toBeGreaterThan(Math.min(...compatibilityCounts));
      
      // Each race should have reasonable number of compatible classes
      compatibilityCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(10);
      });
    });

    it('should have diverse racial ability usage patterns', () => {
      const usageLimits = Object.values(racialAbilities).map(a => a.usageLimit);
      const uniqueUsageLimits = new Set(usageLimits);
      
      expect(uniqueUsageLimits.size).toBeGreaterThan(1);
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent data types', () => {
      expect(Array.isArray(availableRaces)).toBe(true);
      expect(typeof raceAttributes).toBe('object');
      expect(typeof racialAbilities).toBe('object');
      expect(typeof classRaceCompatibility).toBe('object');
    });

    it('should not have null or undefined values', () => {
      availableRaces.forEach(raceName => {
        expect(raceName).toBeTruthy();
      });

      Object.values(raceAttributes).forEach(attributes => {
        expect(attributes.hpModifier).toBeTruthy();
        expect(attributes.armorModifier).toBeTruthy();
        expect(attributes.damageModifier).toBeTruthy();
        expect(attributes.description).toBeTruthy();
        expect(attributes.compatibleClasses.length).toBeGreaterThan(0);
      });

      Object.values(racialAbilities).forEach(ability => {
        expect(ability.name).toBeTruthy();
        expect(ability.description).toBeTruthy();
        expect(ability.target).toBeTruthy();
        expect(ability.usageLimit).toBeTruthy();
      });
    });

    it('should have unique race names', () => {
      const uniqueRaces = new Set(availableRaces);
      expect(uniqueRaces.size).toBe(availableRaces.length);
    });

    it('should have unique racial ability names', () => {
      const abilityNames = Object.values(racialAbilities).map(a => a.name);
      const uniqueAbilityNames = new Set(abilityNames);
      expect(uniqueAbilityNames.size).toBe(abilityNames.length);
    });
  });

  describe('Module Integration', () => {
    it('should work with class system', () => {
      // Test that all referenced classes exist in compatibility
      const allReferencedClasses = new Set<string>();
      Object.values(raceAttributes).forEach(attributes => {
        attributes.compatibleClasses.forEach(className => {
          allReferencedClasses.add(className);
        });
      });

      // Should have reasonable number of classes
      expect(allReferencedClasses.size).toBeGreaterThanOrEqual(8);
    });

    it('should be importable as TypeScript module', () => {
      expect(() => {
        const imported = require('../../../../server/config/character/races');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Ability Parameters', () => {
    it('should have valid parameters for each racial ability', () => {
      Object.values(racialAbilities).forEach(ability => {
        expect(ability.params).toBeDefined();
        expect(typeof ability.params).toBe('object');
        
        // Check common parameter types
        if (ability.params.damage) {
          expect(typeof ability.params.damage).toBe('number');
          expect(ability.params.damage).toBeGreaterThan(0);
        }
        
        if (ability.params.heal) {
          expect(typeof ability.params.heal).toBe('number');
          expect(ability.params.heal).toBeGreaterThan(0);
        }
        
        if (ability.params.shield) {
          expect(typeof ability.params.shield).toBe('number');
          expect(ability.params.shield).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('TypeScript Integration', () => {
    it('should maintain type compatibility', () => {
      // These should compile without errors if types are correct
      const races: string[] = availableRaces;
      const attributes = raceAttributes;
      const abilities = racialAbilities;
      const compatibility = classRaceCompatibility;

      expect(races).toBeDefined();
      expect(attributes).toBeDefined();
      expect(abilities).toBeDefined();
      expect(compatibility).toBeDefined();
    });
  });
});