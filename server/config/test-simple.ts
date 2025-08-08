/**
 * Simple test to verify the new abilities system works
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('Testing abilities configuration refactor...\n');

// Test 1: Verify JSON data can be loaded
console.log('1. Testing JSON data loading...');
try {
  const abilitiesPath = path.join(__dirname, 'data', 'abilities.json');
  const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf-8'));

  const abilityCount = Object.keys(abilitiesData).length;
  console.log(`✓ Loaded ${abilityCount} abilities from JSON`);

  // Test a specific ability
  const attackAbility = abilitiesData.attack;
  if (attackAbility && attackAbility.name === 'Slash' && attackAbility.params.damage === 28) {
    console.log('✓ Attack ability data structure is correct');
  } else {
    console.log('✗ Attack ability data structure is incorrect');
  }

  // Test different ability types
  const categories = new Set<string>();
  const tags = new Set<string>();

  Object.values(abilitiesData).forEach((ability: any) => {
    categories.add(ability.category);
    ability.tags.forEach((tag: string) => tags.add(tag));
  });

  console.log(`✓ Found ${categories.size} categories: ${Array.from(categories).join(', ')}`);
  console.log(`✓ Found ${tags.size} unique tags`);

} catch (error) {
  console.log('✗ JSON loading failed:', (error as Error).message);
}

// Test 2: Verify the old system still works
console.log('\n2. Testing backwards compatibility...');
try {
  const oldConfig = require('./index.js');

  // Test that old methods still exist
  const testMethods = [
    'getAbility',
    'getAbilities',
    'getAbilitiesByTag',
    'getAbilitiesByCategory',
    'getAllAbilityIds',
    'getAbilityButtonText'
  ];

  let allMethodsExist = true;
  testMethods.forEach(method => {
    if (typeof oldConfig[method] === 'function') {
      console.log(`✓ ${method} method exists`);
    } else {
      console.log(`✗ ${method} method missing`);
      allMethodsExist = false;
    }
  });

  if (allMethodsExist) {
    // Test method functionality
    const attackAbility = oldConfig.getAbility('attack');
    if (attackAbility && attackAbility.name === 'Slash') {
      console.log('✓ getAbility() returns correct data');
    } else {
      console.log('✗ getAbility() returns incorrect data');
    }

    const attackAbilities = oldConfig.getAbilitiesByCategory('Attack');
    if (attackAbilities.length > 0) {
      console.log(`✓ getAbilitiesByCategory() found ${attackAbilities.length} attack abilities`);
    } else {
      console.log('✗ getAbilitiesByCategory() found no attack abilities');
    }

    const allIds = oldConfig.getAllAbilityIds();
    console.log(`✓ getAllAbilityIds() returned ${allIds.length} ability IDs`);
  }

} catch (error) {
  console.log('✗ Backwards compatibility test failed:', (error as Error).message);
}

// Test 3: Data integrity checks
console.log('\n3. Testing data integrity...');
try {
  const abilitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'abilities.json'), 'utf-8'));

  const issues: string[] = [];

  Object.entries(abilitiesData).forEach(([id, ability]: [string, any]) => {
    // Check ID consistency
    if (id !== ability.id) {
      issues.push(`ID mismatch: key '${id}' vs ability.id '${ability.id}'`);
    }

    // Check required fields
    const requiredFields = ['id', 'name', 'category', 'target', 'params', 'order', 'cooldown', 'flavorText', 'tags'];
    requiredFields.forEach(field => {
      if (ability[field] === undefined) {
        issues.push(`Missing field '${field}' in ability '${id}'`);
      }
    });

    // Check category values
    const validCategories = ['Attack', 'Defense', 'Heal', 'Special'];
    if (!validCategories.includes(ability.category)) {
      issues.push(`Invalid category '${ability.category}' in ability '${id}'`);
    }

    // Check target values
    const validTargets = ['Single', 'Self', 'Multi'];
    if (!validTargets.includes(ability.target)) {
      issues.push(`Invalid target '${ability.target}' in ability '${id}'`);
    }
  });

  if (issues.length === 0) {
    console.log('✓ All abilities pass integrity checks');
  } else {
    console.log(`✗ Found ${issues.length} integrity issues:`);
    issues.slice(0, 5).forEach(issue => console.log(`  - ${issue}`));
    if (issues.length > 5) {
      console.log(`  ... and ${issues.length - 5} more`);
    }
  }

} catch (error) {
  console.log('✗ Data integrity test failed:', (error as Error).message);
}

console.log('\nTest complete!');
