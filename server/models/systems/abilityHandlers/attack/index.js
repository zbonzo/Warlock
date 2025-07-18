/**
 * @fileoverview Attack abilities main module
 * Combines all attack ability handlers and provides registration functionality
 */
const { registerAbilitiesByCategory } = require('../abilityRegistryUtils');

// Import all attack modules
const basicAttacks = require('./basicAttacks');
const poisonAttacks = require('./poisonAttacks');
const fireAttacks = require('./fireAttacks');
const multiHitAttacks = require('./multiHitAttacks');

/**
 * Register all attack ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Register basic attack handlers
  registry.registerClassAbility('attack', basicAttacks.handleAttack);
  registry.registerClassAbility('recklessStrike', basicAttacks.handleRecklessStrike);
  registry.registerClassAbility('shiv', basicAttacks.handleVulnerabilityStrike);

  // Register poison attack handlers
  registry.registerClassAbility('poisonStrike', poisonAttacks.handlePoisonStrike);
  registry.registerClassAbility('deathMark', poisonAttacks.handleDeathMark);
  registry.registerClassAbility('poisonTrap', poisonAttacks.handlePoisonTrap);
  registry.registerClassAbility('barbedArrow', poisonAttacks.handleBarbedArrow);

  // Register fire attack handlers
  registry.registerClassAbility('pyroblast', fireAttacks.handlePyroblast);
  registry.registerClassAbility('combustion', fireAttacks.handlePyroblast); // Alias
  registry.registerClassAbility('infernoBlast', fireAttacks.handleInfernoBlast);

  // Register multi-hit attack handlers
  registry.registerClassAbility('multiHitAttack', multiHitAttacks.handleMultiHitAttack);
  registry.registerClassAbility('arcaneBarrage', multiHitAttacks.handleMultiHitAttack);
  registry.registerClassAbility('twinStrike', multiHitAttacks.handleMultiHitAttack);
  registry.registerClassAbility('meteorShower', multiHitAttacks.handleAoeDamage);
  registry.registerClassAbility('chainLightning', multiHitAttacks.handleAoeDamage);
  registry.registerClassAbility('ricochetRound', multiHitAttacks.handleRicochetRound);

  // Register all abilities with category "Attack" to use the basic attack handler
  // This allows new attack abilities to work automatically
  registerAbilitiesByCategory(
    registry,
    'Attack',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'attack',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );
}

module.exports = {
  register,
  // Export individual handlers for testing
  ...basicAttacks,
  ...poisonAttacks,
  ...fireAttacks,
  ...multiHitAttacks
};