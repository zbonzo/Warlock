/**
 * @fileoverview Defense ability handlers
 * Contains all protection and defensive class abilities
 */

/**
 * Register all defense ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Protection abilities
  registry.registerClassAbility('shieldWall', handleShieldWall);
  
  // Register all shield/protection abilities
  registry.registerClassAbilities([
    'flameWard', 'arcaneShield', 'divineGuard', 'foresight', 'spiritGuard', 
    'totemShield', 'barkskin'
  ], (actor, target, ability, log, systems) => {
    return registry.executeClassAbility('shieldWall', actor, target, ability, log);
  });
  
  // Invisibility abilities
  registry.registerClassAbility('shadowVeil', handleInvisibility);
  
  // Register all invisibility abilities
  registry.registerClassAbilities(
    ['smokeBomb', 'smokeScreen', 'camouflage'],
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility('shadowVeil', actor, target, ability, log);
    }
  );
  
  // Special invisibility for Rogue
  registry.registerClassAbility('shadowstep', handleShadowstep);
  
  // Multi-protection abilities
  registry.registerClassAbility('battleCry', handleMultiProtection);
  
  registry.registerClassAbility('divineShield', (actor, target, ability, log, systems) => {
    return registry.executeClassAbility('battleCry', actor, target, ability, log);
  });
}

/**
 * Handler for shield/protection abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the protection
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleShieldWall(actor, target, ability, log, systems) {
  systems.statusEffectManager.applyEffect(target.id, 'protected', { 
    armor: ability.params.armor,
    turns: ability.params.duration 
  }, log);
  
  if (actor.id === target.id) {
    log.push(`${actor.name} raises ${ability.name}, gaining ${ability.params.armor} armor for ${ability.params.duration} turn(s).`);
  } else {
    log.push(`${actor.name} protects ${target.name} with ${ability.name}, granting ${ability.params.armor} armor for ${ability.params.duration} turn(s).`);
  }
  
  return true;
}

/**
 * Handler for invisibility abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to make invisible
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleInvisibility(actor, target, ability, log, systems) {
  systems.statusEffectManager.applyEffect(target.id, 'invisible', { 
    turns: ability.params.duration 
  }, log);
  
  if (actor.id === target.id) {
    log.push(`${actor.name} vanishes from sight for ${ability.params.duration} turn(s).`);
  } else {
    log.push(`${actor.name} makes ${target.name} invisible for ${ability.params.duration} turn(s).`);
  }
  
  return true;
}

/**
 * Handler for shadowstep ability (Rogue specialty)
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to make invisible
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleShadowstep(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(`${actor.name} tries to use ${ability.name}, but the target is invalid.`);
    return false;
  }
  
  systems.statusEffectManager.applyEffect(target.id, 'invisible', { 
    turns: ability.params.duration 
  }, log);
  
  log.push(`${actor.name} uses ${ability.name} on ${target.name}, shrouding them in shadows for ${ability.params.duration} turn(s).`);
  return true;
}

/**
 * Handler for multi-target protection abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Initial target (ignored for multi-target)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleMultiProtection(actor, target, ability, log, systems) {
  // Get all alive players
  const targets = Array.from(systems.players.values()).filter(p => p.isAlive);
  let protectedCount = 0;
  
  for (const potentialTarget of targets) {
    systems.statusEffectManager.applyEffect(potentialTarget.id, 'protected', { 
      armor: ability.params.armor,
      turns: ability.params.duration 
    }, log);
    protectedCount++;
  }
  
  log.push(`${actor.name} uses ${ability.name}, protecting ${protectedCount} allies with ${ability.params.armor} armor for ${ability.params.duration} turn(s).`);
  return true;
}

module.exports = { register };