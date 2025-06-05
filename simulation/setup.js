#!/usr/bin/env node
/**
 * @fileoverview Quick setup script to get the simulation working
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Warlock simulation environment...\n');

// Create necessary directories
const directories = ['./web-interface/reports', './reporting', './reports'];

directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Create a simple reports index if it doesn't exist
const indexPath = './web-interface/reports/reports-index.json';
if (!fs.existsSync(indexPath)) {
  const initialIndex = {
    reports: [],
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
  };

  fs.writeFileSync(indexPath, JSON.stringify(initialIndex, null, 2));
  console.log(`✅ Created reports index: ${indexPath}`);
} else {
  console.log(`📋 Reports index exists: ${indexPath}`);
}

// Check if package.json has the right dependencies
const packagePath = './package.json';
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  if (!pkg.dependencies || !pkg.dependencies['module-alias']) {
    console.log('⚠️  Missing module-alias dependency');
    console.log('   Run: npm install module-alias');
  } else {
    console.log('✅ Dependencies look good');
  }
} else {
  console.log('⚠️  No package.json found in simulation directory');
}

console.log('\n🎯 Quick Test Options:');
console.log('1. Run: node test-runner.js 25');
console.log('   This will generate 25 mock games and create CSV reports');
console.log('');
console.log('2. Open: web-interface/index.html in your browser');
console.log('   This will show the interactive dashboard');
console.log('');
console.log("3. To fix the real simulators, you'll need to:");
console.log('   - Install dependencies: npm install');
console.log('   - Fix the module aliases in your server code');
console.log('   - Ensure all imported modules exist');

console.log('\n✅ Setup complete!');
