/**
 * @fileoverview Entry point for all ability handlers
 * Registers handlers with the AbilityRegistry
 */
const attackAbilities = require('./attackAbilities');
const healAbilities = require('./healAbilities');
const defenseAbilities = require('./defenseAbilities');
const specialAbilities = require('./specialAbilities');
const racialAbilities = require('./racialAbilities');
const { getAllAbilities } = require('./abilityRegistryUtils');

/**
 * Register all ability handlers with the provided registry
 * @param {AbilityRegistry} registry - The ability registry to register handlers with
 * @returns {Object} Debug information about registered handlers
 */
function registerAbilityHandlers(registry) {
  // Register handlers from each category
  attackAbilities.register(registry);
  healAbilities.register(registry);
  defenseAbilities.register(registry);
  specialAbilities.register(registry);
  racialAbilities.register(registry);
  
  // For debugging: check if all abilities have been registered
  checkUnregisteredAbilities(registry);
  
  // Return debug info about registered handlers
  return registry.getDebugInfo();
}

/**
 * Check if any abilities are not registered with handlers
 * @param {AbilityRegistry} registry - The ability registry to check
 * @private
 */
function checkUnregisteredAbilities(registry) {
  const allAbilities = getAllAbilities();
  
  // Check for unregistered abilities
  const unregistered = allAbilities.all.filter(abilityType => 
    !registry.hasClassAbility(abilityType)
  );
  
  if (unregistered.length > 0) {
    console.warn(`Warning: The following abilities don't have registered handlers: ${unregistered.join(', ')}`);
  }
}

module.exports = { registerAbilityHandlers };