/**
 * @fileoverview Entry point for all ability handlers
 * Registers handlers with the AbilityRegistry
 */
const attackAbilities = require('./attackAbilities');
const healAbilities = require('./healAbilities');
const defenseAbilities = require('./defenseAbilities');
const specialAbilities = require('./specialAbilities');
const racialAbilities = require('./racialAbilities');

/**
 * Register all ability handlers with the provided registry
 * @param {AbilityRegistry} registry - The ability registry to register handlers with
 */
function registerAbilityHandlers(registry) {
  // Register handlers from each category
  attackAbilities.register(registry);
  healAbilities.register(registry);
  defenseAbilities.register(registry);
  specialAbilities.register(registry);
  racialAbilities.register(registry);
  
  // Return debug info about registered handlers
  return registry.getDebugInfo();
}

module.exports = { registerAbilityHandlers };