module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['security'],
  rules: {
    // File length limits (your request)
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],

    // Mixed operators rule (your specific request)
    'no-mixed-operators': 'error',

    // Security rules
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',

    // Math.random detection (your request)
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="Math"][callee.property.name="random"]',
        message: '🚨 SECURITY: Math.random() is cryptographically weak! Use crypto.randomBytes() or utils/secureRandom instead.',
      },
      {
        selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
        message: '⚠️ WARNING: Date.now() for ID generation can be predictable. Consider crypto.randomBytes() for secure IDs.',
      },
    ],

    // Line ending enforcement
    'linebreak-style': ['error', 'unix'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',

    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'spaced-comment': ['error', 'always'],
  },
  overrides: [
    {
      files: ['server/**/*.js', 'server/**/*.ts'],
      rules: {
        'no-console': 'off', // Allow console in server
        'security/detect-non-literal-fs-filename': 'off', // Common in server
      },
    },
    {
      files: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    'archive/',
    '*.min.js',
    'coverage/',
  ],
};
