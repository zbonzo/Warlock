/**
 * @fileoverview Tests for environment configurations
 * Tests all environment config files and their structure
 */
import developmentConfig from '../../server/config/environments/development';
import productionConfig from '../../server/config/environments/production';
import stagingConfig from '../../server/config/environments/staging';
import testConfig from '../../server/config/environments/test';
import type { EnvironmentConfig } from '../../server/config/environments/types';

describe('Environment Configurations', () => {
  const configs = {
    development: developmentConfig,
    production: productionConfig,
    staging: stagingConfig,
    test: testConfig,
  };

  describe.each(Object.entries(configs))('%s environment', (envName, config) => {
    it('should export a valid configuration object', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should have required basic properties', () => {
      expect(config.logLevel).toBeDefined();
      expect(typeof config.logLevel).toBe('string');
    });

    it('should have valid timeout configurations', () => {
      if (config.gameTimeout) {
        expect(typeof config.gameTimeout).toBe('number');
        expect(config.gameTimeout).toBeGreaterThan(0);
      }

      if (config.roundTimeout) {
        expect(typeof config.roundTimeout).toBe('number');
        expect(config.roundTimeout).toBeGreaterThan(0);
      }
    });

    it('should have valid action cooldowns', () => {
      if (config.actionCooldowns) {
        expect(typeof config.actionCooldowns).toBe('object');
        expect(typeof config.actionCooldowns.createGame).toBe('number');
        expect(typeof config.actionCooldowns.joinGame).toBe('number');
        expect(typeof config.actionCooldowns.playerReady).toBe('number');

        expect(config.actionCooldowns.createGame).toBeGreaterThanOrEqual(0);
        expect(config.actionCooldowns.joinGame).toBeGreaterThanOrEqual(0);
        expect(config.actionCooldowns.playerReady).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have valid rate limiting config', () => {
      if (config.rateLimiting) {
        expect(typeof config.rateLimiting).toBe('object');
        expect(typeof config.rateLimiting.defaultLimit).toBe('number');
        expect(typeof config.rateLimiting.defaultTimeWindow).toBe('number');

        expect(config.rateLimiting.defaultLimit).toBeGreaterThan(0);
        expect(config.rateLimiting.defaultTimeWindow).toBeGreaterThan(0);

        if (config.rateLimiting.actionLimits) {
          const { actionLimits } = config.rateLimiting;
          expect(typeof actionLimits).toBe('object');

          Object.values(actionLimits).forEach(limitConfig => {
            expect(typeof limitConfig.limit).toBe('number');
            expect(typeof limitConfig.window).toBe('number');
            expect(limitConfig.limit).toBeGreaterThan(0);
            expect(limitConfig.window).toBeGreaterThan(0);
          });
        }
      }
    });

    it('should have valid player limits', () => {
      if (config.minPlayers) {
        expect(typeof config.minPlayers).toBe('number');
        expect(config.minPlayers).toBeGreaterThan(0);
      }

      if (config.maxPlayers) {
        expect(typeof config.maxPlayers).toBe('number');
        expect(config.maxPlayers).toBeGreaterThan(0);
      }

      if (config.minPlayers && config.maxPlayers) {
        expect(config.maxPlayers).toBeGreaterThanOrEqual(config.minPlayers);
      }
    });

    it('should have valid debug configuration', () => {
      if (config.debug) {
        expect(typeof config.debug).toBe('object');
        expect(typeof config.debug.logAllEvents).toBe('boolean');
        expect(typeof config.debug.showDetailedErrors).toBe('boolean');
        expect(typeof config.debug.enableTestEndpoints).toBe('boolean');
      }
    });
  });

  describe('Development environment specifics', () => {
    it('should have development-appropriate settings', () => {
      expect(developmentConfig.logLevel).toBe('debug');
      expect(developmentConfig.debug?.logAllEvents).toBe(true);
      expect(developmentConfig.debug?.showDetailedErrors).toBe(true);
      expect(developmentConfig.debug?.enableTestEndpoints).toBe(true);
      expect(developmentConfig.minPlayers).toBe(1); // Allow single player testing
    });

    it('should have relaxed rate limiting', () => {
      expect(developmentConfig.rateLimiting?.defaultLimit).toBeGreaterThan(5);
      expect(developmentConfig.corsOrigins).toBe('*');
    });
  });

  describe('Production environment specifics', () => {
    it('should have production-appropriate settings', () => {
      expect(productionConfig.logLevel).toBe('info');
      expect(productionConfig.debug?.logAllEvents).toBe(false);
      expect(productionConfig.debug?.showDetailedErrors).toBe(false);
      expect(productionConfig.debug?.enableTestEndpoints).toBe(false);
      expect(productionConfig.minPlayers).toBeGreaterThan(1);
    });

    it('should have stricter rate limiting', () => {
      expect(productionConfig.rateLimiting?.defaultLimit).toBeLessThanOrEqual(5);
    });

    it('should have production-specific configurations', () => {
      expect(productionConfig.security).toBeDefined();
      expect(productionConfig.performance).toBeDefined();
      expect(productionConfig.maxGames).toBeDefined();
      expect(productionConfig.serverMemoryThreshold).toBeDefined();

      if (productionConfig.security) {
        expect(typeof productionConfig.security.enableRateLimiting).toBe('boolean');
        expect(typeof productionConfig.security.logSuspiciousActivity).toBe('boolean');
        expect(typeof productionConfig.security.maxConnectionsPerIP).toBe('number');
      }

      if (productionConfig.performance) {
        expect(typeof productionConfig.performance.enableGzip).toBe('boolean');
        expect(typeof productionConfig.performance.enableEtag).toBe('boolean');
        expect(typeof productionConfig.performance.cacheStaticFiles).toBe('boolean');
        expect(typeof productionConfig.performance.cacheExpiry).toBe('number');
      }
    });
  });

  describe('Test environment specifics', () => {
    it('should have test-appropriate settings', () => {
      expect(testConfig.logLevel).toBe('warn');

      if (testConfig.database) {
        expect(testConfig.database.inMemory).toBe(true);
        expect(testConfig.database.logging).toBe(false);
      }

      if (testConfig.testing) {
        expect(typeof testConfig.testing.enableTestHelpers).toBe('boolean');
        expect(typeof testConfig.testing.automaticCleanup).toBe('boolean');
      }
    });
  });

  describe('Environment consistency', () => {
    it('should have consistent property types across environments', () => {
      const allConfigs = Object.values(configs);

      // Check that when a property exists in multiple configs, it has the same type
      const commonProperties = ['logLevel', 'gameTimeout', 'roundTimeout'] as const;

      commonProperties.forEach(prop => {
        const types = allConfigs
          .filter(config => config[prop] !== undefined)
          .map(config => typeof config[prop]);

        if (types.length > 1) {
          const uniqueTypes = [...new Set(types)];
          expect(uniqueTypes).toHaveLength(1);
        }
      });
    });

    it('should have sensible timeout relationships', () => {
      Object.entries(configs).forEach(([envName, config]) => {
        if (config.gameTimeout && config.roundTimeout) {
          expect(config.gameTimeout).toBeGreaterThan(config.roundTimeout);
        }
      });
    });
  });

  describe('Configuration validation', () => {
    it('should satisfy TypeScript interface constraints', () => {
      Object.entries(configs).forEach(([envName, config]) => {
        // This test ensures configs match the EnvironmentConfig interface
        const validConfig: EnvironmentConfig = config;
        expect(validConfig).toBeDefined();
      });
    });
  });
});
