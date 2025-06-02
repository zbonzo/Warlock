/**
 * @fileoverview Module aliases configuration for server-side code
 * Provides shorthand paths similar to the client-side webpack aliases


const path = require('path');
const moduleAlias = require('module-alias');

// Define path aliases
moduleAlias.addAliases({
  '@config': path.resolve(__dirname, 'config'),
  '@controllers': path.resolve(__dirname, 'controllers'),
  '@middleware': path.resolve(__dirname, 'middleware'),
  '@models': path.resolve(__dirname, 'models'),
  '@services': path.resolve(__dirname, 'services'),
  '@utils': path.resolve(__dirname, 'utils'),
  '@shared': path.resolve(__dirname, 'shared'),
  '@messages': path.resolve(__dirname, 'config', 'messages'),
});

console.log('Module aliases registered successfully');

// Register the aliases
moduleAlias();
 */


