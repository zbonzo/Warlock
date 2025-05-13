/**
 * @fileoverview Attack-related ability handlers
 * Contains damage-dealing class abilities
 */

/**
 * Register all attack ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Generic attack handler
  registry.registerClassAbility('attack', handleAttack);
  
  // Register all basic attack abilities
  registry.registerClassAbilities([
    'slash', 'fireball', 'lightningBolt', 'pistolShot', 'preciseShot', 
    'clawSwipe', 'holyBolt', 'psychicBolt', 'backstab'
  ], (actor, target, ability, log, systems) => {
    return registry.executeClassAbility('attack', actor, target, ability, log, systems);
  });
  
  // Special attack types
  registry.registerClassAbility('poisonStrike', handlePoisonStrike);
  
  // AOE damage abilities
  registry.registerClassAbility('meteorShower', handleAoeDamage);
  
  // Register similar AOE abilities
  registry.registerClassAbilities(
    ['chainLightning', 'ricochetRound'],
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility('meteorShower', actor, target, ability, log, systems);
    }
  );
  
  // Poison + damage AOE
  registry.registerClassAbility('infernoBlast', handleInfernoBlast);
  
  // Single-target poison
  registry.registerClassAbility('deathMark', handleDeathMark);
  
  // Poison trap
  registry.registerClassAbility('poisonTrap', handlePoisonTrap);
}

/**
 * Handler for generic attack abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleAttack(actor, target, ability, log, systems) {
  if (target === '__monster__') {
    return handleMonsterAttack(actor, ability, log, systems);
  }
  return handlePlayerAttack(actor, target, ability, log, systems);
}

/**
 * Handler for poison strike ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handlePoisonStrike(actor, target, ability, log, systems) {
  // First apply regular attack damage
  const attackResult = handleAttack(actor, target, ability, log, systems);
  
  // Then apply poison if attack was successful and target is still alive
  if (attackResult && target !== '__monster__' && target.isAlive) {
    const poisonData = ability.params.poison;
    const modifiedPoisonDamage = Math.floor(poisonData.damage * (actor.damageMod || 1.0));
    
    systems.statusEffectManager.applyEffect(target.id, 'poison', {
      turns: poisonData.turns,
      damage: modifiedPoisonDamage
    }, log);
    
    log.push(`${target.name} is poisoned for ${modifiedPoisonDamage} damage over ${poisonData.turns} turns.`);
  }
  
  return attackResult;
}

/**
 * Handler for AoE damage abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleAoeDamage(actor, target, ability, log, systems) {
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);
  
  // Get potential targets (all alive players except self)
  const targets = Array.from(systems.players.values())
    .filter(p => p.isAlive && p.id !== actor.id);
  
  if (targets.length === 0) {
    log.push(`${actor.name} uses ${ability.name}, but there are no valid targets.`);
    return false;
  }
  
  // Apply damage to multiple targets
  log.push(`${actor.name} unleashes ${ability.name}!`);
  
  for (const potentialTarget of targets) {
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget, 
      modifiedDamage, 
      actor, 
      log
    );
    
    // Check for warlock conversion with reduced chance for AoE
    if (actor.isWarlock && potentialTarget.isAlive && !potentialTarget.isWarlock) {
      systems.warlockSystem.attemptConversion(actor, potentialTarget, log, 0.5);
    }
  }
  
  return true;
}

/**
 * Handler for inferno blast ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleInfernoBlast(actor, target, ability, log, systems) {
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);
  
  // Get potential targets (all alive players except self)
  const targets = Array.from(systems.players.values())
    .filter(p => p.isAlive && p.id !== actor.id);
  
  if (targets.length === 0) {
    log.push(`${actor.name} uses ${ability.name}, but there are no valid targets.`);
    return false;
  }
  
  // Apply damage and poison to multiple targets
  log.push(`${actor.name} unleashes ${ability.name}!`);
  
  for (const potentialTarget of targets) {
    // Apply direct damage
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget, 
      modifiedDamage, 
      actor, 
      log
    );
    
    // Apply poison if target is still alive
    if (potentialTarget.isAlive && ability.effect === 'poison') {
      const poisonData = ability.params.poison;
      const modifiedPoisonDamage = Math.floor(poisonData.damage * (actor.damageMod || 1.0));
      
      systems.statusEffectManager.applyEffect(potentialTarget.id, 'poison', {
        turns: poisonData.turns,
        damage: modifiedPoisonDamage
      }, log);
      
      log.push(`${potentialTarget.name} is poisoned for ${modifiedPoisonDamage} damage over ${poisonData.turns} turns.`);
    }
  }
  
  return true;
}

/**
 * Handler for death mark ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleDeathMark(actor, target, ability, log, systems) {
  if (target === '__monster__') {
    log.push(`${actor.name} tries to use ${ability.name} on the Monster, but it has no effect.`);
    return false;
  }
  
  const poisonData = ability.params.poison;
  const modifiedPoisonDamage = Math.floor(poisonData.damage * (actor.damageMod || 1.0));
  
  systems.statusEffectManager.applyEffect(target.id, 'poison', {
    turns: poisonData.turns,
    damage: modifiedPoisonDamage
  }, log);
  
  log.push(`${actor.name} uses ${ability.name} on ${target.name}, poisoning them for ${modifiedPoisonDamage} damage over ${poisonData.turns} turns.`);
  return true;
}

/**
 * Handler for poison trap ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handlePoisonTrap(actor, target, ability, log, systems) {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values())
    .filter(p => p.isAlive && p.id !== actor.id);
  
  if (targets.length === 0) {
    log.push(`${actor.name} uses ${ability.name}, but there are no valid targets.`);
    return false;
  }
  
  const poisonData = ability.params.poison;
  if (!poisonData) {
    log.push(`${actor.name} tries to set a poison trap, but something is wrong with the poison.`);
    return false;
  }
  
  const modifiedPoisonDamage = Math.floor((poisonData.damage || 0) * (actor.damageMod || 1.0));
  
  // Apply poison to multiple targets
  log.push(`${actor.name} sets a ${ability.name}!`);
  let targetsHit = 0;
  
  for (const potentialTarget of targets) {
    if (Math.random() < 0.7) { // 70% chance to affect each target
      systems.statusEffectManager.applyEffect(potentialTarget.id, 'poison', {
        turns: poisonData.turns || 2,
        damage: modifiedPoisonDamage
      }, log);
      log.push(`${potentialTarget.name} is caught in ${actor.name}'s ${ability.name}, taking ${modifiedPoisonDamage} poison damage over ${poisonData.turns || 2} turns.`);
      targetsHit++;
    }
  }
  
  if (targetsHit === 0) {
    log.push(`${actor.name}'s ${ability.name} doesn't catch anyone!`);
  }
  
  return true;
}

/**
 * Helper for handling attacks on the monster
 * @param {Object} actor - Actor using the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handleMonsterAttack(actor, ability, log, systems) {
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);
  systems.monsterController.takeDamage(modifiedDamage, actor, log);
  
  // Warlocks generate "threat" attacking monster
  if (actor.isWarlock) {
    systems.warlockSystem.attemptConversion(actor, null, log);
  }
  
  return true;
}

/**
 * Helper for handling attacks on players
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target player
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handlePlayerAttack(actor, target, ability, log, systems) {
  if (!target || !target.isAlive) return false;
  
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);
  
  // Check if this is a Keen Senses attack
  const isKeenSensesAttack = actor.racialEffects && 
                            actor.racialEffects.keenSensesActiveOnNextAttack === target.id;
  
  systems.combatSystem.applyDamageToPlayer(target, modifiedDamage, actor, log, isKeenSensesAttack);
  
  // Clear the Keen Senses flag after use
  if (isKeenSensesAttack) {
    delete actor.racialEffects.keenSensesActiveOnNextAttack;
  }
  
  // Warlocks may attempt to convert on attack
  if (actor.isWarlock) {
    systems.warlockSystem.attemptConversion(actor, target, log);
  }
  
  return true;
}

module.exports = { register };