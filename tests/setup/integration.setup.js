/**
 * Setup for integration tests that span client and server
 */

// Import both client and server setup utilities
require('./server.setup.js');

// Additional integration-specific setup
global.testHelpers = {
  async createTestGame() {
    // Helper to create test game instances
    return {
      code: 'TEST',
      players: new Map(),
      started: false,
    };
  },

  async createTestSocket() {
    // Helper to create mock socket instances
    return {
      id: `test-socket-${Date.now()}`,
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };
  },
};
