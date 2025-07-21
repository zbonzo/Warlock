#!/usr/bin/env node

/**
 * @fileoverview Simple test runner for the E2E ability test
 * Run this after starting the server: node run-e2e-test.js
 */

const { runE2ETest } = require('./e2e-ability-test');

console.log('🧪 Starting Warlock E2E Ability Test...\n');

console.log('Prerequisites:');
console.log('1. Make sure the server is running on localhost:3001');
console.log('2. Make sure no other games are running');
console.log('3. This test will take 5-10 minutes to complete\n');

console.log('Test will create 12 players:');
console.log('- 1 of each class (Warrior, Wizard, Assassin, Priest, Barbarian, Gunslinger, Alchemist, Pyromancer, Druid, Tracker, Oracle, Shaman)');
console.log('- 2 of each race (Artisan, Rockhewn, Crestfallen, Orc, Kinfolk, Lich)');
console.log('- Test progression: Level 1 → Level 2 + Blood Rage → Level 3 → Level 4 → Special abilities → Player targeting\n');

// Add a delay to let user read the info
setTimeout(() => {
  runE2ETest()
    .then(() => {
      console.log('\n✅ All tests passed! Check the logs above for detailed results.');
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}, 3000);