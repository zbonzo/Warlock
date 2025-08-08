#!/usr/bin/env node
/**
 * Custom script to detect build artifacts in source directories
 * This helps prevent TypeScript build artifacts from polluting the source tree
 */

const fs = require('fs');
const path = require('path');

const BUILD_ARTIFACT_PATTERNS = [
  '**/*.js',     // JavaScript files
  '**/*.d.ts',   // TypeScript declaration files  
  '**/*.js.map', // Source map files
  '**/*.d.ts.map' // Declaration map files
];

const ALLOWED_DIRECTORIES = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  'archive',
  'public',
  '.git',
  'scripts' // Allow JS files in scripts directory
];

const SOURCE_DIRECTORIES = [
  'client/src',
  'server',
  'shared'
];

function isAllowedPath(filePath) {
  // Check if file is in an allowed directory
  for (const allowedDir of ALLOWED_DIRECTORIES) {
    if (filePath.includes(`/${allowedDir}/`) || filePath.startsWith(`${allowedDir}/`)) {
      return true;
    }
  }
  
  // Allow specific root-level files
  const fileName = path.basename(filePath);
  const rootLevelAllowed = [
    'config-overrides.js',
    '.eslintrc.js',
    '.eslintrc-security.js',
    '.eslintrc.simple.js',
    '.eslintrc.js.backup',
    'webpack.config.js',
    'babel.config.js',
    'jest.config.js',
    'craco.config.js'
  ];
  
  if (rootLevelAllowed.includes(fileName) && !filePath.includes('/')) {
    return true;
  }
  
  return false;
}

function findFilesRecursively(dir, extensions) {
  let results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Skip node_modules and other build directories
      if (!ALLOWED_DIRECTORIES.includes(item.name)) {
        results = results.concat(findFilesRecursively(fullPath, extensions));
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext) || extensions.includes(item.name)) {
        results.push(fullPath);
      }
    }
  }
  
  return results;
}

function checkBuildArtifacts() {
  let foundArtifacts = [];
  
  const targetExtensions = ['.js', '.d.ts', '.js.map', '.d.ts.map'];
  
  for (const sourceDir of SOURCE_DIRECTORIES) {
    if (!fs.existsSync(sourceDir)) {
      continue;
    }
    
    const files = findFilesRecursively(sourceDir, targetExtensions);
    
    for (const file of files) {
      if (!isAllowedPath(file)) {
        foundArtifacts.push({
          file,
          type: path.extname(file) || path.basename(file),
          directory: path.dirname(file)
        });
      }
    }
  }
  
  return foundArtifacts;
}

function main() {
  console.log('🔍 Checking for build artifacts in source directories...');
  
  const artifacts = checkBuildArtifacts();
  
  if (artifacts.length === 0) {
    console.log('✅ No build artifacts found in source directories');
    process.exit(0);
  }
  
  console.log(`⚠️  Found ${artifacts.length} build artifacts in source directories:`);
  console.log('');
  
  // Group by type for better reporting
  const byType = artifacts.reduce((acc, artifact) => {
    if (!acc[artifact.type]) acc[artifact.type] = [];
    acc[artifact.type].push(artifact.file);
    return acc;
  }, {});
  
  for (const [type, files] of Object.entries(byType)) {
    console.log(`${type} files (${files.length}):`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');
  }
  
  console.log('💡 These files should be in dist/ directories instead of source directories');
  console.log('💡 Run "npm run typecheck:clean" to clean build outputs');
  console.log('💡 Check your TypeScript configuration (tsconfig.json) outDir settings');
  
  // Exit with warning code but don't fail the build
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { checkBuildArtifacts, isAllowedPath };