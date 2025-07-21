/**
 * Test script to verify the new ability system works correctly
 */

const { 
  getClassAbilities, 
  getAllClassAbilities,
  getClassAbilityForLevel,
  validateClassAbilities,
  availableClasses 
} = require('./server/config/character/classes');

const { 
  getAbility,
  getAbilities,
  getAbilitiesByTag,
  abilities
} = require('./server/config/character/abilities');

console.log('🧪 Testing New Ability System...\n');

// Test 1: Validate all class abilities exist
console.log('1. Validating all class abilities exist...');
const validation = validateClassAbilities();
if (validation.isValid) {
  console.log('✅ All class abilities valid!');
} else {
  console.log('❌ Missing abilities found:');
  validation.missing.forEach(error => console.log(`  - ${error}`));
}

if (validation.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  validation.warnings.forEach(warning => console.log(`  - ${warning}`));
}

console.log('');

// Test 2: Check each class has exactly 4 abilities
console.log('2. Verifying each class has exactly 4 abilities...');
let allClassesValid = true;
availableClasses.forEach(className => {
  const abilities = getAllClassAbilities(className);
  if (abilities.length !== 4) {
    console.log(`❌ ${className} has ${abilities.length} abilities, expected 4`);
    allClassesValid = false;
  } else {
    console.log(`✅ ${className}: ${abilities.map(a => a.name).join(', ')}`);
  }
});

if (allClassesValid) {
  console.log('✅ All classes have exactly 4 abilities!');
}

console.log('');

// Test 3: Test specific ability lookup
console.log('3. Testing specific ability lookups...');
const fireball = getAbility('fireball');
if (fireball) {
  console.log(`✅ Fireball found: ${fireball.name} - ${fireball.flavorText}`);
} else {
  console.log('❌ Fireball not found');
}

const warriorLevel1 = getClassAbilityForLevel('Warrior', 1);
if (warriorLevel1) {
  const ability = getAbility(warriorLevel1);
  console.log(`✅ Warrior Level 1: ${ability.name}`);
} else {
  console.log('❌ Warrior Level 1 ability not found');
}

console.log('');

// Test 4: Test hidden abilities
console.log('4. Testing hidden/special abilities...');
const hiddenAbilities = getAbilitiesByTag('hidden');
console.log(`✅ Found ${hiddenAbilities.length} hidden abilities:`);
hiddenAbilities.forEach(ability => {
  console.log(`  - ${ability.name}: ${ability.flavorText}`);
});

console.log('');

// Test 5: Test ability progression for a class
console.log('5. Testing ability progression for Wizard...');
for (let level = 1; level <= 4; level++) {
  const abilities = getClassAbilities('Wizard', level);
  console.log(`  Level ${level}: ${abilities.length} abilities unlocked`);
  abilities.forEach(ability => {
    console.log(`    - ${ability.name} (Level ${ability.unlockAt})`);
  });
}

console.log('');

// Test 6: Verify ability IDs match their object keys
console.log('6. Verifying ability ID consistency...');
let idConsistency = true;
Object.entries(abilities).forEach(([key, ability]) => {
  if (key !== ability.id) {
    console.log(`❌ Inconsistent ID: key="${key}" but id="${ability.id}"`);
    idConsistency = false;
  }
});

if (idConsistency) {
  console.log('✅ All ability IDs are consistent!');
}

console.log('');

// Summary
console.log('📊 Summary:');
console.log(`  - Total Classes: ${availableClasses.length}`);
console.log(`  - Total Abilities: ${Object.keys(abilities).length}`);
console.log(`  - Hidden Abilities: ${hiddenAbilities.length}`);
console.log(`  - Class Abilities Valid: ${validation.isValid ? 'Yes' : 'No'}`);
console.log(`  - All Classes Have 4 Abilities: ${allClassesValid ? 'Yes' : 'No'}`);
console.log(`  - ID Consistency: ${idConsistency ? 'Yes' : 'No'}`);

const allTestsPassed = validation.isValid && allClassesValid && idConsistency;
console.log(`\n🎯 Overall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allTestsPassed) {
  console.log('\n🚀 The new ability system is ready for deployment!');
  console.log('   To activate:');
  console.log('   1. Rename classes.js to classes_old.js');
  console.log('   2. Rename classes_new.js to classes.js');
  console.log('   3. Rename index.js to index_old.js');
  console.log('   4. Rename index_new.js to index.js');
}