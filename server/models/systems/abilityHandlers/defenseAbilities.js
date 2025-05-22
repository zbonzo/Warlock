/**
 * @fileoverview Defense-related ability handlers
 * Contains protective and defensive class abilities
 */
const config = require('@config');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
} = require('./abilityRegistryUtils');

/**
 * Register all defense ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Base protection ability handlers
  registry.registerClassAbility('shieldWall', handleShieldWall);
  registry.registerClassAbility('shadowVeil', handleInvisibility);

  // Register all 'Defense' category abilities to use appropriate handlers based on effect
  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'protected' },
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'shieldWall',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'invisible' },
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'shadowVeil',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  // Special abilities with their own handlers
  registry.registerClassAbility('shadowstep', handleShadowstep);
  registry.registerClassAbility('battleCry', handleMultiProtection);
  registry.registerClassAbility('divineShield', handleMultiProtection);
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
  // Get protection defaults from config if needed
  const protectionDefaults = config.getStatusEffectDefaults('protected') || {
    armor: 2,
    turns: 1,
  };

  systems.statusEffectManager.applyEffect(
    target.id,
    'protected',
    {
      armor: ability.params.armor || protectionDefaults.armor,
      turns: ability.params.duration || protectionDefaults.turns,
    },
    log
  );

  // Use message from config if available
  const protectionMessage =
    config.getMessage('events', 'playerProtected') ||
    `{playerName} is protected with {armor} armor for {turns} turn(s).`;

  log.push(
    protectionMessage
      .replace('{playerName}', target.name)
      .replace('{armor}', ability.params.armor || protectionDefaults.armor)
      .replace('{turns}', ability.params.duration || protectionDefaults.turns)
  );

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
  // Get invisibility defaults from config if needed
  const invisibilityDefaults = config.getStatusEffectDefaults('invisible') || {
    turns: 1,
  };

  systems.statusEffectManager.applyEffect(
    target.id,
    'invisible',
    {
      turns: ability.params.duration || invisibilityDefaults.turns,
    },
    log
  );

  // Use message from config if available
  const invisibilityMessage =
    config.getMessage('events', 'playerInvisible') ||
    `{playerName} becomes invisible for {turns} turn(s).`;

  log.push(
    invisibilityMessage
      .replace('{playerName}', target.name)
      .replace('{turns}', ability.params.duration || invisibilityDefaults.turns)
  );

  return true;
}

/**
 * Handler for shadowstep ability (Alchemist specialty)
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to make invisible
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleShadowstep(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(
      `${actor.name} tries to use ${ability.name}, but the target is invalid.`
    );
    return false;
  }

  // Get invisibility defaults from config if needed
  const invisibilityDefaults = config.getStatusEffectDefaults('invisible') || {
    turns: 1,
  };

  systems.statusEffectManager.applyEffect(
    target.id,
    'invisible',
    {
      turns: ability.params.duration || invisibilityDefaults.turns,
    },
    log
  );

  log.push(
    `${actor.name} uses ${ability.name} on ${target.name}, shrouding them in shadows for ${ability.params.duration || invisibilityDefaults.turns} turn(s).`
  );
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
  const targets = Array.from(systems.players.values()).filter((p) => p.isAlive);

  // Get protection defaults from config if needed
  const protectionDefaults = config.getStatusEffectDefaults('protected') || {
    armor: 2,
    turns: 1,
  };

  let protectedCount = 0;

  for (const potentialTarget of targets) {
    systems.statusEffectManager.applyEffect(
      potentialTarget.id,
      'protected',
      {
        armor: ability.params.armor || protectionDefaults.armor,
        turns: ability.params.duration || protectionDefaults.turns,
      },
      log
    );
    protectedCount++;
  }

  log.push(
    `${actor.name} uses ${ability.name}, protecting ${protectedCount} allies with ${ability.params.armor || protectionDefaults.armor} armor for ${ability.params.duration || protectionDefaults.turns} turn(s).`
  );
  return true;
}

module.exports = { register };
