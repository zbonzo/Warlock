/**
 * @fileoverview Tests for moduleAliases configuration
 */

import * as path from 'path';

// Mock module-alias to capture the aliases being registered
const mockAddAliases = jest.fn();
jest.mock('module-alias', () => ({
  addAliases: mockAddAliases
}));

// Mock console.log to verify the success message
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('moduleAliases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register module aliases correctly', () => {
    // Import the module to trigger alias registration
    require('../../server/moduleAliases');

    const expectedAliases = {
      '@config': path.resolve(__dirname, '../../server', 'config'),
      '@controllers': path.resolve(__dirname, '../../server', 'controllers'),
      '@middleware': path.resolve(__dirname, '../../server', 'middleware'),
      '@models': path.resolve(__dirname, '../../server', 'models'),
      '@services': path.resolve(__dirname, '../../server', 'services'),
      '@utils': path.resolve(__dirname, '../../server', 'utils'),
      '@shared': path.resolve(__dirname, '../../server', 'shared'),
      '@messages': path.resolve(__dirname, '../../server', 'config', 'messages'),
    };

    expect(mockAddAliases).toHaveBeenCalledWith(expectedAliases);
  });

  it('should log success message', () => {
    require('../../server/moduleAliases');

    expect(mockConsoleLog).toHaveBeenCalledWith('Module aliases registered successfully');
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });
});
