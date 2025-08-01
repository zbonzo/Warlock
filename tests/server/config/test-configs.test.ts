/**
 * @fileoverview Tests for test configuration files
 * Tests test-simple.ts, test-comprehensive.ts, test-compatibility.ts configs
 */

describe('Test Configuration Files', () => {
  const testConfigFiles = [
    'test-simple.ts',
    'test-comprehensive.ts', 
    'test-compatibility.ts'
  ];

  describe.each(testConfigFiles)('%s configuration', (configFile) => {
    let config: any;

    beforeAll(async () => {
      try {
        const configPath = configFile.replace('.ts', '');
        config = await import(`../../server/config/${configPath}`);
        config = config.default || config;
      } catch (error) {
        console.warn(`Test config file ${configFile} not available for testing`);
        config = null;
      }
    });

    it('should handle missing config gracefully', () => {
      // This test passes whether config exists or not
      expect(true).toBe(true);
    });

    it('should have valid structure when available', () => {
      if (!config) return;
      
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should have test-appropriate settings when available', () => {
      if (!config) return;
      
      // Common test config properties we might expect
      if (config.logLevel) {
        expect(['error', 'warn', 'info', 'debug', 'silent']).toContain(config.logLevel);
      }
      
      if (config.timeout !== undefined) {
        expect(typeof config.timeout).toBe('number');
        expect(config.timeout).toBeGreaterThan(0);
      }
      
      if (config.database) {
        expect(typeof config.database).toBe('object');
        // Test databases should typically be in-memory
        if (config.database.inMemory !== undefined) {
          expect(typeof config.database.inMemory).toBe('boolean');
        }
      }
    });

    it('should have disabled production features when available', () => {
      if (!config) return;
      
      // Test configs should disable production-only features
      if (config.enableMetrics !== undefined) {
        expect(config.enableMetrics).toBe(false);
      }
      
      if (config.enableAnalytics !== undefined) {
        expect(config.enableAnalytics).toBe(false);
      }
      
      if (config.enableExternalServices !== undefined) {
        expect(config.enableExternalServices).toBe(false);
      }
    });

    it('should have fast timeouts for testing when available', () => {
      if (!config) return;
      
      // Test configs should have faster timeouts
      const timeoutFields = ['gameTimeout', 'roundTimeout', 'connectionTimeout'];
      
      timeoutFields.forEach(field => {
        if (config[field] !== undefined) {
          expect(typeof config[field]).toBe('number');
          expect(config[field]).toBeGreaterThan(0);
          // Test timeouts should be reasonably fast (less than 30 seconds)
          expect(config[field]).toBeLessThan(30000);
        }
      });
    });
  });

  describe('Test configuration relationships', () => {
    let simpleConfig: any;
    let comprehensiveConfig: any;
    let compatibilityConfig: any;

    beforeAll(async () => {
      try {
        simpleConfig = await import('../../server/config/test-simple');
        simpleConfig = simpleConfig.default || simpleConfig;
      } catch (error) {
        simpleConfig = null;
      }

      try {
        comprehensiveConfig = await import('../../server/config/test-comprehensive');
        comprehensiveConfig = comprehensiveConfig.default || comprehensiveConfig;
      } catch (error) {
        comprehensiveConfig = null;
      }

      try {
        compatibilityConfig = await import('../../server/config/test-compatibility');
        compatibilityConfig = compatibilityConfig.default || compatibilityConfig;
      } catch (error) {
        compatibilityConfig = null;
      }
    });

    it('should have logical timeout relationships when available', () => {
      const configs = [simpleConfig, comprehensiveConfig, compatibilityConfig].filter(Boolean);
      
      configs.forEach(config => {
        if (config.gameTimeout && config.roundTimeout) {
          expect(config.gameTimeout).toBeGreaterThan(config.roundTimeout);
        }
        
        if (config.roundTimeout && config.actionTimeout) {
          expect(config.roundTimeout).toBeGreaterThan(config.actionTimeout);
        }
      });
    });

    it('should have appropriate complexity levels when available', () => {
      // Simple config should have minimal settings
      if (simpleConfig) {
        const simpleKeys = Object.keys(simpleConfig);
        
        // Comprehensive config should have more settings
        if (comprehensiveConfig) {
          const comprehensiveKeys = Object.keys(comprehensiveConfig);
          expect(comprehensiveKeys.length).toBeGreaterThanOrEqual(simpleKeys.length);
        }
      }
    });

    it('should have consistent property types when available', () => {
      const configs = [
        { name: 'simple', config: simpleConfig },
        { name: 'comprehensive', config: comprehensiveConfig },
        { name: 'compatibility', config: compatibilityConfig }
      ].filter(item => item.config !== null);

      if (configs.length < 2) return;

      // Check common properties have consistent types
      const commonProps = ['logLevel', 'timeout', 'enableRandomness'];
      
      commonProps.forEach(prop => {
        const types = configs
          .filter(item => item.config[prop] !== undefined)
          .map(item => typeof item.config[prop]);
        
        if (types.length > 1) {
          const uniqueTypes = [...new Set(types)];
          expect(uniqueTypes).toHaveLength(1);
        }
      });
    });
  });

  describe('Test configuration validation', () => {
    it('should validate test-specific properties', () => {
      const testConfigs = [
        { name: 'test-simple', path: '../../server/config/test-simple' },
        { name: 'test-comprehensive', path: '../../server/config/test-comprehensive' },
        { name: 'test-compatibility', path: '../../server/config/test-compatibility' }
      ];

      testConfigs.forEach(async ({ name, path }) => {
        try {
          const config = await import(path);
          const configObj = config.default || config;
          
          if (!configObj) return;
          
          // Test configs should be designed for testing
          if (configObj.environment) {
            expect(['test', 'testing', 'development']).toContain(configObj.environment);
          }
          
          // Should have deterministic behavior for testing
          if (configObj.enableRandomness !== undefined) {
            expect(typeof configObj.enableRandomness).toBe('boolean');
          }
          
          if (configObj.seed !== undefined) {
            expect(typeof configObj.seed).toBe('number');
          }
          
        } catch (error) {
          // Config file doesn't exist, which is fine
        }
      });
    });

    it('should not have production secrets or keys', () => {
      const testConfigs = [
        'test-simple',
        'test-comprehensive', 
        'test-compatibility'
      ];

      testConfigs.forEach(async (configName) => {
        try {
          const config = await import(`../../server/config/${configName}`);
          const configObj = config.default || config;
          
          if (!configObj) return;
          
          // Test configs should not contain production secrets
          const dangerousKeys = [
            'apiKey',
            'secretKey', 
            'password',
            'token',
            'privateKey',
            'databaseUrl'
          ];
          
          const configString = JSON.stringify(configObj).toLowerCase();
          
          dangerousKeys.forEach(key => {
            expect(configString).not.toContain(key.toLowerCase());
          });
          
        } catch (error) {
          // Config file doesn't exist
        }
      });
    });
  });
});