/**
 * @fileoverview Tests for webpack config overrides
 */
import * as path from 'path';

// Mock customize-cra
const mockAddWebpackAlias = jest.fn();
const mockOverride = jest.fn();

jest.mock('customize-cra', () => ({
  addWebpackAlias: mockAddWebpackAlias,
  override: mockOverride,
}));

// Mock path module
jest.mock('path');
const mockPath = path as jest.Mocked<typeof path>;

describe('config-overrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock path.resolve to return predictable paths
    mockPath.resolve.mockImplementation((base, ...segments) => {
      return `${base}/${segments.join('/')}`;
    });
    
    // Mock override to return the passed function for testing
    mockOverride.mockImplementation((fn) => fn);
    
    // Clear modules to ensure fresh import
    jest.resetModules();
  });

  it('should configure webpack aliases correctly', () => {
    // Import the config-overrides module
    require('../../client/config-overrides');

    // Verify that addWebpackAlias was called with correct aliases
    expect(mockAddWebpackAlias).toHaveBeenCalledWith({
      '@components': expect.stringContaining('src/components'),
      '@pages': expect.stringContaining('src/pages'),
      '@hooks': expect.stringContaining('src/hooks'),
      '@contexts': expect.stringContaining('src/contexts'),
      '@utils': expect.stringContaining('src/utils'),
      '@services': expect.stringContaining('src/services'),
      '@config': expect.stringContaining('src/config'),
      '@styles': expect.stringContaining('src/styles'),
    });
  });

  it('should call override with the webpack alias configuration', () => {
    require('../../client/config-overrides');

    expect(mockOverride).toHaveBeenCalledTimes(1);
    expect(mockOverride).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should resolve paths relative to __dirname', () => {
    require('../../client/config-overrides');

    // Verify path.resolve was called with __dirname for each alias
    const expectedCalls = [
      [expect.any(String), 'src/components'],
      [expect.any(String), 'src/pages'],
      [expect.any(String), 'src/hooks'],
      [expect.any(String), 'src/contexts'],
      [expect.any(String), 'src/utils'],
      [expect.any(String), 'src/services'],
      [expect.any(String), 'src/config'],
      [expect.any(String), 'src/styles'],
    ];

    expectedCalls.forEach(call => {
      expect(mockPath.resolve).toHaveBeenCalledWith(...call);
    });
  });

  it('should export the override configuration as module.exports', () => {
    const configOverrides = require('../../client/config-overrides');
    
    // Since we mocked override to return the passed function,
    // the module.exports should be that function
    expect(typeof configOverrides).toBe('function');
  });

  it('should configure all required path aliases', () => {
    require('../../client/config-overrides');

    const aliasConfig = mockAddWebpackAlias.mock.calls[0][0];
    
    // Verify all required aliases are present
    expect(aliasConfig).toHaveProperty('@components');
    expect(aliasConfig).toHaveProperty('@pages');
    expect(aliasConfig).toHaveProperty('@hooks');
    expect(aliasConfig).toHaveProperty('@contexts');
    expect(aliasConfig).toHaveProperty('@utils');
    expect(aliasConfig).toHaveProperty('@services');
    expect(aliasConfig).toHaveProperty('@config');
    expect(aliasConfig).toHaveProperty('@styles');
    
    // Verify the count of aliases
    expect(Object.keys(aliasConfig)).toHaveLength(8);
  });
});