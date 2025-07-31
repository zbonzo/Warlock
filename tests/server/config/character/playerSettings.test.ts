/**
 * @fileoverview Tests for player settings configuration
 * Tests player configuration settings, validation, and helper functions
 */

import {
  playerSettings,
  isValidPlayerSettings,
  calculatePlayerHpAtLevel,
  calculateDamageModifierAtLevel,
  isReconnectionAllowed,
  PlayerSettingsConfig
} from '../../../../server/config/character/playerSettings';

describe('Player Settings Configuration', () => {
  describe('Player Settings Object', () => {
    it('should export player settings object', () => {
      expect(playerSettings).toBeDefined();
      expect(typeof playerSettings).toBe('object');
    });

    it('should have all required properties', () => {
      expect(playerSettings).toHaveProperty('defaultPlayerName');
      expect(playerSettings).toHaveProperty('baseHp');
      expect(playerSettings).toHaveProperty('baseArmor');
      expect(playerSettings).toHaveProperty('baseDamageMod');
      expect(playerSettings).toHaveProperty('reconnectionWindow');
      expect(playerSettings).toHaveProperty('maxReconnectionAttempts');
      expect(playerSettings).toHaveProperty('hpIncreasePerLevel');
      expect(playerSettings).toHaveProperty('damageIncreasePerLevel');
      expect(playerSettings).toHaveProperty('pendingDeathEnabled');
      expect(playerSettings).toHaveProperty('deathMessageDelay');
    });

    it('should have valid property types', () => {
      expect(typeof playerSettings.defaultPlayerName).toBe('string');
      expect(typeof playerSettings.baseHp).toBe('number');
      expect(typeof playerSettings.baseArmor).toBe('number');
      expect(typeof playerSettings.baseDamageMod).toBe('number');
      expect(typeof playerSettings.reconnectionWindow).toBe('number');
      expect(typeof playerSettings.maxReconnectionAttempts).toBe('number');
      expect(typeof playerSettings.hpIncreasePerLevel).toBe('number');
      expect(typeof playerSettings.damageIncreasePerLevel).toBe('number');
      expect(typeof playerSettings.pendingDeathEnabled).toBe('boolean');
      expect(typeof playerSettings.deathMessageDelay).toBe('number');
    });

    it('should have reasonable default values', () => {
      expect(playerSettings.defaultPlayerName).toBe('The Unknown Hero');
      expect(playerSettings.baseHp).toBe(250);
      expect(playerSettings.baseArmor).toBe(2.0);
      expect(playerSettings.baseDamageMod).toBe(1.0);
      expect(playerSettings.reconnectionWindow).toBe(60 * 1000);
      expect(playerSettings.maxReconnectionAttempts).toBe(3);
      expect(playerSettings.hpIncreasePerLevel).toBe(0.1);
      expect(playerSettings.damageIncreasePerLevel).toBe(0.25);
      expect(playerSettings.pendingDeathEnabled).toBe(true);
      expect(playerSettings.deathMessageDelay).toBe(1500);
    });

    it('should have valid numeric constraints', () => {
      expect(playerSettings.baseHp).toBeGreaterThan(0);
      expect(playerSettings.baseArmor).toBeGreaterThanOrEqual(0);
      expect(playerSettings.baseDamageMod).toBeGreaterThan(0);
      expect(playerSettings.reconnectionWindow).toBeGreaterThan(0);
      expect(playerSettings.maxReconnectionAttempts).toBeGreaterThan(0);
      expect(playerSettings.hpIncreasePerLevel).toBeGreaterThanOrEqual(0);
      expect(playerSettings.damageIncreasePerLevel).toBeGreaterThanOrEqual(0);
      expect(playerSettings.deathMessageDelay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isValidPlayerSettings', () => {
    it('should validate valid player settings', () => {
      expect(isValidPlayerSettings(playerSettings)).toBe(true);
    });

    it('should validate a complete valid object', () => {
      const validSettings: PlayerSettingsConfig = {
        defaultPlayerName: 'Test Hero',
        baseHp: 100,
        baseArmor: 1.0,
        baseDamageMod: 1.5,
        reconnectionWindow: 30000,
        maxReconnectionAttempts: 5,
        hpIncreasePerLevel: 0.15,
        damageIncreasePerLevel: 0.2,
        pendingDeathEnabled: false,
        deathMessageDelay: 2000
      };

      expect(isValidPlayerSettings(validSettings)).toBe(true);
    });

    it('should reject null and undefined', () => {
      expect(isValidPlayerSettings(null)).toBe(false);
      expect(isValidPlayerSettings(undefined)).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isValidPlayerSettings('string')).toBe(false);
      expect(isValidPlayerSettings(123)).toBe(false);
      expect(isValidPlayerSettings([])).toBe(false);
    });

    it('should reject objects with missing properties', () => {
      const incomplete = { ...playerSettings };
      delete (incomplete as any).baseHp;
      expect(isValidPlayerSettings(incomplete)).toBe(false);
    });

    it('should reject objects with wrong property types', () => {
      const wrongTypes = {
        ...playerSettings,
        baseHp: 'not a number'
      };
      expect(isValidPlayerSettings(wrongTypes)).toBe(false);
    });

    it('should reject objects with invalid numeric constraints', () => {
      const invalidConstraints = {
        ...playerSettings,
        baseHp: -100 // Should be positive
      };
      expect(isValidPlayerSettings(invalidConstraints)).toBe(false);
    });

    it('should reject objects with zero or negative critical values', () => {
      expect(isValidPlayerSettings({ ...playerSettings, baseHp: 0 })).toBe(false);
      expect(isValidPlayerSettings({ ...playerSettings, baseDamageMod: 0 })).toBe(false);
      expect(isValidPlayerSettings({ ...playerSettings, reconnectionWindow: 0 })).toBe(false);
      expect(isValidPlayerSettings({ ...playerSettings, maxReconnectionAttempts: 0 })).toBe(false);
    });

    it('should allow zero for non-critical values', () => {
      expect(isValidPlayerSettings({ ...playerSettings, baseArmor: 0 })).toBe(true);
      expect(isValidPlayerSettings({ ...playerSettings, hpIncreasePerLevel: 0 })).toBe(true);
      expect(isValidPlayerSettings({ ...playerSettings, damageIncreasePerLevel: 0 })).toBe(true);
      expect(isValidPlayerSettings({ ...playerSettings, deathMessageDelay: 0 })).toBe(true);
    });
  });

  describe('calculatePlayerHpAtLevel', () => {
    it('should calculate HP for level 1', () => {
      const hp = calculatePlayerHpAtLevel(1);
      expect(hp).toBe(playerSettings.baseHp);
    });

    it('should calculate increasing HP for higher levels', () => {
      const hp1 = calculatePlayerHpAtLevel(1);
      const hp2 = calculatePlayerHpAtLevel(2);
      const hp3 = calculatePlayerHpAtLevel(3);

      expect(hp2).toBeGreaterThan(hp1);
      expect(hp3).toBeGreaterThan(hp2);
    });

    it('should use exponential growth formula', () => {
      const level = 5;
      const expectedHp = Math.floor(
        playerSettings.baseHp * Math.pow(1 + playerSettings.hpIncreasePerLevel, level - 1)
      );
      
      expect(calculatePlayerHpAtLevel(level)).toBe(expectedHp);
    });

    it('should return integer values', () => {
      for (let level = 1; level <= 10; level++) {
        const hp = calculatePlayerHpAtLevel(level);
        expect(Number.isInteger(hp)).toBe(true);
      }
    });

    it('should throw error for invalid levels', () => {
      expect(() => calculatePlayerHpAtLevel(0)).toThrow('Player level must be 1 or greater');
      expect(() => calculatePlayerHpAtLevel(-1)).toThrow('Player level must be 1 or greater');
    });

    it('should handle high levels without overflow', () => {
      expect(() => calculatePlayerHpAtLevel(20)).not.toThrow();
      const hp = calculatePlayerHpAtLevel(20);
      expect(hp).toBeGreaterThan(0);
      expect(Number.isFinite(hp)).toBe(true);
    });
  });

  describe('calculateDamageModifierAtLevel', () => {
    it('should calculate damage modifier for level 1', () => {
      const modifier = calculateDamageModifierAtLevel(1);
      expect(modifier).toBe(playerSettings.baseDamageMod);
    });

    it('should calculate increasing damage modifier for higher levels', () => {
      const mod1 = calculateDamageModifierAtLevel(1);
      const mod2 = calculateDamageModifierAtLevel(2);
      const mod3 = calculateDamageModifierAtLevel(3);

      expect(mod2).toBeGreaterThan(mod1);
      expect(mod3).toBeGreaterThan(mod2);
    });

    it('should use exponential growth formula', () => {
      const level = 4;
      const expectedModifier = 
        playerSettings.baseDamageMod * Math.pow(1 + playerSettings.damageIncreasePerLevel, level - 1);
      
      expect(calculateDamageModifierAtLevel(level)).toBeCloseTo(expectedModifier, 10);
    });

    it('should return precise decimal values', () => {
      const modifier = calculateDamageModifierAtLevel(2);
      expect(typeof modifier).toBe('number');
      expect(modifier).toBeCloseTo(1.25, 2); // With 25% increase
    });

    it('should throw error for invalid levels', () => {
      expect(() => calculateDamageModifierAtLevel(0)).toThrow('Player level must be 1 or greater');
      expect(() => calculateDamageModifierAtLevel(-1)).toThrow('Player level must be 1 or greater');
    });

    it('should handle high levels without overflow', () => {
      expect(() => calculateDamageModifierAtLevel(15)).not.toThrow();
      const modifier = calculateDamageModifierAtLevel(15);
      expect(modifier).toBeGreaterThan(0);
      expect(Number.isFinite(modifier)).toBe(true);
    });
  });

  describe('isReconnectionAllowed', () => {
    it('should allow reconnection within limits', () => {
      const allowed = isReconnectionAllowed(1, 30000); // 1 attempt, 30 seconds
      expect(allowed).toBe(true);
    });

    it('should reject when attempt count exceeds limit', () => {
      const maxAttempts = playerSettings.maxReconnectionAttempts;
      const allowed = isReconnectionAllowed(maxAttempts, 30000);
      expect(allowed).toBe(false);
    });

    it('should reject when time window expires', () => {
      const windowTime = playerSettings.reconnectionWindow;
      const allowed = isReconnectionAllowed(1, windowTime + 1000);
      expect(allowed).toBe(false);
    });

    it('should allow on the boundary conditions', () => {
      const maxAttempts = playerSettings.maxReconnectionAttempts - 1;
      const windowTime = playerSettings.reconnectionWindow;
      
      expect(isReconnectionAllowed(maxAttempts, windowTime)).toBe(true);
    });

    it('should handle zero values', () => {
      expect(isReconnectionAllowed(0, 0)).toBe(true);
      expect(isReconnectionAllowed(0, playerSettings.reconnectionWindow)).toBe(true);
    });

    it('should validate both conditions together', () => {
      const maxAttempts = playerSettings.maxReconnectionAttempts;
      const windowTime = playerSettings.reconnectionWindow;
      
      // Both conditions failed
      expect(isReconnectionAllowed(maxAttempts, windowTime + 1000)).toBe(false);
      
      // One condition failed each
      expect(isReconnectionAllowed(maxAttempts, windowTime - 1000)).toBe(false);
      expect(isReconnectionAllowed(maxAttempts - 1, windowTime + 1000)).toBe(false);
    });
  });

  describe('Level Scaling Balance', () => {
    it('should have reasonable HP scaling', () => {
      const hp1 = calculatePlayerHpAtLevel(1);
      const hp5 = calculatePlayerHpAtLevel(5);
      const hp10 = calculatePlayerHpAtLevel(10);

      // HP should scale reasonably
      expect(hp5).toBeGreaterThan(hp1 * 1.2); // At least 20% more
      expect(hp5).toBeLessThan(hp1 * 2.0); // But not double
      expect(hp10).toBeGreaterThan(hp1 * 1.5); // Significant growth
      expect(hp10).toBeLessThan(hp1 * 4.0); // But not excessive
    });

    it('should have reasonable damage scaling', () => {
      const mod1 = calculateDamageModifierAtLevel(1);
      const mod5 = calculateDamageModifierAtLevel(5);
      const mod10 = calculateDamageModifierAtLevel(10);

      // Damage should scale more aggressively than HP
      expect(mod5).toBeGreaterThan(mod1 * 1.5); // Significant increase
      expect(mod10).toBeGreaterThan(mod1 * 2.0); // Double by level 10
      expect(mod10).toBeLessThan(mod1 * 10.0); // But not excessive
    });
  });

  describe('Module Exports', () => {
    it('should export playerSettings as default', () => {
      const defaultExport = require('../../../../server/config/character/playerSettings').default;
      expect(defaultExport).toBe(playerSettings);
    });

    it('should export all named exports', () => {
      const module = require('../../../../server/config/character/playerSettings');
      expect(module.playerSettings).toBeDefined();
      expect(module.isValidPlayerSettings).toBeDefined();
      expect(module.calculatePlayerHpAtLevel).toBeDefined();
      expect(module.calculateDamageModifierAtLevel).toBeDefined();
      expect(module.isReconnectionAllowed).toBeDefined();
    });

    it('should be importable as TypeScript module', () => {
      expect(() => {
        const imported = require('../../../../server/config/character/playerSettings');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should enforce PlayerSettingsConfig interface', () => {
      const testConfig: PlayerSettingsConfig = playerSettings;
      expect(testConfig).toBe(playerSettings);
    });

    it('should maintain type consistency', () => {
      // These should compile without errors if types are correct
      const hp: number = calculatePlayerHpAtLevel(5);
      const damage: number = calculateDamageModifierAtLevel(3);
      const allowed: boolean = isReconnectionAllowed(1, 1000);
      const valid: boolean = isValidPlayerSettings(playerSettings);

      expect(typeof hp).toBe('number');
      expect(typeof damage).toBe('number');
      expect(typeof allowed).toBe('boolean');
      expect(typeof valid).toBe('boolean');
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent timing values', () => {
      expect(playerSettings.reconnectionWindow).toBeGreaterThan(playerSettings.deathMessageDelay);
    });

    it('should have balanced progression rates', () => {
      // HP increase should be lower than damage increase
      expect(playerSettings.hpIncreasePerLevel).toBeLessThan(playerSettings.damageIncreasePerLevel);
    });

    it('should have reasonable reconnection limits', () => {
      expect(playerSettings.maxReconnectionAttempts).toBeGreaterThanOrEqual(1);
      expect(playerSettings.maxReconnectionAttempts).toBeLessThanOrEqual(10);
      expect(playerSettings.reconnectionWindow).toBeGreaterThan(10000); // At least 10 seconds
      expect(playerSettings.reconnectionWindow).toBeLessThan(300000); // Less than 5 minutes
    });
  });
});