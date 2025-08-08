/**
 * @fileoverview Tests for CharacterSelectPage constants and utility functions
 */

import {
  RACES,
  CLASSES,
  CLASS_TO_RACES,
  getCompatibleClasses,
  getCompatibleRaces,
  isValidCombination,
  Race,
  Class
} from '../../../../client/src/pages/CharacterSelectPage/constants';

describe('CharacterSelectPage Constants', () => {
  describe('RACES constant', () => {
    it('should have all expected races', () => {
      const expectedRaces = ['Artisan', 'Rockhewn', 'Lich', 'Orc', 'Crestfallen', 'Kinfolk'];
      const raceIds = RACES.map(race => race.id);

      expect(raceIds).toEqual(expect.arrayContaining(expectedRaces));
      expect(raceIds.length).toBe(6);
    });

    it('should have correct structure for each race', () => {
      RACES.forEach(race => {
        expect(race).toHaveProperty('id');
        expect(race).toHaveProperty('label');
        expect(race).toHaveProperty('icon');
        expect(typeof race.id).toBe('string');
        expect(typeof race.label).toBe('string');
        expect(typeof race.icon).toBe('string');
      });
    });

    it('should have unique race IDs', () => {
      const raceIds = RACES.map(race => race.id);
      const uniqueRaceIds = [...new Set(raceIds)];
      expect(raceIds.length).toBe(uniqueRaceIds.length);
    });
  });

  describe('CLASSES constant', () => {
    it('should have all expected classes', () => {
      const expectedClasses = [
        'Warrior', 'Pyromancer', 'Wizard', 'Assassin', 'Alchemist',
        'Priest', 'Oracle', 'Seer', 'Shaman', 'Gunslinger', 'Tracker', 'Druid'
      ];
      const classIds = CLASSES.map(cls => cls.id);

      expect(classIds).toEqual(expect.arrayContaining(expectedClasses));
      expect(classIds.length).toBe(12);
    });

    it('should have correct structure for each class', () => {
      CLASSES.forEach(cls => {
        expect(cls).toHaveProperty('id');
        expect(cls).toHaveProperty('label');
        expect(cls).toHaveProperty('icon');
        expect(cls).toHaveProperty('color');
        expect(typeof cls.id).toBe('string');
        expect(typeof cls.label).toBe('string');
        expect(typeof cls.icon).toBe('string');
        expect(typeof cls.color).toBe('string');
      });
    });

    it('should have unique class IDs', () => {
      const classIds = CLASSES.map(cls => cls.id);
      const uniqueClassIds = [...new Set(classIds)];
      expect(classIds.length).toBe(uniqueClassIds.length);
    });

    it('should have valid hex color codes', () => {
      CLASSES.forEach(cls => {
        expect(cls.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('CLASS_TO_RACES mapping', () => {
    it('should have mappings for all classes', () => {
      const classIds = CLASSES.map(cls => cls.id);
      const mappedClasses = Object.keys(CLASS_TO_RACES);

      expect(mappedClasses).toEqual(expect.arrayContaining(classIds));
      expect(mappedClasses.length).toBe(classIds.length);
    });

    it('should only reference valid races', () => {
      const validRaceIds = RACES.map(race => race.id);

      Object.values(CLASS_TO_RACES).forEach(races => {
        races.forEach(raceId => {
          expect(validRaceIds).toContain(raceId);
        });
      });
    });

    it('should have at least one race for each class', () => {
      Object.values(CLASS_TO_RACES).forEach(races => {
        expect(races.length).toBeGreaterThan(0);
      });
    });

    it('should have specific known mappings', () => {
      expect(CLASS_TO_RACES.Warrior).toEqual(['Artisan', 'Rockhewn', 'Lich']);
      expect(CLASS_TO_RACES.Pyromancer).toEqual(['Rockhewn', 'Lich', 'Orc']);
      expect(CLASS_TO_RACES.Wizard).toEqual(['Artisan', 'Crestfallen', 'Lich']);
    });
  });

  describe('getCompatibleClasses function', () => {
    it('should return classes compatible with Artisan race', () => {
      const compatibleClasses = getCompatibleClasses('Artisan');
      const expectedClasses = ['Warrior', 'Wizard', 'Assassin', 'Alchemist', 'Priest', 'Gunslinger'];

      expect(compatibleClasses).toEqual(expect.arrayContaining(expectedClasses));
      expect(compatibleClasses.length).toBe(expectedClasses.length);
    });

    it('should return classes compatible with Orc race', () => {
      const compatibleClasses = getCompatibleClasses('Orc');
      const expectedClasses = ['Pyromancer', 'Oracle', 'Seer', 'Shaman', 'Tracker', 'Druid'];

      expect(compatibleClasses).toEqual(expect.arrayContaining(expectedClasses));
      expect(compatibleClasses.length).toBe(expectedClasses.length);
    });

    it('should return empty array for invalid race', () => {
      const compatibleClasses = getCompatibleClasses('InvalidRace');
      expect(compatibleClasses).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const compatibleClasses = getCompatibleClasses('');
      expect(compatibleClasses).toEqual([]);
    });
  });

  describe('getCompatibleRaces function', () => {
    it('should return races compatible with Warrior class', () => {
      const compatibleRaces = getCompatibleRaces('Warrior');
      expect(compatibleRaces).toEqual(['Artisan', 'Rockhewn', 'Lich']);
    });

    it('should return races compatible with Druid class', () => {
      const compatibleRaces = getCompatibleRaces('Druid');
      expect(compatibleRaces).toEqual(['Crestfallen', 'Kinfolk', 'Orc']);
    });

    it('should return empty array for invalid class', () => {
      const compatibleRaces = getCompatibleRaces('InvalidClass');
      expect(compatibleRaces).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const compatibleRaces = getCompatibleRaces('');
      expect(compatibleRaces).toEqual([]);
    });
  });

  describe('isValidCombination function', () => {
    it('should return true for valid combinations', () => {
      expect(isValidCombination('Artisan', 'Warrior')).toBe(true);
      expect(isValidCombination('Orc', 'Pyromancer')).toBe(true);
      expect(isValidCombination('Lich', 'Wizard')).toBe(true);
      expect(isValidCombination('Crestfallen', 'Druid')).toBe(true);
    });

    it('should return false for invalid combinations', () => {
      expect(isValidCombination('Artisan', 'Pyromancer')).toBe(false);
      expect(isValidCombination('Orc', 'Warrior')).toBe(false);
      expect(isValidCombination('Rockhewn', 'Druid')).toBe(false);
    });

    it('should return false for invalid race', () => {
      expect(isValidCombination('InvalidRace', 'Warrior')).toBe(false);
    });

    it('should return false for invalid class', () => {
      expect(isValidCombination('Artisan', 'InvalidClass')).toBe(false);
    });

    it('should return false for both invalid inputs', () => {
      expect(isValidCombination('InvalidRace', 'InvalidClass')).toBe(false);
    });

    it('should return false for empty inputs', () => {
      expect(isValidCombination('', 'Warrior')).toBe(false);
      expect(isValidCombination('Artisan', '')).toBe(false);
      expect(isValidCombination('', '')).toBe(false);
    });
  });

  describe('Type definitions', () => {
    it('should have correct Race interface structure', () => {
      const sampleRace: Race = RACES[0];
      expect(sampleRace).toHaveProperty('id');
      expect(sampleRace).toHaveProperty('label');
      expect(sampleRace).toHaveProperty('icon');
    });

    it('should have correct Class interface structure', () => {
      const sampleClass: Class = CLASSES[0];
      expect(sampleClass).toHaveProperty('id');
      expect(sampleClass).toHaveProperty('label');
      expect(sampleClass).toHaveProperty('icon');
      expect(sampleClass).toHaveProperty('color');
    });
  });

  describe('Data integrity', () => {
    it('should ensure all races appear in at least one class mapping', () => {
      const raceIds = RACES.map(race => race.id);
      const referencedRaces = new Set<string>();

      Object.values(CLASS_TO_RACES).forEach(races => {
        races.forEach(raceId => referencedRaces.add(raceId));
      });

      raceIds.forEach(raceId => {
        expect(referencedRaces.has(raceId)).toBe(true);
      });
    });

    it('should ensure symmetry between race-class relationships', () => {
      RACES.forEach(race => {
        const compatibleClasses = getCompatibleClasses(race.id);

        compatibleClasses.forEach(classId => {
          const compatibleRaces = getCompatibleRaces(classId);
          expect(compatibleRaces).toContain(race.id);
        });
      });
    });
  });
});
