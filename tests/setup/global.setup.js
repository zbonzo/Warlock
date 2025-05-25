/**
 * Global setup that runs once before all test suites
 */
module.exports = async () => {
  // Set environment variables for all tests
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.LOG_LEVEL = 'warn';

  console.log('🧪 Global test environment initialized');
};
