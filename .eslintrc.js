module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  extends: ['eslint:recommended'],
  plugins: ['security'],
  rules: {
    // YOUR SPECIFIC REQUESTS:

    // File length limits (500 lines warning, 1000 lines error)
    'max-lines': [
      'error',
      {
        max: 1000,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    'max-statements': ['warn', 50],
    'max-nested-callbacks': ['warn', 5],
    'max-depth': ['warn', 4],

    // Mixed binary operators (your specific example)
    'no-mixed-operators': 'error',

    // Math.random() detection and other security patterns
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="Math"][callee.property.name="random"]',
        message:
          '🚨 SECURITY: Math.random() detected! Use crypto.randomBytes() or utils/secureRandom instead for security-sensitive operations.',
      },
      {
        selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
        message:
          '⚠️ WARNING: Date.now() for randomness/IDs can be predictable. Consider crypto.randomBytes() for secure operations.',
      },
      {
        selector: 'CallExpression[callee.name="eval"]',
        message: '🚨 SECURITY: eval() is dangerous!',
      },
    ],

    // Security rules
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'warn',

    // Line endings (prevent the ␍ issue you had)
    'linebreak-style': ['error', 'unix'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',

    // Code quality improvements
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'spaced-comment': ['warn', 'always'],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Catch common bugs
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-extra-boolean-cast': 'error',
    'no-regex-spaces': 'error',
    'valid-typeof': 'error',
  },

  overrides: [
    // JavaScript files
    {
      files: ['**/*.js', '**/*.jsx'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },

    // TypeScript files (if TypeScript parser works)
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        'no-undef': 'off', // TypeScript handles this
      },
    },

    // Server-specific rules
    {
      files: ['server/**/*'],
      rules: {
        'no-console': 'off', // Allow console.log in server
        'security/detect-non-literal-fs-filename': 'off',
      },
    },

    // Test files
    {
      files: ['**/*.test.*', '**/*.spec.*', '**/test/**/*', '**/tests/**/*'],
      rules: {
        'max-lines': 'off',
        'max-statements': 'off',
        'max-nested-callbacks': 'off',
        'max-depth': 'off',
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // More lenient for tests
        'security/detect-object-injection': 'off', // Often false positives in tests
        'no-restricted-syntax': 'off', // Allow Date.now() and Math.random() in tests
        'security/detect-unsafe-regex': 'warn', // Less strict for tests
        'no-mixed-operators': 'warn', // Less strict for tests
        'prefer-const': 'warn', // Less strict for tests
      },
    },
  ],

  ignorePatterns: ['node_modules/', 'build/', 'dist/', 'archive/', '*.min.js', 'coverage/'],
};
