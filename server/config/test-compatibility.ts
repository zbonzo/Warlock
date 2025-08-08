/**
 * Test script to verify backwards compatibility of the new config system
 */

// Test the old way (JavaScript import)
console.log('Testing old config system...');
try {
  const oldConfig = require('./index.js');

  // Test basic ability access
  console.log('✓ Old config loaded successfully');
  console.log('✓ Total abilities (old):', Object.keys(oldConfig.abilities).length);

  // Test specific ability access
  const attackAbility = oldConfig.getAbility('attack');
  if (attackAbility && attackAbility.name === 'Slash') {
    console.log('✓ getAbility() works in old config');
  } else {
    console.log('✗ getAbility() failed in old config');
  }

} catch (error) {
  console.log('✗ Old config failed:', (error as Error).message);
}

// Test the new way (TypeScript, but compiled to JS for this test)
console.log('\nTesting new config system...');
try {
  // Note: This will work once the TypeScript is compiled
  // For now, we'll test the components directly

  const { abilityLoader } = require('./loaders/AbilityLoader');

  console.log('✓ New AbilityLoader loaded successfully');

  // Test basic functionality
  const totalAbilities = abilityLoader.getAllAbilityIds().length;
  console.log('✓ Total abilities (new):', totalAbilities);

  // Test specific ability access
  const attackAbility = abilityLoader.getAbility('attack');
  if (attackAbility && attackAbility.name === 'Slash') {
    console.log('✓ getAbility() works in new loader');
  } else {
    console.log('✗ getAbility() failed in new loader');
  }

  // Test enhanced functionality
  const damageCalculation = abilityLoader.calculateDamage(attackAbility, { level: 5 });
  console.log('✓ Enhanced damage calculation:', damageCalculation);

  // Test validation
  const stats = abilityLoader.getAbilityStats();
  console.log('✓ Ability stats:', {
    total: stats.total,
    categories: Object.keys(stats.byCategory),
    averageDamage: Math.round(stats.averageDamage)
  });

} catch (error) {
  console.log('✗ New config failed:', (error as Error).message);
  console.log('Stack:', (error as Error).stack);
}

console.log('\nCompatibility test complete.');
