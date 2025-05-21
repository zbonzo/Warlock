/**
 * @fileoverview Special ability handlers
 * Contains utility, detection, and status-effect abilities
 */
const config = require('@config');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria
} = require('./abilityRegistryUtils');

/**
 * Register all special ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Register detection abilities
  registry.registerClassAbility('fatesEye', handleDetectionAbility);
  
  // Register all abilities with 'detect' effect
  registerAbilitiesByEffectAndTarget(registry, 
    'detect', 
    'Single', 
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility('fatesEye', actor, target, ability, log, systems);
    }
  );
  
  // Register stun abilities
  registry.registerClassAbility('entangle', handleStunAbility);
  
  // Register all abilities with 'stunned' effect
  registerAbilitiesByEffectAndTarget(registry, 
    'stunned', 
    'Multi', 
    (actor, target, ability, log, systems) => {
      if (ability.type !== 'entangle') { // Skip ones with specific handlers
        return registry.executeClassAbility('entangle', actor, target, ability, log, systems);
      }
    }
  );
  
  // Register remaining Special category abilities
  registerAbilitiesByCategory(registry, 
    'Special', 
    (actor, target, ability, log, systems) => {
      // Default handler for Special category abilities without a specific handler
      // Log that the ability was used
      log.push(`${actor.name} uses ${ability.name}.`);
      return true;
    }
  );
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
  // Use config message if available
  const isWarlock = target.isWarlock;
  const warlockMessage = isWarlock ? 
    (config.getMessage('events', 'warlockRevealed') || `{playerName} IS a Warlock!`) :
    (config.getMessage('events', 'notWarlock') || `{playerName} is NOT a Warlock.`);
  
  const revealText = warlockMessage.replace('{playerName}', target.name);
  
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
  // For multi-target stun abilities
  if (ability.target === 'Multi') {
    return handleMultiStun(actor, ability, log, systems);
  }
  
  // For single-target stun abilities
  if (!target || target === '__monster__') {
    log.push(`${actor.name} tries to use ${ability.name}, but the target is invalid.`);
    return false;
  }
  
  // Get stun defaults from config if needed
  const stunDefaults = config.getStatusEffectDefaults('stunned') || { turns: 1 };
  
  // Check stun chance
  const stunChance = ability.params.chance || 0.5;
  
  if (Math.random() < stunChance) {
    // Apply stun effect
    systems.statusEffectManager.applyEffect(target.id, 'stunned', { 
      turns: ability.params.duration || stunDefaults.turns
    }, log);
    
    // Use config message if available
    const stunMessage = config.getMessage('events', 'playerStunned') || 
      `{playerName} is stunned for {turns} turn(s).`;
    
    log.push(stunMessage
      .replace('{playerName}', target.name)
      .replace('{turns}', ability.params.duration || stunDefaults.turns));
    
    return true;
  } else {
    log.push(`${target.name} resists ${actor.name}'s ${ability.name}!`);
    return false;
  }
}

/**
 * Handler for multi-target stun abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handleMultiStun(actor, ability, log, systems) {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values())
    .filter(p => p.isAlive && p.id !== actor.id);
  
  if (targets.length === 0) {
    log.push(`${actor.name} uses ${ability.name}, but there are no valid targets.`);
    return false;
  }
  
  // Get stun defaults from config if needed
  const stunDefaults = config.getStatusEffectDefaults('stunned') || { turns: 1 };
  
  // Apply stun to multiple targets
  log.push(`${actor.name} casts ${ability.name}!`);
  let targetsStunned = 0;
  
  // Get stun chance from ability or use default
  const stunChance = ability.params.chance || 0.5;
  
  for (const potentialTarget of targets) {
    if (Math.random() < stunChance) {
      systems.statusEffectManager.applyEffect(potentialTarget.id, 'stunned', { 
        turns: ability.params.duration || stunDefaults.turns
      }, log);
      
      // Use config message if available
      const stunMessage = config.getMessage('events', 'playerStunned') || 
        `{playerName} is stunned for {turns} turn(s).`;
      
      log.push(stunMessage
        .replace('{playerName}', potentialTarget.name)
        .replace('{turns}', ability.params.duration || stunDefaults.turns));
      
      targetsStunned++;
    } else {
      log.push(`${potentialTarget.name} resists ${actor.name}'s ${ability.name}!`);
    }
  }
  
  if (targetsStunned === 0) {
    log.push(`${actor.name}'s ${ability.name} doesn't stun anyone!`);
  }
  
  return true;
}

module.exports = { register };