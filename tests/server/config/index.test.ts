/**
 * @fileoverview Tests for server configuration index module
 * Tests all configuration functions, loaders, and legacy compatibility
 */

import config, { ConfigType } from '../../../server/config/index';

// Mock all external dependencies
jest.mock('fs');
jest.mock('../../../server/config/loaders/AbilityLoader');
jest.mock('../../../server/config/loaders/ClassLoader');
jest.mock('../../../server/config/loaders/RaceLoader');
jest.mock('../../../server/config/loaders/GameBalanceLoader');
jest.mock('../../../server/config/loaders/StatusEffectsLoader');
jest.mock('../../../server/config/loaders/MessagesLoader');

// Mock the character config require
jest.mock('../../../server/config/character', () => ({
  legacyProperty: 'test',
  anotherLegacyValue: 42
}), { virtual: true });

describe('Server Config Index', () => {
  describe('Configuration Structure', () => {
    it('should export default configuration object', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should include basic server settings', () => {
      expect(config.port).toBeDefined();
      expect(config.host).toBeDefined();
      expect(config.maxPlayers).toBeDefined();
      expect(config.minPlayers).toBeDefined();
      expect(config.gameTimeout).toBeDefined();
      expect(config.roundTimeout).toBeDefined();
      expect(config.MONSTER_ID).toBeDefined();
    });

    it('should include security settings', () => {
      expect(config.actionCooldowns).toBeDefined();
      expect(config.actionCooldowns.createGame).toBeDefined();
      expect(config.actionCooldowns.joinGame).toBeDefined();
      expect(config.actionCooldowns.playerReady).toBeDefined();
    });

    it('should include environment configuration', () => {
      expect(config.env).toBeDefined();
      expect(config.corsOrigins).toBeDefined();
      expect(config.logLevel).toBeDefined();
    });
  });

  describe('Ability Functions', () => {
    it('should provide ability management functions', () => {
      expect(typeof config.getAbility).toBe('function');
      expect(typeof config.getAbilities).toBe('function');
      expect(typeof config.getAbilitiesByTag).toBe('function');
      expect(typeof config.getAbilitiesByCategory).toBe('function');
      expect(typeof config.getAllAbilityIds).toBe('function');
      expect(typeof config.getAbilityButtonText).toBe('function');
    });

    it('should provide enhanced ability functions', () => {
      expect(typeof config.isAbilityAvailable).toBe('function');
      expect(typeof config.calculateAbilityDamage).toBe('function');
      expect(typeof config.getAbilityCooldown).toBe('function');
      expect(typeof config.getAbilityEffect).toBe('function');
      expect(typeof config.reloadAbilities).toBe('function');
      expect(typeof config.getAbilityStats).toBe('function');
    });

    it('should provide abilities property for legacy compatibility', () => {
      expect(config.abilities).toBeDefined();
    });

    it('should validate ability actions', () => {
      expect(typeof config.validateAbilityAction).toBe('function');
    });
  });

  describe('Class Functions', () => {
    it('should provide class management functions', () => {
      expect(typeof config.getAvailableClasses).toBe('function');
      expect(typeof config.getClassCategories).toBe('function');
      expect(typeof config.getClassesByCategory).toBe('function');
      expect(typeof config.getClassAttributes).toBe('function');
      expect(typeof config.getClassAbilities).toBe('function');
      expect(typeof config.getAllClassAbilities).toBe('function');
      expect(typeof config.getClassAbilityForLevel).toBe('function');
      expect(typeof config.getClassInfo).toBe('function');
    });

    it('should provide class calculation and validation functions', () => {
      expect(typeof config.calculateClassStats).toBe('function');
      expect(typeof config.validateClassAbilities).toBe('function');
      expect(typeof config.isValidClass).toBe('function');
    });

    it('should provide legacy class properties', () => {
      expect(config.availableClasses).toBeDefined();
      expect(config.classCategories).toBeDefined();
      expect(config.classAttributes).toBeDefined();
      expect(config.classAbilityProgression).toBeDefined();
    });
  });

  describe('Race Functions', () => {
    it('should provide race management functions', () => {
      expect(typeof config.getAvailableRaces).toBe('function');
      expect(typeof config.getRaceAttributes).toBe('function');
      expect(typeof config.getRacialAbility).toBe('function');
      expect(typeof config.getCompatibleClasses).toBe('function');
      expect(typeof config.getCompatibleRaces).toBe('function');
      expect(typeof config.isValidCombination).toBe('function');
      expect(typeof config.calculateRaceStats).toBe('function');
      expect(typeof config.isValidRace).toBe('function');
    });

    it('should provide legacy race properties', () => {
      expect(config.availableRaces).toBeDefined();
      expect(config.raceAttributes).toBeDefined();
      expect(config.racialAbilities).toBeDefined();
      expect(config.classRaceCompatibility).toBeDefined();
    });
  });

  describe('Message Functions', () => {
    it('should provide basic message functions', () => {
      expect(typeof config.getMessage).toBe('function');
      expect(typeof config.getAbilityMessage).toBe('function');
      expect(typeof config.getError).toBe('function');
      expect(typeof config.getSuccess).toBe('function');
      expect(typeof config.getEvent).toBe('function');
      expect(typeof config.formatMessage).toBe('function');
    });

    it('should provide enhanced message functions', () => {
      expect(typeof config.getPrivateMessage).toBe('function');
      expect(typeof config.getWinCondition).toBe('function');
      expect(typeof config.getCombatMessage).toBe('function');
      expect(typeof config.getWarlockMessage).toBe('function');
      expect(typeof config.getMonsterMessage).toBe('function');
      expect(typeof config.getPlayerMessage).toBe('function');
      expect(typeof config.getUIMessage).toBe('function');
      expect(typeof config.getServerLogMessage).toBe('function');
    });

    it('should provide legacy message properties', () => {
      expect(config.messages).toBeDefined();
      expect(config.events).toBeDefined();
      expect(config.errors).toBeDefined();
      expect(config.success).toBeDefined();
      expect(config.privateMessages).toBeDefined();
      expect(config.combat).toBeDefined();
      expect(config.statusEffects).toBeDefined();
      expect(config.warlock).toBeDefined();
      expect(config.monster).toBeDefined();
      expect(config.player).toBeDefined();
      expect(config.ui).toBeDefined();
      expect(config.serverLogMessages).toBeDefined();
      expect(config.winConditions).toBeDefined();
    });
  });

  describe('Game Balance Functions', () => {
    it('should provide calculation functions', () => {
      expect(typeof config.calculateMonsterHp).toBe('function');
      expect(typeof config.calculateMonsterDamage).toBe('function');
      expect(typeof config.calculateDamageReduction).toBe('function');
      expect(typeof config.calculateConversionChance).toBe('function');
      expect(typeof config.calculateWarlockCount).toBe('function');
      expect(typeof config.calculateThreatGeneration).toBe('function');
      expect(typeof config.calculateCoordinationBonus).toBe('function');
      expect(typeof config.shouldActiveComebackMechanics).toBe('function');
      expect(typeof config.applyComebackBonus).toBe('function');
    });

    it('should provide game balance property', () => {
      expect(config.gameBalance).toBeDefined();
    });

    it('should provide calculated game code ranges', () => {
      expect(typeof config.maxGameCode).toBe('number');
      expect(typeof config.minGameCode).toBe('number');
    });
  });

  describe('Status Effects Functions', () => {
    it('should provide status effect functions', () => {
      expect(typeof config.getEffectDefaults).toBe('function');
      expect(typeof config.isEffectStackable).toBe('function');
      expect(typeof config.isEffectRefreshable).toBe('function');
      expect(typeof config.getEffectMessage).toBe('function');
      expect(typeof config.formatEffectMessage).toBe('function');
    });

    it('should provide status effects property', () => {
      expect(config.statusEffects).toBeDefined();
    });
  });

  describe('Environment Helpers', () => {
    it('should provide environment checking properties', () => {
      expect(typeof config.isDevelopment).toBe('boolean');
      expect(typeof config.isProduction).toBe('boolean');
    });

    it('should determine environment correctly', () => {
      // In test environment, isDevelopment should be false
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should provide validation function', () => {
      expect(typeof config.validateConfiguration).toBe('function');
    });

    it('should provide reload function', () => {
      expect(typeof config.reloadConfiguration).toBe('function');
    });

    it('should provide statistics function', () => {
      expect(typeof config.getConfigurationStats).toBe('function');
    });

    it('should validate configuration structure', () => {
      const validation = config.validateConfiguration();
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should provide configuration statistics', () => {
      const stats = config.getConfigurationStats();
      expect(stats).toHaveProperty('abilities');
      expect(stats).toHaveProperty('classes');
      expect(stats).toHaveProperty('races');
      expect(stats).toHaveProperty('balance');
      expect(stats).toHaveProperty('statusEffects');
      expect(stats).toHaveProperty('messages');
    });

    it('should reload configuration', () => {
      const reloaded = config.reloadConfiguration();
      expect(typeof reloaded).toBe('boolean');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should include character config properties', () => {
      expect(config.legacyProperty).toBe('test');
      expect(config.anotherLegacyValue).toBe(42);
    });

    it('should maintain backwards compatibility structure', () => {
      // Test that properties exist that legacy code might depend on
      expect(config.abilities).toBeDefined();
      expect(config.availableClasses).toBeDefined();
      expect(config.availableRaces).toBeDefined();
      expect(config.messages).toBeDefined();
      expect(config.gameBalance).toBeDefined();
      expect(config.statusEffects).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should export ConfigType', () => {
      // This test ensures the type export is available
      const testConfig: ConfigType = config;
      expect(testConfig).toBe(config);
    });

    it('should provide typed constants', () => {
      expect(typeof config.MONSTER_ID).toBe('string');
      expect(config.MONSTER_ID).toBe('__monster__');
    });

    it('should have proper default values', () => {
      expect(config.port).toBe(3001);
      expect(config.host).toBe('localhost');
      expect(config.maxPlayers).toBe(20);
      expect(config.minPlayers).toBe(2);
      expect(config.env).toBeDefined();
      expect(config.corsOrigins).toBe('*');
      expect(config.logLevel).toBe('info');
    });
  });

  describe('Action Cooldowns', () => {
    it('should define all required cooldowns', () => {
      expect(config.actionCooldowns.createGame).toBe(2000);
      expect(config.actionCooldowns.joinGame).toBe(1000);
      expect(config.actionCooldowns.playerReady).toBe(500);
    });

    it('should have reasonable cooldown values', () => {
      Object.values(config.actionCooldowns).forEach(cooldown => {
        expect(typeof cooldown).toBe('number');
        expect(cooldown).toBeGreaterThan(0);
        expect(cooldown).toBeLessThan(10000); // Reasonable upper limit
      });
    });
  });

  describe('Timeout Settings', () => {
    it('should have reasonable timeout values', () => {
      expect(config.gameTimeout).toBeGreaterThan(0);
      expect(config.roundTimeout).toBeGreaterThan(0);
      // Game timeout should be longer than round timeout
      expect(config.gameTimeout).toBeGreaterThan(config.roundTimeout);
    });

    it('should use default timeout values', () => {
      expect(config.gameTimeout).toBe(30 * 60 * 1000); // 30 minutes
      expect(config.roundTimeout).toBe(60 * 1000); // 1 minute
    });
  });

  describe('Function Integration', () => {
    it('should allow function chaining for complex operations', () => {
      // Test that functions can work together
      expect(() => {
        const abilityIds = config.getAllAbilityIds();
        const stats = config.getAbilityStats();
        const validation = config.validateConfiguration();
        return { abilityIds, stats, validation };
      }).not.toThrow();
    });

    it('should handle invalid inputs gracefully', () => {
      // Test that functions handle edge cases
      expect(() => {
        config.getAbility('nonexistent');
        config.getClassInfo('invalid');
        config.getRaceAttributes('fake');
      }).not.toThrow();
    });
  });

  describe('Hot Reload Functionality', () => {
    it('should support hot reload for all systems', () => {
      expect(typeof config.reloadAbilities).toBe('function');
      expect(typeof config.reloadConfiguration).toBe('function');
    });

    it('should return boolean for reload operations', () => {
      const abilityReload = config.reloadAbilities();
      const configReload = config.reloadConfiguration();
      
      expect(typeof abilityReload).toBe('boolean');
      expect(typeof configReload).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should not throw during configuration access', () => {
      expect(() => {
        const allProps = Object.keys(config);
        allProps.forEach(prop => {
          const value = (config as any)[prop];
          // Just accessing the property shouldn't throw
        });
      }).not.toThrow();
    });

    it('should handle validation errors gracefully', () => {
      const validation = config.validateConfiguration();
      // Should always return a proper structure even if validation fails
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });
});