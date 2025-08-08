/**
 * @fileoverview Tests for JoinGamePage constants
 */

import { RANDOM_NAMES } from '@client/pages/JoinGamePage/constants';

describe('JoinGamePage constants', () => {
  describe('RANDOM_NAMES', () => {
    it('should be defined', () => {
      expect(RANDOM_NAMES).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(RANDOM_NAMES)).toBe(true);
    });

    it('should contain string values', () => {
      RANDOM_NAMES.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should have a reasonable number of names', () => {
      expect(RANDOM_NAMES.length).toBeGreaterThan(10);
      expect(RANDOM_NAMES.length).toBeLessThan(200);
    });

    it('should contain expected name categories', () => {
      // Test for presence of different categories of names
      const hasArtisanNames = RANDOM_NAMES.some(name =>
        ['Forge', 'Chisel', 'Canvas', 'Hammer', 'Smith'].includes(name)
      );
      const hasLichNames = RANDOM_NAMES.some(name =>
        ['Wraith', 'Shade', 'Void', 'Crypt', 'Lich'].includes(name)
      );
      const hasOrcNames = RANDOM_NAMES.some(name =>
        ['Fury', 'Rage', 'Blade', 'Blood', 'Savage'].includes(name)
      );

      expect(hasArtisanNames).toBe(true);
      expect(hasLichNames).toBe(true);
      expect(hasOrcNames).toBe(true);
    });

    it('should not contain empty strings', () => {
      expect(RANDOM_NAMES.includes('')).toBe(false);
    });

    it('should not contain duplicate names', () => {
      const uniqueNames = new Set(RANDOM_NAMES);
      expect(uniqueNames.size).toBe(RANDOM_NAMES.length);
    });

    it('should contain valid character names', () => {
      RANDOM_NAMES.forEach(name => {
        // Names should only contain letters (no numbers, special characters)
        expect(name).toMatch(/^[A-Za-z]+$/);
        // Names should be reasonable length
        expect(name.length).toBeGreaterThanOrEqual(2);
        expect(name.length).toBeLessThanOrEqual(15);
      });
    });

    it('should contain specific expected names', () => {
      const expectedNames = [
        'Forge', 'Chisel', 'Canvas', 'Quill', 'Hammer',
        'Wraith', 'Shade', 'Lich', 'Phantom', 'Shadow',
        'Fury', 'Rage', 'Savage', 'Hunter', 'Slayer'
      ];

      expectedNames.forEach(name => {
        expect(RANDOM_NAMES).toContain(name);
      });
    });

    it('should have names suitable for different character classes', () => {
      // Check that we have names that would fit different character themes
      const craftingNames = RANDOM_NAMES.filter(name =>
        ['Forge', 'Smith', 'Mason', 'Potter', 'Weaver', 'Carver'].includes(name)
      );
      const magicNames = RANDOM_NAMES.filter(name =>
        ['Wraith', 'Hex', 'Phantom', 'Void', 'Mist'].includes(name)
      );
      const warriorNames = RANDOM_NAMES.filter(name =>
        ['Blade', 'Steel', 'Iron', 'Crusher', 'Breaker'].includes(name)
      );

      expect(craftingNames.length).toBeGreaterThan(0);
      expect(magicNames.length).toBeGreaterThan(0);
      expect(warriorNames.length).toBeGreaterThan(0);
    });
  });
});
