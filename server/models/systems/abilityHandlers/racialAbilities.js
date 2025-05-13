/**
 * @fileoverview Racial ability handlers
 * Contains all race-specific ability implementations
 */

/**
 * Register all racial ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Human racial ability - Adaptability
  registry.registerRacialAbility('adaptability', handleAdaptability);
  
  // Dwarf racial ability - Stone Resolve
  registry.registerRacialAbility('stoneResolve', handleStoneResolve);
  
  // Elf racial ability - Keen Senses
  registry.registerRacialAbility('keenSenses', handleKeenSenses);
  
  // Orc racial ability - Blood Rage
  registry.registerRacialAbility('bloodRage', handleBloodRage);
  
  // Satyr racial ability - Forest's Grace
  registry.registerRacialAbility('forestsGrace', handleForestsGrace);
  
  // Skeleton racial ability - Undying
  registry.registerRacialAbility('undying', handleUndying);
}

/**
 * Handler for Human's Adaptability ability
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the ability (always self)
 * @param {Object} racialAbility - Racial ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleAdaptability(actor, target, racialAbility, log, systems) {
  // This ability requires UI integration to let player choose
  log.push(`${actor.name} uses Adaptability to replace one ability with another of the same level.`);
  
  // Log the available abilities for reference
  const allAbilities = actor.abilities;
  const unlockedByLevel = {};
  
  allAbilities.forEach(a => {
    unlockedByLevel[a.unlockAt] = unlockedByLevel[a.unlockAt] || [];
    unlockedByLevel[a.unlockAt].push(a.name);
  });
  
  // Emit an event to trigger the UI selection
  if (systems.socket) {
    systems.socket.emit('adaptabilityChooseAbility', {
      abilities: getAbilitiesByLevel(actor.abilities),
      maxLevel: actor.level || 1
    });
  }
  
  return true;
}

/**
 * Handler for Dwarf's Stone Resolve ability
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the ability (always self)
 * @param {Object} racialAbility - Racial ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleStoneResolve(actor, target, racialAbility, log, systems) {
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  
  actor.racialEffects.immuneNextDamage = true;
  log.push(`${actor.name} activates Stone Resolve, gaining immunity to the next damage instance.`);
  return true;
}

/**
 * Handler for Elf's Keen Senses ability
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to reveal information about
 * @param {Object} racialAbility - Racial ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleKeenSenses(actor, target, racialAbility, log, systems) {
  if (target === '__monster__') {
    log.push(`${actor.name} tried to use Keen Senses on the Monster, but it has no effect.`);
    return false;
  }
  
  if (!target || !target.isAlive) {
    log.push(`${actor.name} tried to use Keen Senses, but the target is invalid.`);
    return false;
  }
  
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  
  // Set up the effect for next attack
  actor.racialEffects.keenSensesActiveOnNextAttack = target.id;
  
  log.push(`${actor.name} uses Keen Senses to study ${target.name} closely.`);
  log.push(`${actor.name}'s next attack on ${target.name} will reveal their true nature.`);
  
  return true;
}

/**
 * Handler for Orc's Blood Rage ability
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the ability (always self)
 * @param {Object} racialAbility - Racial ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleBloodRage(actor, target, racialAbility, log, systems) {
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  
  // Set up the blood rage effect
  actor.racialEffects.bloodRage = true;
  
  // Apply self-damage
  const selfDamage = racialAbility.params.selfDamage || 10;
  const oldHp = actor.hp;
  actor.hp = Math.max(1, actor.hp - selfDamage); // Cannot reduce below 1 HP
  const actualDamage = oldHp - actor.hp;
  
  log.push(`${actor.name} enters a Blood Rage, taking ${actualDamage} damage but doubling the power of their next attack!`);
  
  return true;
}

/**
 * Handler for Satyr's Forest's Grace ability
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the ability (always self)
 * @param {Object} racialAbility - Racial ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleForestsGrace(actor, target, racialAbility, log, systems) {
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  
  // Set up the healing over time effect
  actor.racialEffects.healOverTime = {
    amount: racialAbility.params.amount || 5,
    turns: racialAbility.params.turns || 3
  };
  
  log.push(`${actor.name} calls upon Forest's Grace, gaining ${actor.racialEffects.healOverTime.amount} healing each turn for ${actor.racialEffects.healOverTime.turns} turns.`);
  
  return true;
}

/**
 * Handler for Skeleton's Undying ability
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the ability (always self)
 * @param {Object} racialAbility - Racial ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleUndying(actor, target, racialAbility, log, systems) {
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  
  // Set up the resurrection effect
  actor.racialEffects.resurrect = {
    resurrectedHp: racialAbility.params.resurrectedHp || 1
  };
  
  log.push(`${actor.name} prepares Undying, ready to cheat death once.`);
  
  return true;
}

/**
 * Helper to organize abilities by level for UI
 * @param {Array} abilities - List of player abilities
 * @returns {Object} Object with abilities organized by level
 * @private
 */
function getAbilitiesByLevel(abilities) {
  const byLevel = {};
  
  abilities.forEach(ability => {
    const level = ability.unlockAt || 1;
    byLevel[level] = byLevel[level] || [];
    byLevel[level].push(ability);
  });
  
  return byLevel;
}

module.exports = { register };