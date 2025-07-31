/**
 * @fileoverview Tests for client utility helper functions
 * Tests common utility functions used across multiple components
 */

import {
  generateRandomCode,
  generateRandomName,
  isValidRaceClassCombo,
  getHealthPercentage,
  getHealthColor,
  getEventClass,
  isMobileDevice,
  getInitials,
  delay,
  safeJsonParse
} from '@client/utils/helpers';

// Mock constants
jest.mock('@client/pages/JoinGamePage/constants', () => ({
  RANDOM_NAMES: ['TestName1', 'TestName2', 'TestName3']
}));

jest.mock('@client/pages/CharacterSelectPage/constants', () => ({
  CLASS_TO_RACES: {
    Warrior: ['Artisan', 'Rockhewn', 'Orc'],
    Wizard: ['Lich', 'Crestfallen', 'Kinfolk'], 
    Assassin: ['Artisan', 'Lich'],
    Priest: ['Artisan', 'Rockhewn']
  }
}));

describe('helpers utility functions', () => {
  describe('generateRandomCode', () => {
    it('should generate a 4-digit code', () => {
      const code = generateRandomCode();
      expect(code).toMatch(/^\d{4}$/);
    });

    it('should generate different codes on subsequent calls', () => {
      const code1 = generateRandomCode();
      const code2 = generateRandomCode();
      
      // While theoretically they could be the same, probability is very low
      // We'll test multiple times to be more confident
      const codes = Array.from({ length: 10 }, () => generateRandomCode());
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThan(1);
    });

    it('should generate codes within valid range', () => {
      const code = parseInt(generateRandomCode());
      expect(code).toBeGreaterThanOrEqual(1000);
      expect(code).toBeLessThanOrEqual(9999);
    });
  });

  describe('generateRandomName', () => {
    it('should return a name from the RANDOM_NAMES array', () => {
      const name = generateRandomName();
      expect(['TestName1', 'TestName2', 'TestName3']).toContain(name);
    });

    it('should return empty string if RANDOM_NAMES is empty', () => {
      // Mock empty array
      jest.doMock('@client/pages/JoinGamePage/constants', () => ({
        RANDOM_NAMES: []
      }));
      
      const name = generateRandomName();
      expect(name).toBe('');
    });
  });

  describe('isValidRaceClassCombo', () => {
    it('should return true for valid race-class combinations', () => {
      expect(isValidRaceClassCombo('Artisan', 'Warrior')).toBe(true);
      expect(isValidRaceClassCombo('Lich', 'Wizard')).toBe(true);
      expect(isValidRaceClassCombo('Rockhewn', 'Priest')).toBe(true);
    });

    it('should return false for invalid race-class combinations', () => {
      expect(isValidRaceClassCombo('Lich', 'Warrior')).toBe(false);
      expect(isValidRaceClassCombo('Artisan', 'Wizard')).toBe(false);
      expect(isValidRaceClassCombo('NonExistent', 'Warrior')).toBe(false);
    });

    it('should return false for empty or null inputs', () => {
      expect(isValidRaceClassCombo('', 'Warrior')).toBe(false);
      expect(isValidRaceClassCombo('Artisan', '')).toBe(false);
      expect(isValidRaceClassCombo(null as any, 'Warrior')).toBe(false);
      expect(isValidRaceClassCombo('Artisan', null as any)).toBe(false);
    });

    it('should return false for non-existent class', () => {
      expect(isValidRaceClassCombo('Artisan', 'NonExistentClass')).toBe(false);
    });
  });

  describe('getHealthPercentage', () => {
    it('should calculate correct percentage for normal values', () => {
      expect(getHealthPercentage(50, 100)).toBe(50);
      expect(getHealthPercentage(75, 100)).toBe(75);
      expect(getHealthPercentage(25, 50)).toBe(50);
    });

    it('should return 0 for zero or negative current health', () => {
      expect(getHealthPercentage(0, 100)).toBe(0);
      expect(getHealthPercentage(-10, 100)).toBe(0);
    });

    it('should return 0 for zero or negative max health', () => {
      expect(getHealthPercentage(50, 0)).toBe(0);
      expect(getHealthPercentage(50, -10)).toBe(0);
    });

    it('should cap percentage at 100', () => {
      expect(getHealthPercentage(150, 100)).toBe(100);
    });

    it('should handle decimal values', () => {
      expect(getHealthPercentage(33, 100)).toBe(33);
      expect(getHealthPercentage(66.6, 100)).toBe(66.6);
    });
  });

  describe('getHealthColor', () => {
    it('should return danger color for low health', () => {
      expect(getHealthColor(10)).toBe('#e84855');
      expect(getHealthColor(24)).toBe('#e84855');
    });

    it('should return warning color for medium health', () => {
      expect(getHealthColor(25)).toBe('#ff7b25');
      expect(getHealthColor(40)).toBe('#ff7b25');
      expect(getHealthColor(49)).toBe('#ff7b25');
    });

    it('should return good color for high health', () => {
      expect(getHealthColor(50)).toBe('#2cb978');
      expect(getHealthColor(75)).toBe('#2cb978');
      expect(getHealthColor(100)).toBe('#2cb978');
    });

    it('should handle edge cases', () => {
      expect(getHealthColor(0)).toBe('#e84855');
      expect(getHealthColor(24.9)).toBe('#e84855');
      expect(getHealthColor(25.1)).toBe('#ff7b25');
      expect(getHealthColor(49.9)).toBe('#ff7b25');
      expect(getHealthColor(50.1)).toBe('#2cb978');
    });
  });

  describe('getEventClass', () => {
    it('should return warlock-event for warlock-related events', () => {
      expect(getEventClass('Warlock appears')).toBe('warlock-event');
      expect(getEventClass('The Warlock strikes')).toBe('warlock-event');
    });

    it('should return attack-event for attack-related events', () => {
      expect(getEventClass('Player attacked enemy')).toBe('attack-event');
      expect(getEventClass('Took 15 damage')).toBe('attack-event');
    });

    it('should return heal-event for healing-related events', () => {
      expect(getEventClass('Player healed ally')).toBe('heal-event');
      expect(getEventClass('Received healing')).toBe('heal-event');
    });

    it('should return defense-event for shield-related events', () => {
      expect(getEventClass('Player shielded self')).toBe('defense-event');
      expect(getEventClass('Shield activated')).toBe('defense-event');
    });

    it('should return monster-event for monster-related events', () => {
      expect(getEventClass('Monster roars')).toBe('monster-event');
      expect(getEventClass('The Monster attacks')).toBe('monster-event');
    });

    it('should return death-event for death-related events', () => {
      expect(getEventClass('Player has fallen')).toBe('death-event');
      expect(getEventClass('Enemy died')).toBe('death-event');
    });

    it('should return level-event for level up events', () => {
      expect(getEventClass('Players level up!')).toBe('level-event');
    });

    it('should return empty string for unrecognized events', () => {
      expect(getEventClass('Some random event')).toBe('');
      expect(getEventClass('')).toBe('');
    });

    it('should handle null or undefined input', () => {
      expect(getEventClass(null as any)).toBe('');
      expect(getEventClass(undefined as any)).toBe('');
    });
  });

  describe('isMobileDevice', () => {
    const originalWindow = global.window;
    const originalNavigator = global.navigator;

    beforeEach(() => {
      // Reset window and navigator
      delete (global as any).window;
      delete (global as any).navigator;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.navigator = originalNavigator;
    });

    it('should return false when window is undefined (SSR)', () => {
      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for mobile screen widths', () => {
      global.window = { innerWidth: 600 } as any;
      global.navigator = { userAgent: 'Desktop' } as any;
      
      expect(isMobileDevice()).toBe(true);
    });

    it('should return false for desktop screen widths with desktop user agent', () => {
      global.window = { innerWidth: 1024 } as any;
      global.navigator = { userAgent: 'Desktop' } as any;
      
      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for mobile user agents regardless of screen size', () => {
      global.window = { innerWidth: 1024 } as any;
      global.navigator = { userAgent: 'iPhone' } as any;
      
      expect(isMobileDevice()).toBe(true);
    });

    it('should detect various mobile user agents', () => {
      const mobileUserAgents = [
        'Android',
        'webOS',
        'iPhone',
        'iPad',
        'iPod',
        'BlackBerry',
        'IEMobile',
        'Opera Mini'
      ];

      mobileUserAgents.forEach(userAgent => {
        global.window = { innerWidth: 1024 } as any;
        global.navigator = { userAgent } as any;
        
        expect(isMobileDevice()).toBe(true);
      });
    });
  });

  describe('getInitials', () => {
    it('should return first letter for single names', () => {
      expect(getInitials('John')).toBe('J');
      expect(getInitials('alice')).toBe('A');
    });

    it('should return first and last initials for multiple names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alice Bob Charlie')).toBe('AC');
      expect(getInitials('mary jane watson')).toBe('MW');
    });

    it('should handle empty or whitespace-only names', () => {
      expect(getInitials('')).toBe('');
      expect(getInitials('   ')).toBe('');
    });

    it('should handle names with extra spaces', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
      expect(getInitials('John    Middle    Doe')).toBe('JD');
    });

    it('should return uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
      expect(getInitials('ALICE BOB')).toBe('AB');
    });

    it('should handle special characters', () => {
      expect(getInitials("John O'Connor")).toBe('JO');
      expect(getInitials('Jean-Pierre Doe')).toBe('JD');
    });
  });

  describe('delay', () => {
    jest.useFakeTimers();

    it('should resolve after specified time', async () => {
      const promise = delay(1000);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before specified time', async () => {
      const promise = delay(1000);
      let resolved = false;
      
      promise.then(() => { resolved = true; });
      
      // Advance by less than the delay
      jest.advanceTimersByTime(500);
      
      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      expect(resolved).toBe(false);
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const obj = { name: 'test', value: 123 };
      const json = JSON.stringify(obj);
      
      expect(safeJsonParse(json)).toEqual(obj);
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { error: true };
      
      expect(safeJsonParse('invalid json', fallback)).toEqual(fallback);
    });

    it('should return empty object as default fallback', () => {
      expect(safeJsonParse('invalid json')).toEqual({});
    });

    it('should handle various JSON types', () => {
      expect(safeJsonParse('null')).toBeNull();
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('123')).toBe(123);
      expect(safeJsonParse('"string"')).toBe('string');
      expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('should log errors for invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      safeJsonParse('invalid json');
      
      expect(consoleSpy).toHaveBeenCalledWith('JSON Parse Error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should use typed fallback', () => {
      const fallback: string[] = ['default'];
      const result = safeJsonParse<string[]>('invalid', fallback);
      
      expect(result).toEqual(fallback);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});