/**
 * @fileoverview Diagnostic tool to identify and fix simulation issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing Warlock Simulation Issues...\n');

// Check file structure
console.log('📁 Checking file structure:');
const requiredFiles = [
  '../server/config/index.js',
  '../server/models/GameRoom.js',
  '../server/models/Player.js',
  './simple-simulator.js',
  './runner.js',
  './enhanced-simulation-runner.js',
  './test-strategies.js',
];

const missingFiles = [];
const existingFiles = [];

requiredFiles.forEach((file) => {
  const fullPath = path.resolve(__dirname, file);
  if (fs.existsSync(fullPath)) {
    existingFiles.push(file);
    console.log(`  ✅ ${file}`);
  } else {
    missingFiles.push(file);
    console.log(`  ❌ ${file} - MISSING`);
  }
});

// Check module dependencies
console.log('\n📦 Checking module dependencies:');
const packageJsonPath = path.resolve(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = pkg.dependencies || {};

    const requiredDeps = ['module-alias'];
    requiredDeps.forEach((dep) => {
      if (deps[dep]) {
        console.log(`  ✅ ${dep}: ${deps[dep]}`);
      } else {
        console.log(`  ❌ ${dep} - MISSING`);
      }
    });
  } catch (error) {
    console.log(`  ❌ Error reading package.json: ${error.message}`);
  }
} else {
  console.log('  ❌ package.json not found');
}

// Test module loading
console.log('\n🔧 Testing module imports:');

// Test module-alias
try {
  require('module-alias');
  console.log('  ✅ module-alias loads correctly');
} catch (error) {
  console.log(`  ❌ module-alias failed: ${error.message}`);
}

// Test simple-simulator
try {
  const simulator = require('./simple-simulator');
  console.log('  ✅ simple-simulator loads correctly');
  console.log(`     - Exports: ${Object.keys(simulator).join(', ')}`);
} catch (error) {
  console.log(`  ❌ simple-simulator failed: ${error.message}`);
}

// Test config loading
try {
  // First try direct path
  const configPath = path.resolve(__dirname, '../server/config/index.js');
  if (fs.existsSync(configPath)) {
    const config = require(configPath);
    console.log('  ✅ config loads correctly');
    console.log(`     - Races: ${config.races?.length || 0}`);
    console.log(
      `     - Classes available: ${
        config.raceAttributes ? Object.keys(config.raceAttributes).length : 0
      }`
    );
  } else {
    console.log('  ❌ config file not found at expected path');
  }
} catch (error) {
  console.log(`  ❌ config loading failed: ${error.message}`);
}

// Check for circular dependencies
console.log('\n🔄 Checking for circular dependencies:');
// This is a simple check - in a real scenario you'd use a more sophisticated tool
const checkCircular = (filePath, visited = new Set(), stack = new Set()) => {
  if (stack.has(filePath)) {
    return `Circular dependency detected: ${Array.from(stack).join(
      ' -> '
    )} -> ${filePath}`;
  }

  if (visited.has(filePath)) {
    return null;
  }

  visited.add(filePath);
  stack.add(filePath);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const requires = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];

    for (const req of requires) {
      const match = req.match(/require\(['"`]([^'"`]+)['"`]\)/);
      if (match && match[1].startsWith('./')) {
        const depPath = path.resolve(path.dirname(filePath), match[1]);
        if (fs.existsSync(depPath + '.js')) {
          const result = checkCircular(depPath + '.js', visited, stack);
          if (result) return result;
        }
      }
    }
  } catch (error) {
    // Ignore file read errors for this check
  }

  stack.delete(filePath);
  return null;
};

const filesToCheck = existingFiles
  .filter((f) => f.endsWith('.js'))
  .map((f) => path.resolve(__dirname, f));

let circularFound = false;
filesToCheck.forEach((file) => {
  const result = checkCircular(file);
  if (result) {
    console.log(`  ❌ ${result}`);
    circularFound = true;
  }
});

if (!circularFound) {
  console.log('  ✅ No obvious circular dependencies found');
}

// Generate recommendations
console.log('\n💡 Recommendations:');

if (missingFiles.length > 0) {
  console.log(`\n📂 Missing Files (${missingFiles.length}):`);
  missingFiles.forEach((file) => {
    console.log(`  • ${file}`);

    if (file.includes('server/config')) {
      console.log('    → This is critical - the game configuration is missing');
      console.log(
        '    → You need the server-side code for races, classes, and abilities'
      );
    }

    if (file.includes('GameRoom') || file.includes('Player')) {
      console.log('    → Core game models are missing');
      console.log('    → These contain the actual game logic');
    }
  });
}

console.log('\n🔧 Quick Fixes:');

if (missingFiles.some((f) => f.includes('server/'))) {
  console.log('1. Server Dependencies Missing:');
  console.log('   → The simulation relies on server-side game logic');
  console.log('   → You need to either:');
  console.log('     a) Copy the required server files to simulation/');
  console.log('     b) Fix the module paths in your simulation files');
  console.log('     c) Create stub/mock versions of the missing modules');
}

console.log('\n2. Module Alias Issues:');
console.log('   → Run: npm install module-alias');
console.log('   → Or remove module-alias usage and use relative paths');

console.log('\n3. Test Simple Simulator:');
console.log('   → Try: node -e "console.log(require(\'./simple-simulator\'))"');
console.log('   → This will show specific import errors');

console.log('\n🚀 Next Steps:');
console.log('1. Fix missing dependencies first');
console.log('2. Test individual modules before running the full simulation');
console.log('3. Use the working modules to build up functionality');

// Try to create a minimal working simulation
console.log('\n🧪 Creating minimal test...');

const minimalTest = `
// Minimal simulation test
try {
  console.log('Testing basic functionality...');
  
  // Test if we can create a simple game
  const races = ['Artisan', 'Rockhewn', 'Crestfallen'];
  const classes = ['Warrior', 'Priest', 'Pyromancer'];
  
  console.log('✅ Basic data structures work');
  console.log('✅ Can proceed with stub-based simulation');
  
} catch (error) {
  console.error('❌ Basic test failed:', error.message);
}
`;

fs.writeFileSync(path.join(__dirname, 'minimal-test.js'), minimalTest);
console.log('   → Created minimal-test.js for basic verification');

console.log('\n📋 Summary:');
console.log(`   ✅ Working files: ${existingFiles.length}`);
console.log(`   ❌ Missing files: ${missingFiles.length}`);
console.log(
  `   🔧 Action needed: ${
    missingFiles.length > 0 ? 'Fix dependencies' : 'Debug module loading'
  }`
);
