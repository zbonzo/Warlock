/**
 * @fileoverview Custom test runner configuration
 * Provides test utilities and setup for the entire test suite
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Test suite configuration
 */
const testConfig = {
  // Test categories and their patterns
  categories: {
    unit: 'tests/unit/**/*.test.js',
    integration: 'tests/integration/**/*.test.js',
    e2e: 'tests/e2e/**/*.test.js',
  },

  // Coverage thresholds
  coverage: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
};

/**
 * Run specific test category
 * @param {string} category - Test category to run
 * @param {Object} options - Test options
 */
function runTests(category = 'all', options = {}) {
  const { watch = false, verbose = false, coverage = true } = options;

  let testPattern = '';
  if (category === 'all') {
    testPattern = 'tests/**/*.test.js';
  } else if (testConfig.categories[category]) {
    testPattern = testConfig.categories[category];
  } else {
    console.error(`Unknown test category: ${category}`);
    process.exit(1);
  }

  const jestArgs = [
    `--testMatch="<rootDir>/${testPattern}"`,
    verbose ? '--verbose' : '',
    watch ? '--watch' : '',
    coverage ? '--coverage' : '',
    '--passWithNoTests',
  ].filter(Boolean);

  const command = `npx jest ${jestArgs.join(' ')}`;

  console.log(`Running ${category} tests...`);
  console.log(`Command: ${command}`);

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
  } catch (error) {
    console.error(`Tests failed with exit code: ${error.status}`);
    process.exit(error.status);
  }
}

/**
 * Generate test coverage report
 */
function generateCoverageReport() {
  console.log('Generating detailed coverage report...');

  try {
    execSync(
      'npx jest --coverage --coverageReporters=html --coverageReporters=text',
      {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      }
    );

    console.log('Coverage report generated in coverage/ directory');
  } catch (error) {
    console.error('Failed to generate coverage report');
    process.exit(1);
  }
}

/**
 * Validate test environment
 */
function validateTestEnvironment() {
  const requiredEnvVars = ['NODE_ENV'];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars.join(', '));
  }

  if (process.env.NODE_ENV !== 'test') {
    console.warn('NODE_ENV is not set to "test"');
  }

  console.log('Test environment validation complete');
}

/**
 * Command line interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  // Parse options
  const options = {
    watch: args.includes('--watch'),
    verbose: args.includes('--verbose'),
    coverage: !args.includes('--no-coverage'),
  };

  switch (command) {
    case 'unit':
    case 'integration':
    case 'e2e':
    case 'all':
      validateTestEnvironment();
      runTests(command, options);
      break;

    case 'coverage':
      generateCoverageReport();
      break;

    default:
      console.log(
        'Usage: node testRunner.js [unit|integration|e2e|all|coverage] [options]'
      );
      console.log('Options:');
      console.log('  --watch        Run tests in watch mode');
      console.log('  --verbose      Verbose output');
      console.log('  --no-coverage  Skip coverage reporting');
      break;
  }
}

module.exports = {
  runTests,
  generateCoverageReport,
  validateTestEnvironment,
  testConfig,
};
