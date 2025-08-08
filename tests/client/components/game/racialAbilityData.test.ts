/**
 * @fileoverview Tests for racialAbilityData.ts
 * Tests the data mappings and utility functions for racial abilities
 */

import {
  RACE_TO_ABILITY,
  ABILITY_ICONS,
  RACE_COLORS,
  getRaceFromAbilityType,
  getAbilityTypeFromRace,
  getRaceColor
} from '../../../../client/src/components/game/RacialAbilityCard/racialAbilityData';

describe('racialAbilityData', () => {
  describe('Data Constants', () => {
    describe('RACE_TO_ABILITY', () => {
      it('should contain all expected races', () => {
        const expectedRaces = ['Artisan', 'Rockhewn', 'Crestfallen', 'Orc', 'Kinfolk', 'Lich'];
        const actualRaces = Object.keys(RACE_TO_ABILITY);

        expectedRaces.forEach(race => {
          expect(actualRaces).toContain(race);
        });
      });

      it('should map races to correct ability types', () => {
        expect(RACE_TO_ABILITY['Artisan']).toBe('adaptability');
        expect(RACE_TO_ABILITY['Rockhewn']).toBe('stoneResolve');
        expect(RACE_TO_ABILITY['Crestfallen']).toBe('keenSenses');
        expect(RACE_TO_ABILITY['Orc']).toBe('bloodRage');
        expect(RACE_TO_ABILITY['Kinfolk']).toBe('forestsGrace');
        expect(RACE_TO_ABILITY['Lich']).toBe('undying');
      });

      it('should have unique ability types for each race', () => {
        const abilityTypes = Object.values(RACE_TO_ABILITY);
        const uniqueAbilityTypes = [...new Set(abilityTypes)];

        expect(abilityTypes.length).toBe(uniqueAbilityTypes.length);
      });
    });

    describe('ABILITY_ICONS', () => {
      it('should contain icons for all ability types', () => {
        const abilityTypes = Object.values(RACE_TO_ABILITY);

        abilityTypes.forEach(abilityType => {
          expect(ABILITY_ICONS).toHaveProperty(abilityType);
          expect(typeof ABILITY_ICONS[abilityType]).toBe('string');
          expect(ABILITY_ICONS[abilityType]).not.toBe('');
        });
      });

      it('should have correct emoji icons', () => {
        expect(ABILITY_ICONS['adaptability']).toBe('🔄');
        expect(ABILITY_ICONS['stoneResolve']).toBe('🛡️');
        expect(ABILITY_ICONS['keenSenses']).toBe('👁️');
        expect(ABILITY_ICONS['bloodRage']).toBe('💢');
        expect(ABILITY_ICONS['forestsGrace']).toBe('🌿');
        expect(ABILITY_ICONS['undying']).toBe('💀');
      });
    });

    describe('RACE_COLORS', () => {
      it('should contain colors for all races', () => {
        const races = Object.keys(RACE_TO_ABILITY);

        races.forEach(race => {
          expect(RACE_COLORS).toHaveProperty(race);
          expect(typeof RACE_COLORS[race]).toBe('string');
          expect(RACE_COLORS[race]).toMatch(/^#[0-9A-Fa-f]{6}$/); // Valid hex color
        });
      });

      it('should have correct color mappings', () => {
        expect(RACE_COLORS['Artisan']).toBe('#4169E1');
        expect(RACE_COLORS['Rockhewn']).toBe('#8B4513');
        expect(RACE_COLORS['Crestfallen']).toBe('#228B22');
        expect(RACE_COLORS['Orc']).toBe('#8B0000');
        expect(RACE_COLORS['Kinfolk']).toBe('#9932CC');
        expect(RACE_COLORS['Lich']).toBe('#36454F');
      });

      it('should have unique colors for each race', () => {
        const colors = Object.values(RACE_COLORS);
        const uniqueColors = [...new Set(colors)];

        expect(colors.length).toBe(uniqueColors.length);
      });
    });
  });

  describe('getRaceFromAbilityType', () => {
    it('should return correct race for valid ability types', () => {
      expect(getRaceFromAbilityType('adaptability')).toBe('Artisan');
      expect(getRaceFromAbilityType('stoneResolve')).toBe('Rockhewn');
      expect(getRaceFromAbilityType('keenSenses')).toBe('Crestfallen');
      expect(getRaceFromAbilityType('bloodRage')).toBe('Orc');
      expect(getRaceFromAbilityType('forestsGrace')).toBe('Kinfolk');
      expect(getRaceFromAbilityType('undying')).toBe('Lich');
    });

    it('should return "Unknown" for invalid ability types', () => {
      expect(getRaceFromAbilityType('invalidAbility')).toBe('Unknown');
      expect(getRaceFromAbilityType('')).toBe('Unknown');
      expect(getRaceFromAbilityType('nonexistent')).toBe('Unknown');
    });

    it('should handle case sensitivity', () => {
      expect(getRaceFromAbilityType('ADAPTABILITY')).toBe('Unknown');
      expect(getRaceFromAbilityType('Adaptability')).toBe('Unknown');
    });

    it('should handle null and undefined inputs', () => {
      expect(getRaceFromAbilityType(null as any)).toBe('Unknown');
      expect(getRaceFromAbilityType(undefined as any)).toBe('Unknown');
    });
  });

  describe('getAbilityTypeFromRace', () => {
    it('should return correct ability type for valid races', () => {
      expect(getAbilityTypeFromRace('Artisan')).toBe('adaptability');
      expect(getAbilityTypeFromRace('Rockhewn')).toBe('stoneResolve');
      expect(getAbilityTypeFromRace('Crestfallen')).toBe('keenSenses');
      expect(getAbilityTypeFromRace('Orc')).toBe('bloodRage');
      expect(getAbilityTypeFromRace('Kinfolk')).toBe('forestsGrace');
      expect(getAbilityTypeFromRace('Lich')).toBe('undying');
    });

    it('should return null for invalid races', () => {
      expect(getAbilityTypeFromRace('InvalidRace')).toBeNull();
      expect(getAbilityTypeFromRace('')).toBeNull();
      expect(getAbilityTypeFromRace('Human')).toBeNull();
    });

    it('should handle case sensitivity', () => {
      expect(getAbilityTypeFromRace('artisan')).toBeNull();
      expect(getAbilityTypeFromRace('ARTISAN')).toBeNull();
    });

    it('should handle null and undefined inputs', () => {
      expect(getAbilityTypeFromRace(null as any)).toBeNull();
      expect(getAbilityTypeFromRace(undefined as any)).toBeNull();
    });
  });

  describe('getRaceColor', () => {
    it('should return correct color for valid races', () => {
      expect(getRaceColor('Artisan')).toBe('#4169E1');
      expect(getRaceColor('Rockhewn')).toBe('#8B4513');
      expect(getRaceColor('Crestfallen')).toBe('#228B22');
      expect(getRaceColor('Orc')).toBe('#8B0000');
      expect(getRaceColor('Kinfolk')).toBe('#9932CC');
      expect(getRaceColor('Lich')).toBe('#36454F');
    });

    it('should return theme color for invalid races when theme is provided', () => {
      const mockTheme = { colors: { primary: '#123456' } };

      expect(getRaceColor('InvalidRace', mockTheme)).toBe('#123456');
      expect(getRaceColor('', mockTheme)).toBe('#123456');
    });

    it('should return default color for invalid races when no theme is provided', () => {
      expect(getRaceColor('InvalidRace')).toBe('#4a2c82');
      expect(getRaceColor('')).toBe('#4a2c82');
    });

    it('should return default color when theme is provided but has no colors.primary', () => {
      const mockTheme = { colors: {} };

      expect(getRaceColor('InvalidRace', mockTheme)).toBe('#4a2c82');
    });

    it('should return default color when theme is null or undefined', () => {
      expect(getRaceColor('InvalidRace', null)).toBe('#4a2c82');
      expect(getRaceColor('InvalidRace', undefined)).toBe('#4a2c82');
    });

    it('should handle case sensitivity', () => {
      const mockTheme = { colors: { primary: '#999999' } };

      expect(getRaceColor('artisan', mockTheme)).toBe('#999999');
      expect(getRaceColor('ARTISAN', mockTheme)).toBe('#999999');
    });

    it('should prioritize race color over theme color for valid races', () => {
      const mockTheme = { colors: { primary: '#999999' } };

      expect(getRaceColor('Artisan', mockTheme)).toBe('#4169E1');
      expect(getRaceColor('Orc', mockTheme)).toBe('#8B0000');
    });
  });

  describe('Data Consistency', () => {
    it('should have matching number of entries across all data objects', () => {
      const raceCount = Object.keys(RACE_TO_ABILITY).length;
      const abilityIconCount = Object.keys(ABILITY_ICONS).length;
      const raceColorCount = Object.keys(RACE_COLORS).length;

      expect(abilityIconCount).toBe(raceCount);
      expect(raceColorCount).toBe(raceCount);
    });

    it('should have ability icons for all mapped ability types', () => {
      const abilityTypes = Object.values(RACE_TO_ABILITY);

      abilityTypes.forEach(abilityType => {
        expect(ABILITY_ICONS).toHaveProperty(abilityType);
      });
    });

    it('should have colors for all mapped races', () => {
      const races = Object.keys(RACE_TO_ABILITY);

      races.forEach(race => {
        expect(RACE_COLORS).toHaveProperty(race);
      });
    });
  });

  describe('Bidirectional Mapping', () => {
    it('should maintain bidirectional consistency between race and ability type', () => {
      Object.entries(RACE_TO_ABILITY).forEach(([race, abilityType]) => {
        expect(getRaceFromAbilityType(abilityType)).toBe(race);
        expect(getAbilityTypeFromRace(race)).toBe(abilityType);
      });
    });

    it('should handle all ability types from RACE_TO_ABILITY in getRaceFromAbilityType', () => {
      const abilityTypes = Object.values(RACE_TO_ABILITY);

      abilityTypes.forEach(abilityType => {
        const race = getRaceFromAbilityType(abilityType);
        expect(race).not.toBe('Unknown');
        expect(Object.keys(RACE_TO_ABILITY)).toContain(race);
      });
    });

    it('should handle all races from RACE_TO_ABILITY in getAbilityTypeFromRace', () => {
      const races = Object.keys(RACE_TO_ABILITY);

      races.forEach(race => {
        const abilityType = getAbilityTypeFromRace(race);
        expect(abilityType).not.toBeNull();
        expect(Object.values(RACE_TO_ABILITY)).toContain(abilityType);
      });
    });
  });
});
