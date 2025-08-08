/**
 * @fileoverview Module aliases configuration for server-side code - TypeScript version
 * Provides shorthand paths similar to the client-side webpack aliases
 * Phase 9: TypeScript Migration - Converted from moduleAliases.js
 */

import * as path from 'path';
import * as moduleAlias from 'module-alias';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export {};
