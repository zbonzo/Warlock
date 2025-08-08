/**
 * @fileoverview Tests for character configuration index
 * Tests the main character config export and its structure
 */
import characterConfig from '../../../server/config/character/index';

describe('Character Configuration Index', () => {
  it('should export a valid configuration object', () => {
    expect(characterConfig).toBeDefined();
    expect(typeof characterConfig).toBe('object');
  });

  describe('Race exports', () => {
    it('should export race-related configurations', () => {
      expect(characterConfig.races).toBeDefined();
      expect(characterConfig.raceAttributes).toBeDefined();
      expect(characterConfig.racialAbilities).toBeDefined();
      expect(characterConfig.classRaceCompatibility).toBeDefined();
    });

    it('should export race helper methods', () => {
      expect(typeof characterConfig.getRacialAbility).toBe('function');
      expect(typeof characterConfig.isValidCombination).toBe('function');
    });
  });

  describe('Class exports', () => {
    it('should export class-related configurations', () => {
      expect(characterConfig.classes).toBeDefined();
      expect(characterConfig.classCategories).toBeDefined();
      expect(characterConfig.classAttributes).toBeDefined();
      expect(characterConfig.classAbilityProgression).toBeDefined();
    });

    it('should export class helper methods', () => {
      expect(typeof characterConfig.getClassAbilities).toBe('function');
      expect(typeof characterConfig.getAllClassAbilities).toBe('function');
      expect(typeof characterConfig.getClassAbilityForLevel).toBe('function');
      expect(typeof characterConfig.validateClassAbilities).toBe('function');
    });
  });

  describe('Ability exports', () => {
    it('should export ability-related configurations', () => {
      expect(characterConfig.abilities).toBeDefined();
    });

    it('should export ability helper methods', () => {
      expect(typeof characterConfig.getAbility).toBe('function');
      expect(typeof characterConfig.getAbilities).toBe('function');
      expect(typeof characterConfig.getAbilitiesByTag).toBe('function');
      expect(typeof characterConfig.getAbilitiesByCategory).toBe('function');
      expect(typeof characterConfig.getAllAbilityIds).toBe('function');
    });
  });

  describe('Player settings', () => {
    it('should export player settings', () => {
      expect(characterConfig.player).toBeDefined();
      expect(typeof characterConfig.player).toBe('object');
    });
  });

  describe('Legacy compatibility', () => {
    it('should provide deprecated classAbilities getter with warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const classAbilities = characterConfig.classAbilities;
      expect(classAbilities).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Accessing classAbilities directly is deprecated. Use getClassAbilities() instead.'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Helper method functionality', () => {
    it('should have working ability helper methods', () => {
      // Test that helper methods don't throw errors when called
      expect(() => characterConfig.getAllAbilityIds()).not.toThrow();
      expect(() => characterConfig.getAbilities()).not.toThrow();
    });

    it('should have working class helper methods', () => {
      expect(() => characterConfig.getAllClassAbilities()).not.toThrow();
    });
  });

  describe('Data structure validation', () => {
    it('should have consistent data types for exports', () => {
      // Races should be objects or arrays
      expect(['object'].includes(typeof characterConfig.races)).toBe(true);
      expect(['object'].includes(typeof characterConfig.raceAttributes)).toBe(true);
      expect(['object'].includes(typeof characterConfig.racialAbilities)).toBe(true);

      // Classes should be objects or arrays
      expect(['object'].includes(typeof characterConfig.classes)).toBe(true);
      expect(['object'].includes(typeof characterConfig.classCategories)).toBe(true);
      expect(['object'].includes(typeof characterConfig.classAttributes)).toBe(true);

      // Abilities should be objects
      expect(typeof characterConfig.abilities).toBe('object');
    });
  });
});
