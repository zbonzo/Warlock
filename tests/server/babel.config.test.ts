/**
 * @fileoverview Tests for Babel configuration
 * Tests the structure and content of the Babel config
 */
import config from '../../server/babel.config';
import * as path from 'path';

describe('Babel Configuration', () => {
  it('should export a valid config object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should have correct presets', () => {
    expect(config.presets).toBeDefined();
    expect(Array.isArray(config.presets)).toBe(true);
    expect(config.presets).toHaveLength(2);

    // Check for @babel/preset-env
    const envPreset = config.presets[0];
    expect(Array.isArray(envPreset)).toBe(true);
    expect(envPreset[0]).toBe('@babel/preset-env');
    expect(envPreset[1]).toEqual({
      targets: {
        node: 'current',
      },
    });

    // Check for @babel/preset-typescript
    expect(config.presets[1]).toBe('@babel/preset-typescript');
  });

  it('should have module-resolver plugin with correct aliases', () => {
    expect(config.plugins).toBeDefined();
    expect(Array.isArray(config.plugins)).toBe(true);
    expect(config.plugins).toHaveLength(1);

    const moduleResolverPlugin = config.plugins[0];
    expect(Array.isArray(moduleResolverPlugin)).toBe(true);
    expect(moduleResolverPlugin[0]).toBe('module-resolver');

    const pluginConfig = moduleResolverPlugin[1];
    expect(pluginConfig.alias).toBeDefined();

    // Check that all expected aliases exist
    const expectedAliases = [
      '@config',
      '@controllers',
      '@middleware',
      '@models',
      '@services',
      '@utils',
      '@shared',
      '@messages'
    ];

    expectedAliases.forEach(alias => {
      expect(pluginConfig.alias[alias]).toBeDefined();
      expect(typeof pluginConfig.alias[alias]).toBe('string');
    });
  });

  it('should have test environment configuration', () => {
    expect(config.env).toBeDefined();
    expect(config.env.test).toBeDefined();
    expect(config.env.test.presets).toBeDefined();

    const testPresets = config.env.test.presets;
    expect(Array.isArray(testPresets)).toBe(true);
    expect(testPresets).toHaveLength(2);

    // Check test environment preset config
    const testEnvPreset = testPresets[0];
    expect(Array.isArray(testEnvPreset)).toBe(true);
    expect(testEnvPreset[0]).toBe('@babel/preset-env');
    expect(testEnvPreset[1]).toEqual({
      targets: {
        node: 'current',
      },
    });
  });

  it('should have valid root path configuration', () => {
    const moduleResolverPlugin = config.plugins[0];
    const pluginConfig = moduleResolverPlugin[1];

    expect(pluginConfig.root).toBeDefined();
    expect(Array.isArray(pluginConfig.root)).toBe(true);
    expect(pluginConfig.root).toHaveLength(1);

    // Root path should be a valid directory path
    const rootPath = pluginConfig.root[0];
    expect(typeof rootPath).toBe('string');
    expect(path.isAbsolute(rootPath)).toBe(true);
  });

  it('should have consistent alias paths', () => {
    const moduleResolverPlugin = config.plugins[0];
    const pluginConfig = moduleResolverPlugin[1];
    const aliases = pluginConfig.alias;

    // All alias paths should be absolute
    Object.values(aliases).forEach(aliasPath => {
      expect(typeof aliasPath).toBe('string');
      expect(path.isAbsolute(aliasPath as string)).toBe(true);
    });

    // Special check for @messages alias (should point to index.js)
    expect(aliases['@messages']).toContain('config/messages/index.js');
  });
});
