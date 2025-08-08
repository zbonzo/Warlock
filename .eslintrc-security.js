module.exports = {
  root: true,
  plugins: ['security'],
  rules: {
    // Maximum file length rules
    'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
    
    // Security-critical patterns
    'no-restricted-globals': [
      'error',
      {
        name: 'Math.random',
        message: '🚨 SECURITY: Math.random() is cryptographically weak! Use crypto.randomBytes() or utils/secureRandom instead.',
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="Math"][callee.property.name="random"]',
        message: '🚨 SECURITY: Math.random() detected! Use secure random functions from crypto module.',
      },
      {
        selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
        message: '⚠️ WARNING: Date.now() used for ID generation can be predictable. Consider crypto.randomBytes() for secure IDs.',
      },
      {
        selector: 'CallExpression[callee.name="eval"]',
        message: '🚨 SECURITY: eval() is dangerous and should never be used!',
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="innerHTML"]',
        message: '⚠️ SECURITY: innerHTML can lead to XSS. Use textContent or proper sanitization.',
      },
    ],
    
    // All security plugin rules as errors
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-object-injection': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    
    // Additional patterns we want to catch
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
  },
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
};