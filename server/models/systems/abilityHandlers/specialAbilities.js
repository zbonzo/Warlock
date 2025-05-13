/**
 * @fileoverview Special ability handlers
 * Contains utility, detection, and status-effect abilities
 */

/**
 * Register all special ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Detection abilities
  registry.registerClassAbility('fatesEye', handleDetectionAbility);
  
  registry.registerClassAbility('revealSecret', (actor, target, ability, log, systems) => {
    return registry.executeClassAbility('fatesEye', actor, target, ability, log);
  });
  
  // Stun abilities
  registry.registerClassAbility('entangle', handleStunAbility);
}

/**
 * Handler for detection abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to detect information about
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleDetectionAbility(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(`${actor.name} tries to use ${ability.name}, but it can only target players.`);
    return false;
  }
  
  log.push(`${actor.name} uses ${ability.name} on ${target.name}.`);
  
  // Reveal warlock status
  const revealText = target.isWarlock 
    ? `${target.name} IS a Warlock!` 
    : `${target.name} is NOT a Warlock.`;
  
  log.push(`Revelation: ${revealText}`);
  return true;
}

/**
 * Handler for stun abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to potentially stun
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleStunAbility(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(`${actor.name} tries to use ${ability.name}, but the target is invalid.`);
    return false;
  }
  
  // Check stun chance
  const stunChance = ability.params.chance || 0.5;
  
  if (Math.random() < stunChance) {
    // Apply stun effect
    systems.statusEffectManager.applyEffect(target.id, 'stunned', { 
      turns: ability.params.duration || 1 
    }, log);
    
    log.push(`${actor.name}'s ${ability.name} stuns ${target.name} for ${ability.params.duration || 1} turn(s)!`);
    return true;
  } else {
    log.push(`${target.name} resists ${actor.name}'s ${ability.name}!`);
    return false;
  }
}

module.exports = { register };