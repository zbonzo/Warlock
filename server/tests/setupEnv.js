/**
 * @fileoverview Environment setup for server tests
 * Sets up environmental variables and conditions
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Set other environment variables needed for tests
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'warn'; // Reduce noise in tests

// Mock timers globally if needed
// jest.useFakeTimers();
